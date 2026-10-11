import { env } from "../../config/env.js";
import type { LLMProvider, ModelCapability } from "./types.js";
import { MockLLMProvider } from "./mock.provider.js";
import { OpenRouterAdapter } from "./openrouter.provider.js";
import { AnthropicAdapter } from "./anthropic.provider.js";
import { GeminiAdapter } from "./gemini.provider.js";

/** Allowlisted providers — Admin API can only select these (spec §8.5). */
export const ALLOWLISTED_PROVIDERS = ["mock", "openrouter", "anthropic", "gemini"] as const;

const singletons: Partial<Record<string, LLMProvider>> = {};

export function getProvider(name?: string): LLMProvider {
  const key = (name ?? env.AI_PROVIDER).toLowerCase();
  if (!ALLOWLISTED_PROVIDERS.includes(key as (typeof ALLOWLISTED_PROVIDERS)[number])) {
    throw new Error(`Provider '${key}' is not allowlisted`);
  }
  if (!singletons[key]) {
    singletons[key] =
      key === "openrouter" ? new OpenRouterAdapter()
      : key === "anthropic" ? new AnthropicAdapter()
      : key === "gemini" ? new GeminiAdapter()
      : new MockLLMProvider();
  }
  return singletons[key] as LLMProvider;
}

export function activeModel(): string {
  return env.AI_MODEL;
}

/** Capability check before use (spec §8.4); route returns 422 when unsupported. */
export function assertCapability(provider: LLMProvider, model: string, cap: ModelCapability) {
  if (!provider.supports(cap, model)) {
    const err = new Error(`Model '${model}' does not support '${cap}'`) as Error & {
      code?: string;
    };
    err.code = "UNSUPPORTED_CAPABILITY";
    throw err;
  }
}
