"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/phone";
import { toast } from "sonner";
import {
  Upload,
  FileAudio,
  X,
  Plus,
  Loader2,
  ArrowRight,
  Users,
  Mic,
  Globe,
  Mail,
  Phone,
} from "lucide-react";

const BG = { fontFamily: "'Bricolage Grotesque', sans-serif" };
const MONO = { fontFamily: "'JetBrains Mono', monospace" };

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-m4a",
  "audio/ogg",
  "audio/webm",
  "video/mp4",
  "video/webm",
];
const MAX_FILE_SIZE = 500 * 1024 * 1024;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "multi", label: "Auto-detect" },
];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [attendees, setAttendees] = useState<
    { name: string; email: string; phone: string }[]
  >([]);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [language, setLanguage] = useState("en");

  function validateFile(f: File): boolean {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error(
        "Unsupported file format. Use MP3, MP4, WAV, M4A, OGG, or WEBM."
      );
      return false;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 500MB.");
      return false;
    }
    return true;
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && validateFile(droppedFile)) {
        setFile(droppedFile);
        if (!title) {
          setTitle(droppedFile.name.replace(/\.[^.]+$/, ""));
        }
      }
    },
    [title]
  );

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected && validateFile(selected)) {
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^.]+$/, ""));
      }
    }
  }

  function addAttendee() {
    if (!draftName.trim()) return;
    setAttendees([
      ...attendees,
      {
        name: draftName.trim(),
        email: draftEmail.trim(),
        phone: draftPhone.trim() ? normalizePhone(draftPhone) : "",
      },
    ]);
    setDraftName("");
    setDraftEmail("");
    setDraftPhone("");
  }

  function removeAttendee(index: number) {
    setAttendees(attendees.filter((_, i) => i !== index));
  }

  function handleDraftKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addAttendee();
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      toast.error("Please select an audio file.");
      return;
    }

    // Include a pending draft name the user typed but didn't click "Add" for
    const finalAttendees = draftName.trim()
      ? [
        ...attendees,
        {
          name: draftName.trim(),
          email: draftEmail.trim(),
          phone: draftPhone.trim() ? normalizePhone(draftPhone) : "",
        },
      ]
      : attendees;

    if (finalAttendees.length === 0) {
      toast.error("Please add at least one attendee name.");
      return;
    }

    const attendeeNames = finalAttendees.map((a) => a.name);
    const attendeeEmails: Record<string, string> = {};
    const attendeePhones: Record<string, string> = {};
    for (const a of finalAttendees) {
      if (a.email) {
        attendeeEmails[a.name] = a.email;
      }
      if (a.phone) {
        attendeePhones[a.name] = a.phone;
      }
    }

    setUploading(true);
    setProgress(10);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in again.");
        return;
      }

      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .single();

      if (!membership) {
        toast.error("Could not find your workspace. Please re-login.");
        setUploading(false);
        return;
      }

      setProgress(20);

      const timestamp = Date.now();
      const filePath = `meetings/${user.id}/${timestamp}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("meeting-audio")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress(60);

      const { data: urlData } = supabase.storage
        .from("meeting-audio")
        .getPublicUrl(filePath);

      const { data: meeting, error: insertError } = await supabase
        .from("meetings")
        .insert({
          user_id: user.id,
          workspace_id: membership.workspace_id,
          title: title || file.name,
          status: "queued",
          audio_url: urlData.publicUrl,
          audio_path: filePath,
          attendees: attendeeNames,
          attendee_emails: attendeeEmails,
          attendee_phones: attendeePhones,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(`Failed to save meeting: ${insertError.message}`);
      }

      setProgress(80);

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      try {
        await fetch(`${apiUrl}/api/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meeting_id: meeting.id,
            audio_url: urlData.publicUrl,
            attendees: attendeeNames,
            language,
          }),
        });
      } catch {
        // Backend may not be running yet
      }

      setProgress(100);
      toast.success("Meeting uploaded! Processing will begin shortly.");
      router.push(`/dashboard/meetings/${meeting.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const filledAttendees = draftName.trim()
    ? [
      ...attendees,
      {
        name: draftName.trim(),
        email: draftEmail.trim(),
        phone: draftPhone.trim() ? normalizePhone(draftPhone) : "",
      },
    ]
    : attendees;
  const isReady = !!file && !!title.trim() && filledAttendees.length > 0;
  const languageLabel =
    LANGUAGES.find((l) => l.code === language)?.label ?? "English";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold tracking-tight" style={BG}>
          Upload a recording
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Drop your meeting audio and add attendee names
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* TOP — Full-width file upload */}
        {file ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(52,211,153,0.1)" }}
            >
              <FileAudio className="h-4 w-4" style={{ color: "#34d399" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={BG}>
                {file.name}
              </p>
              <p className="text-[11px] text-muted-foreground" style={MONO}>
                {formatFileSize(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer"
            >
              Change file
            </button>
          </div>
        ) : (
          <label
            className="block cursor-pointer"
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
          >
            <div
              className="flex flex-col items-center justify-center text-center gap-2 rounded-xl border-2 border-dashed px-5 py-6 transition-all"
              style={{
                borderColor: dragActive
                  ? "rgba(255,255,255,0.5)"
                  : "rgba(255,255,255,0.15)",
                background: dragActive
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.02)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <Upload className="h-4.5 w-4.5" style={{ color: "#d4d4d8" }} />
              </div>
              <p className="text-[13px] font-semibold" style={BG}>
                {dragActive
                  ? "Drop your file here"
                  : "Drag & drop audio file, or click to browse"}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {["MP3", "MP4", "WAV", "M4A", "OGG", "WEBM"].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-1.5 py-0.5 rounded text-[8px] font-medium"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      color: "#d4d4d8",
                      ...MONO,
                    }}
                  >
                    {fmt}
                  </span>
                ))}
                <span
                  className="text-[9px] text-muted-foreground/40 ml-1"
                  style={MONO}
                >
                  Max 500MB
                </span>
              </div>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".mp3,.mp4,.wav,.m4a,.ogg,.webm"
              onChange={onFileSelect}
            />
          </label>
        )}

        {/* BELOW — Two columns: form (left) + live preview (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT — Form */}
          <div className="rounded-xl border border-border bg-card flex flex-col">
            {/* Title */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 mb-1.5">
                <Mic className="h-3 w-3 shrink-0 text-muted-foreground" />
                <p className="text-[11px] font-semibold" style={BG}>
                  Meeting title
                </p>
              </div>
              <input
                placeholder="e.g. Sprint Planning — June 27"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent rounded-lg border border-border px-3 py-1.5 text-[12px] outline-none placeholder:text-muted-foreground/40 focus:border-[rgba(255,255,255,0.4)] transition-colors"
              />
            </div>

            {/* Language */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 mb-1.5">
                <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
                <p className="text-[11px] font-semibold" style={BG}>
                  Language
                </p>
              </div>
              <div className="flex gap-1.5">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer"
                    style={{
                      background:
                        language === lang.code
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(255,255,255,0.04)",
                      color: language === lang.code ? "#e4e4e7" : "#9999a8",
                      border: `1px solid ${language === lang.code ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Attendees */}
            <div className="px-4 py-3 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                <p className="text-[11px] font-semibold" style={BG}>
                  Attendees
                </p>
              </div>

              {/* Quick-add row */}
              <div className="flex gap-1.5 mb-1.5">
                <input
                  placeholder="Attendee name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  className="flex-1 bg-transparent rounded-lg border border-border px-2.5 py-1.5 text-[12px] outline-none placeholder:text-muted-foreground/40 focus:border-[rgba(255,255,255,0.4)] transition-colors min-w-0"
                />
                <button
                  type="button"
                  onClick={addAttendee}
                  disabled={!draftName.trim()}
                  className="w-8 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "#e4e4e7",
                  }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-1.5 mb-2.5">
                <div className="flex-1 flex items-center gap-1 rounded-lg border border-border px-2 focus-within:border-[rgba(255,255,255,0.4)] transition-colors min-w-0">
                  <Mail className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    onKeyDown={handleDraftKeyDown}
                    className="flex-1 bg-transparent py-1.5 text-[12px] outline-none placeholder:text-muted-foreground/40 min-w-0"
                  />
                </div>
                <div className="flex-1 flex items-center gap-1 rounded-lg border border-border px-2 focus-within:border-[rgba(255,255,255,0.4)] transition-colors min-w-0">
                  <Phone className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                  <input
                    type="tel"
                    placeholder="WhatsApp number (optional)"
                    value={draftPhone}
                    onChange={(e) => setDraftPhone(e.target.value)}
                    onKeyDown={handleDraftKeyDown}
                    className="flex-1 bg-transparent py-1.5 text-[12px] outline-none placeholder:text-muted-foreground/40 min-w-0"
                  />
                </div>
              </div>

              {/* Chips — wrap horizontally instead of growing the page */}
              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-35 overflow-y-auto pr-1">
                  {attendees.map((attendee, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px]"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#e4e4e7",
                      }}
                    >
                      {attendee.name}
                      {attendee.email && (
                        <Mail className="h-2.5 w-2.5 text-muted-foreground/50" />
                      )}
                      {attendee.phone && (
                        <Phone className="h-2.5 w-2.5 text-muted-foreground/50" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttendee(i)}
                        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <X className="h-2.5 w-2.5 text-muted-foreground" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Meeting summary */}
          <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden">
            <div
              className="px-4 py-3 border-b border-border flex items-center justify-between"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ color: "#9999a8", ...MONO }}
              >
                Meeting summary
              </p>
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{
                  background: isReady
                    ? "rgba(52,211,153,0.12)"
                    : "rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: isReady ? "#34d399" : "#71717a" }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{
                    color: isReady ? "#34d399" : "#9999a8",
                    ...MONO,
                  }}
                >
                  {isReady ? "Ready" : "Incomplete"}
                </span>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-border">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1"
                style={{ color: "#71717a", ...MONO }}
              >
                Recording
              </p>
              {file ? (
                <div className="flex items-center gap-2">
                  <FileAudio className="h-3.5 w-3.5 shrink-0" style={{ color: "#34d399" }} />
                  <span className="text-[13px] font-medium truncate">
                    {file.name}
                  </span>
                  <span
                    className="text-[10px] text-muted-foreground shrink-0"
                    style={MONO}
                  >
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ) : (
                <span className="text-[12px] text-muted-foreground/50 italic">
                  Not selected yet
                </span>
              )}
            </div>

            <div className="px-4 py-3 border-b border-border">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1"
                style={{ color: "#71717a", ...MONO }}
              >
                Title
              </p>
              {title.trim() ? (
                <span className="text-[13px] font-medium">{title}</span>
              ) : (
                <span className="text-[12px] text-muted-foreground/50 italic">
                  No title yet
                </span>
              )}
            </div>

            <div className="px-4 py-3 border-b border-border">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1"
                style={{ color: "#71717a", ...MONO }}
              >
                Language
              </p>
              <span className="text-[13px] font-medium">{languageLabel}</span>
            </div>

            <div className="px-4 py-3 flex-1">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2"
                style={{ color: "#71717a", ...MONO }}
              >
                Attendees ({filledAttendees.length})
              </p>
              {filledAttendees.length === 0 ? (
                <span className="text-[12px] text-muted-foreground/50 italic">
                  None added yet
                </span>
              ) : (
                <div className="space-y-1.5 max-h-37.5 overflow-y-auto pr-1">
                  {filledAttendees.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          color: "#e4e4e7",
                        }}
                      >
                        {a.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <span className="text-[12px] font-medium truncate shrink-0 max-w-[30%]">
                        {a.name}
                      </span>
                      <div className="flex flex-col min-w-0 flex-1">
                        {a.email ? (
                          <span
                            className="text-[11px] text-muted-foreground truncate"
                            style={MONO}
                          >
                            {a.email}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40 italic">
                            no email — won&apos;t get follow-up
                          </span>
                        )}
                        {a.phone && (
                          <span
                            className="text-[10px] text-muted-foreground/70 truncate"
                            style={MONO}
                          >
                            {a.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {uploading && (
          <div
            className="rounded-xl border p-3.5"
            style={{
              borderColor: "rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold" style={BG}>
                {progress < 60
                  ? "Uploading audio..."
                  : progress < 100
                    ? "Saving meeting..."
                    : "Done!"}
              </p>
              <span
                className="text-[10px] font-medium"
                style={{ color: "#d4d4d8", ...MONO }}
              >
                {progress}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
                }}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: isReady
              ? "linear-gradient(135deg, #e4e4e7, #a1a1aa)"
              : "rgba(255,255,255,0.15)",
            color: isReady ? "#0a0a0a" : "#d4d4d8",
            boxShadow: isReady ? "0 0 20px rgba(255,255,255,0.25)" : "none",
          }}
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Upload and process
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
