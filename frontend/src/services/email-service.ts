import { apiPostJson } from "./api-client";

async function postJson<T>(
  path: string,
  body: unknown,
  fallbackError: string
): Promise<T> {
  const res = await apiPostJson(path, body);
  if (!res.ok) throw new Error(fallbackError);
  return (await res.json()) as T;
}

export function updateAttendeeEmails(params: {
  meetingId: string;
  attendeeEmails: Record<string, string>;
}) {
  return postJson<{ status: string; attendee_emails: Record<string, string> }>(
    "/api/update-attendee-emails",
    { meeting_id: params.meetingId, attendee_emails: params.attendeeEmails },
    "Failed to save"
  );
}

export function updateFollowupText(params: {
  meetingId: string;
  followUpEmail: string;
}) {
  return postJson<{ status: string }>(
    "/api/update-followup-text",
    { meeting_id: params.meetingId, follow_up_email: params.followUpEmail },
    "Failed to save"
  );
}

export function sendFollowupEmail(params: {
  meetingId: string;
  recipients: string[];
}) {
  return postJson<{ status: string; recipients: string[] }>(
    "/api/send-followup",
    { meeting_id: params.meetingId, recipients: params.recipients },
    "Failed to send"
  );
}
