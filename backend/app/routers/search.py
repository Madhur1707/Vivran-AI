import json
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter()


class SearchRequest(BaseModel):
    meeting_id: str
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
