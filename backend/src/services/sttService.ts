import { env } from "../config/env.js";

const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text-translate";

export async function speechToText(audioBuffer: Buffer, languageCode = "hi-IN", mimeType = "audio/webm"): Promise<string> {
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" : "wav";
  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer], { type: mimeType }), `audio.${ext}`);
  formData.append("model", "saaras:v2.5");
  formData.append("language_code", languageCode);

  const res = await fetch(SARVAM_STT_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": env.SARVAM_API_KEY,
    },
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Sarvam STT failed (${res.status}): ${errBody}`);
  }

  const data = await res.json() as { transcript: string };
  return data.transcript;
}
