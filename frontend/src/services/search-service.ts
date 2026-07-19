import { apiFetch, apiPostJson } from "./api-client";

export interface SearchSource {
  speaker: string;
  text: string;
  timestamp: number;
  meeting_title?: string;
  meeting_id?: string;
}

export interface SearchResult {
  answer: string;
  sources: SearchSource[];
}

export interface VoiceSearchResult extends SearchResult {
  query_text: string;
  audio_base64?: string;
}

async function throwDetailedError(res: Response): Promise<never> {
  const detail = await res
    .json()
    .then((d) => d?.detail)
    .catch(() => null);
  throw new Error(typeof detail === "string" ? detail : "");
}

export async function searchMeeting(params: {
  meetingId: string;
  query: string;
}): Promise<SearchResult> {
  const res = await apiPostJson("/api/search", {
    meeting_id: params.meetingId,
    query: params.query,
  });
  if (!res.ok) await throwDetailedError(res);
  return res.json();
}

export async function searchAllMeetings(params: {
  workspaceId: string;
  query: string;
}): Promise<SearchResult> {
  const res = await apiPostJson("/api/search-all", {
    workspace_id: params.workspaceId,
    query: params.query,
  });
  if (!res.ok) await throwDetailedError(res);
  return res.json();
}

export async function voiceSearch(params: {
  audioBlob: Blob;
  meetingId?: string;
  workspaceId?: string;
}): Promise<VoiceSearchResult> {
  const formData = new FormData();
  formData.append("audio", params.audioBlob, "query.webm");
  if (params.meetingId) {
    formData.append("meeting_id", params.meetingId);
  } else if (params.workspaceId) {
    formData.append("workspace_id", params.workspaceId);
  }

  const res = await apiFetch("/api/voice-search", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) await throwDetailedError(res);
  return res.json();
}
