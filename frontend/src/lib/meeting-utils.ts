import type { TranscriptSegment } from "@/lib/meeting-types";

export const BG = { fontFamily: "'Bricolage Grotesque', sans-serif" };
export const MONO = { fontFamily: "'JetBrains Mono', monospace" };

export const AVATAR_COLORS = [
  "#e4e4e7",
  "#a1a1aa",
  "#f472b6",
  "#34d399",
  "#d4d4d8",
  "#fbbf24",
  "#f97316",
  "#06b6d4",
];

export const statusConfig: Record<
  string,
  { label: string; dot: string; bg: string; color: string }
> = {
  queued: {
    label: "Queued",
    dot: "#fbbf24",
    bg: "rgba(251,191,36,0.1)",
    color: "#fbbf24",
  },
  processing: {
    label: "Processing",
    dot: "#d4d4d8",
    bg: "rgba(255,255,255,0.1)",
    color: "#d4d4d8",
  },
  completed: {
    label: "Completed",
    dot: "#34d399",
    bg: "rgba(52,211,153,0.1)",
    color: "#34d399",
  },
  failed: {
    label: "Failed",
    dot: "#f87171",
    bg: "rgba(239,68,68,0.1)",
    color: "#f87171",
  },
};

export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function getSpeakerColor(speaker: string, allSpeakers: string[]): string {
  const idx = allSpeakers.indexOf(speaker);
  return AVATAR_COLORS[idx >= 0 ? idx % AVATAR_COLORS.length : 0];
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getAllSpeakerQuotes(transcript: TranscriptSegment[]) {
  const quotes: Record<string, string[]> = {};
  for (const seg of transcript) {
    if (seg.text.trim().length > 5) {
      if (!quotes[seg.speaker]) quotes[seg.speaker] = [];
      quotes[seg.speaker].push(
        seg.text.length > 120 ? seg.text.slice(0, 120) + "…" : seg.text
      );
    }
  }
  for (const speaker of Object.keys(quotes)) {
    quotes[speaker].sort((a, b) => b.length - a.length);
  }
  return quotes;
}

export function getUniqueSpeakers(transcript: TranscriptSegment[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const seg of transcript) {
    if (!seen.has(seg.speaker)) {
      seen.add(seg.speaker);
      result.push(seg.speaker);
    }
  }
  return result;
}
