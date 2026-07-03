// Vivran.ai Meet Recorder — background service worker.
//
// Owns the recording state machine and all JSON/API calls. The heavy binary
// work (capturing audio, MediaRecorder, uploading the blob) happens in the
// offscreen document, because MV3 service workers can't use getUserMedia and
// can't hold large blobs across restarts.
//
// State lives in chrome.storage.session so it survives service-worker sleeps
// for the whole browser session.

import { CONFIG } from "./config.js";
import {
  getValidSession,
  getWorkspaceId,
  insertMeeting,
  publicAudioUrl,
  startProcessing,
} from "./lib/supabase.js";

// Clicking the toolbar icon opens the side panel (there is no default_popup).
//
// We open it manually from action.onClicked instead of using
// setPanelBehavior({ openPanelOnActionClick: true }). Chrome's automatic
// open-on-click behavior never registers as the user "invoking" the
// extension on that tab (this is a deliberate Chromium decision, not a bug —
// see crbug 40926394), so tabCapture.getMediaStreamId() always fails with
// "Extension has not been invoked" afterwards, no matter how many times you
// reopen the panel. A real onClicked listener fires per-click on the actual
// active tab and *does* count as invoking the extension on it, which is what
// tabCapture needs.
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
});

const IDLE_STATE = {
  status: "idle", // idle | recording | pending_upload | uploading | done | error
  tabId: null,
  meetingTitle: "",
  meetingUrl: "",
  startedAt: null,
  stoppedAt: null,
  attendees: [],
  micUsed: false,
  recordingBytes: 0,
  uploadProgress: 0,
  lastMeeting: null,
  error: null,
};

// ------------------------------------------------------------------ state

async function getState() {
  const { rec } = await chrome.storage.session.get("rec");
  return rec ?? { ...IDLE_STATE };
}

async function setState(patch) {
  const state = { ...(await getState()), ...patch };
  await chrome.storage.session.set({ rec: state });
  await updateBadge(state);
  return state;
}

// Per-tab Meet info reported by the content script (title + scraped names),
// used to prefill the upload form even before recording starts.
async function getTabMeet(tabId) {
  const { tabMeet } = await chrome.storage.session.get("tabMeet");
  return tabMeet?.[tabId] ?? null;
}

async function setTabMeet(tabId, info) {
  const { tabMeet } = await chrome.storage.session.get("tabMeet");
  const map = tabMeet ?? {};
  if (info) map[tabId] = info;
  else delete map[tabId];
  await chrome.storage.session.set({ tabMeet: map });
}

async function updateBadge(state) {
  const badges = {
    recording: { text: "REC", color: "#ef4444" },
    pending_upload: { text: "1", color: "#6366f1" },
    uploading: { text: "↑", color: "#6366f1" },
    error: { text: "!", color: "#ef4444" },
  };
  const badge = badges[state.status] ?? { text: "", color: "#6366f1" };
  await chrome.action.setBadgeText({ text: badge.text });
  await chrome.action.setBadgeBackgroundColor({ color: badge.color });
}

// -------------------------------------------------------------- offscreen

async function hasOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  return contexts.length > 0;
}

async function ensureOffscreen() {
  if (await hasOffscreen()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Record meeting audio from the Google Meet tab and microphone",
  });
}

async function closeOffscreen() {
  if (await hasOffscreen()) {
    await chrome.offscreen.closeDocument().catch(() => {});
  }
}

function sendToOffscreen(message) {
  return chrome.runtime.sendMessage({ target: "offscreen", ...message });
}

function notifyContent(tabId, recording) {
  if (tabId == null) return;
  chrome.tabs
    .sendMessage(tabId, { target: "content", type: "REC_STATE", recording })
    .catch(() => {});
}

// ------------------------------------------------------------------ flows

async function startRecording(tabId) {
  const state = await getState();
  if (state.status === "recording") throw new Error("Already recording.");
  if (state.status === "pending_upload" || state.status === "uploading") {
    throw new Error("Previous recording is not uploaded yet.");
  }

  // tabCapture requires the extension to have been *invoked* on this tab
  // (toolbar icon click). With a side panel the user may have opened the
  // panel on another tab and only switched here, so translate Chrome's
  // cryptic error into an actionable one.
  let streamId;
  try {
    streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });
  } catch (err) {
    if (/invoked/i.test(String(err?.message))) {
      throw new Error(
        "Chrome needs a fresh grant for this tab: click the Vivran.ai toolbar icon once while this Meet tab is active, then press Start again.",
      );
    }
    throw err;
  }

  await ensureOffscreen();
  const result = await sendToOffscreen({ type: "START", streamId });
  if (!result?.ok) {
    await closeOffscreen();
    throw new Error(result?.error ?? "Could not start audio capture.");
  }

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const meet = await getTabMeet(tabId);
  await setState({
    ...IDLE_STATE,
    status: "recording",
    tabId,
    startedAt: Date.now(),
    meetingTitle: meet?.title ?? tab?.title ?? "Google Meet",
    meetingUrl: tab?.url ?? "",
    attendees: meet?.attendees ?? [],
    micUsed: result.mic,
  });
  notifyContent(tabId, true);
}

async function stopRecording(reason = "user") {
  const state = await getState();
  if (state.status !== "recording") return state;

  notifyContent(state.tabId, false);
  let result = null;
  try {
    result = await sendToOffscreen({ type: "STOP" });
  } catch {
    // offscreen already gone — nothing recoverable
  }
  if (!result?.ok || !result.bytes) {
    return setState({
      status: "error",
      error: "Recording was lost before it could be saved.",
    });
  }
  return setState({
    status: "pending_upload",
    stoppedAt: Date.now(),
    recordingBytes: result.bytes,
    error: reason === "user" ? null : null,
  });
}

// Offscreen reported the stream died on its own (tab closed, capture ended).
async function onSpontaneousStop(bytes) {
  const state = await getState();
  if (state.status !== "recording") return;
  notifyContent(state.tabId, false);
  if (!bytes) {
    await setState({ status: "error", error: "Recording ended with no audio captured." });
    await closeOffscreen();
    return;
  }
  await setState({
    status: "pending_upload",
    stoppedAt: Date.now(),
    recordingBytes: bytes,
  });
}

async function uploadRecording(meta) {
  const state = await getState();
  if (state.status !== "pending_upload") throw new Error("Nothing to upload.");

  // Persist the user's edits so a failed upload retries with the same form.
  await setState({
    status: "uploading",
    uploadProgress: 0,
    error: null,
    meetingTitle: meta.title || state.meetingTitle,
    attendees: meta.attendees,
  });
  try {
    const session = await getValidSession();
    const workspaceId = await getWorkspaceId(session);

    const path = `meetings/${session.user.id}/${Date.now()}-meet-recording.webm`;
    const uploadResult = await sendToOffscreen({
      type: "UPLOAD",
      url: `${CONFIG.SUPABASE_URL}/storage/v1/object/${CONFIG.STORAGE_BUCKET}/${path}`,
      token: session.access_token,
      anonKey: CONFIG.SUPABASE_ANON_KEY,
    });
    if (!uploadResult?.ok) {
      throw new Error(uploadResult?.error ?? "Audio upload failed.");
    }

    const audioUrl = publicAudioUrl(path);
    const attendees = meta.attendees.length ? meta.attendees : ["Me"];
    const meeting = await insertMeeting(session, {
      user_id: session.user.id,
      workspace_id: workspaceId,
      title: meta.title || state.meetingTitle || "Google Meet recording",
      status: "queued",
      audio_url: audioUrl,
      audio_path: path,
      attendees,
      attendee_emails: {},
      attendee_phones: {},
    });

    await startProcessing({
      meeting_id: meeting.id,
      workspace_id: workspaceId,
      audio_url: audioUrl,
      attendees,
      language: meta.language ?? "en",
    });

    await closeOffscreen();
    return setState({
      ...IDLE_STATE,
      status: "done",
      lastMeeting: { id: meeting.id, title: meeting.title },
    });
  } catch (err) {
    // Keep the blob in the offscreen document so the user can retry.
    return setState({
      status: "pending_upload",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function discardRecording() {
  await closeOffscreen();
  return setState({ ...IDLE_STATE });
}

// --------------------------------------------------------------- messages

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== "bg") return;

  const respond = (promise) => {
    promise
      .then((data) => sendResponse({ ok: true, ...data }))
      .catch((err) =>
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      );
    return true; // keep the channel open for the async response
  };

  switch (message.type) {
    case "GET_STATE":
      return respond(
        (async () => {
          const state = await getState();
          const meet = message.tabId != null ? await getTabMeet(message.tabId) : null;
          return { state, meet };
        })(),
      );

    case "START_RECORDING":
      return respond(startRecording(message.tabId).then(() => ({})));

    case "STOP_RECORDING":
      return respond(stopRecording("user").then((state) => ({ state })));

    case "UPLOAD":
      return respond(uploadRecording(message.meta).then((state) => ({ state })));

    case "DISCARD":
      return respond(discardRecording().then((state) => ({ state })));

    case "RESET":
      return respond(setState({ ...IDLE_STATE }).then((state) => ({ state })));

    case "MEET_STATE": {
      const tabId = sender.tab?.id;
      if (tabId == null) return;
      return respond(
        (async () => {
          await setTabMeet(tabId, {
            inMeeting: message.inMeeting,
            title: message.title,
            attendees: message.attendees,
          });
          const state = await getState();
          if (state.status === "recording" && state.tabId === tabId) {
            // Accumulate everyone seen during the recording, even if they leave.
            const names = new Set([...state.attendees, ...message.attendees]);
            await setState({
              attendees: [...names],
              meetingTitle: message.title || state.meetingTitle,
            });
            if (!message.inMeeting) await stopRecording("meeting_ended");
          }
          return { recording: state.status === "recording" && state.tabId === tabId };
        })(),
      );
    }

    case "RECORDING_STOPPED": // from offscreen (stream ended on its own)
      return respond(onSpontaneousStop(message.bytes).then(() => ({})));

    case "UPLOAD_PROGRESS": // from offscreen; popup also listens directly
      return respond(setState({ uploadProgress: message.pct }).then(() => ({})));

    default:
      return;
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await setTabMeet(tabId, null);
  const state = await getState();
  if (state.status === "recording" && state.tabId === tabId) {
    // The capture stream dies with the tab; offscreen usually reports it
    // first, but make sure we never stay stuck in "recording".
    await stopRecording("tab_closed");
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  await updateBadge(await getState());
});
