import { env } from "../../config/env.js";

/** OCR adapter interface (spec §10). Mock by default; plug real OCR via HTTP. */
export interface OcrResult {
  text: string;
  confidence: number;
  provider: string;
}

export async function runOcr(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
  void mimeType;
  if (env.OCR_PROVIDER === "mock" || !env.OCR_ENDPOINT) {
    return {
      text: "",
      confidence: 0,
      provider: "mock",
    };
  }
  // Production hook: POST image bytes to OCR_ENDPOINT with OCR_API_KEY.
  const res = await fetch(env.OCR_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OCR_API_KEY}`,
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(imageBuffer),
  });
  if (!res.ok) throw new Error(`OCR provider HTTP ${res.status}`);
  const json = (await res.json()) as { text?: string; confidence?: number };
  return { text: json.text ?? "", confidence: json.confidence ?? 0, provider: env.OCR_PROVIDER };
}

/** STT adapter — audio bytes → transcript. */
export interface SttResult {
  transcript: string;
  language?: string;
  provider: string;
}

export async function transcribeAudio(audio: Buffer, mimeType: string): Promise<SttResult> {
  void audio;
  void mimeType;
  if (env.STT_PROVIDER === "mock" || !env.STT_ENDPOINT) {
    return { transcript: "", provider: "mock" };
  }
  throw new Error(`STT provider '${env.STT_PROVIDER}' not implemented — configure STT_ENDPOINT adapter`);
}

/** TTS adapter — validated text → audio bytes. */
export async function synthesizeSpeech(text: string, language: string): Promise<{ audio: Buffer; mimeType: string; provider: string }> {
  void text;
  void language;
  if (env.TTS_PROVIDER === "mock" || !env.TTS_ENDPOINT) {
    return { audio: Buffer.from("mock-audio"), mimeType: "audio/mpeg", provider: "mock" };
  }
  throw new Error(`TTS provider '${env.TTS_PROVIDER}' not implemented — configure TTS_ENDPOINT adapter`);
}

/** Capability snapshot for /admin/ai-config + health reporting. */
export function mediaCapabilities() {
  return {
    ocr: { provider: env.OCR_PROVIDER, configured: Boolean(env.OCR_ENDPOINT) || env.OCR_PROVIDER === "mock" },
    stt: { provider: env.STT_PROVIDER, configured: Boolean(env.STT_ENDPOINT) || env.STT_PROVIDER === "mock" },
    tts: { provider: env.TTS_PROVIDER, configured: Boolean(env.TTS_ENDPOINT) || env.TTS_PROVIDER === "mock" },
  };
}
