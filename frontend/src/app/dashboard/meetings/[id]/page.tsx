import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MeetingDetail } from "@/components/meeting-detail";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .single();

  if (!meeting) {
    notFound();
  }

  return <MeetingDetail meeting={meeting} />;
}
