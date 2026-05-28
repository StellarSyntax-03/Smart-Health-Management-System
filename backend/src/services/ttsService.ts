import { env } from "../config/env.js";

const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";

function detectLanguage(text: string): string {
  if (/[ऀ-ॿ]/.test(text)) return "hi-IN";
  const hindiRomanized = /\b(kya|hai|hain|mein|mera|meri|kaise|aap|aapka|kar|raha|rahi|nahi|kuch|bahut|dard|dukh|pet|sar|bukhar|dawai|doctor|bata|madad|theek|accha|ji|haan|naa)\b/i;
  if (hindiRomanized.test(text)) return "hi-IN";
  return "en-IN";
}

export async function textToSpeech(text: string, langHint?: string): Promise<Buffer> {
  const lang = langHint || detectLanguage(text);

  const res = await fetch(SARVAM_TTS_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": env.SARVAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: lang,
      speaker: "anushka",
      model: "bulbul:v2",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Sarvam TTS failed (${res.status}): ${errBody}`);
  }

  const data = await res.json() as { audios: string[] };
  return Buffer.from(data.audios[0], "base64");
}
