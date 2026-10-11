import { env } from "../../config/env.js";
import type { LLMProvider, ModelCapability, TutorGenerationOptions, TutorMessage } from "./types.js";
import { ProviderError, fetchWithTimeout } from "./types.js";

/**
 * OpenRouter adapter — first dev/presentation provider (spec §8.3).
 * Uses OpenAI-compatible chat completions + JSON mode for structured output.
 * Handles 429 / timeout / outage / bad-output explicitly (§14.1).
 */
export class OpenRouterAdapter implements LLMProvider {
  readonly name = "openrouter";

  supports(capability: ModelCapability, _model: string): boolean {
    // Conservative default: text + structured JSON. Vision/audio depend on the
    // specific model — checked per-request against allowlist in provider_configs.
    return capability === "text" || capability === "structured-json";
  }

  private headers(): Record<string, string> {
    if (!env.OPENROUTER_API_KEY) {
      throw new ProviderError("auth", "OPENROUTER_API_KEY is not configured");
    }
    const h: Record<string, string> = {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    };
    if (env.OPENROUTER_APP_URL) h["HTTP-Referer"] = env.OPENROUTER_APP_URL;
    if (env.OPENROUTER_APP_NAME) h["X-Title"] = env.OPENROUTER_APP_NAME;
    return h;
  }

  async generateText(messages: TutorMessage[], options: TutorGenerationOptions) {
    const start = Date.now();
    const timeoutMs = options.timeoutMs ?? env.AI_REQUEST_TIMEOUT_MS;
    let res: Response;
    try {
      res = await fetchWithTimeout(
        `${env.OPENROUTER_BASE_URL}/chat/completions`,
        {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({
            model: options.model,
            messages,
            temperature: options.temperature ?? 0.6,
            max_tokens: options.maxOutputTokens ?? env.AI_MAX_OUTPUT_TOKENS,
          }),
        },
        timeoutMs
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderError("timeout", "OpenRouter request timed out", { retryable: true });
      }
      throw new ProviderError("outage", "OpenRouter unreachable", { retryable: true });
    }

    if (res.status === 401 || res.status === 403) {
      throw new ProviderError("auth", "OpenRouter credentials invalid");
    }
    if (res.status === 429) {
      throw new ProviderError("rate-limited", "OpenRouter rate limit / quota exhausted", {
        retryable: true,
      });
    }
    if (!res.ok) {
      throw new ProviderError("outage", `OpenRouter HTTP ${res.status}`, { retryable: res.status >= 500 });
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      id?: string;
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) throw new ProviderError("empty", "OpenRouter returned an empty response");
    return {
      text,
      provider: "openrouter",
      model: options.model,
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
      finishReason: json.choices?.[0]?.finish_reason,
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
      `You MUST reply with valid JSON only (no markdown fences). JSON Schema:\n` +
      JSON.stringify(schema).slice(0, 6000);
    const result = await this.generateText(
      [...messages, { role: "system", content: schemaText }],
      { ...options }
    );
    const cleaned = result.text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new ProviderError("bad-output", "OpenRouter returned invalid structured JSON");
    }
  }
}
