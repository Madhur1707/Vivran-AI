import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: "/ffmpeg/ffmpeg-core.js",
        wasmURL: "/ffmpeg/ffmpeg-core.wasm",
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

/**
 * Transcodes a recording to mono/16kHz/Opus (48kbps) in-browser before upload.
 * That's enough bandwidth for speech ASR (Deepgram) with no accuracy loss,
 * and drops the video track from screen/video recordings since only audio matters.
 */
export async function compressAudio(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<File> {
  const ffmpeg = await getFFmpeg();

  const onFfmpegProgress = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(Math.max(progress, 0), 1));
  };
  ffmpeg.on("progress", onFfmpegProgress);

  const inputExt = file.name.match(/\.[^.]+$/)?.[0] ?? "";
  const inputName = `input${inputExt}`;
  const outputName = "output.ogg";

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    await ffmpeg.exec([
      "-i", inputName,
      "-vn",
      "-ac", "1",
      "-ar", "16000",
      "-c:a", "libopus",
      "-b:a", "48k",
      "-compression_level", "5",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type: "audio/ogg" });
    const baseName = file.name.replace(/\.[^.]+$/, "");

    return new File([blob], `${baseName}.ogg`, { type: "audio/ogg" });
  } finally {
    ffmpeg.off("progress", onFfmpegProgress);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
