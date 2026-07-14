import asyncio
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


# ~150 words per chunk, so 20 chunks ≈ 3k words — the same context size the
# cross-meeting search sends, which stays inside the LLM's request limits.
MAX_CONTEXT_CHUNKS = 20


def sample_evenly(items: list, limit: int) -> list:
    """Take up to `limit` items spread evenly across the list, so a long
    meeting is represented start-to-end instead of just its beginning."""
    if len(items) <= limit:
        return items
    step = len(items) / limit
    return [items[int(i * step)] for i in range(limit)]


class SearchRequest(BaseModel):
    meeting_id: str
    query: str


class SearchAllRequest(BaseModel):
    workspace_id: str
    query: str


# Text search (this router) defaults to Groq. Voice search (app/routers/voice.py)
# calls the same retrieval logic below but passes Cerebras' config instead —
# splitting providers so the two features draw from separate free-tier rate
# limits instead of sharing one.
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


# The "answer" text is sent straight to text-to-speech for voice search, so
# it can't contain bullet points or inline "(Name, 12s)" citations — those
# read fine on screen but sound wrong spoken aloud. The sources array still
# carries speaker/timestamp separately for the on-screen list either way.
SPEECH_RULES = """- Answer based only on what's in the excerpts. If the answer isn't there, say so.
- Write the answer as natural spoken sentences, the way you'd say it out loud to someone — no bullet points, no numbered lists, and don't read out speaker names or timestamps inline.
- Be concise: a few sentences."""

# Shared formatting contract for the on-screen (non-speech) answers. The
# worked example matters more than the rules: without it the model tends to
# reply with a lazy one-liner ("X discussed several points") instead of
# actually extracting the substance from the excerpts.
_MARKDOWN_FORMAT = """FORMAT THE ANSWER AS DETAILED, STRUCTURED MARKDOWN. This is required:
- NEVER answer with a vague one-liner such as "X discussed several points" or "the agenda was covered". Read the excerpts and spell out the ACTUAL substance.
- Open with ONE short sentence that directly answers the question.
- Then a blank line, then enumerate each distinct point, decision, question, suggestion, number, or next step as its own `-` bullet, paraphrased clearly. Use **bold** for key terms, names, and dates.
- Group bullets under `###` sub-headings (e.g. `### Decisions`, `### Open questions`, `### Next steps`) when the answer spans more than one topic.
- Attribute each point to who said it and roughly when (the timestamp) where it helps.
- Give a genuinely complete answer — as many bullets as the excerpts support, not a summary.

Example of the required SHAPE (copy the structure, NOT this content):

Priya walked through the launch plan and flagged a couple of risks.

### Decisions
- Agreed to **ship the beta on Friday** once QA signs off _(Priya, 4:12)_.

### Risks & open questions
- The **payments integration is still untested** and may slip _(Priya, 6:30)_.
- Unclear whether **marketing has the assets ready** — not resolved in these excerpts _(Priya, 7:05)_."""

SINGLE_MEETING_RULES = f"""- Answer based only on what's in the excerpts. If the answer genuinely isn't there, say so.
- The excerpts are only parts of the meeting, so never claim something wasn't discussed — say it doesn't appear in the retrieved excerpts.

{_MARKDOWN_FORMAT}"""

CROSS_MEETING_RULES = f"""- Answer based only on what's in the excerpts. If the answer genuinely isn't there, say so.
- When the answer draws on more than one meeting, add a `### <meeting name>` sub-heading per meeting.

{_MARKDOWN_FORMAT}"""


def _answer_rules(speech_style: bool, default_rules: str) -> str:
    return SPEECH_RULES if speech_style else default_rules


async def ask_llm(prompt: str, *, base_url: str, api_key: str, model: str) -> dict:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            },
        )
        response.raise_for_status()

    content = response.json()["choices"][0]["message"]["content"]
    return json.loads(content)


# The written answer is generated WITHOUT JSON mode. In json_object mode the
# model reliably offloads all the detail into the "sources" array and leaves
# "answer" a lazy one-liner ("X discussed several points") that ignores the
# Markdown formatting rules. A plain-text completion honours the structure.
async def ask_llm_text(prompt: str, *, base_url: str, api_key: str, model: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
            },
        )
        response.raise_for_status()

    return response.json()["choices"][0]["message"]["content"].strip()


async def _search_meeting(
    req: SearchRequest,
    *,
    llm_base_url: str = GROQ_URL,
    llm_api_key: str | None = None,
    llm_model: str = GROQ_MODEL,
    speech_style: bool = False,
) -> dict:
    import traceback as tb
    from supabase import create_client

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    result = supabase.table("meetings").select(
        "title, transcript, attendees"
    ).eq("id", req.meeting_id).single().execute()

    if not result.data or not result.data.get("transcript"):
        raise HTTPException(status_code=404, detail="Meeting or transcript not found")

    transcript = result.data["transcript"]
    title = result.data.get("title", "Untitled")

    try:
        all_result = (
            supabase.table("meeting_chunks")
            .select("chunk_index, speaker, start_time, text")
            .eq("meeting_id", req.meeting_id)
            .order("chunk_index")
            .execute()
        )
        all_chunks = all_result.data or []

        if all_chunks and len(all_chunks) <= MAX_CONTEXT_CHUNKS:
            # The whole meeting fits in one request, so send all of it. Keyword
            # retrieval would only pull a few fragments — no good for questions
            # that span the meeting ("what did X discuss?", "list the decisions"),
            # and it also pulls chunks that merely mention a name rather than the
            # turns actually spoken by that person.
            chunks = all_chunks
        elif all_chunks:
            # Long meeting: retrieve the chunks matching the question (same FTS
            # as /search-all, scoped to this meeting) so the context stays inside
            # the request limits. Broad questions often match nothing by keyword —
            # fall back to an even sample across the whole meeting.
            words = significant_words(req.query)
            tsquery = " | ".join(words) if words else req.query

            chunk_result = (
                supabase.table("meeting_chunks")
                .select("chunk_index, speaker, start_time, text")
                .eq("meeting_id", req.meeting_id)
                .filter("search_vector", "fts(simple)", tsquery)
                .order("chunk_index")
                .limit(MAX_CONTEXT_CHUNKS)
                .execute()
            )
            chunks = chunk_result.data or sample_evenly(all_chunks, MAX_CONTEXT_CHUNKS)
        else:
            # Meetings processed before chunk indexing existed have no rows in
            # meeting_chunks — chunk the stored transcript on the fly instead.
            from app.services.transcribe import chunk_transcript

            chunks = sample_evenly(chunk_transcript(transcript), MAX_CONTEXT_CHUNKS)

        excerpts = "\n\n".join(
            f"[{(c.get('start_time') or 0):.0f}s | {c.get('speaker') or 'Unknown'}]\n{c['text']}"
            for c in chunks
        )

        context = f"""MEETING: {title}
EXCERPTS:
{excerpts}

USER QUESTION: {req.query}"""

        answer_prompt = f"""You are a meeting search assistant. Answer the user's question based ONLY on these excerpts from the meeting transcript.

{context}

{_answer_rules(speech_style, SINGLE_MEETING_RULES)}

Write ONLY the answer itself — no preamble, no "Here is", no JSON."""

        sources_prompt = f"""From these meeting excerpts, pick the quotes that best support answering the question.

{context}

Return ONLY valid JSON:
{{"sources": [{{"speaker": "who said it", "text": "exact quote from an excerpt", "timestamp": timestamp_in_seconds}}]}}
Pick up to 4 of the most relevant quotes. Use the exact speaker label and timestamp from the excerpt's `[123s | Name]` header. If nothing is relevant, return {{"sources": []}}."""

        api_key = llm_api_key or settings.groq_api_key
        answer, sources_data = await asyncio.gather(
            ask_llm_text(answer_prompt, base_url=llm_base_url, api_key=api_key, model=llm_model),
            ask_llm(sources_prompt, base_url=llm_base_url, api_key=api_key, model=llm_model),
        )

        return {
            "answer": answer,
            "sources": sources_data.get("sources", []),
            "meeting_title": title,
        }
    except httpx.HTTPStatusError as e:
        tb.print_exc()
        raise HTTPException(
            status_code=502,
            detail=f"AI request failed ({e.response.status_code})",
        )
    except Exception as e:
        tb.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_meeting(req: SearchRequest):
    return await _search_meeting(req)


async def _search_all_meetings(
    req: SearchAllRequest,
    *,
    llm_base_url: str = GROQ_URL,
    llm_api_key: str | None = None,
    llm_model: str = GROQ_MODEL,
    speech_style: bool = False,
) -> dict:
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

        context = f"""EXCERPTS:
{chunks_text}

USER QUESTION: {req.query}"""

        answer_prompt = f"""You are a meeting search assistant. Answer the user's question based ONLY on these excerpts pulled from the user's past meetings.

{context}

{_answer_rules(speech_style, CROSS_MEETING_RULES)}

Write ONLY the answer itself — no preamble, no "Here is", no JSON."""

        sources_prompt = f"""From these excerpts pulled from the user's past meetings, pick the quotes that best support answering the question.

{context}

Return ONLY valid JSON:
{{"sources": [{{"meeting_title": "which meeting", "speaker": "who said it", "text": "exact quote from an excerpt", "timestamp": timestamp_in_seconds}}]}}
Pick up to 5 of the most relevant quotes. Use the exact meeting title, speaker, and timestamp from the excerpt's `[Meeting: ... | Name | 123s]` header. If nothing is relevant, return {{"sources": []}}."""

        api_key = llm_api_key or settings.groq_api_key
        answer, sources_data = await asyncio.gather(
            ask_llm_text(answer_prompt, base_url=llm_base_url, api_key=api_key, model=llm_model),
            ask_llm(sources_prompt, base_url=llm_base_url, api_key=api_key, model=llm_model),
        )

        meeting_id_by_title = {
            (c.get("meetings") or {}).get("title", "Untitled").strip(): c["meeting_id"] for c in chunks
        }
        sources = sources_data.get("sources", [])
        for s in sources:
            s["meeting_id"] = meeting_id_by_title.get((s.get("meeting_title") or "").strip())

        return {
            "answer": answer,
            "sources": sources,
        }
    except Exception as e:
        tb.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search-all")
async def search_all_meetings(req: SearchAllRequest):
    return await _search_all_meetings(req)
