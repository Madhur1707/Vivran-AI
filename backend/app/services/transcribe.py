import asyncio
import httpx
import re
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

CHUNK_ANALYSIS_PROMPT = """You are a meeting analyst. Below is PART {part} of {total} of a long meeting transcript. Analyze only this part.

TRANSCRIPT (PART {part} of {total}):
{transcript}

Return a JSON object with exactly these keys:
{{
  "summary": "A concise 2-3 sentence summary of this part of the meeting",
  "action_items": [
    {{"owner": "person name", "task": "what they need to do", "deadline": "when (or null if not mentioned)"}}
  ],
  "decisions": [
    {{"text": "what was decided", "context": "brief context or null"}}
  ],
  "open_questions": ["question that was raised but not resolved in this part"]
}}

Rules:
- For action_items, extract the owner name from the transcript. If unclear, use "Team".
- For deadlines, use the exact phrasing from the meeting (e.g. "Monday", "by EOD", "this week").
- Only include decisions that were actually agreed upon, not suggestions.
- Return ONLY valid JSON, no markdown, no explanation."""

COMBINE_ANALYSIS_PROMPT = """You are a meeting analyst. A long meeting transcript was analyzed in {total} sequential parts. Below are the partial analyses, in meeting order, as a JSON array.

PARTIAL ANALYSES:
{partial_analyses}

Merge them into one final analysis of the entire meeting. Return a JSON object with exactly these keys:
{{
  "summary": "A concise 2-4 sentence summary of the whole meeting",
  "action_items": [
    {{"owner": "person name", "task": "what they need to do", "deadline": "when (or null if not mentioned)"}}
  ],
  "decisions": [
    {{"text": "what was decided", "context": "brief context or null"}}
  ],
  "open_questions": ["question that was raised but never resolved"],
  "follow_up_email": "A professional follow-up email summarizing the meeting, action items, and next steps"
}}

Rules:
- Merge duplicate action items and decisions into one entry.
- Drop open questions that a later part shows were answered.
- The follow-up email should be professional and ready to send.
- Return ONLY valid JSON, no markdown, no explanation."""


async def process_meeting(
    meeting_id: str, workspace_id: str, audio_url: str, attendees: list[str], language: str = "en"
):
    from supabase import create_client

    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    def set_stage(stage: str):
        print(f"[{meeting_id}] {stage}")
        try:
            supabase.table("meetings").update({"processing_stage": stage}).eq("id", meeting_id).execute()
        except Exception:
            traceback.print_exc()

    try:
        print(f"[{meeting_id}] Starting processing...")
        supabase.table("meetings").update({
            "status": "processing",
            "processing_stage": "Preparing",
            "error_detail": None,
        }).eq("id", meeting_id).execute()

        # A failed run may have already saved a transcript — reuse it so a
        # retry doesn't pay Deepgram again for the same audio.
        existing = supabase.table("meetings").select("transcript").eq("id", meeting_id).single().execute()
        transcript_with_speakers = (existing.data or {}).get("transcript")

        if transcript_with_speakers:
            print(f"[{meeting_id}] Reusing saved transcript ({len(transcript_with_speakers)} segments)")
        else:
            set_stage("Transcribing audio")
            transcript_segments = await transcribe_audio(audio_url, language)
            print(f"[{meeting_id}] Got {len(transcript_segments)} segments")
            transcript_with_speakers = assign_speakers(transcript_segments, attendees)

        duration = 0
        if transcript_with_speakers:
            duration = int(max(seg["end"] for seg in transcript_with_speakers))

        # Persist the transcript before analysis — Deepgram work is already
        # paid for, so a failure below must not throw it away.
        supabase.table("meetings").update({
            "transcript": transcript_with_speakers,
            "speaker_count": len(set(seg["speaker"] for seg in transcript_with_speakers)),
            "duration_seconds": duration,
        }).eq("id", meeting_id).execute()

        set_stage("Analyzing transcript")
        analysis = await analyze_transcript(transcript_with_speakers, on_stage=set_stage)
        print(f"[{meeting_id}] Analysis complete")

        supabase.table("meetings").update({
            "status": "completed",
            "processing_stage": None,
            "summary": analysis.get("summary"),
            "action_items": analysis.get("action_items"),
            "decisions": analysis.get("decisions"),
            "open_questions": analysis.get("open_questions"),
            "follow_up_email": analysis.get("follow_up_email"),
        }).eq("id", meeting_id).execute()

        try:
            sync_action_items(supabase, meeting_id, workspace_id, analysis.get("action_items"))
        except Exception:
            print(f"[{meeting_id}] Action item sync failed (meeting itself still completed):")
            traceback.print_exc()

        try:
            print(f"[{meeting_id}] Indexing transcript for cross-meeting search...")
            index_meeting_chunks(supabase, meeting_id, workspace_id, transcript_with_speakers)
        except Exception:
            print(f"[{meeting_id}] Chunk indexing failed (meeting itself still completed):")
            traceback.print_exc()

        print(f"[{meeting_id}] Completed successfully")

    except Exception as e:
        print(f"[{meeting_id}] Error: {e}")
        traceback.print_exc()
        detail = str(e)
        # For API errors the response body has the actionable part
        # (e.g. Groq's "tokens per minute" message), not the status line.
        if isinstance(e, httpx.HTTPStatusError):
            detail = f"{e} — {e.response.text[:300]}"
        supabase.table("meetings").update({
            "status": "failed",
            "processing_stage": None,
            "error_detail": detail[:500],
        }).eq("id", meeting_id).execute()


async def transcribe_audio(audio_url: str, language: str = "en") -> list[dict]:
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
                        **({"detect_language": "true"} if language == "multi" else {"language": language}),
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


# Groq free tier allows 12k tokens/minute per model, and that budget covers
# the prompt AND the completion. Estimates are deliberately conservative
# (~1 token per 3 chars) so a miscount stays under the limit, not over it.
SINGLE_CALL_TOKEN_BUDGET = 7000
MAP_TOKEN_BUDGET = 5000


def estimate_tokens(text: str) -> int:
    return len(text) // 3


def segments_to_text(segments: list[dict]) -> str:
    return "\n".join(f"{seg['speaker']}: {seg['text']}" for seg in segments)


def _rate_limit_wait_seconds(response: httpx.Response) -> float:
    retry_after = response.headers.get("retry-after")
    if retry_after:
        try:
            return float(retry_after) + 1
        except ValueError:
            pass
    # Groq puts the wait time in the error message: "try again in 7.66s"
    match = re.search(r"try again in ([\d.]+)s", response.text)
    if match:
        return float(match.group(1)) + 1
    return 30


async def _groq_chat(prompt: str, max_retries: int = 5, on_stage=None) -> dict:
    async with httpx.AsyncClient(timeout=120) as client:
        for attempt in range(max_retries):
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
            if response.status_code == 429 and attempt < max_retries - 1:
                wait = _rate_limit_wait_seconds(response)
                if on_stage:
                    on_stage(f"Rate limited — resuming in {wait:.0f}s")
                else:
                    print(f"Groq rate limited, retrying in {wait:.0f}s...")
                await asyncio.sleep(wait)
                continue
            response.raise_for_status()
            result = response.json()
            return json.loads(result["choices"][0]["message"]["content"])


def split_segments_for_analysis(segments: list[dict]) -> list[list[dict]]:
    parts: list[list[dict]] = []
    current: list[dict] = []
    tokens = 0

    for seg in segments:
        line_tokens = estimate_tokens(f"{seg['speaker']}: {seg['text']}\n")
        if current and tokens + line_tokens > MAP_TOKEN_BUDGET:
            parts.append(current)
            current = []
            tokens = 0
        current.append(seg)
        tokens += line_tokens

    if current:
        parts.append(current)
    return parts


async def analyze_transcript(segments: list[dict], on_stage=None) -> dict:
    transcript_text = segments_to_text(segments)

    if estimate_tokens(transcript_text) <= SINGLE_CALL_TOKEN_BUDGET:
        return await _groq_chat(
            ANALYSIS_PROMPT.format(transcript=transcript_text), on_stage=on_stage
        )

    # Map-reduce for transcripts too long for one request: analyze each part
    # separately, then merge the partial results in a final small call.
    parts = split_segments_for_analysis(segments)
    partial_results = []
    for i, part in enumerate(parts):
        if on_stage:
            on_stage(f"Analyzing part {i + 1} of {len(parts)}")
        partial_results.append(await _groq_chat(
            CHUNK_ANALYSIS_PROMPT.format(
                part=i + 1, total=len(parts), transcript=segments_to_text(part)
            ),
            on_stage=on_stage,
        ))

    if on_stage:
        on_stage("Writing summary")
    return await _groq_chat(
        COMBINE_ANALYSIS_PROMPT.format(
            total=len(parts),
            partial_analyses=json.dumps(partial_results, indent=2),
        ),
        on_stage=on_stage,
    )


def assign_speakers(segments: list[dict], attendees: list[str]) -> list[dict]:
    for seg in segments:
        speaker_id = seg["speaker"]
        seg["speaker"] = f"Speaker {speaker_id + 1}"

    return segments


CHUNK_WORD_TARGET = 150


def chunk_transcript(segments: list[dict]) -> list[dict]:
    """Group consecutive utterances into ~150-word chunks for full-text search."""
    chunks = []
    current: list[dict] = []
    word_count = 0

    def flush():
        if not current:
            return
        chunks.append({
            "speaker": current[0]["speaker"],
            "start_time": current[0]["start"],
            "end_time": current[-1]["end"],
            "text": "\n".join(f"{seg['speaker']}: {seg['text']}" for seg in current),
        })

    for seg in segments:
        if not seg["text"]:
            continue
        current.append(seg)
        word_count += len(seg["text"].split())
        if word_count >= CHUNK_WORD_TARGET:
            flush()
            current = []
            word_count = 0

    flush()
    return chunks


def sync_action_items(supabase, meeting_id: str, workspace_id: str, action_items) -> None:
    """Mirror the analysis' action items into the action_items table that
    backs the cross-meeting dashboard. Rewrites the meeting's rows, so any
    done/assigned state is reset when a meeting is re-analyzed."""
    supabase.table("action_items").delete().eq("meeting_id", meeting_id).execute()

    if not isinstance(action_items, list):
        return

    rows = [
        {
            "meeting_id": meeting_id,
            "workspace_id": workspace_id,
            "owner": item.get("owner") or "Team",
            "task": item["task"],
            "deadline": item.get("deadline"),
        }
        for item in action_items
        if isinstance(item, dict) and item.get("task")
    ]
    if rows:
        supabase.table("action_items").insert(rows).execute()


def index_meeting_chunks(supabase, meeting_id: str, workspace_id: str, segments: list[dict]) -> None:
    supabase.table("meeting_chunks").delete().eq("meeting_id", meeting_id).execute()

    chunks = chunk_transcript(segments)
    if not chunks:
        return

    rows = [
        {
            "meeting_id": meeting_id,
            "workspace_id": workspace_id,
            "chunk_index": i,
            "speaker": chunk["speaker"],
            "start_time": chunk["start_time"],
            "end_time": chunk["end_time"],
            "text": chunk["text"],
        }
        for i, chunk in enumerate(chunks)
    ]
    supabase.table("meeting_chunks").insert(rows).execute()
