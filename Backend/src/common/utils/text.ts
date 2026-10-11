import crypto from "crypto";

/** Deterministic content hash for chunks / uploads (dedupe + idempotency). */
export function sha256Hex(input: string | Buffer): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function safeFileKey(prefix: string, originalName: string, ext: string): string {
  const rand = crypto.randomBytes(12).toString("hex");
  const date = new Date().toISOString().slice(0, 10);
  const cleanExt = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  void originalName;
  return `${prefix}/${date}/${rand}${cleanExt}`;
}

export function newId(prefix = "id"): string {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

export function isAllowedExtension(filename: string, allowed: string[]): boolean {
  const lower = filename.toLowerCase();
  return allowed.some((ext) => lower.endsWith(ext.toLowerCase()));
}

export function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

/** Chunk text into ~token-sized windows with overlap (tune per §7.3). */
export function chunkText(
  text: string,
  opts: { maxChars?: number; overlapChars?: number } = {}
): string[] {
  const maxChars = opts.maxChars ?? 1800; // ≈ 250–500 tokens for BN/EN mix
  const overlap = opts.overlapChars ?? 200;
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + maxChars);
    chunks.push(clean.slice(start, end));
    if (end >= clean.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}
