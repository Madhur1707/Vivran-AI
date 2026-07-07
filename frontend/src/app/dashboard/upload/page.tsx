"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/phone";
import { compressAudio } from "@/lib/audio-compress";
import { processMeeting } from "@/services/meeting-service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        "Unsupported file format. Use MP3, MP4, WAV, M4A, OGG, or WEBM.",
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
    [title],
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
    setProgress(2);

    try {
      let uploadFile = file;
      try {
        uploadFile = await compressAudio(file, (ratio) => {
          setProgress(2 + Math.round(ratio * 28));
        });
      } catch (err) {
        console.error(
          "Client-side compression failed, uploading original file:",
          err,
        );
      }

      setProgress(30);

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

      const timestamp = Date.now();
      const filePath = `meetings/${user.id}/${timestamp}-${uploadFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("meeting-audio")
        .upload(filePath, uploadFile);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress(70);

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

      try {
        await processMeeting({
          meetingId: meeting.id,
          workspaceId: membership.workspace_id,
          audioUrl: urlData.publicUrl,
          attendees: attendeeNames,
          language,
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
          <Card className="flex-row items-center gap-3 px-4 py-3 border border-border ring-0">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFile(null)}
              className="text-[11px] shrink-0 cursor-pointer"
            >
              Change file
            </Button>
          </Card>
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
              className={`flex flex-col items-center justify-center text-center gap-2 rounded-xl border-2 border-dashed px-5 py-6 transition-all ${
                dragActive
                  ? "border-foreground/50 bg-foreground/6"
                  : "border-foreground/15 bg-foreground/2"
              }`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-foreground/10">
                <Upload className="h-4.5 w-4.5 text-foreground/70" />
              </div>
              <p className="text-[13px] font-semibold" style={BG}>
                {dragActive
                  ? "Drop your file here"
                  : "Drag & drop audio file, or click to browse"}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {["MP3", "MP4", "WAV", "M4A", "OGG", "WEBM"].map((fmt) => (
                  <Badge
                    key={fmt}
                    variant="secondary"
                    className="h-auto px-1.5 py-0.5 text-[8px] font-medium rounded"
                    style={MONO}
                  >
                    {fmt}
                  </Badge>
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
          <Card className="gap-0 py-0 border border-border ring-0">
            {/* Title */}
            <CardContent className="px-4 py-3 border-b border-border">
              <Label
                htmlFor="meeting-title"
                className="mb-1.5 text-[11px] font-semibold"
                style={BG}
              >
                <Mic className="h-3 w-3 shrink-0 text-muted-foreground" />
                Meeting title
              </Label>
              <Input
                id="meeting-title"
                placeholder="e.g. Sprint Planning — June 27"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-[12px]"
              />
            </CardContent>

            {/* Language */}
            <CardContent className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 mb-1.5">
                <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
                <p className="text-[11px] font-semibold" style={BG}>
                  Language
                </p>
              </div>
              <div className="flex gap-1.5">
                {LANGUAGES.map((lang) => (
                  <Button
                    key={lang.code}
                    type="button"
                    size="sm"
                    variant={language === lang.code ? "secondary" : "outline"}
                    onClick={() => setLanguage(lang.code)}
                    className="text-[11px] font-medium rounded-md cursor-pointer"
                  >
                    {lang.label}
                  </Button>
                ))}
              </div>
            </CardContent>

            {/* Attendees */}
            <CardContent className="px-4 py-3 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                <p className="text-[11px] font-semibold" style={BG}>
                  Attendees
                </p>
              </div>

              {/* Quick-add row */}
              <div className="flex gap-1.5 mb-1.5">
                <Input
                  placeholder="Attendee name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  className="flex-1 text-[12px] min-w-0"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={addAttendee}
                  disabled={!draftName.trim()}
                  className="shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-1.5 mb-2.5">
                <div className="flex-1 flex items-center gap-1 rounded-lg border border-border px-2 focus-within:border-ring transition-colors min-w-0">
                  <Mail className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                  <Input
                    type="email"
                    placeholder="Email (optional)"
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    onKeyDown={handleDraftKeyDown}
                    className="flex-1 min-w-0 border-0 rounded-none bg-transparent dark:bg-transparent shadow-none h-auto py-1.5 text-[12px] focus-visible:ring-0"
                  />
                </div>
                <div className="flex-1 flex items-center gap-1 rounded-lg border border-border px-2 focus-within:border-ring transition-colors min-w-0">
                  <Phone className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                  <Input
                    type="tel"
                    placeholder="WhatsApp number (optional)"
                    value={draftPhone}
                    onChange={(e) => setDraftPhone(e.target.value)}
                    onKeyDown={handleDraftKeyDown}
                    className="flex-1 min-w-0 border-0 rounded-none bg-transparent dark:bg-transparent shadow-none h-auto py-1.5 text-[12px] focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Chips — wrap horizontally instead of growing the page */}
              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-35 overflow-y-auto pr-1">
                  {attendees.map((attendee, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="h-auto gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] text-foreground"
                    >
                      {attendee.name}
                      {attendee.email && (
                        <Mail className="h-2.5 w-2.5 text-muted-foreground/50" />
                      )}
                      {attendee.phone && (
                        <Phone className="h-2.5 w-2.5 text-muted-foreground/50" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeAttendee(i)}
                        className="size-4 rounded-full hover:bg-foreground/10 cursor-pointer"
                      >
                        <X className="h-2.5 w-2.5 text-muted-foreground" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT — Meeting summary */}
          <Card className="gap-0 py-0 border border-border ring-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border bg-foreground/2">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
                style={MONO}
              >
                Meeting summary
              </p>
              <Badge
                variant="secondary"
                className="h-auto gap-1.5 px-2 py-0.5 rounded-full"
                style={{
                  background: isReady ? "rgba(52,211,153,0.12)" : undefined,
                }}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${isReady ? "" : "bg-muted-foreground"}`}
                  style={{ background: isReady ? "#34d399" : undefined }}
                />
                <span
                  className={`text-[10px] font-medium ${isReady ? "" : "text-muted-foreground"}`}
                  style={{ color: isReady ? "#34d399" : undefined, ...MONO }}
                >
                  {isReady ? "Ready" : "Incomplete"}
                </span>
              </Badge>
            </CardHeader>

            <CardContent className="px-4 py-3 border-b border-border">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1 text-muted-foreground"
                style={MONO}
              >
                Recording
              </p>
              {file ? (
                <div className="flex items-center gap-2">
                  <FileAudio
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: "#34d399" }}
                  />
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
            </CardContent>

            <CardContent className="px-4 py-3 border-b border-border">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1 text-muted-foreground"
                style={MONO}
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
            </CardContent>

            <CardContent className="px-4 py-3 border-b border-border">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1 text-muted-foreground"
                style={MONO}
              >
                Language
              </p>
              <span className="text-[13px] font-medium">{languageLabel}</span>
            </CardContent>

            <CardContent className="px-4 py-3 flex-1">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.15em] mb-2 text-muted-foreground"
                style={MONO}
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
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 bg-foreground/10 text-foreground">
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
            </CardContent>
          </Card>
        </div>

        {/* Progress bar */}
        {uploading && (
          <Card className="p-3.5 gap-2 border border-foreground/20 ring-0 bg-foreground/4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold" style={BG}>
                {progress < 30
                  ? "Compressing audio..."
                  : progress < 70
                    ? "Uploading audio..."
                    : progress < 100
                      ? "Saving meeting..."
                      : "Done!"}
              </p>
              <span
                className="text-[10px] font-medium text-foreground/80"
                style={MONO}
              >
                {progress}%
              </span>
            </div>
            <Progress
              value={progress}
              className="**:data-[slot=progress-track]:h-1.5 **:data-[slot=progress-indicator]:duration-500"
            />
          </Card>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant={isReady ? undefined : "secondary"}
          disabled={uploading || !file}
          className="w-full rounded-xl py-2.5 h-auto text-[13px] font-semibold cursor-pointer"
          style={
            isReady
              ? {
                  background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
                  color: "#0a0a0a",
                  boxShadow: "0 0 20px rgba(255,255,255,0.25)",
                }
              : undefined
          }
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
        </Button>
      </form>
    </div>
  );
}
