import base64
import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.config import settings
from app.routers.search import (
    SearchRequest,
    SearchAllRequest,
    _search_meeting,
    _search_all_meetings,
)

router = APIRouter()

# aura-2-jupiter-en chosen in the Deepgram TTS playground; swap here if the
# voice ever needs to change.
TTS_MODEL = "aura-2-jupiter-en"

# Aura's /v1/speak caps input at 2000 characters per request.
MAX_TTS_CHARS = 2000

# Voice search answers via Cerebras rather than Groq (which text search uses)
# so the two features draw from separate free-tier rate-limit pools instead
# of competing for the same one.
CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions"
CEREBRAS_MODEL = "gpt-oss-120b"


@router.post("/voice-search")
async def voice_search(
    audio: UploadFile = File(...),
    workspace_id: str | None = Form(None),
    meeting_id: str | None = Form(None),
):
    if not settings.cerebras_api_key:
        raise HTTPException(status_code=500, detail="Voice search is not configured (missing Cerebras API key)")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No audio received")

    content_type = (audio.content_type or "audio/webm").split(";")[0]

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            stt_response = await client.post(
                "https://api.deepgram.com/v1/listen",
                headers={
                    "Authorization": f"Token {settings.deepgram_api_key}",
                    "Content-Type": content_type,
                },
                params={
                    "model": "nova-3",
                    "smart_format": "true",
                    "punctuate": "true",
                },
                content=audio_bytes,
            )
            stt_response.raise_for_status()

        stt_result = stt_response.json()
        alt = (
            stt_result.get("results", {})
            .get("channels", [{}])[0]
            .get("alternatives", [{}])[0]
        )
        query_text = (alt.get("transcript") or "").strip()

        if not query_text:
            raise HTTPException(status_code=422, detail="Didn't catch a question in that recording")

        cerebras_kwargs = dict(
            llm_base_url=CEREBRAS_URL,
            llm_api_key=settings.cerebras_api_key,
            llm_model=CEREBRAS_MODEL,
            speech_style=True,
        )
        if meeting_id:
            search_result = await _search_meeting(
                SearchRequest(meeting_id=meeting_id, query=query_text), **cerebras_kwargs
            )
        elif workspace_id:
            search_result = await _search_all_meetings(
                SearchAllRequest(workspace_id=workspace_id, query=query_text), **cerebras_kwargs
            )
        else:
            raise HTTPException(status_code=400, detail="workspace_id or meeting_id required")

        answer_text = search_result.get("answer") or "I couldn't find an answer to that."

        async with httpx.AsyncClient(timeout=60) as client:
            tts_response = await client.post(
                "https://api.deepgram.com/v1/speak",
                headers={
                    "Authorization": f"Token {settings.deepgram_api_key}",
                    "Content-Type": "application/json",
                },
                params={"model": TTS_MODEL},
                json={"text": answer_text[:MAX_TTS_CHARS]},
            )
            tts_response.raise_for_status()

        audio_base64 = base64.b64encode(tts_response.content).decode("ascii")

        return {
            "query_text": query_text,
            **search_result,
            "audio_base64": audio_base64,
        }
    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Voice request failed ({e.response.status_code})")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
