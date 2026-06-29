import httpx
import tempfile
import os
import json
import traceback
from pathlib import Path

from app.config import settings

ANALYSIS_PROMPT = """You are a meeting analyst. Analyze this meeting transcript and extract structured insights.

TRANSCRIPT:
{transcript}

Return a JSON object with exactly these keys:
{{
  "summary": "A concise 2-4 sentence summary of the meeting",
  "action_items": [
    {{"owner": "person name", "task": "what they need to do", "deadline": "when (or null if not mentioned)"}}
  ],
  "decisions": [
    {{"text": "what was decided", "context": "brief context or null"}}
  ],
  "open_questions": ["question that was raised but not resolved"],
  "follow_up_email": "A professional follow-up email summarizing the meeting, action items, and next steps"
}}

Rules:
- For action_items, extract the owner name from the transcript. If unclear, use "Team".
- For deadlines, use the exact phrasing from the meeting (e.g. "Monday", "by EOD", "this week").
- Only include decisions that were actually agreed upon, not suggestions.
- Open questions are things raised but left unresolved.
- The follow-up email should be professional and ready to send.
- Return ONLY valid JSON, no markdown, no explanation."""


async def process_meeting(meeting_id: str, audio_url: str, attendees: list[str]):
    from supabase import create_client

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    try:
        print(f"[{meeting_id}] Starting processing...")
        supabase.table("meetings").update({"status": "processing"}).eq("id", meeting_id).execute()

        print(f"[{meeting_id}] Downloading and transcribing audio...")
        transcript_segments = await transcribe_audio(audio_url)
        print(f"[{meeting_id}] Got {len(transcript_segments)} segments")

        transcript_with_speakers = assign_speakers(transcript_segments, attendees)

        duration = 0
        if transcript_with_speakers:
            duration = int(max(seg["end"] for seg in transcript_with_speakers))

        print(f"[{meeting_id}] Analyzing transcript with AI...")
        analysis = await analyze_transcript(transcript_with_speakers)
        print(f"[{meeting_id}] Analysis complete")

        supabase.table("meetings").update({
            "status": "completed",
            "transcript": transcript_with_speakers,
            "speaker_count": len(set(seg["speaker"] for seg in transcript_with_speakers)),
            "duration_seconds": duration,
            "summary": analysis.get("summary"),
            "action_items": analysis.get("action_items"),
            "decisions": analysis.get("decisions"),
            "open_questions": analysis.get("open_questions"),
            "follow_up_email": analysis.get("follow_up_email"),
        }).eq("id", meeting_id).execute()
        print(f"[{meeting_id}] Completed successfully")

    except Exception as e:
        print(f"[{meeting_id}] Error: {e}")
        traceback.print_exc()
        supabase.table("meetings").update({"status": "failed"}).eq("id", meeting_id).execute()


async def transcribe_audio(audio_url: str) -> list[dict]:
    tmp_path = None
    try:
        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.get(audio_url)
            response.raise_for_status()

        suffix = ".mp3"
        if ".wav" in audio_url:
            suffix = ".wav"
        elif ".m4a" in audio_url:
            suffix = ".m4a"
        elif ".mp4" in audio_url:
            suffix = ".mp4"
        elif ".ogg" in audio_url:
            suffix = ".ogg"
        elif ".webm" in audio_url:
            suffix = ".webm"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        async with httpx.AsyncClient(timeout=300) as client:
            with open(tmp_path, "rb") as audio_file:
                deepgram_response = await client.post(
                    "https://api.deepgram.com/v1/listen",
                    headers={
                        "Authorization": f"Token {settings.deepgram_api_key}",
                        "Content-Type": f"audio/{suffix.lstrip('.')}",
                    },
                    params={
                        "model": "nova-3",
                        "smart_format": "true",
                        "diarize": "true",
                        "punctuate": "true",
                        "utterances": "true",
                        "detect_language": "true",
                    },
                    content=audio_file.read(),
                )
                deepgram_response.raise_for_status()

        result = deepgram_response.json()

        segments = []
        utterances = result.get("results", {}).get("utterances", [])

        for utt in utterances:
            segments.append({
                "speaker": utt.get("speaker", 0),
                "text": utt.get("transcript", "").strip(),
                "start": utt.get("start", 0),
                "end": utt.get("end", 0),
            })

        if not segments:
            alt = result.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])[0]
            if alt.get("transcript"):
                segments.append({
                    "speaker": 0,
                    "text": alt["transcript"].strip(),
                    "start": 0,
                    "end": 0,
                })

        return segments

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


async def analyze_transcript(segments: list[dict]) -> dict:
    transcript_text = "\n".join(
        f"{seg['speaker']}: {seg['text']}" for seg in segments
    )

    prompt = ANALYSIS_PROMPT.format(transcript=transcript_text)

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,
                "response_format": {"type": "json_object"},
            },
        )
        response.raise_for_status()

    result = response.json()
    content = result["choices"][0]["message"]["content"]

    return json.loads(content)


def assign_speakers(segments: list[dict], attendees: list[str]) -> list[dict]:
    for seg in segments:
        speaker_id = seg["speaker"]
        seg["speaker"] = f"Speaker {speaker_id + 1}"

    return segments
