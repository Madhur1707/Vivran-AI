function apiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export async function processMeeting(params: {
  meetingId: string;
  workspaceId: string;
  audioUrl: string;
  attendees: string[];
  language: string;
}): Promise<void> {
  const res = await fetch(`${apiUrl()}/api/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      meeting_id: params.meetingId,
      workspace_id: params.workspaceId,
      audio_url: params.audioUrl,
      attendees: params.attendees,
      language: params.language,
    }),
  });
  if (!res.ok) throw new Error("Failed to start processing");
}

export async function remapSpeakers(params: {
  meetingId: string;
  speakerMap: Record<string, string>;
}): Promise<void> {
  const res = await fetch(`${apiUrl()}/api/remap-speakers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      meeting_id: params.meetingId,
      speaker_map: params.speakerMap,
    }),
  });
  if (!res.ok) throw new Error("Failed to save");
}
