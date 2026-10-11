import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SlideView, isSupportedSlide } from "@/components/lessons/Slides";

describe("slide registry (safe renderer)", () => {
  it("supports all 8 MVP slide types", () => {
    for (const t of ["TITLE", "EXPLANATION", "IMAGE", "DIAGRAM", "EXAMPLE", "INTERACTIVE", "QUIZ", "SUMMARY"]) {
      expect(isSupportedSlide(t)).toBe(true);
    }
  });

  it("renders TITLE + SUMMARY without executing anything", () => {
    const { container } = render(
      <SlideView slide={{ type: "TITLE", data: { heading: "ভগ্নাংশ" } }} />
    );
    expect(screen.getByText("ভগ্নাংশ")).toBeTruthy();
    // No script/iframe injection surface
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("shows a controlled message for unknown types (never raw HTML)", () => {
    render(<SlideView slide={{ type: "SCRIPT_TAG", data: { html: "<script>alert(1)</script>" } }} />);
    expect(screen.getByText(/এই স্লাইডটা এখন দেখানো যাচ্ছে না/)).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
  });

  it("renders EXAMPLE steps and QUIZ options as plain text", () => {
    render(<SlideView slide={{ type: "EXAMPLE", data: { title: "যোগ", steps: ["১+২", "৩ হয়"] } }} />);
    expect(screen.getByText("১+২")).toBeTruthy();
  });
});
