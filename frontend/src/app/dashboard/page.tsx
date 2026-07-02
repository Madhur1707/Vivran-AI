import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Upload, FileAudio } from "lucide-react";
import { MeetingsBrowser } from "@/components/meetings-browser";

const BG = { fontFamily: "'Bricolage Grotesque', sans-serif" };

interface Meeting {
  id: string;
  title: string;
  status: "queued" | "processing" | "completed" | "failed";
  duration_seconds: number | null;
  speaker_count: number | null;
  attendees: string[] | null;
  created_at: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: meetings } = await supabase
    .from("meetings")
    .select(
      "id, title, status, duration_seconds, speaker_count, attendees, created_at"
    )
    .order("created_at", { ascending: false });

  const meetingList: Meeting[] = meetings ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold tracking-tight" style={BG}>
          Your meetings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {meetingList.length} recording{meetingList.length !== 1 ? "s" : ""}{" "}
          processed
        </p>
      </div>

      {/* Empty state */}
      {meetingList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-foreground/15 bg-linear-to-b from-foreground/4 to-transparent">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-foreground/10">
            <FileAudio className="h-5 w-5 text-foreground/70" />
          </div>
          <h3 className="text-[14px] font-semibold mb-1" style={BG}>
            No meetings yet
          </h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm text-center">
            Upload your first meeting recording and get transcripts, action
            items, and insights in minutes
          </p>
          <Link href="/dashboard/upload">
            <Button
              size="sm"
              className="rounded-lg text-[12px] font-semibold text-black border-0 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
              }}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload your first recording
            </Button>
          </Link>
        </div>
      ) : (
        <MeetingsBrowser meetings={meetingList} />
      )}

      {/* Floating upload button */}
      <Link
        href="/dashboard/upload"
        title="Upload recording"
        className="fixed bottom-6 right-6 z-40 flex h-13 w-13 items-center justify-center rounded-full text-black transition-transform hover:scale-105 cursor-pointer"
        style={{
          background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25), 0 0 20px rgba(255,255,255,0.25)",
        }}
      >
        <Upload className="h-5 w-5" />
      </Link>
    </div>
  );
}
