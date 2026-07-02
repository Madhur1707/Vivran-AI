import json
import traceback
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.services.transcribe import process_meeting, index_meeting_chunks
from app.config import settings

router = APIRouter()


class ProcessRequest(BaseModel):
    meeting_id: str
    workspace_id: str
    audio_url: str
    attendees: list[str]
    language: str = "en"


class RemapSpeakersRequest(BaseModel):
    meeting_id: str
    speaker_map: dict[str, str]


@router.post("/process")
async def start_processing(req: ProcessRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        process_meeting, req.meeting_id, req.workspace_id, req.audio_url, req.attendees, req.language
    )
    return {"status": "processing", "meeting_id": req.meeting_id}


def replace_speakers_in_text(text: str, speaker_map: dict[str, str]) -> str:
    for old_name, new_name in speaker_map.items():
        text = text.replace(old_name, new_name)
    return text


@router.post("/remap-speakers")
async def remap_speakers(req: RemapSpeakersRequest):
    from supabase import create_client

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    result = supabase.table("meetings").select(
        "workspace_id, transcript, summary, action_items, decisions, open_questions, follow_up_email"
    ).eq("id", req.meeting_id).single().execute()

    if not result.data or not result.data.get("transcript"):
        raise HTTPException(status_code=404, detail="Meeting or transcript not found")

    transcript = result.data["transcript"]
    for seg in transcript:
        old_speaker = seg["speaker"]
        if old_speaker in req.speaker_map:
            seg["speaker"] = req.speaker_map[old_speaker]

    update_data: dict = {
        "transcript": transcript,
        "speakers_mapped": True,
    }

    if result.data.get("summary"):
        update_data["summary"] = replace_speakers_in_text(result.data["summary"], req.speaker_map)

    if result.data.get("action_items"):
        action_items = result.data["action_items"]
        for item in action_items:
            if item.get("owner") in req.speaker_map:
                item["owner"] = req.speaker_map[item["owner"]]
            if item.get("task"):
                item["task"] = replace_speakers_in_text(item["task"], req.speaker_map)
        update_data["action_items"] = action_items

    if result.data.get("decisions"):
        decisions = result.data["decisions"]
        for d in decisions:
            if d.get("text"):
                d["text"] = replace_speakers_in_text(d["text"], req.speaker_map)
            if d.get("context"):
                d["context"] = replace_speakers_in_text(d["context"], req.speaker_map)
        update_data["decisions"] = decisions

    if result.data.get("open_questions"):
        update_data["open_questions"] = [
            replace_speakers_in_text(q, req.speaker_map) for q in result.data["open_questions"]
        ]

    if result.data.get("follow_up_email"):
        update_data["follow_up_email"] = replace_speakers_in_text(result.data["follow_up_email"], req.speaker_map)

    supabase.table("meetings").update(update_data).eq("id", req.meeting_id).execute()

    # The action_items table was populated with "Speaker N" owners — rename
    # them in place (not delete/recreate) to keep done/assigned state.
    try:
        rows = supabase.table("action_items").select("id, owner, task").eq(
            "meeting_id", req.meeting_id
        ).execute()
        for row in rows.data or []:
            supabase.table("action_items").update({
                "owner": req.speaker_map.get(row["owner"], row["owner"]),
                "task": replace_speakers_in_text(row["task"], req.speaker_map),
            }).eq("id", row["id"]).execute()
    except Exception:
        print(f"[{req.meeting_id}] Renaming action item owners failed:")
        traceback.print_exc()

    # Cross-meeting search reads from meeting_chunks, which was indexed with
    # the raw "Speaker N" labels right after transcription — re-index it now
    # so renamed speakers show up in search results too.
    workspace_id = result.data.get("workspace_id")
    if workspace_id:
        try:
            index_meeting_chunks(supabase, req.meeting_id, workspace_id, transcript)
        except Exception:
            print(f"[{req.meeting_id}] Re-indexing chunks after speaker remap failed:")
            traceback.print_exc()

    return {"status": "ok", "meeting_id": req.meeting_id}
