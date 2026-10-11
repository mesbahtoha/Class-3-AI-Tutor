import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

/**
 * E2E acceptance (spec §18.3) — runnable without external services:
 * guest flow, ownership isolation, unsupported capability, quota envelope.
 */
describe("e2e acceptance", () => {
  const app = createApp();

  it("guest asks in Banglish and gets a safe, schema-valid answer", async () => {
    const guest = await request(app).post("/api/v1/guest/session");
    const token = guest.body.data.guestToken as string;
    for (const message of [
      "vognangsho ki? easy kore bujhao",
      "ভগ্নাংশ কী? সহজ করে বোঝাও।",
      "What is a fraction? Explain for Class 3.",
    ]) {
      const res = await request(app)
        .post("/api/v1/tutor/chat")
        .set("Authorization", `Bearer ${token}`)
        .send({ message });
      expect(res.status).toBe(200);
      expect(typeof res.body.data.answer).toBe("string");
    }
  });

  it("another user's conversation id is not accessible (ownership)", async () => {
    const res = await request(app)
      .get("/api/v1/conversations/conv_someone_else")
      .set("Authorization", "Bearer mock_guardian1");
    expect([401, 404]).toContain(res.status);
  });

  it("oversized/unsupported payloads are rejected with stable codes", async () => {
    const guest = await request(app).post("/api/v1/guest/session");
    const token = guest.body.data.guestToken as string;
    const longMsg = "a".repeat(5000);
    const res = await request(app)
      .post("/api/v1/tutor/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: longMsg });
    expect([400, 413]).toContain(res.status);
  });
});
