import { env } from "../../config/env.js";
import type { LLMProvider, ModelCapability, TutorGenerationOptions, TutorMessage } from "./types.js";
import { ProviderError, fetchWithTimeout } from "./types.js";

/**
 * Optional Gemini adapter (spec §8.3). Implemented against the
 * generateContent REST endpoint; disabled unless GEMINI_API_KEY is set.
 */
export class GeminiAdapter implements LLMProvider {
  readonly name = "gemini";

  supports(capability: ModelCapability, _model: string): boolean {
    return capability === "text" || capability === "structured-json";
  }

  async generateText(messages: TutorMessage[], options: TutorGenerationOptions) {
    const start = Date.now();
    if (!env.GEMINI_API_KEY) throw new ProviderError("auth", "GEMINI_API_KEY is not configured");
    const timeoutMs = options.timeoutMs ?? env.AI_REQUEST_TIMEOUT_MS;
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");

    let res: Response;
    try {
      res = await fetchWithTimeout(
        `${env.GEMINI_BASE_URL}/v1beta/models/${encodeURIComponent(options.model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
            contents,
            generationConfig: {
              temperature: options.temperature ?? 0.6,
              maxOutputTokens: options.maxOutputTokens ?? env.AI_MAX_OUTPUT_TOKENS,
            },
          }),
        },
        timeoutMs
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderError("timeout", "Gemini request timed out", { retryable: true });
      }
      throw new ProviderError("outage", "Gemini unreachable", { retryable: true });
    }
    if (res.status === 429) throw new ProviderError("rate-limited", "Gemini rate limited", { retryable: true });
    if (!res.ok) throw new ProviderError("outage", `Gemini HTTP ${res.status}`, { retryable: res.status >= 500 });
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    if (!text) throw new ProviderError("empty", "Gemini returned an empty response");
    return {
      text, provider: "gemini", model: options.model,
      finishReason: "stop", latencyMs: Date.now() - start,
    };
  }

  async generateStructured<T>(messages: TutorMessage[], schema: unknown, options: TutorGenerationOptions): Promise<T> {
    const result = await this.generateText(
      [...messages, { role: "system", content: `Reply JSON only. Schema: ${JSON.stringify(schema).slice(0, 6000)}` }],
      options
    );
    try {
      return JSON.parse(result.text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()) as T;
    } catch {
      throw new ProviderError("bad-output", "Gemini returned invalid structured JSON");
    }
  }
}
