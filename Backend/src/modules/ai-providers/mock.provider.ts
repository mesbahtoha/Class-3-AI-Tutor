import type { LLMProvider, ModelCapability, TutorGenerationOptions, TutorMessage } from "./types.js";
import { ProviderError } from "./types.js";

/**
 * Deterministic mock provider — zero API cost, used for automated tests and
 * local dev without keys. Output is child-friendly and schema-valid.
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";

  supports(capability: ModelCapability, _model: string): boolean {
    return capability === "text" || capability === "structured-json";
  }

  async generateText(messages: TutorMessage[], options: TutorGenerationOptions) {
    const start = Date.now();
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const q = (lastUser?.content ?? "").slice(0, 400);
    const text =
      `Cholo, shohoj kore bujhi! 🌱\n\n` +
      `Tomar proshno: "${q || "ajker pora"}"\n\n` +
      `Step 1: Prothome amra mul kotha ta chinte shikhbo.\n` +
      `Step 2: Tarpor boi-er udahoron diye practice korbo.\n\n` +
      `(Mock answer — configure OPENROUTER_API_KEY / ANTHROPIC_API_KEY for real AI.)`;
    return {
      text,
      provider: "mock",
      model: options.model,
      promptTokens: 50,
      completionTokens: 120,
      finishReason: "stop",
      vendorRequestId: `mock_${Date.now()}`,
      latencyMs: Date.now() - start,
    };
  }

  async generateStructured<T>(
    messages: TutorMessage[],
    _schema: unknown,
    options: TutorGenerationOptions
  ): Promise<T> {
    const text = (await this.generateText(messages, options)).text;
    // Minimal valid structured payloads used by lesson/quiz routes in mock mode.
    const looksQuiz = messages.some((m) => /quiz/i.test(m.content));
    if (looksQuiz) {
      return {
        title: "Mock Quiz — Class 3",
        questions: [
          {
            id: "q1",
            type: "mcq",
            prompt: "Mock question: 2 + 3 = koto?",
            options: ["4", "5", "6", "7"],
            answer: "5",
            explanation: text.slice(0, 200),
          },
        ],
      } as unknown as T;
    }
    return {
      title: "Mock Lesson — Class 3",
      slides: [
        { type: "TITLE", data: { heading: "Ajker Pora", subheading: "Shohoj kore shikhi" } },
        { type: "EXPLANATION", data: { body: text.slice(0, 500) } },
        { type: "SUMMARY", data: { points: ["Mul kotha bujhechi", "Udahoron dekhechi"] } },
      ],
    } as unknown as T;
  }
}

/** Capability registry for models (spec §8.4). */
const CAPABILITY_TABLE: Record<string, ModelCapability[]> = {
  "mock-tutor-v1": ["text", "structured-json"],
};

export function mockCapabilities(model: string): ModelCapability[] {
  return CAPABILITY_TABLE[model] ?? ["text", "structured-json"];
}

export function assertMockCapability(model: string, cap: ModelCapability) {
  if (!mockCapabilities(model).includes(cap)) {
    throw new ProviderError("unsupported-capability", `Mock model ${model} lacks ${cap}`);
  }
}
