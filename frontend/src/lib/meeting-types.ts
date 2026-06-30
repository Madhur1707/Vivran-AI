export interface TranscriptSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export interface ActionItem {
  owner: string;
  task: string;
  deadline: string | null;
}

export interface Decision {
  text: string;
  context: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  status: string;
  created_at: string;
  duration_seconds: number | null;
  speaker_count: number | null;
  attendees: string[] | null;
  transcript: TranscriptSegment[] | null;
  summary: string | null;
  action_items: ActionItem[] | null;
  decisions: Decision[] | null;
  open_questions: string[] | null;
  follow_up_email: string | null;
  speakers_mapped: boolean | null;
  attendee_emails: Record<string, string> | null;
  email_sent: boolean | null;
  email_sent_to: string[] | null;
}
