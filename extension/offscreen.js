// Vivran.ai Meet Recorder — offscreen document.
//
// Captures the Meet tab's audio (remote participants) plus the user's
// microphone (their own voice), mixes both into one stream, records it with
// MediaRecorder, and uploads the resulting blob to Supabase Storage.
//
// Offscreen documents can only use chrome.runtime, so all config and tokens
// arrive in messages from the background service worker.

let recorder = null;
let chunks = [];
let recordedBlob = null;
let tabStream = null;
let micStream = null;
let audioCtx = null;
let startedAt = 0;

function cleanupStreams() {
  for (const stream of [tabStream, micStream]) {
    stream?.getTracks().forEach((t) => t.stop());
  }
  tabStream = null;
  micStream = null;
  audioCtx?.close().catch(() => {});
  audioCtx = null;
}

async function start(streamId) {
  if (recorder && recorder.state !== "inactive") {
    throw new Error("Recorder already running.");
  }
  recordedBlob = null;
  chunks = [];

  // Tab audio via the stream ID minted by the service worker.
  tabStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  // Microphone is best-effort: offscreen documents can't show a permission
  // prompt, so this only works if permission.html granted it earlier.
  let micOk = false;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    micOk = true;
  } catch {
    micStream = null;
  }

  audioCtx = new AudioContext();
  const mixed = audioCtx.createMediaStreamDestination();
  const tabSource = audioCtx.createMediaStreamSource(tabStream);
  tabSource.connect(mixed);
  // Capturing a tab mutes it for the user — route the audio back out so the
  // user can still hear the meeting.
  tabSource.connect(audioCtx.destination);
  if (micStream) {
    audioCtx.createMediaStreamSource(micStream).connect(mixed);
  }

  recorder = new MediaRecorder(mixed.stream, {
    mimeType: "audio/webm;codecs=opus",
    audioBitsPerSecond: 64000,
  });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.onstop = () => {
    recordedBlob = new Blob(chunks, { type: "audio/webm" });
    chunks = [];
    cleanupStreams();
  };

  // If the capture dies on its own (tab closed, Meet ended), finalize the
  // blob and tell the background so state doesn't stay stuck on "recording".
  tabStream.getAudioTracks()[0].addEventListener("ended", async () => {
    if (recorder && recorder.state !== "inactive") {
      const { bytes } = await stop();
      chrome.runtime.sendMessage({ target: "bg", type: "RECORDING_STOPPED", bytes });
    }
  });

  recorder.start(1000); // 1s timeslice so a crash loses at most a second
  startedAt = Date.now();
  return { mic: micOk };
}

function stop() {
  return new Promise((resolve) => {
    if (!recorder || recorder.state === "inactive") {
      resolve({ bytes: recordedBlob?.size ?? 0, durationMs: 0 });
      return;
    }
    const durationMs = Date.now() - startedAt;
    recorder.addEventListener(
      "stop",
      () => resolve({ bytes: recordedBlob?.size ?? 0, durationMs }),
      { once: true },
    );
    recorder.stop();
  });
}

// XHR instead of fetch: fetch has no upload progress events.
function upload({ url, token, anonKey }) {
  return new Promise((resolve, reject) => {
    if (!recordedBlob || recordedBlob.size === 0) {
      reject(new Error("No recording to upload."));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("Content-Type", "audio/webm");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        chrome.runtime.sendMessage({ target: "bg", type: "UPLOAD_PROGRESS", pct }).catch(() => {});
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let detail = xhr.statusText;
        try {
          detail = JSON.parse(xhr.responseText).message ?? detail;
        } catch {}
        reject(new Error(`Upload failed: ${detail}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed: network error."));
    xhr.send(recordedBlob);
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen") return;

  const respond = (promise) => {
    promise
      .then((data) => sendResponse({ ok: true, ...(data ?? {}) }))
      .catch((err) =>
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      );
    return true;
  };

  switch (message.type) {
    case "START":
      return respond(start(message.streamId));
    case "STOP":
      return respond(stop());
    case "UPLOAD":
      return respond(upload(message).then(() => ({})));
    default:
      return;
  }
});
