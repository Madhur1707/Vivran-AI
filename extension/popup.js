// Vivran.ai Meet Recorder — popup logic.
import { CONFIG } from "./config.js";
import { getStoredSession, signIn, clearSession } from "./lib/supabase.js";

const $ = (id) => document.getElementById(id);
const views = ["viewLogin", "viewNoMeet", "viewIdle", "viewRecording", "viewReview", "viewUploading", "viewDone"];

let activeTab = null;
let state = null; // background recording state
let meet = null; // per-tab meet info (title, attendees) from content script
let attendees = []; // editable list in the review form
let language = "en";
let reviewInitialized = false;
let timerInterval = null;
let pollInterval = null;

// ------------------------------------------------------------------ utils

function showView(id) {
  views.forEach((v) => $(v).classList.toggle("hidden", v !== id));
}

function showError(msg) {
  const banner = $("errorBanner");
  banner.textContent = msg ?? "";
  banner.classList.toggle("hidden", !msg);
}

// Never let messaging failures reject: a rejected promise in a click handler
// dies silently ("button does nothing"), so turn it into a visible error.
function sendBg(message) {
  return chrome.runtime.sendMessage({ target: "bg", ...message }).catch((err) => ({
    ok: false,
    error: `Extension error: ${err?.message ?? err}. Try closing and reopening this popup.`,
  }));
}

function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtTimer(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function isMeetCallTab(tab) {
  if (!tab?.url) return false;
  const url = new URL(tab.url);
  // Call URLs are /abc-defg-hij codes or /lookup/<name> links — the landing
  // and /new pages are not calls.
  return (
    url.hostname === "meet.google.com" &&
    /^\/(?:[a-z]{3}-[a-z]{4}-[a-z]{3}|lookup\/.+)$/i.test(url.pathname)
  );
}

// ------------------------------------------------------------------ render

async function render() {
  showError(state?.error);

  if (!(await getStoredSession())) {
    $("signOutBtn").classList.add("hidden");
    showView("viewLogin");
    return;
  }
  $("signOutBtn").classList.remove("hidden");

  switch (state?.status) {
    case "recording":
      renderRecording();
      return;
    case "pending_upload":
      renderReview();
      return;
    case "uploading": {
      // The audio upload itself is fast; the visible wait is usually the
      // free-tier backend waking up — say so instead of sitting at "100%".
      const stageLabels = {
        audio: "Uploading audio…",
        finalize: "Saving meeting…",
        wake: "Starting processing — the server can take a minute to wake up…",
      };
      $("uploadStageLabel").textContent = stageLabels[state.uploadStage] ?? "Uploading…";
      $("progressBar").style.width = `${state.uploadProgress ?? 0}%`;
      $("progressPct").textContent =
        state.uploadStage === "audio" ? `${state.uploadProgress ?? 0}%` : "";
      showView("viewUploading");
      return;
    }
    case "done": {
      const started = state.processingStarted !== false;
      $("doneIcon").textContent = started ? "✅" : "⚠️";
      $("doneTitle").textContent = state.lastMeeting?.title ?? "Meeting";
      $("doneSub").textContent = started
        ? "uploaded. Processing has started."
        : "uploaded, but processing hasn't started — the server didn't respond. Press \"Start processing\" to retry.";
      $("retryProcessBtn").classList.toggle("hidden", started);
      $("viewMeetingLink").href = `${CONFIG.PORTAL_URL}/dashboard/meetings/${state.lastMeeting?.id}`;
      showView("viewDone");
      return;
    }
    default:
      renderIdle();
  }
}

async function renderIdle() {
  // Gate only on the tab URL. The content script enriches this view (title,
  // participant names) but must never block recording — after an extension
  // reload its instance in an already-open Meet tab is orphaned until the
  // background re-injects it.
  if (!isMeetCallTab(activeTab)) {
    showView("viewNoMeet");
    return;
  }
  const fallbackTitle = (activeTab.title ?? "").replace(/^Meet\s*[–—-]\s*/i, "").trim();
  $("idleTitle").textContent = meet?.title || fallbackTitle || "Google Meet";
  $("idleParticipants").textContent = meet?.attendees?.length
    ? `${meet.attendees.length} participant${meet.attendees.length > 1 ? "s" : ""}: ${meet.attendees.join(", ")}`
    : "Participants are detected while you record";
  await renderMicStatus();
  // Tab-picker fallback, only offered after Chrome refused a tabCapture
  // start (should not happen with the popup flow, but never dead-end).
  $("pickTabBtn").classList.toggle("hidden", !state?.grantBlocked);
  showView("viewIdle");
}

async function renderMicStatus() {
  const row = $("micStatus");
  try {
    const { state: perm } = await navigator.permissions.query({ name: "microphone" });
    if (perm === "granted") {
      row.innerHTML = "🎙️ Microphone ready — your voice will be recorded";
      return;
    }
  } catch {
    /* fall through */
  }
  row.innerHTML = "⚠️ Mic not enabled — only other participants will be heard. ";
  const btn = document.createElement("button");
  btn.textContent = "Enable mic";
  btn.addEventListener("click", () =>
    chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") }),
  );
  row.appendChild(btn);
}

function renderRecording() {
  $("recTitle").textContent = state.meetingTitle || "Google Meet";
  $("recParticipants").textContent = state.attendees?.length
    ? `Detected: ${state.attendees.join(", ")}`
    : "Detecting participants…";
  const paused = !!state.paused;
  $("pauseBtn").textContent = paused ? "Resume" : "Pause";
  $("recHint").textContent = paused ? "Paused" : "Recording meeting audio + your mic";
  $("recDot").classList.toggle("pulsing", !paused);
  $("recTimer").classList.toggle("paused", paused);
  const tick = () => {
    const end = state.pauseStartedAt ?? Date.now();
    $("recTimer").textContent = fmtTimer(end - state.startedAt - (state.pausedAccumMs ?? 0));
  };
  clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);
  tick();
  showView("viewRecording");
}

function renderAttendeeChips() {
  const wrap = $("attendeeChips");
  wrap.innerHTML = "";
  attendees.forEach((name, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = name;
    const x = document.createElement("button");
    x.textContent = "×";
    x.addEventListener("click", () => {
      attendees.splice(i, 1);
      renderAttendeeChips();
    });
    chip.appendChild(x);
    wrap.appendChild(chip);
  });
}

function renderReview() {
  // Initialize the form once per pending recording so user edits survive
  // background state refreshes while the popup is open.
  if (!reviewInitialized) {
    reviewInitialized = true;
    $("reviewTitle").value = state.meetingTitle || "";
    attendees = [...(state.attendees ?? [])];
    renderAttendeeChips();
  }
  $("reviewSize").textContent = fmtSize(state.recordingBytes);
  showView("viewReview");
}

// ------------------------------------------------------------------ data

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab ?? null;
  const res = await sendBg({ type: "GET_STATE", tabId: tab?.id });
  if (res?.ok) {
    state = res.state;
    meet = res.meet;
  }
  // Loom-style handoff: on a Meet call tab the whole UI lives on the page.
  // The popup's real job is done the moment it opened (its click granted tab
  // capture), so open the in-page panel and get out of the way. Falls back
  // to the popup views when the content script isn't reachable or the user
  // still has to sign in.
  if (isMeetCallTab(activeTab) && (await getStoredSession())) {
    try {
      await chrome.tabs.sendMessage(activeTab.id, { target: "content", type: "OPEN_PANEL" });
      window.close();
      return;
    } catch {
      /* no content script in this tab — keep the popup UI */
    }
  }
  await render();
}

// ------------------------------------------------------------------ events

$("portalLink").href = `${CONFIG.PORTAL_URL}/login`;

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("loginBtn");
  btn.disabled = true;
  btn.textContent = "Signing in…";
  showError(null);
  try {
    await signIn($("loginEmail").value.trim(), $("loginPassword").value);
    await refresh();
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign in";
  }
});

$("signOutBtn").addEventListener("click", async () => {
  await clearSession();
  await refresh();
});

$("startBtn").addEventListener("click", async () => {
  if (!activeTab?.id) {
    showError("No active tab found — close this popup and reopen it on the Meet tab.");
    return;
  }
  const btn = $("startBtn");
  btn.disabled = true;
  showError(null);
  const res = await sendBg({ type: "START_RECORDING", tabId: activeTab.id });
  btn.disabled = false;
  if (!res?.ok) {
    await refresh(); // pick up grantBlocked so the fallback button appears
    showError(res?.error ?? "Could not start recording.");
    return;
  }
  await refresh();
});

// Fallback that needs no icon-click grant: Chrome's own share dialog mints a
// desktopCapture stream id for whichever tab the user picks. The user must
// choose the Meet tab and tick "Also share tab audio".
$("pickTabBtn").addEventListener("click", () => {
  showError(null);
  if (!chrome.desktopCapture) {
    showError("Missing desktopCapture permission — reload the extension in chrome://extensions (the manifest changed).");
    return;
  }
  chrome.desktopCapture.chooseDesktopMedia(["tab", "audio"], (streamId) => {
    if (!streamId) return; // picker cancelled
    sendBg({ type: "START_RECORDING", tabId: activeTab?.id, desktopStreamId: streamId }).then(
      async (res) => {
        if (!res?.ok) showError(res?.error ?? "Could not start recording.");
        await refresh();
      },
    );
  });
});

$("stopBtn").addEventListener("click", async () => {
  const btn = $("stopBtn");
  btn.disabled = true;
  const res = await sendBg({ type: "STOP_RECORDING" });
  btn.disabled = false;
  if (!res?.ok) showError(res?.error);
  await refresh();
});

$("pauseBtn").addEventListener("click", async () => {
  const btn = $("pauseBtn");
  btn.disabled = true;
  const res = await sendBg({ type: state?.paused ? "RESUME_RECORDING" : "PAUSE_RECORDING" });
  btn.disabled = false;
  if (!res?.ok) showError(res?.error);
  await refresh();
});

$("attendeeAdd").addEventListener("click", addAttendee);
$("attendeeInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addAttendee();
  }
});

function addAttendee() {
  const input = $("attendeeInput");
  const name = input.value.trim();
  if (name && !attendees.includes(name)) {
    attendees.push(name);
    renderAttendeeChips();
  }
  input.value = "";
  input.focus();
}

$("langRow").addEventListener("click", (e) => {
  const btn = e.target.closest(".lang");
  if (!btn) return;
  language = btn.dataset.lang;
  document.querySelectorAll(".lang").forEach((b) => b.classList.toggle("active", b === btn));
});

$("uploadBtn").addEventListener("click", async () => {
  // Include a name typed but not yet added with "+"
  const draft = $("attendeeInput").value.trim();
  if (draft && !attendees.includes(draft)) attendees.push(draft);
  if (attendees.length === 0) {
    showError("Add at least one attendee name.");
    return;
  }
  showError(null);
  reviewInitialized = false;
  state = { ...state, status: "uploading", uploadProgress: 0 };
  await render();
  const res = await sendBg({
    type: "UPLOAD",
    meta: { title: $("reviewTitle").value.trim(), attendees, language },
  });
  if (res?.ok) {
    state = res.state;
  } else {
    await refresh();
    return;
  }
  await render();
});

$("discardBtn").addEventListener("click", async () => {
  if (!confirm("Discard this recording? It cannot be recovered.")) return;
  reviewInitialized = false;
  await sendBg({ type: "DISCARD" });
  await refresh();
});

$("doneBtn").addEventListener("click", async () => {
  await sendBg({ type: "RESET" });
  await refresh();
});

$("retryProcessBtn").addEventListener("click", async () => {
  const btn = $("retryProcessBtn");
  btn.disabled = true;
  btn.textContent = "Contacting server…";
  showError(null);
  const res = await sendBg({ type: "RETRY_PROCESS" });
  btn.disabled = false;
  btn.textContent = "Start processing";
  if (!res?.ok) showError(res?.error ?? "Retry failed.");
  await refresh();
});

// Live upload progress + state changes pushed while the popup is open.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "UPLOAD_PROGRESS" && state?.status === "uploading") {
    $("progressBar").style.width = `${message.pct}%`;
    $("progressPct").textContent = `${message.pct}%`;
  }
});

// Keep idle/recording views fresh (participants list, auto-stop transitions).
pollInterval = setInterval(async () => {
  if (["recording", "idle", undefined].includes(state?.status) || state?.status === "uploading") {
    const prev = state?.status;
    await refresh();
    if (prev !== state?.status) reviewInitialized = false;
  }
}, 2000);

refresh();
