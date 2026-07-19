import { apiPostJson } from "./api-client";

/**
 * The API reads workspace, audio URL and attendees off the meeting row itself
 * — they're written at insert time — so only the id is sent here.
 */
export async function processMeeting(params: {
  meetingId: string;
  language: string;
}): Promise<void> {
  const res = await apiPostJson("/api/process", {
    meeting_id: params.meetingId,
    language: params.language,
  });
  if (!res.ok) throw new Error("Failed to start processing");
}

export async function remapSpeakers(params: {
  meetingId: string;
  speakerMap: Record<string, string>;
}): Promise<void> {
  const res = await apiPostJson("/api/remap-speakers", {
    meeting_id: params.meetingId,
    speaker_map: params.speakerMap,
  });
  if (!res.ok) throw new Error("Failed to save");
}

/** Irreversible: removes the audio, transcript, action items and search index. */
export async function deleteMeeting(meetingId: string): Promise<void> {
  const res = await apiPostJson("/api/meetings/delete", {
    meeting_id: meetingId,
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((d) => d?.detail)
      .catch(() => null);
    throw new Error(typeof detail === "string" ? detail : "Failed to delete meeting");
  }
}
