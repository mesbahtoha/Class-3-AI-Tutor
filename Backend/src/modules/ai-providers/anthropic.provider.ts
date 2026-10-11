import { env } from "../../config/env.js";
import type { LLMProvider, ModelCapability, TutorGenerationOptions, TutorMessage } from "./types.js";
import { ProviderError, fetchWithTimeout } from "./types.js";

/**
 * Anthropic Claude adapter — production-grade path (spec §8.3).
 * Direct Messages API. Added without changing tutor routes/contracts.
 */
export class AnthropicAdapter implements LLMProvider {
  readonly name = "anthropic";

  supports(capability: ModelCapability, model: string): boolean {
    if (capability === "text" || capability === "structured-json") return true;
    if (capability === "vision") return /claude/i.test(model);
    return false;
  }

  async generateText(messages: TutorMessage[], options: TutorGenerationOptions) {
    const start = Date.now();
    if (!env.ANTHROPIC_API_KEY) {
      throw new ProviderError("auth", "ANTHROPIC_API_KEY is not configured");
    }
    const timeoutMs = options.timeoutMs ?? env.AI_REQUEST_TIMEOUT_MS;
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const turns = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    let res: Response;
    try {
      res = await fetchWithTimeout(
        `${env.ANTHROPIC_BASE_URL}/v1/messages`,
        {
          method: "POST",
          headers: {
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: options.model,
            max_tokens: options.maxOutputTokens ?? env.AI_MAX_OUTPUT_TOKENS,
            temperature: options.temperature ?? 0.6,
            system: system || undefined,
            messages: turns,
          }),
        },
        timeoutMs
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderError("timeout", "Anthropic request timed out", { retryable: true });
      }
      throw new ProviderError("outage", "Anthropic unreachable", { retryable: true });
    }

    if (res.status === 401 || res.status === 403) throw new ProviderError("auth", "Anthropic credentials invalid");
    if (res.status === 429) throw new ProviderError("rate-limited", "Anthropic rate limited", { retryable: true });
    if (!res.ok) throw new ProviderError("outage", `Anthropic HTTP ${res.status}`, { retryable: res.status >= 500 });

    const json = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
      id?: string;
      stop_reason?: string;
    };
    const text = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
    if (!text) throw new ProviderError("empty", "Anthropic returned an empty response");
    return {
      text,
      provider: "anthropic",
      model: options.model,
      promptTokens: json.usage?.input_tokens,
      completionTokens: json.usage?.output_tokens,
      finishReason: json.stop_reason,
      vendorRequestId: json.id,
      latencyMs: Date.now() - start,
    };
  }

  async generateStructured<T>(
    messages: TutorMessage[],
    schema: unknown,
    options: TutorGenerationOptions
  ): Promise<T> {
    const schemaText =
      `Reply with valid JSON only (no markdown). JSON Schema:\n` + JSON.stringify(schema).slice(0, 6000);
    const result = await this.generateText(
      [...messages, { role: "system", content: schemaText }],
      options
    );
    try {
      return JSON.parse(result.text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()) as T;
    } catch {
      throw new ProviderError("bad-output", "Anthropic returned invalid structured JSON");
    }
  }
}
