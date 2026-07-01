import json
import re
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter()

# Small stopword list (kept short since 'simple' tsvector config is used for
# Hindi/Hinglish support and has no built-in stopword removal) so an OR query
# built from the user's words isn't drowned out by filler terms.
STOPWORDS = {
    "the", "and", "for", "are", "was", "were", "this", "that", "with",
    "from", "have", "has", "had", "not", "but", "you", "your", "what",
    "when", "where", "how", "why", "who", "which", "also", "about",
    "there", "their", "them", "these", "those", "been", "being",
}


def significant_words(text: str) -> list[str]:
    words = re.findall(r"\w+", text.lower())
    return [w for w in words if len(w) > 2 and w not in STOPWORDS]


class SearchRequest(BaseModel):
    meeting_id: str
    query: str


class SearchAllRequest(BaseModel):
    workspace_id: str
    query: str


@router.post("/search")
async def search_meeting(req: SearchRequest):
    from supabase import create_client

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    result = supabase.table("meetings").select(
        "title, transcript, attendees"
    ).eq("id", req.meeting_id).single().execute()

    if not result.data or not result.data.get("transcript"):
        raise HTTPException(status_code=404, detail="Meeting or transcript not found")

    transcript = result.data["transcript"]
    title = result.data.get("title", "Untitled")

    transcript_text = "\n".join(
        f"[{seg.get('start', 0):.0f}s] {seg['speaker']}: {seg['text']}"
        for seg in transcript
    )

    prompt = f"""You are a meeting search assistant. Answer the user's question based ONLY on this meeting transcript.

MEETING: {title}
TRANSCRIPT:
{transcript_text}

USER QUESTION: {req.query}

Rules:
- Answer based only on what's in the transcript. If the answer isn't there, say so.
- Quote the relevant parts directly.
- Mention who said it and at what timestamp.
- Be concise and direct.
- Return a JSON object with:
{{
  "answer": "your answer to the question",
  "sources": [
    {{"speaker": "who said it", "text": "exact quote from transcript", "timestamp": timestamp_in_seconds}}
  ]
}}
Return ONLY valid JSON."""

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
        )
        response.raise_for_status()

    content = response.json()["choices"][0]["message"]["content"]
    data = json.loads(content)

    return {
        "answer": data.get("answer", ""),
        "sources": data.get("sources", []),
        "meeting_title": title,
    }


@router.post("/search-all")
async def search_all_meetings(req: SearchAllRequest):
    import traceback as tb
    from supabase import create_client

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)
    try:
        words = significant_words(req.query)
        # OR the terms together instead of requiring every single word to
        # appear in the same chunk (plainto_tsquery ANDs everything, which
        # almost never matches a natural-language question).
        tsquery = " | ".join(words) if words else req.query

        result = (
            supabase.table("meeting_chunks")
            .select("meeting_id, chunk_index, speaker, start_time, text, meetings(title)")
            .eq("workspace_id", req.workspace_id)
            .filter("search_vector", "fts(simple)", tsquery)
            .order("chunk_index")
            .limit(20)
            .execute()
        )
        chunks = result.data or []


        if words:
            meetings_result = (
                supabase.table("meetings")
                .select("id, title")
                .eq("workspace_id", req.workspace_id)
                .eq("status", "completed")
                .execute()
            )
            word_set = set(words)
            matched_ids = {
                m["id"] for m in (meetings_result.data or [])
                if word_set & set(significant_words(m["title"]))
            }
            title_only_ids = matched_ids - {c["meeting_id"] for c in chunks}

            if title_only_ids:
                extra_result = (
                    supabase.table("meeting_chunks")
                    .select("meeting_id, chunk_index, speaker, start_time, text, meetings(title)")
                    .in_("meeting_id", list(title_only_ids))
                    .order("chunk_index")
                    .execute()
                )
                per_meeting_count: dict[str, int] = {}
                for c in extra_result.data or []:
                    mid = c["meeting_id"]
                    if per_meeting_count.get(mid, 0) >= 8:
                        continue
                    per_meeting_count[mid] = per_meeting_count.get(mid, 0) + 1
                    chunks.append(c)

        if not chunks:
            return {"answer": "", "sources": []}

        chunks_text = "\n\n".join(
            f"[Meeting: {(c.get('meetings') or {}).get('title', 'Untitled')} | "
            f"{c.get('speaker') or 'Unknown'} | {(c.get('start_time') or 0):.0f}s]\n{c['text']}"
            for c in chunks
        )

        prompt = f"""You are a meeting search assistant. Answer the user's question based ONLY on these excerpts pulled from the user's past meetings.

EXCERPTS:
{chunks_text}

USER QUESTION: {req.query}

Rules:
- Answer based only on what's in the excerpts. If the answer isn't there, say so.
- Quote the relevant parts directly.
- Mention which meeting and who said it, with the timestamp.
- Be concise and direct.
- Return a JSON object with:
{{
  "answer": "your answer to the question",
  "sources": [
    {{"meeting_title": "which meeting", "speaker": "who said it", "text": "exact quote", "timestamp": timestamp_in_seconds}}
  ]
}}
Return ONLY valid JSON."""

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()

        content = response.json()["choices"][0]["message"]["content"]
        data = json.loads(content)


        meeting_id_by_title = {
            (c.get("meetings") or {}).get("title", "Untitled").strip(): c["meeting_id"] for c in chunks
        }
        sources = data.get("sources", [])
        for s in sources:
            s["meeting_id"] = meeting_id_by_title.get((s.get("meeting_title") or "").strip())

        return {
            "answer": data.get("answer", ""),
            "sources": sources,
        }
    except Exception as e:
        tb.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
