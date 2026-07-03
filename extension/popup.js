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

function sendBg(message) {
  return chrome.runtime.sendMessage({ target: "bg", ...message });
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
  return url.hostname === "meet.google.com" && url.pathname.length > 1;
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
    case "uploading":
      $("progressBar").style.width = `${state.uploadProgress ?? 0}%`;
      $("progressPct").textContent = `${state.uploadProgress ?? 0}%`;
      showView("viewUploading");
      return;
    case "done":
      $("doneTitle").textContent = state.lastMeeting?.title ?? "Meeting";
      $("viewMeetingLink").href = `${CONFIG.PORTAL_URL}/dashboard/meetings/${state.lastMeeting?.id}`;
      showView("viewDone");
      return;
    default:
      renderIdle();
  }
}

async function renderIdle() {
  if (!isMeetCallTab(activeTab) || !meet?.inMeeting) {
    showView("viewNoMeet");
    return;
  }
  $("idleTitle").textContent = meet.title || "Google Meet";
  $("idleParticipants").textContent = meet.attendees?.length
    ? `${meet.attendees.length} participant${meet.attendees.length > 1 ? "s" : ""}: ${meet.attendees.join(", ")}`
    : "No participants detected yet";
  await renderMicStatus();
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
  const tick = () => {
    $("recTimer").textContent = fmtTimer(Date.now() - state.startedAt);
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
  const btn = $("startBtn");
  btn.disabled = true;
  showError(null);
  const res = await sendBg({ type: "START_RECORDING", tabId: activeTab.id });
  btn.disabled = false;
  if (!res?.ok) {
    showError(res?.error ?? "Could not start recording.");
    return;
  }
  await refresh();
});

$("stopBtn").addEventListener("click", async () => {
  const btn = $("stopBtn");
  btn.disabled = true;
  const res = await sendBg({ type: "STOP_RECORDING" });
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
