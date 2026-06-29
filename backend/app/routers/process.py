from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.services.transcribe import process_meeting
from app.config import settings

router = APIRouter()


class ProcessRequest(BaseModel):
    meeting_id: str
    audio_url: str
    attendees: list[str]


class RemapSpeakersRequest(BaseModel):
    meeting_id: str
    speaker_map: dict[str, str]


@router.post("/process")
async def start_processing(req: ProcessRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(process_meeting, req.meeting_id, req.audio_url, req.attendees)
    return {"status": "processing", "meeting_id": req.meeting_id}


@router.post("/remap-speakers")
async def remap_speakers(req: RemapSpeakersRequest):
    from supabase import create_client

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    result = supabase.table("meetings").select("transcript").eq("id", req.meeting_id).single().execute()

    if not result.data or not result.data.get("transcript"):
        raise HTTPException(status_code=404, detail="Meeting or transcript not found")

    transcript = result.data["transcript"]

    for seg in transcript:
        old_speaker = seg["speaker"]
        if old_speaker in req.speaker_map:
            seg["speaker"] = req.speaker_map[old_speaker]

    supabase.table("meetings").update({
        "transcript": transcript,
        "speakers_mapped": True,
    }).eq("id", req.meeting_id).execute()

    return {"status": "ok", "meeting_id": req.meeting_id}
