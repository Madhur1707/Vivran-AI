"use client";

import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendFollowupEmail } from "@/services/email-service";

function sameRecipients(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((email, i) => email === sortedB[i]);
}

export function SendEmailButton({
  meetingId,
  recipients,
  sentTo,
  onSent,
}: {
  meetingId: string;
  recipients: string[];
  sentTo: string[] | null;
  onSent: (recipients: string[]) => void;
}) {
  const [sending, setSending] = useState(false);

  const alreadySentToCurrent =
    !!sentTo && recipients.length > 0 && sameRecipients(recipients, sentTo);

  async function handleSend() {
    if (recipients.length === 0) return;
    setSending(true);
    try {
      const data = await sendFollowupEmail({ meetingId, recipients });
      onSent(data.recipients ?? recipients);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  if (recipients.length === 0) {
    return (
      <span
        className="text-[11px] text-muted-foreground"
        title="Add attendee emails to enable this"
      >
        No attendee emails on file
      </span>
    );
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={handleSend}
      disabled={sending}
      className="h-auto gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium hover:opacity-80"
      style={{
        background: alreadySentToCurrent
          ? "rgba(52,211,153,0.15)"
          : "rgba(255,255,255,0.1)",
        color: alreadySentToCurrent ? "#34d399" : "#d4d4d8",
      }}
    >
      {sending ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Sending...
        </>
      ) : alreadySentToCurrent ? (
        <>
          <Check className="h-3 w-3" />
          Sent to {recipients.length} — Resend
        </>
      ) : (
        <>
          <Mail className="h-3 w-3" />
          Send to {recipients.length} attendee{recipients.length > 1 ? "s" : ""}
        </>
      )}
    </Button>
  );
}
