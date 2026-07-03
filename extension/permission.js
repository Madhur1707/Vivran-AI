// One-time microphone permission grant for the extension origin.
// Offscreen documents can't show permission prompts, so the user grants mic
// access here once; after that the offscreen recorder can use it silently.

const statusEl = document.getElementById("status");
const btn = document.getElementById("grantBtn");

async function updateStatus() {
  try {
    const { state } = await navigator.permissions.query({ name: "microphone" });
    if (state === "granted") {
      statusEl.textContent = "✓ Microphone enabled — you can close this tab.";
      statusEl.className = "status ok";
      btn.disabled = true;
      return true;
    }
    if (state === "denied") {
      statusEl.textContent =
        "✗ Microphone blocked. Click the icon left of the address bar and allow the microphone, then reload.";
      statusEl.className = "status bad";
      return false;
    }
  } catch {
    /* permissions API unavailable — user can still click the button */
  }
  statusEl.textContent = "";
  return false;
}

btn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop()); // only needed the grant
  } catch {
    /* denied — reflected below */
  }
  await updateStatus();
});

updateStatus();
