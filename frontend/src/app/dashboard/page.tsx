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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1
            className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight"
            style={BG}
          >
            Your meetings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meetingList.length} recording{meetingList.length !== 1 ? "s" : ""}{" "}
            processed
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button
            className="rounded-full text-black border-0"
            style={{
              background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
              boxShadow: "0 0 20px rgba(255,255,255,0.25)",
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload recording
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {meetingList.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl border"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
            borderColor: "rgba(255,255,255,0.15)",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <FileAudio className="h-7 w-7" style={{ color: "#d4d4d8" }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={BG}>
            No meetings yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
            Upload your first meeting recording and get transcripts, action
            items, and insights in minutes
          </p>
          <Link href="/dashboard/upload">
            <Button
              className="rounded-full text-black border-0"
              style={{
                background: "linear-gradient(135deg, #e4e4e7, #a1a1aa)",
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload your first recording
            </Button>
          </Link>
        </div>
      ) : (
        <MeetingsBrowser meetings={meetingList} />
      )}
    </div>
  );
}
