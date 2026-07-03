// Minimal Supabase REST client for the extension (auth, DB, backend API).
// Sessions are stored in chrome.storage.local under "session".
import { CONFIG } from "../config.js";

const AUTH_URL = `${CONFIG.SUPABASE_URL}/auth/v1`;
const REST_URL = `${CONFIG.SUPABASE_URL}/rest/v1`;

// ---------------------------------------------------------------- session

export async function getStoredSession() {
  const { session } = await chrome.storage.local.get("session");
  return session ?? null;
}

async function storeSession(session) {
  await chrome.storage.local.set({ session });
}

export async function clearSession() {
  await chrome.storage.local.remove("session");
}

function sessionFromTokenResponse(data) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    // expires_at is seconds since epoch
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name ?? "",
    },
  };
}

export async function signIn(email, password) {
  const res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CONFIG.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description ?? data.msg ?? "Sign in failed");
  }
  const session = sessionFromTokenResponse(data);
  await storeSession(session);
  return session;
}

async function refreshSession(session) {
  const res = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CONFIG.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const data = await res.json();
  if (!res.ok) {
    await clearSession();
    throw new Error("Session expired — please sign in again.");
  }
  const fresh = sessionFromTokenResponse(data);
  await storeSession(fresh);
  return fresh;
}

// Returns a session whose access token is valid for at least the next minute,
// refreshing it if needed. Throws if the user is signed out.
export async function getValidSession() {
  let session = await getStoredSession();
  if (!session) throw new Error("Not signed in.");
  if (session.expires_at - 60 < Math.floor(Date.now() / 1000)) {
    session = await refreshSession(session);
  }
  return session;
}

// ------------------------------------------------------------------- REST

function restHeaders(session, extra = {}) {
  return {
    apikey: CONFIG.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function getWorkspaceId(session) {
  const url = `${REST_URL}/workspace_members?select=workspace_id&user_id=eq.${session.user.id}&limit=1`;
  const res = await fetch(url, { headers: restHeaders(session) });
  const rows = await res.json();
  if (!res.ok || !rows.length) {
    throw new Error("Could not find your workspace. Sign in to the portal once, then retry.");
  }
  return rows[0].workspace_id;
}

export async function insertMeeting(session, row) {
  const res = await fetch(`${REST_URL}/meetings`, {
    method: "POST",
    headers: restHeaders(session, { Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to save meeting: ${data.message ?? res.statusText}`);
  }
  return data[0];
}

export function publicAudioUrl(path) {
  return `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${CONFIG.STORAGE_BUCKET}/${path}`;
}

export async function startProcessing(payload) {
  // Backend may be down; the meeting stays "queued" and can be retried later,
  // matching how the web upload page treats this call as best-effort.
  try {
    await fetch(`${CONFIG.API_URL}/api/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    return false;
  }
}
