import { createClient } from "@/lib/supabase/client";

export function apiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

/**
 * The API derives the caller's identity and workspace access from this token
 * rather than from anything in the request body, so every call needs it.
 */
async function accessToken(): Promise<string> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You've been signed out. Sign in again to continue.");
  }
  return token;
}

/**
 * fetch() against the API with the caller's bearer token attached.
 *
 * Deliberately does not set Content-Type: FormData bodies need the browser to
 * generate one with a multipart boundary.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await accessToken()}`);
  return fetch(`${apiUrl()}${path}`, { ...init, headers });
}

export async function apiPostJson(
  path: string,
  body: unknown
): Promise<Response> {
  return apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
