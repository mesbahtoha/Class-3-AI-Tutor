import crypto from "crypto";
import { env } from "../../config/env.js";
import { ProviderError, fetchWithTimeout } from "../ai-providers/types.js";

/**
 * Embedding adapter — SEPARATE from the LLM provider (spec §8.7).
 * - "hash": deterministic local vectors (dev/test, zero cost). Dimension =
 *   EMBEDDING_DIMENSION. Good enough for ingestion pipeline + retrieval tests.
 * - "openai-compatible": POST {input, model} to EMBEDDING_BASE_URL/embeddings
 *   (works with OpenAI / OpenRouter embeddings). Requires EMBEDDING_API_KEY.
 * Changing the embedding model requires full re-embedding (vectors incompatible).
 */

export interface EmbeddingResult {
  vector: number[];
  model: string;
  dimension: number;
}

function hashVector(text: string, dimension: number): number[] {
  const vec = new Array<number>(dimension).fill(0);
  const tokens = text.toLowerCase().split(/[\s\u0980-\u09FF.,!?;:()\[\]{}"'\-]+/).filter(Boolean);
  const source = tokens.length > 0 ? tokens : [text.toLowerCase()];
  for (const tok of source) {
    for (let i = 0; i < 3; i++) {
      const h = crypto.createHash("sha256").update(`${tok}#${i}`).digest();
      const idx = h.readUInt32BE(0) % dimension;
      const val = h.readUInt32BE(4) / 0xffffffff;
      vec[idx] = (vec[idx] ?? 0) + (val - 0.5);
    }
  }
  // L2 normalize for cosine similarity.
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedText(text: string): Promise<EmbeddingResult> {
  const dimension = env.EMBEDDING_DIMENSION;
  const model = env.EMBEDDING_MODEL;
  const clean = (text ?? "").slice(0, 8000);
  if (!clean.trim()) return { vector: new Array(dimension).fill(0), model, dimension };

  if (env.EMBEDDING_PROVIDER === "hash") {
    return { vector: hashVector(clean, dimension), model, dimension };
  }

  // openai-compatible
  if (!env.EMBEDDING_API_KEY || !env.EMBEDDING_BASE_URL) {
    throw new ProviderError("auth", "EMBEDDING_API_KEY/BASE_URL not configured");
  }
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${env.EMBEDDING_BASE_URL}/embeddings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.EMBEDDING_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, input: clean }),
      },
      30000
    );
  } catch {
    throw new ProviderError("outage", "Embedding provider unreachable", { retryable: true });
  }
  if (!res.ok) throw new ProviderError("unknown", `Embedding HTTP ${res.status}`, { retryable: res.status >= 500 });
  const json = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  const vector = json.data?.[0]?.embedding;
  if (!vector || vector.length === 0) throw new ProviderError("bad-output", "Empty embedding response");
  if (vector.length !== dimension) {
    throw new ProviderError(
      "bad-output",
      `Embedding dimension mismatch: got ${vector.length}, expected ${dimension}. Re-embed with matching EMBEDDING_DIMENSION.`
    );
  }
  return { vector, model, dimension };
}

export function toPgVectorLiteral(vector: number[]): string {
  return `[${vector.map((v) => (Number.isFinite(v) ? v : 0)).join(",")}]`;
}

/** Cosine similarity for in-memory fallback retrieval (tests / no-DB mode). */
export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    na += (a[i] ?? 0) ** 2;
    nb += (b[i] ?? 0) ** 2;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
