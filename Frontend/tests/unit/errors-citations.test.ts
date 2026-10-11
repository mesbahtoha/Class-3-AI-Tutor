import { describe, it, expect } from "vitest";
import { toFriendlyError } from "@/lib/api/errors";
import { citationLabel } from "@/lib/utils";

describe("error mapping (child-safe, requestId kept)", () => {
  it("maps rate limits to friendly Bangla copy", () => {
    const e = toFriendlyError("RATE_LIMITED", "Please try again shortly.", "req_1");
    expect(e.message).toContain("পরে");
    expect(e.requestId).toBe("req_1");
    expect(e.retryable).toBe(true);
  });

  it("maps quota to sign-in guidance without retry", () => {
    const e = toFriendlyError("QUOTA_EXCEEDED", "", "req_2");
    expect(e.message).toContain("সাইন ইন");
    expect(e.retryable).toBe(false);
  });

  it("never surfaces raw provider text for unknown codes", () => {
    const e = toFriendlyError("WEIRD_VENDOR_X", "secret stack trace here", "req_3");
    expect(e.message).not.toContain("secret");
    expect(e.requestId).toBe("req_3");
  });
});

describe("citation labels (backend values only)", () => {
  it("renders title + page", () => {
    expect(citationLabel({ bookTitle: "গণিত", pageStart: 28 })).toBe("গণিত · পৃষ্ঠা 28");
  });

  it("renders page ranges accurately", () => {
    const label = citationLabel({ bookTitle: "গণিত", chapterTitle: "ভগ্নাংশ", pageStart: 28, pageEnd: 30 });
    expect(label).toContain("ভগ্নাংশ");
    expect(label).toContain("28–30");
  });
});
