export async function getMeetingsProcessedCount(options?: {
  revalidateSeconds?: number;
}): Promise<number | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/stats/public`, {
      signal: AbortSignal.timeout(3000),
      ...(options?.revalidateSeconds
        ? { next: { revalidate: options.revalidateSeconds } }
        : {}),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.meetings_processed === "number"
      ? data.meetings_processed
      : null;
  } catch {
    // Backend cold start or unreachable — callers just hide the stat.
    return null;
  }
}
