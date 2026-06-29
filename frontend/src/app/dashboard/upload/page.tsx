"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [attendees, setAttendees] = useState<string[]>(["", ""]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

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
    setAttendees([...attendees, ""]);
  }

  function removeAttendee(index: number) {
    setAttendees(attendees.filter((_, i) => i !== index));
  }

  function updateAttendee(index: number, value: string) {
    const updated = [...attendees];
    updated[index] = value;
    setAttendees(updated);
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

    const filteredAttendees = attendees.filter((a) => a.trim());
    if (filteredAttendees.length === 0) {
      toast.error("Please add at least one attendee name.");
      return;
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
          title: title || file.name,
          status: "queued",
          audio_url: urlData.publicUrl,
          audio_path: filePath,
          attendees: filteredAttendees,
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
            attendees: filteredAttendees,
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

  const isReady = !!file && !!title.trim() && attendees.some((a) => a.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight"
          style={BG}
        >
          Upload a recording
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drop your meeting audio and add attendee names
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT — File upload */}
          <div className="flex flex-col">
            {file ? (
              <div
                className="flex-1 flex flex-col rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(52,211,153,0.1)" }}
                  >
                    <FileAudio
                      className="h-7 w-7"
                      style={{ color: "#34d399" }}
                    />
                  </div>
                  <p className="text-[15px] font-semibold mb-1" style={BG}>
                    {file.name}
                  </p>
                  <p
                    className="text-[12px] text-muted-foreground"
                    style={MONO}
                  >
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="w-full py-2 rounded-xl text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Remove and choose another
                </button>
              </div>
            ) : (
              <label
                className="flex-1 block cursor-pointer"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
              >
                <div
                  className="h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 px-6 transition-all"
                  style={{
                    borderColor: dragActive
                      ? "rgba(99,102,241,0.5)"
                      : "rgba(99,102,241,0.15)",
                    background: dragActive
                      ? "rgba(99,102,241,0.06)"
                      : "rgba(99,102,241,0.02)",
                    minHeight: 320,
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(99,102,241,0.1)" }}
                  >
                    <Upload
                      className="h-6 w-6"
                      style={{ color: "#818cf8" }}
                    />
                  </div>
                  <p className="text-[15px] font-semibold mb-1" style={BG}>
                    {dragActive
                      ? "Drop your file here"
                      : "Drag & drop audio file"}
                  </p>
                  <p className="text-[12px] text-muted-foreground mb-5">
                    or click to browse
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {["MP3", "MP4", "WAV", "M4A", "OGG", "WEBM"].map(
                      (fmt) => (
                        <span
                          key={fmt}
                          className="px-2 py-0.5 rounded-md text-[9px] font-medium"
                          style={{
                            background: "rgba(99,102,241,0.08)",
                            color: "#818cf8",
                            ...MONO,
                          }}
                        >
                          {fmt}
                        </span>
                      )
                    )}
                  </div>
                  <p
                    className="text-[10px] text-muted-foreground/40 mt-2"
                    style={MONO}
                  >
                    Max 500MB
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".mp3,.mp4,.wav,.m4a,.ogg,.webm"
                  onChange={onFileSelect}
                />
              </label>
            )}
          </div>

          {/* RIGHT — Meeting details */}
          <div
            className="rounded-2xl border border-border bg-card flex flex-col"
            style={{ minHeight: 320 }}
          >
            {/* Title */}
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(99,102,241,0.08)" }}
                >
                  <Mic
                    className="h-3.5 w-3.5"
                    style={{ color: "#818cf8" }}
                  />
                </div>
                <p className="text-[13px] font-semibold" style={BG}>
                  Meeting title
                </p>
              </div>
              <input
                placeholder="e.g. Sprint Planning — June 27"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent rounded-xl border border-border px-4 py-2.5 text-[14px] outline-none placeholder:text-muted-foreground/40 focus:border-[rgba(99,102,241,0.4)] transition-colors"
              />
            </div>

            {/* Attendees */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center gap-2.5 mb-1">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(99,102,241,0.08)" }}
                >
                  <Users
                    className="h-3.5 w-3.5"
                    style={{ color: "#818cf8" }}
                  />
                </div>
                <p className="text-[13px] font-semibold" style={BG}>
                  Attendees
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3 ml-[38px]">
                We&apos;ll match voices to names after processing
              </p>

              <div className="space-y-2 flex-1">
                {attendees.map((name, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      placeholder={`Attendee ${i + 1}`}
                      value={name}
                      onChange={(e) => updateAttendee(i, e.target.value)}
                      className="flex-1 bg-transparent rounded-xl border border-border px-4 py-2.5 text-[14px] outline-none placeholder:text-muted-foreground/40 focus:border-[rgba(99,102,241,0.4)] transition-colors"
                    />
                    {attendees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAttendee(i)}
                        className="w-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors shrink-0"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addAttendee}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80 self-start"
                style={{
                  background: "rgba(99,102,241,0.08)",
                  color: "#818cf8",
                }}
              >
                <Plus className="h-3 w-3" />
                Add attendee
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {uploading && (
          <div
            className="mt-5 rounded-2xl border p-5"
            style={{
              borderColor: "rgba(99,102,241,0.2)",
              background: "rgba(99,102,241,0.04)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold" style={BG}>
                {progress < 60
                  ? "Uploading audio..."
                  : progress < 100
                    ? "Saving meeting..."
                    : "Done!"}
              </p>
              <span
                className="text-[11px] font-medium"
                style={{ color: "#818cf8", ...MONO }}
              >
                {progress}%
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(99,102,241,0.1)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                }}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading || !file}
          className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl py-4 text-[15px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isReady
              ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
              : "rgba(99,102,241,0.15)",
            color: isReady ? "white" : "#818cf8",
            boxShadow: isReady
              ? "0 0 24px rgba(99,102,241,0.3)"
              : "none",
          }}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Upload and process
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
