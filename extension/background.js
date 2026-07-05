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
  clearSession,
  getStoredSession,
  getValidSession,
  getWorkspaceId,
  insertMeeting,
  publicAudioUrl,
  startProcessing,
} from "./lib/supabase.js";

// The toolbar icon opens popup.html (default_popup). Opening the popup
// counts as *invoking* the extension on the active tab, which is exactly
// what grants tabCapture access — so a Start press inside a freshly opened
// popup always has the grant. A side panel deliberately never gets this
// grant (crbug 40926394), which is why this extension does not use one.

// Keyboard shortcut — a command invocation grants tab-capture access exactly
// like opening the popup does, so recording can be toggled without the popup.
// (Verify the binding exists under chrome://extensions/shortcuts.)
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-recording") return;
  const state = await getState();
  if (state.status === "recording") {
    await stopRecording("user");
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith("https://meet.google.com/")) return;
  try {
    await startRecording(tab.id);
  } catch (err) {
    await setState({ error: err instanceof Error ? err.message : String(err) });
  }
});

const IDLE_STATE = {
  status: "idle", // idle | recording | pending_upload | uploading | done | error
  tabId: null,
  meetingTitle: "",
  meetingUrl: "",
  startedAt: null,
  stoppedAt: null,
  paused: false,
  pausedAccumMs: 0, // total time spent paused (completed pauses)
  pauseStartedAt: null, // set while currently paused
  attendees: [],
  micUsed: false,
  recordingBytes: 0,
  uploadProgress: 0,
  uploadStage: null, // audio | finalize | wake — labels the uploading view
  lastMeeting: null,
  processingStarted: null, // false = uploaded but backend never confirmed
  pendingProcess: null, // /api/process payload kept for manual retry
  error: null,
  grantBlocked: false, // popup shows the tab-picker fallback when true
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
  let badge = badges[state.status] ?? { text: "", color: "#6366f1" };
  if (state.status === "recording" && state.paused) {
    badge = { text: "II", color: "#f59e0b" };
  }
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

// Drives the on-page control rail. phase: recording | paused | saved | idle.
async function notifyContent(tabId, phase) {
  if (tabId == null) return;
  const state = await getState();
  chrome.tabs
    .sendMessage(tabId, {
      target: "content",
      type: "REC_STATE",
      phase,
      startedAt: state.startedAt,
      pausedAccumMs: state.pausedAccumMs,
      pauseStartedAt: state.pauseStartedAt,
    })
    .catch(() => {});
}


// ------------------------------------------------------------------ flows

async function startRecording(tabId, desktopStreamId = null) {
  const state = await getState();
  if (state.status === "recording") throw new Error("Already recording.");
  if (state.status === "pending_upload" || state.status === "uploading") {
    throw new Error("Previous recording is not uploaded yet.");
  }

  // Two capture sources:
  //  - "tab": tabCapture stream id — no picker, but Chrome requires the
  //    extension to have been *invoked* on this tab (popup open or keyboard
  //    command), and it drops that grant when the tab navigates.
  //  - "desktop": stream id from desktopCapture.chooseDesktopMedia (the
  //    popup's "Pick the tab to record" fallback) — user picks the tab in
  //    Chrome's dialog, no invocation needed.
  let streamId = desktopStreamId;
  let source = "desktop";
  if (!streamId) {
    source = "tab";
    // Translate Chrome's cryptic invocation error into an actionable one.
    // It is stored in state (with the fallback flag) so the popup keeps
    // showing it and offers the picker.
    try {
      streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: tabId,
      });
    } catch (err) {
      if (/invoked/i.test(String(err?.message))) {
        const msg =
          'Chrome blocked the tab capture. Close this popup, reopen it on the Meet tab and press Start again — or use "Pick the tab to record" below.';
        await setState({ error: msg, grantBlocked: true });
        throw new Error(msg);
      }
      throw err;
    }
  }

  await ensureOffscreen();
  const result = await sendToOffscreen({ type: "START", streamId, source });
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
  await notifyContent(tabId, "recording");
}

async function pauseRecording() {
  const state = await getState();
  if (state.status !== "recording" || state.paused) return state;
  await sendToOffscreen({ type: "PAUSE" });
  const next = await setState({ paused: true, pauseStartedAt: Date.now() });
  await notifyContent(next.tabId, "paused");
  return next;
}

async function resumeRecording() {
  const state = await getState();
  if (state.status !== "recording" || !state.paused) return state;
  await sendToOffscreen({ type: "RESUME" });
  const next = await setState({
    paused: false,
    pauseStartedAt: null,
    pausedAccumMs: state.pausedAccumMs + (Date.now() - state.pauseStartedAt),
  });
  await notifyContent(next.tabId, "recording");
  return next;
}

async function stopRecording(reason = "user") {
  const state = await getState();
  if (state.status !== "recording") return state;

  let result = null;
  try {
    result = await sendToOffscreen({ type: "STOP" });
  } catch {
    // offscreen already gone — nothing recoverable
  }
  if (!result?.ok || !result.bytes) {
    const next = await setState({
      status: "error",
      error: "Recording was lost before it could be saved.",
    });
    await notifyContent(state.tabId, "idle");
    return next;
  }
  const next = await setState({
    status: "pending_upload",
    stoppedAt: Date.now(),
    recordingBytes: result.bytes,
    error: null,
  });
  await notifyContent(state.tabId, "saved");
  return next;
}

// Offscreen reported the stream died on its own (tab closed, capture ended).
async function onSpontaneousStop(bytes) {
  const state = await getState();
  if (state.status !== "recording") return;
  if (!bytes) {
    await setState({ status: "error", error: "Recording ended with no audio captured." });
    await notifyContent(state.tabId, "idle");
    await closeOffscreen();
    return;
  }
  await setState({
    status: "pending_upload",
    stoppedAt: Date.now(),
    recordingBytes: bytes,
  });
  await notifyContent(state.tabId, "saved");
}

async function uploadRecording(meta) {
  const state = await getState();
  if (state.status !== "pending_upload") throw new Error("Nothing to upload.");

  // Persist the user's edits so a failed upload retries with the same form.
  await setState({
    status: "uploading",
    uploadProgress: 0,
    uploadStage: "audio",
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

    await setState({ uploadStage: "finalize" });
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

    // The slow part on a free-tier backend is waking it up, not uploading —
    // label it so a full progress bar doesn't look like a frozen upload.
    await setState({ uploadStage: "wake" });
    const processPayload = {
      meeting_id: meeting.id,
      workspace_id: workspaceId,
      audio_url: audioUrl,
      attendees,
      language: meta.language ?? "en",
    };
    const processingStarted = await startProcessing(processPayload);

    await closeOffscreen();
    return setState({
      ...IDLE_STATE,
      status: "done",
      lastMeeting: { id: meeting.id, title: meeting.title },
      processingStarted,
      // Keep the payload so the popup's "Start processing" button can retry
      // without re-uploading or duplicating the meeting row.
      pendingProcess: processingStarted ? null : processPayload,
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
          const session = await getStoredSession();
          // The mic used for recording belongs to the *extension* origin
          // (offscreen document) — only extension contexts can check it, so
          // report it here for the in-page panel.
          let mic = "unknown";
          try {
            const perm = await navigator.permissions.query({ name: "microphone" });
            mic = perm.state;
          } catch {
            /* permissions API unavailable in this worker — leave unknown */
          }
          return {
            state,
            meet,
            portalUrl: CONFIG.PORTAL_URL,
            signedIn: !!session,
            email: session?.user?.email ?? "",
            mic,
          };
        })(),
      );

    case "SIGN_OUT":
      return respond(clearSession().then(() => ({})));

    case "OPEN_SETUP": // mic permission page (content scripts can't open it)
      return respond(
        chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") }).then(() => ({})),
      );

    case "START_RECORDING":
      // tabId comes from the popup; the in-page panel omits it and the
      // sender tab is used instead.
      return respond(
        startRecording(message.tabId ?? sender.tab?.id, message.desktopStreamId ?? null).then(
          () => ({}),
        ),
      );

    case "STOP_RECORDING":
      return respond(stopRecording("user").then((state) => ({ state })));

    case "PAUSE_RECORDING":
      return respond(pauseRecording().then((state) => ({ state })));

    case "RESUME_RECORDING":
      return respond(resumeRecording().then((state) => ({ state })));

    // On-page control rail (content script). Validate the sender tab so a
    // stray Meet tab can't control another tab's recording.
    case "RAIL_ACTION": {
      const tabId = sender.tab?.id;
      return respond(
        (async () => {
          const state = await getState();
          if (state.tabId !== tabId) throw new Error("Not the recording tab.");
          if (message.action === "pause") await pauseRecording();
          else if (message.action === "resume") await resumeRecording();
          else if (message.action === "stop") await stopRecording("user");
          else if (message.action === "discard") {
            await discardRecording();
            await notifyContent(tabId, "idle");
          }
          return {};
        })(),
      );
    }

    // Rail state sync when the content script (re)loads mid-recording.
    case "RAIL_STATE":
      return respond(
        (async () => {
          const tabId = sender.tab?.id;
          const state = await getState();
          if (state.tabId !== tabId) return { phase: "idle" };
          if (state.status === "recording") {
            return {
              phase: state.paused ? "paused" : "recording",
              startedAt: state.startedAt,
              pausedAccumMs: state.pausedAccumMs,
              pauseStartedAt: state.pauseStartedAt,
            };
          }
          if (state.status === "pending_upload") return { phase: "saved" };
          return { phase: "idle" };
        })(),
      );

    case "UPLOAD":
      return respond(uploadRecording(message.meta).then((state) => ({ state })));

    case "DISCARD":
      return respond(discardRecording().then((state) => ({ state })));

    case "RESET":
      return respond(setState({ ...IDLE_STATE }).then((state) => ({ state })));

    case "RETRY_PROCESS":
      // Meeting row + audio already exist; only the /api/process kick failed.
      return respond(
        (async () => {
          const state = await getState();
          if (!state.pendingProcess) throw new Error("Nothing to retry.");
          const ok = await startProcessing(state.pendingProcess);
          if (!ok) {
            throw new Error("The processing server is still unreachable — try again in a minute.");
          }
          const next = await setState({ processingStarted: true, pendingProcess: null });
          return { state: next };
        })(),
      );

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
      return respond(
        (async () => {
          const state = await setState({ uploadProgress: message.pct });
          // Content scripts don't receive offscreen→runtime messages, so
          // forward progress to the in-page panel on the recording tab.
          if (state.tabId != null) {
            chrome.tabs
              .sendMessage(state.tabId, {
                target: "content",
                type: "UPLOAD_PROGRESS",
                pct: message.pct,
              })
              .catch(() => {});
          }
          return {};
        })(),
      );

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
  // Installing/updating the extension orphans the content script in every
  // already-open Meet tab (Chrome never re-injects on its own), which would
  // leave the popup blind to running meetings — re-inject explicitly.
  const tabs = await chrome.tabs.query({ url: "https://meet.google.com/*" });
  for (const tab of tabs) {
    chrome.scripting
      .executeScript({ target: { tabId: tab.id }, files: ["content.js"] })
      .catch(() => {});
    chrome.scripting
      .insertCSS({ target: { tabId: tab.id }, files: ["content.css"] })
      .catch(() => {});
  }
});
