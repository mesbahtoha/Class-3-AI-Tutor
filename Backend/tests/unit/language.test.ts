import { describe, it, expect } from "vitest";
import {
  detectLanguage,
  normalizeQuery,
  queryVariants,
  resolveResponseLanguage,
} from "../../src/common/utils/language.js";

describe("language utils (spec §7.1)", () => {
  it("detects Bangla script", () => {
    expect(detectLanguage("ভগ্নাংশ কী? সহজ করে বোঝাও।")).toBe("bn");
  });
  it("detects English", () => {
    expect(detectLanguage("What is a fraction? Explain for Class 3.")).toBe("en");
  });
  it("detects Banglish", () => {
    expect(detectLanguage("vognangsho ki? easy kore bujhao")).toBe("banglish");
  });
  it("detects mixed", () => {
    expect(detectLanguage("এই math ta step by step explain koro")).toBe("mixed");
  });
  it("normalizes spelling variants (conservative)", () => {
    expect(normalizeQuery("bojhao kibhabe vognangsho")).toContain("bujhao");
    expect(normalizeQuery("bojhao kibhabe vognangsho")).toContain("kivabe");
  });
  it("keeps original + normalized variants", () => {
    const v = queryVariants("bojhao kivabe?");
    expect(v.length).toBeGreaterThanOrEqual(1);
    expect(v[0]).toContain("bojhao");
  });
  it("follow-up stays banglish-aware", () => {
    expect(detectLanguage("amar answer vul holo keno?")).toBe("banglish");
  });
  it("resolves response language from preference/auto (Bangla-script default)", () => {
    expect(resolveResponseLanguage("en", "bn")).toBe("en");
    expect(resolveResponseLanguage("banglish", "bn")).toBe("banglish"); // explicit choice wins
    expect(resolveResponseLanguage("auto", "mixed")).toBe("bn");
    expect(resolveResponseLanguage("auto", "en")).toBe("en");
  });
  it("answers Banglish questions in Bangla script on auto", () => {
    expect(resolveResponseLanguage("auto", "banglish")).toBe("bn");
    expect(resolveResponseLanguage(undefined, "banglish")).toBe("bn");
    expect(resolveResponseLanguage(undefined, "unknown")).toBe("bn");
  });
});
