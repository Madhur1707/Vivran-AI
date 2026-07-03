// Vivran.ai Meet Recorder — content script for meet.google.com.
//
// Detects whether the user is in an active call, scrapes participant names
// (best-effort — Meet's DOM is obfuscated and changes; the popup lets the
// user edit the list before upload), and shows a small "Recording" pill.

(() => {
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
    const names = new Set();

    // 1) Your own name — Meet exposes it on the self video tile.
    document.querySelectorAll("[data-self-name]").forEach((el) => {
      const n = cleanName(el.getAttribute("data-self-name"));
      if (n) names.add(n);
    });

    // 2) Video tiles — participant name usually sits in a .notranslate span.
    document.querySelectorAll("[data-participant-id]").forEach((el) => {
      el.querySelectorAll("span.notranslate").forEach((span) => {
        const n = cleanName(span.textContent);
        if (n) names.add(n);
      });
    });

    // 3) People side panel entries.
    document
      .querySelectorAll('[role="list"] [role="listitem"][aria-label]')
      .forEach((el) => {
        const n = cleanName(el.getAttribute("aria-label"));
        if (n) names.add(n);
      });

    return [...names].sort();
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

  // ------------------------------------------------------------ indicator

  function setIndicator(visible) {
    let pill = document.getElementById("vivran-rec-pill");
    if (!visible) {
      pill?.remove();
      return;
    }
    if (pill) return;
    pill = document.createElement("div");
    pill.id = "vivran-rec-pill";
    pill.innerHTML = '<span class="vivran-rec-dot"></span>Recording &mdash; Vivran.ai';
    document.documentElement.appendChild(pill);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.target === "content" && message.type === "REC_STATE") {
      setIndicator(message.recording);
    }
  });
})();
