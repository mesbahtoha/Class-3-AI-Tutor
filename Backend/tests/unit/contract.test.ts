import { describe, it, expect } from "vitest";
import { tutorResponseSchema, lessonPlanSchema, quizSchema } from "../../src/modules/tutor/contract.js";

describe("tutor contracts (spec §9)", () => {
  it("accepts a valid ANSWERED response with DB-built citations", () => {
    const parsed = tutorResponseSchema.safeParse({
      answer: "ভগ্নাংশ মানে সমান ভাগের অংশ।",
      language: "bn",
      answerStatus: "ANSWERED",
      sources: [
        { bookId: "b1", bookTitle: "Class 3 Mathematics", pageStart: 28, chunkId: "c1" },
      ],
      requestId: "req_test",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invented/empty answers and bad slide types", () => {
    expect(tutorResponseSchema.safeParse({ answer: "", language: "bn", answerStatus: "ANSWERED", sources: [], requestId: "r" }).success).toBe(false);
    expect(
      lessonPlanSchema.safeParse({ title: "t", slides: [{ type: "SCRIPT_TAG", data: {} }] }).success
    ).toBe(false);
  });

  it("accepts lesson + quiz payloads", () => {
    expect(
      lessonPlanSchema.safeParse({
        title: "Fractions",
        slides: [
          { type: "TITLE", data: { heading: "Fractions" } },
          { type: "SUMMARY", data: { points: ["a", "b"] } },
        ],
      }).success
    ).toBe(true);
    expect(
      quizSchema.safeParse({
        title: "Quiz",
        questions: [{ id: "q1", type: "mcq", prompt: "2+3?", options: ["4", "5"], answer: "5" }],
      }).success
    ).toBe(true);
  });
});
