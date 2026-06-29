"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload,
  FileAudio,
  X,
  Plus,
  Loader2,
  CheckCircle2,
} from "lucide-react";

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
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [attendees, setAttendees] = useState<string[]>([""]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  function validateFile(f: File): boolean {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error("Unsupported file format. Use MP3, MP4, WAV, M4A, OGG, or WEBM.");
      return false;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 500MB.");
      return false;
    }
    return true;
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^.]+$/, ""));
      }
    }
  }, [title]);

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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
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
        // Backend may not be running yet — meeting is saved and can be processed later
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload recording</h1>
        <p className="text-sm text-muted-foreground">
          Upload your meeting audio and enter attendee names
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audio file</CardTitle>
            <CardDescription>
              MP3, MP4, WAV, M4A, OGG, WEBM — up to 500MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            {file ? (
              <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
                <div className="flex items-center gap-3">
                  <FileAudio className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
              >
                <Upload className="mb-4 h-10 w-10 text-muted-foreground/50" />
                <p className="mb-1 text-sm font-medium">
                  Drag and drop your audio file here
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept=".mp3,.mp4,.wav,.m4a,.ogg,.webm"
                  onChange={onFileSelect}
                />
              </label>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meeting details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting title</Label>
              <Input
                id="title"
                placeholder="e.g. Sprint Planning — June 27"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Attendee names</Label>
              <p className="text-xs text-muted-foreground">
                Enter the names of everyone in the meeting — we'll match voices
                to names
              </p>
              <div className="space-y-2">
                {attendees.map((name, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Attendee ${i + 1}`}
                      value={name}
                      onChange={(e) => updateAttendee(i, e.target.value)}
                    />
                    {attendees.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttendee(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAttendee}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add attendee
              </Button>
            </div>
          </CardContent>
        </Card>

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-center text-xs text-muted-foreground">
              {progress < 60
                ? "Uploading audio..."
                : progress < 100
                ? "Saving meeting..."
                : "Done!"}
            </p>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Upload and process
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
