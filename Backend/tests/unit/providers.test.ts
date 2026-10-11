import { describe, it, expect } from "vitest";
import { MockLLMProvider } from "../../src/modules/ai-providers/mock.provider.js";
import { embedText, cosineSimilarity } from "../../src/modules/embeddings/adapter.js";
import { sha256Hex, chunkText } from "../../src/common/utils/text.js";

describe("providers + embeddings", () => {
  it("mock LLM returns text + structured payloads", async () => {
    const mock = new MockLLMProvider();
    const r = await mock.generateText([{ role: "user", content: "vognangsho ki?" }], { model: "mock-tutor-v1" });
    expect(r.text.length).toBeGreaterThan(10);
    expect(r.provider).toBe("mock");
    expect(mock.supports("text", "mock-tutor-v1")).toBe(true);
    expect(mock.supports("vision", "mock-tutor-v1")).toBe(false);
  });

  it("hash embeddings are normalized + deterministic with matching dimension", async () => {
    const a = await embedText("ভগ্নাংশ কী? সহজ করে বোঝাও।");
    const b = await embedText("ভগ্নাংশ কী? সহজ করে বোঝাও।");
    expect(a.vector.length).toBeGreaterThan(100);
    expect(a.vector).toEqual(b.vector);
    expect(cosineSimilarity(a.vector, b.vector)).toBeCloseTo(1, 5);
    const c = await embedText("What is photosynthesis?");
    expect(cosineSimilarity(a.vector, c.vector)).toBeLessThan(0.99);
  });

  it("chunking + hashing are stable", () => {
    const chunks = chunkText("a ".repeat(3000));
    expect(chunks.length).toBeGreaterThan(1);
    expect(sha256Hex("abc")).toHaveLength(64);
  });
});
