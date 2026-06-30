"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Pencil, Save } from "lucide-react";
import type { Meeting } from "@/lib/meeting-types";
import { MONO } from "@/lib/meeting-utils";
import { CopyButton } from "@/components/meeting/copy-button";
import { SendEmailButton } from "@/components/meeting/send-email-button";

export function FollowUpEmailPanel({
  meeting,
  onUpdate,
}: {
  meeting: Meeting;
  onUpdate: (patch: Partial<Meeting>) => void;
}) {
  const attendeeNames = meeting.attendees ?? [];
  const [emailDraft, setEmailDraft] = useState<Record<string, string>>(
    meeting.attendee_emails ?? {}
  );
  const [editingEmails, setEditingEmails] = useState(false);
  const [savingEmails, setSavingEmails] = useState(false);

  const [editingText, setEditingText] = useState(false);
  const [textDraft, setTextDraft] = useState(meeting.follow_up_email ?? "");
  const [savingText, setSavingText] = useState(false);

  const namesWithEmail = attendeeNames.filter(
    (name) => meeting.attendee_emails?.[name]
  );
  const [selectedNames, setSelectedNames] = useState<Set<string>>(
    new Set(namesWithEmail)
  );

  // Keep selection in sync when attendee emails are added/removed
  useEffect(() => {
    setSelectedNames(new Set(namesWithEmail));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(meeting.attendee_emails)]);

  function toggleSelected(name: string) {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleSaveEmails() {
    setSavingEmails(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/update-attendee-emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: meeting.id,
          attendee_emails: emailDraft,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      onUpdate({ attendee_emails: data.attendee_emails });
      setEmailDraft(data.attendee_emails);
      setEditingEmails(false);
    } catch {
      // silent
    } finally {
      setSavingEmails(false);
    }
  }

  async function handleSaveText() {
    setSavingText(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/update-followup-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: meeting.id,
          follow_up_email: textDraft,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onUpdate({ follow_up_email: textDraft });
      setEditingText(false);
    } catch {
      // silent
    } finally {
      setSavingText(false);
    }
  }

  const selectedRecipients = namesWithEmail
    .filter((name) => selectedNames.has(name))
    .map((name) => meeting.attendee_emails![name]);

  return (
    <div className="space-y-4">
      {/* Attendee emails */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ color: "#d4d4d8", ...MONO }}
          >
            Recipient emails
          </p>
          {!editingEmails ? (
            <button
              onClick={() => {
                setEmailDraft(meeting.attendee_emails ?? {});
                setEditingEmails(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.1)", color: "#d4d4d8" }}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingEmails(false)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmails}
                disabled={savingEmails}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
                style={{
                  background: "rgba(52,211,153,0.15)",
                  color: "#34d399",
                }}
              >
                {savingEmails ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </button>
            </div>
          )}
        </div>
        <div className="p-4 space-y-2">
          {attendeeNames.length === 0 ? (
            <p className="text-[12px] text-muted-foreground py-2">
              No attendees on this meeting.
            </p>
          ) : (
            attendeeNames.map((name) => {
              const hasEmail = !!meeting.attendee_emails?.[name];
              const isSelected = selectedNames.has(name);
              return (
                <div key={name} className="flex items-center gap-3">
                  {!editingEmails && (
                    <button
                      type="button"
                      disabled={!hasEmail}
                      onClick={() => toggleSelected(name)}
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background:
                          isSelected && hasEmail
                            ? "rgba(255,255,255,0.2)"
                            : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isSelected && hasEmail ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                      }}
                      title={
                        hasEmail
                          ? isSelected
                            ? "Click to exclude from send"
                            : "Click to include in send"
                          : "Add an email to select this person"
                      }
                    >
                      {isSelected && hasEmail && (
                        <Check
                          className="h-3 w-3"
                          style={{ color: "#d4d4d8" }}
                        />
                      )}
                    </button>
                  )}
                  <span className="text-[13px] font-medium w-28 shrink-0 truncate">
                    {name}
                  </span>
                  {editingEmails ? (
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={emailDraft[name] ?? ""}
                      onChange={(e) =>
                        setEmailDraft((prev) => ({
                          ...prev,
                          [name]: e.target.value,
                        }))
                      }
                      className="flex-1 bg-transparent rounded-lg border border-border px-3 py-1.5 text-[13px] outline-none placeholder:text-muted-foreground/40 focus:border-[rgba(255,255,255,0.4)] transition-colors"
                    />
                  ) : (
                    <span className="text-[13px] text-muted-foreground">
                      {meeting.attendee_emails?.[name] || (
                        <span className="text-muted-foreground/40 italic">
                          no email
                        </span>
                      )}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Email draft */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{ color: "#d4d4d8", ...MONO }}
            >
              Follow-up Email Draft
            </p>
            <div className="flex items-center gap-2">
              {!editingText && (
                <button
                  onClick={() => {
                    setTextDraft(meeting.follow_up_email ?? "");
                    setEditingText(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "#d4d4d8",
                  }}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
              <SendEmailButton
                meetingId={meeting.id}
                recipients={selectedRecipients}
                sentTo={meeting.email_sent_to}
                onSent={(sentRecipients) =>
                  onUpdate({ email_sent: true, email_sent_to: sentRecipients })
                }
              />
              <CopyButton text={meeting.follow_up_email!} />
            </div>
          </div>

          {editingText ? (
            <div className="space-y-3">
              <textarea
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                rows={10}
                className="w-full rounded-xl p-5 text-[13px] leading-relaxed outline-none resize-y"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditingText(false)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveText}
                  disabled={savingText}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
                  style={{
                    background: "rgba(52,211,153,0.15)",
                    color: "#34d399",
                  }}
                >
                  {savingText ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  Save changes
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl p-5"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="whitespace-pre-wrap text-[13px] text-muted-foreground leading-relaxed">
                {meeting.follow_up_email}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
