"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Meeting } from "@/lib/meeting-types";
import { MONO } from "@/lib/meeting-utils";
import { CopyButton } from "@/components/meeting/copy-button";
import { SendEmailButton } from "@/components/meeting/send-email-button";
import { updateAttendeeEmails, updateFollowupText } from "@/services/email-service";

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
      const data = await updateAttendeeEmails({
        meetingId: meeting.id,
        attendeeEmails: emailDraft,
      });
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
      await updateFollowupText({
        meetingId: meeting.id,
        followUpEmail: textDraft,
      });
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
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setEmailDraft(meeting.attendee_emails ?? {});
                setEditingEmails(true);
              }}
              className="h-auto gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.1)", color: "#d4d4d8" }}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setEditingEmails(false)}
                className="h-auto rounded-lg px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleSaveEmails}
                disabled={savingEmails}
                className="h-auto gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium hover:opacity-80"
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
              </Button>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={!hasEmail}
                      onClick={() => toggleSelected(name)}
                      className="h-5 w-5 rounded-md hover:bg-transparent disabled:opacity-30"
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
                    </Button>
                  )}
                  <span className="text-[13px] font-medium w-28 shrink-0 truncate">
                    {name}
                  </span>
                  {editingEmails ? (
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={emailDraft[name] ?? ""}
                      onChange={(e) =>
                        setEmailDraft((prev) => ({
                          ...prev,
                          [name]: e.target.value,
                        }))
                      }
                      className="h-auto flex-1 px-3 py-1.5 text-[13px] placeholder:text-muted-foreground/40"
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
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setTextDraft(meeting.follow_up_email ?? "");
                    setEditingText(true);
                  }}
                  className="h-auto gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium hover:opacity-80"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "#d4d4d8",
                  }}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
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
              <Textarea
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                rows={10}
                className="w-full resize-y rounded-xl p-5 text-[13px] leading-relaxed"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setEditingText(false)}
                  className="h-auto rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleSaveText}
                  disabled={savingText}
                  className="h-auto gap-1.5 rounded-lg px-4 py-1.5 text-[12px] font-medium hover:opacity-80"
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
                </Button>
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
