/**
 * Provider-independent AI layer (backend_readme §8).
 * App code depends ONLY on these interfaces — never on vendor SDKs directly.
 */

export type TutorMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type TutorGenerationOptions = {
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export type LLMTextResult = {
  text: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  finishReason?: string;
  vendorRequestId?: string;
  latencyMs: number;
};

export type ModelCapability =
  | "text"
  | "structured-json"
  | "vision"
  | "streaming"
  | "audio-in"
  | "audio-out"
  | "tools";

export interface LLMProvider {
  readonly name: string;
  generateText(messages: TutorMessage[], options: TutorGenerationOptions): Promise<LLMTextResult>;
  generateStructured<T>(
    messages: TutorMessage[],
    schema: unknown,
    options: TutorGenerationOptions
  ): Promise<T>;
  supports(capability: ModelCapability, model: string): boolean;
}

/** Normalized provider error (routes map this to stable app error codes). */
export class ProviderError extends Error {
  readonly kind:
    | "auth"
    | "rate-limited"
    | "timeout"
    | "outage"
    | "unsupported-capability"
    | "bad-output"
    | "empty"
    | "safety-block"
    | "unknown";
  readonly retryable: boolean;
  constructor(kind: ProviderError["kind"], message: string, opts: { retryable?: boolean } = {}) {
    super(message);
    this.kind = kind;
    this.retryable = opts.retryable ?? false;
  }
}

export function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}
