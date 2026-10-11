/**
 * Multilingual query utilities (backend_readme §7):
 * Bangla script / English / Banglish (romanized) / mixed + spelling variants.
 * Conservative normalization — meaning-preserving only.
 */

export type DetectedLanguage = "bn" | "en" | "banglish" | "mixed" | "unknown";

const BANGLA_RE = /[\u0980-\u09FF]/;
// Common Banglish tokens (romanized Bangla) seen in learner queries.
const BANGLISH_TOKENS = [
  "ki", "kivabe", "kibhabe", "kemon", "koto", "keno", "karon", "bujhao", "bojhao",
  "bujhai", "bujhaiya", "bujhiye", "bujhlam", "shekhao", "shikhao", "dao", "daw",
  "koro", "kore", "ta", "tar", "amar", "tomar", "tumi", "ami", "vognangsho",
  "bhognangsho", "ongko", "onko", "gonit", "sohoj", "sahaj", "easy",
];

const SPELLING_NORMALIZATION: Array<[RegExp, string]> = [
  [/\bbojhao\b/gi, "bujhao"],
  [/\bbujhai\b/gi, "bujhao"],
  [/\bkibhabe\b/gi, "kivabe"],
  [/\bvognangsho\b/gi, "bhognangsho"],
  [/\bongko\b/gi, "onko"],
  [/\bsohoj\b/gi, "sohoj"],
];

export function detectLanguage(text: string): DetectedLanguage {
  const t = (text ?? "").trim();
  if (!t) return "unknown";
  const hasBangla = BANGLA_RE.test(t);
  const lower = t.toLowerCase();
  const hasBanglishToken = BANGLISH_TOKENS.some((tok) => new RegExp(`\\b${tok}\\b`, "i").test(lower));
  const hasLatin = /[a-zA-Z]/.test(t);

  if (hasBangla && hasLatin) return "mixed";
  if (hasBangla) return "bn";
  if (hasBanglishToken) return "banglish";
  if (hasLatin) return "en";
  return "unknown";
}

export function normalizeQuery(text: string): string {
  let out = (text ?? "").replace(/\s+/g, " ").trim().slice(0, 2000);
  for (const [re, replacement] of SPELLING_NORMALIZATION) out = out.replace(re, replacement);
  return out;
}

/**
 * Candidate query variants for hybrid retrieval: original + normalized.
 * (A transliteration variant hook is provided; production can plug a
 * dedicated transliteration service without changing retrieval code.)
 */
export function queryVariants(original: string): string[] {
  const normalized = normalizeQuery(original);
  const variants = [original.trim()];
  if (normalized !== original.trim()) variants.push(normalized);
  return [...new Set(variants)].filter(Boolean).slice(0, 3);
}

/** Map requested languagePreference to response language bucket. */
export function resolveResponseLanguage(
  preference: string | undefined,
  detected: DetectedLanguage,
  retrievedSample?: string
): "bn" | "en" | "banglish" {
  if (preference === "bn" || preference === "en" || preference === "banglish") return preference;
  if (detected === "bn" || detected === "mixed") return "bn";
  if (detected === "banglish") return "banglish";
  if (detected === "en") return "en";
  if (retrievedSample && BANGLA_RE.test(retrievedSample)) return "bn";
  return "bn"; // default: young BD learners → Bangla-first
}

/** Very small safety pre-check (full safety lives in the orchestrator + provider). */
const BLOCKED_PATTERNS = [
  /give me your (password|api key|secret)/i,
  /ignore (all|your|previous) instructions/i,
  /reveal (system|secret|private)/i,
];

export function isObviouslyUnsafe(text: string): boolean {
  return BLOCKED_PATTERNS.some((re) => re.test(text ?? ""));
}
