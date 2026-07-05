// Vivran.ai Meet Recorder — content script for meet.google.com.
//
// Detects whether the user is in an active call, scrapes participant names
// (best-effort — Meet's DOM is obfuscated and changes; the popup lets the
// user edit the list before upload), and shows a small "Recording" pill.

(() => {
  // The background re-injects this file into open Meet tabs on install and
  // update — never let two live copies run in the same page.
  if (window.__vivranContentLoaded) return;
  window.__vivranContentLoaded = true;

  const POLL_MS = 3000;
  let lastPayload = "";
  let wasInMeeting = false;

  // ------------------------------------------------------------- scraping

  function cleanName(raw) {
    if (!raw) return null;
    let name = raw.split("\n")[0].trim();
    name = name.replace(/\s*\((You|Vous|Tú|Du)\)\s*$/i, "").trim();
    name = name.replace(/^(You|Your)$/i, "").trim();
    if (name.length < 2 || name.length > 60) return null;
    // Drop obvious UI strings that sneak in through aria-labels
    if (/camera|microphone|present|pinned|muted|more.actions|backgrounds|reactions|devices/i.test(name)) {
      return null;
    }
    if (!/[\p{L}]/u.test(name)) return null;
    return name;
  }

  function scrapeAttendees() {
    // Deduplicate by Meet's per-participant DOM id, NOT by display name —
    // two different people can join with the same name (different Google
    // accounts). Same-named participants get numbered: "Name", "Name (2)".

    // 1) Video tiles — one data-participant-id per participant; the name
    //    usually sits in a .notranslate span inside the tile.
    const byId = new Map();
    document.querySelectorAll("[data-participant-id]").forEach((el) => {
      const id = el.getAttribute("data-participant-id");
      if (!id || byId.has(id)) return;
      for (const span of el.querySelectorAll("span.notranslate")) {
        const n = cleanName(span.textContent);
        if (n) {
          byId.set(id, n);
          break;
        }
      }
    });

    // Assign suffixes in participant-id order so the same person keeps the
    // same label from poll to poll while duplicates are present.
    const nameCounts = new Map();
    const names = [];
    [...byId.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([, name]) => {
        const n = (nameCounts.get(name) ?? 0) + 1;
        nameCounts.set(name, n);
        names.push(n === 1 ? name : `${name} (${n})`);
      });

    // 2) Sources without a participant id — the self tile and People-panel
    //    entries. These can't be told apart from an id-based participant
    //    with the same name, so only add names not seen in the tiles.
    const fallback = new Set();
    const addFallback = (raw) => {
      const n = cleanName(raw);
      if (n && !nameCounts.has(n)) fallback.add(n);
    };
    document.querySelectorAll("[data-self-name]").forEach((el) => {
      addFallback(el.getAttribute("data-self-name"));
    });
    document
      .querySelectorAll('[role="list"] [role="listitem"][aria-label]')
      .forEach((el) => {
        addFallback(el.getAttribute("aria-label"));
      });

    return [...names, ...fallback].sort();
  }

  function isInMeeting() {
    // The leave-call button only exists while in an active call.
    if (document.querySelector('button[aria-label*="Leave call" i]')) return true;
    if (document.querySelector('[aria-label*="Leave call" i]')) return true;
    return document.querySelectorAll("[data-participant-id]").length > 0;
  }

  function meetingTitle() {
    // document.title looks like "Meet – Weekly Sync" or "Meet – abc-defg-hij"
    const t = document.title.replace(/^Meet\s*[–—-]\s*/i, "").trim();
    return t || "Google Meet";
  }

  // ------------------------------------------------------------ reporting

  function report() {
    // Extension was reloaded/updated; chrome.runtime is torn down on this
    // orphaned content script instance and sendMessage would throw
    // synchronously (not just reject) — stop polling instead of crashing.
    if (!chrome.runtime?.id) {
      clearInterval(pollTimer);
      return;
    }

    const inMeeting = isInMeeting();
    // Only report the transition out of a meeting once, so the background can
    // auto-stop; skip reporting while never in a meeting (landing page).
    if (!inMeeting && !wasInMeeting) return;

    const payload = {
      target: "bg",
      type: "MEET_STATE",
      inMeeting,
      title: meetingTitle(),
      attendees: inMeeting ? scrapeAttendees() : [],
    };
    wasInMeeting = inMeeting;

    const key = JSON.stringify(payload);
    if (key === lastPayload) return;
    lastPayload = key;

    chrome.runtime.sendMessage(payload).catch(() => {
      // Extension was reloaded; this content script instance is orphaned.
    });
  }

  const pollTimer = setInterval(report, POLL_MS);
  report();

  // --------------------------------------------------------- control rail
  //
  // A small draggable rail (timer + pause/stop/discard) shown while
  // recording, and a "saved" card prompting the upload after a stop.

  const SVG = {
    pause:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    play:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    stop:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    trash:
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
  };

  let phase = "idle"; // idle | recording | paused | saved
  let timing = { startedAt: null, pausedAccumMs: 0, pauseStartedAt: null };
  let railTick = null;
  let discardArm = null;

  function fmtElapsed() {
    if (!timing.startedAt) return "00:00";
    const end = timing.pauseStartedAt ?? Date.now();
    const total = Math.max(0, Math.floor((end - timing.startedAt - (timing.pausedAccumMs ?? 0)) / 1000));
    const h = Math.floor(total / 3600);
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return h ? `${h}:${m}:${s}` : `${m}:${s}`;
  }

  function railAction(action) {
    chrome.runtime.sendMessage({ target: "bg", type: "RAIL_ACTION", action }).catch(() => {});
  }

  function removeRail() {
    document.getElementById("vivran-rail")?.remove();
    clearInterval(railTick);
    railTick = null;
  }

  function railButton(id, title, svg, onClick) {
    const b = document.createElement("button");
    b.id = id;
    b.title = title;
    b.innerHTML = svg;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  function onDiscardClick() {
    const btn = document.getElementById("vivran-rail-discard");
    if (!btn) return;
    // Two-step confirm: first click arms the button for 3 seconds.
    if (discardArm) {
      clearTimeout(discardArm);
      discardArm = null;
      railAction("discard");
      return;
    }
    btn.classList.add("armed");
    btn.title = "Click again to discard";
    discardArm = setTimeout(() => {
      btn.classList.remove("armed");
      btn.title = "Discard recording";
      discardArm = null;
    }, 3000);
  }

  function enableDrag(el) {
    let dragging = false;
    let sx = 0, sy = 0, ox = 0, oy = 0;
    el.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      dragging = true;
      sx = e.clientX;
      sy = e.clientY;
      const r = el.getBoundingClientRect();
      ox = r.left;
      oy = r.top;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const x = Math.min(Math.max(4, ox + e.clientX - sx), window.innerWidth - el.offsetWidth - 4);
      const y = Math.min(Math.max(4, oy + e.clientY - sy), window.innerHeight - el.offsetHeight - 4);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    });
    const end = () => {
      dragging = false;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  function ensureRail() {
    let el = document.getElementById("vivran-rail");
    if (el) return el;
    el = document.createElement("div");
    el.id = "vivran-rail";
    const dot = document.createElement("span");
    dot.className = "vivran-rec-dot";
    const timer = document.createElement("div");
    timer.className = "vivran-rail-timer";
    timer.textContent = fmtElapsed();
    el.append(
      dot,
      timer,
      railButton("vivran-rail-pause", "Pause recording", SVG.pause, () =>
        railAction(phase === "paused" ? "resume" : "pause"),
      ),
      railButton("vivran-rail-stop", "Stop & save", SVG.stop, () => railAction("stop")),
      railButton("vivran-rail-discard", "Discard recording", SVG.trash, onDiscardClick),
    );
    enableDrag(el);
    document.documentElement.appendChild(el);
    railTick = setInterval(() => {
      timer.textContent = fmtElapsed();
    }, 500);
    return el;
  }

  // ------------------------------------------------------------ page panel
  //
  // Loom-style panel that slides in from the right edge of the Meet page.
  // The toolbar popup hands off to it immediately (its click already granted
  // tab capture), so the whole start → review → upload flow lives on-page.

  let panelEl = null;
  let panelPoll = null;
  let bgState = null;
  let portalUrl = "https://vivran-ai.vercel.app";
  let panelSignedIn = true;
  let panelEmail = "";
  let panelMic = "unknown";
  let panelAttendees = [];
  let panelLanguage = "en";
  let reviewInit = false;
  let panelDiscardArm = null;

  function bg(message) {
    return chrome.runtime.sendMessage({ target: "bg", ...message }).catch(() => null);
  }

  const PANEL_HTML = `
    <div class="vp-head">
      <div class="vp-brand"><span class="vp-logo">V</span> Vivran.ai</div>
      <button class="vp-x" id="vp-close" title="Close">✕</button>
    </div>
    <div class="vp-banner" id="vp-error" hidden></div>

    <div class="vp-body">

    <div id="vp-auth" class="vp-centered" hidden>
      <div class="vp-done-icon vp-brand-icon">V</div>
      <p class="vp-done-text">You're signed out.<br />
        Click the <b>Vivran.ai icon</b> in the toolbar to sign in.</p>
    </div>

    <div id="vp-idle" class="vp-centered" hidden>
      <div class="vp-card">
        <p class="vp-title" id="vp-meet-title">Google Meet</p>
        <p class="vp-sub" id="vp-meet-sub">Ready to record</p>
      </div>
      <div class="vp-mic" id="vp-mic"></div>
      <button class="vp-primary" id="vp-start"><span class="vp-dot"></span>Start recording</button>
      <p class="vp-hint">Captures meeting audio + your microphone. Stops automatically when you leave the call.</p>
    </div>

    <div id="vp-review" hidden>
      <p class="vp-label">Ready to upload <span id="vp-size"></span></p>
      <label class="vp-field">Meeting title
        <input type="text" id="vp-title" placeholder="e.g. Sprint planning" />
      </label>
      <span class="vp-field">Attendees</span>
      <div class="vp-chips" id="vp-chips"></div>
      <div class="vp-addrow">
        <input type="text" id="vp-att-input" placeholder="Add attendee name" />
        <button id="vp-att-add" title="Add attendee">+</button>
      </div>
      <span class="vp-field">Language</span>
      <div class="vp-langs" id="vp-langs">
        <button data-lang="en" class="on">English</button>
        <button data-lang="hi">Hindi</button>
        <button data-lang="multi">Auto</button>
      </div>
      <button class="vp-primary" id="vp-upload">Upload to Vivran.ai</button>
      <button class="vp-ghost" id="vp-discard">Discard recording</button>
    </div>

    <div id="vp-uploading" class="vp-centered" hidden>
      <p class="vp-label" id="vp-stage">Uploading…</p>
      <div class="vp-progress"><div id="vp-bar"></div></div>
      <p class="vp-hint" id="vp-pct"></p>
    </div>

    <div id="vp-done" class="vp-centered" hidden>
      <div class="vp-done-icon" id="vp-done-icon">✓</div>
      <p class="vp-done-text"><b id="vp-done-title"></b> <span id="vp-done-sub"></span></p>
      <button class="vp-primary" id="vp-retry" hidden>Start processing</button>
      <a class="vp-primary" id="vp-view" target="_blank" rel="noopener">View in Vivran.ai</a>
      <button class="vp-ghost" id="vp-done-btn">Done</button>
    </div>

    </div>

    <div class="vp-foot">
      <span class="vp-email" id="vp-email"></span>
      <div class="vp-foot-row">
        <a id="vp-portal" target="_blank" rel="noopener">Open Vivran.ai dashboard ↗</a>
        <button class="vp-ghost" id="vp-signout">Sign out</button>
      </div>
    </div>
  `;

  function q(id) {
    return panelEl?.querySelector(`#${id}`);
  }

  function openPanel() {
    if (!panelEl) {
      panelEl = document.createElement("div");
      panelEl.id = "vivran-panel";
      panelEl.innerHTML = PANEL_HTML;
      document.documentElement.appendChild(panelEl);
      wirePanel();
      // Double rAF so the initial off-screen transform paints first and the
      // slide-in actually animates.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => panelEl?.classList.add("vp-open")),
      );
    }
    clearInterval(panelPoll);
    panelPoll = setInterval(refreshPanel, 1500);
    refreshPanel();
  }

  function closePanel() {
    clearInterval(panelPoll);
    panelPoll = null;
    reviewInit = false;
    const el = panelEl;
    panelEl = null;
    if (!el) return;
    el.classList.remove("vp-open");
    setTimeout(() => el.remove(), 350);
  }

  function panelError(msg) {
    const banner = q("vp-error");
    if (!banner) return;
    banner.hidden = !msg;
    banner.textContent = msg ?? "";
  }

  function showSection(id) {
    ["vp-auth", "vp-idle", "vp-review", "vp-uploading", "vp-done"].forEach((s) => {
      const el = q(s);
      if (el) el.hidden = s !== id;
    });
  }

  function renderMic() {
    const row = q("vp-mic");
    if (!row) return;
    const key = panelMic === "granted" ? "ok" : "warn";
    if (row.dataset.state === key) return; // don't clobber the button mid-click
    row.dataset.state = key;
    row.innerHTML = "";
    if (key === "ok") {
      row.textContent = "🎙️ Microphone ready — your voice will be recorded";
      return;
    }
    row.append("⚠️ Mic not set up — only others will be heard. ");
    const btn = document.createElement("button");
    btn.textContent = "Enable mic";
    btn.addEventListener("click", () => bg({ type: "OPEN_SETUP" }));
    row.appendChild(btn);
  }

  function renderFoot() {
    q("vp-email").textContent = panelEmail;
    q("vp-portal").href = `${portalUrl}/dashboard`;
    q("vp-signout").hidden = !panelSignedIn;
  }

  async function refreshPanel() {
    if (!panelEl) return;
    const res = await bg({ type: "GET_STATE" });
    if (!res?.ok || !panelEl) return;
    bgState = res.state;
    if (res.portalUrl) portalUrl = res.portalUrl;
    panelSignedIn = !!res.signedIn;
    panelEmail = res.email ?? "";
    panelMic = res.mic ?? "unknown";
    renderPanel();
  }

  function renderChips() {
    const wrap = q("vp-chips");
    if (!wrap) return;
    wrap.innerHTML = "";
    panelAttendees.forEach((name, i) => {
      const chip = document.createElement("span");
      chip.className = "vp-chip";
      chip.textContent = name;
      const x = document.createElement("button");
      x.textContent = "×";
      x.addEventListener("click", () => {
        panelAttendees.splice(i, 1);
        renderChips();
      });
      chip.appendChild(x);
      wrap.appendChild(chip);
    });
  }

  function renderPanel() {
    if (!panelEl || !bgState) return;
    renderFoot();
    if (!panelSignedIn) {
      panelError(null);
      showSection("vp-auth");
      return;
    }
    panelError(bgState.error);
    switch (bgState.status) {
      case "recording":
        closePanel(); // the rail owns the screen while recording
        return;
      case "pending_upload": {
        if (!reviewInit) {
          reviewInit = true;
          q("vp-title").value = bgState.meetingTitle || meetingTitle();
          panelAttendees = [...new Set([...(bgState.attendees ?? []), ...scrapeAttendees()])];
          renderChips();
        }
        q("vp-size").textContent = bgState.recordingBytes
          ? `· ${(bgState.recordingBytes / (1024 * 1024)).toFixed(1)} MB`
          : "";
        showSection("vp-review");
        return;
      }
      case "uploading": {
        const stages = {
          audio: "Uploading audio…",
          finalize: "Saving meeting…",
          wake: "Starting processing — the server can take a minute to wake…",
        };
        q("vp-stage").textContent = stages[bgState.uploadStage] ?? "Uploading…";
        q("vp-bar").style.width = `${bgState.uploadProgress ?? 0}%`;
        q("vp-pct").textContent =
          bgState.uploadStage === "audio" ? `${bgState.uploadProgress ?? 0}%` : "";
        showSection("vp-uploading");
        return;
      }
      case "done": {
        const started = bgState.processingStarted !== false;
        q("vp-done-icon").textContent = started ? "✓" : "!";
        q("vp-done-icon").classList.toggle("warn", !started);
        q("vp-done-title").textContent = bgState.lastMeeting?.title ?? "Meeting";
        q("vp-done-sub").textContent = started
          ? "uploaded. Processing has started."
          : "uploaded, but processing hasn't started — the server didn't respond.";
        q("vp-retry").hidden = started;
        q("vp-view").href = `${portalUrl}/dashboard/meetings/${bgState.lastMeeting?.id ?? ""}`;
        showSection("vp-done");
        return;
      }
      default: {
        q("vp-meet-title").textContent = meetingTitle();
        const names = scrapeAttendees();
        q("vp-meet-sub").textContent = names.length
          ? `${names.length} participant${names.length > 1 ? "s" : ""}: ${names.join(", ")}`
          : "No participants detected yet";
        renderMic();
        showSection("vp-idle");
      }
    }
  }

  function addPanelAttendee() {
    const input = q("vp-att-input");
    if (!input) return;
    const name = input.value.trim();
    if (name && !panelAttendees.includes(name)) {
      panelAttendees.push(name);
      renderChips();
    }
    input.value = "";
    input.focus();
  }

  function resetDiscardArm() {
    clearTimeout(panelDiscardArm);
    panelDiscardArm = null;
    const btn = q("vp-discard");
    if (btn) {
      btn.textContent = "Discard recording";
      btn.classList.remove("vp-danger");
    }
  }

  function wirePanel() {
    // Meet has single-key hotkeys (mute, hand raise…) on the document —
    // keep keystrokes typed into the panel away from them.
    ["keydown", "keypress", "keyup"].forEach((type) =>
      panelEl.addEventListener(type, (e) => e.stopPropagation()),
    );

    q("vp-close").addEventListener("click", closePanel);

    q("vp-start").addEventListener("click", async () => {
      const btn = q("vp-start");
      btn.disabled = true;
      panelError(null);
      const res = await bg({ type: "START_RECORDING" });
      if (!panelEl) return;
      btn.disabled = false;
      if (!res?.ok) {
        panelError(
          res?.error ?? "Could not start — click the Vivran.ai toolbar icon once, then try again.",
        );
        return;
      }
      closePanel();
    });

    q("vp-att-add").addEventListener("click", addPanelAttendee);
    q("vp-att-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addPanelAttendee();
      }
    });

    q("vp-langs").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-lang]");
      if (!b) return;
      panelLanguage = b.dataset.lang;
      q("vp-langs")
        .querySelectorAll("button")
        .forEach((x) => x.classList.toggle("on", x === b));
    });

    q("vp-upload").addEventListener("click", async () => {
      const draft = q("vp-att-input").value.trim();
      if (draft && !panelAttendees.includes(draft)) panelAttendees.push(draft);
      if (panelAttendees.length === 0) {
        panelError("Add at least one attendee name.");
        return;
      }
      panelError(null);
      resetDiscardArm();
      reviewInit = false;
      const meta = {
        title: q("vp-title").value.trim(),
        attendees: panelAttendees,
        language: panelLanguage,
      };
      showSection("vp-uploading");
      q("vp-stage").textContent = "Uploading audio…";
      const res = await bg({ type: "UPLOAD", meta });
      if (!panelEl) return;
      if (!res?.ok) panelError(res?.error ?? "Upload failed.");
      await refreshPanel();
    });

    q("vp-discard").addEventListener("click", async () => {
      // Two-step confirm instead of a native dialog.
      if (!panelDiscardArm) {
        const btn = q("vp-discard");
        btn.textContent = "Click again to discard";
        btn.classList.add("vp-danger");
        panelDiscardArm = setTimeout(resetDiscardArm, 3000);
        return;
      }
      resetDiscardArm();
      reviewInit = false;
      await bg({ type: "DISCARD" });
      await refreshPanel();
    });

    q("vp-retry").addEventListener("click", async () => {
      const btn = q("vp-retry");
      btn.disabled = true;
      btn.textContent = "Contacting server…";
      panelError(null);
      const res = await bg({ type: "RETRY_PROCESS" });
      if (!panelEl) return;
      btn.disabled = false;
      btn.textContent = "Start processing";
      if (!res?.ok) panelError(res?.error ?? "Retry failed.");
      await refreshPanel();
    });

    q("vp-done-btn").addEventListener("click", async () => {
      await bg({ type: "RESET" });
      closePanel();
    });

    q("vp-signout").addEventListener("click", async () => {
      await bg({ type: "SIGN_OUT" });
      await refreshPanel();
    });
  }

  function renderRail(nextPhase) {
    phase = nextPhase;
    if (phase === "recording" || phase === "paused") {
      const el = ensureRail();
      el.classList.toggle("paused", phase === "paused");
      const pauseBtn = el.querySelector("#vivran-rail-pause");
      pauseBtn.innerHTML = phase === "paused" ? SVG.play : SVG.pause;
      pauseBtn.title = phase === "paused" ? "Resume recording" : "Pause recording";
    } else if (phase === "saved") {
      // Recording stopped — the review form slides in where the rail was.
      removeRail();
      openPanel();
    } else {
      removeRail();
    }
  }

  // ------------------------------------------------------------- messages

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.target !== "content") return;
    switch (message.type) {
      case "REC_STATE":
        timing = {
          startedAt: message.startedAt ?? null,
          pausedAccumMs: message.pausedAccumMs ?? 0,
          pauseStartedAt: message.pauseStartedAt ?? null,
        };
        renderRail(message.phase);
        break;
      case "OPEN_PANEL": // toolbar popup handing off to the on-page UI
        openPanel();
        sendResponse(true);
        break;
      case "UPLOAD_PROGRESS": {
        const bar = q("vp-bar");
        if (bar && bgState?.uploadStage === "audio") {
          bar.style.width = `${message.pct}%`;
          const pct = q("vp-pct");
          if (pct) pct.textContent = `${message.pct}%`;
        }
        break;
      }
    }
  });

  // Restore the on-page UI when this script (re)loads mid-flow — page
  // reload, or re-injection after an extension update.
  chrome.runtime
    .sendMessage({ target: "bg", type: "RAIL_STATE" })
    .then((res) => {
      if (res?.ok && res.phase && res.phase !== "idle") {
        timing = {
          startedAt: res.startedAt ?? null,
          pausedAccumMs: res.pausedAccumMs ?? 0,
          pauseStartedAt: res.pauseStartedAt ?? null,
        };
        renderRail(res.phase);
      }
    })
    .catch(() => {});
})();
