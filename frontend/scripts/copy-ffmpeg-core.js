// Copies the ffmpeg.wasm single-threaded core from node_modules into public/
// so it's served self-hosted (no external CDN dependency at runtime).
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "@ffmpeg", "core", "dist", "umd");
const dest = path.join(__dirname, "..", "public", "ffmpeg");

fs.mkdirSync(dest, { recursive: true });

for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}

console.log("Copied ffmpeg-core files to public/ffmpeg/");
