import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

describe("API integration (no DB / no keys required)", () => {
  const app = createApp();

  it("GET /health is ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("GET /api/v1/health/ready degrades gracefully without DB", async () => {
    const res = await request(app).get("/api/v1/health/ready");
    expect([200, 503]).toContain(res.status);
    expect(res.body.data.checks).toBeTruthy();
  });

  it("POST /api/v1/guest/session issues a signed token", async () => {
    const res = await request(app).post("/api/v1/guest/session");
    expect(res.status).toBe(201);
    expect(res.body.data.guestToken).toMatch(/^guest_/);
  });

  it("POST /api/v1/tutor/chat works in mock mode (guest)", async () => {
    const guest = await request(app).post("/api/v1/guest/session");
    const token = guest.body.data.guestToken as string;
    const res = await request(app)
      .post("/api/v1/tutor/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "vognangsho ki? easy kore bujhao" });
    expect(res.status).toBe(200);
    expect(res.body.data.answer).toBeTruthy();
    expect(["ANSWERED", "INSUFFICIENT_BOOK_CONTEXT", "CLARIFICATION_NEEDED"]).toContain(
      res.body.data.answerStatus
    );
    // No invented citations when no books published:
    if (res.body.data.answerStatus === "INSUFFICIENT_BOOK_CONTEXT") {
      expect(res.body.data.sources).toEqual([]);
    }
  });

  it("validation errors use the standard envelope", async () => {
    const guest = await request(app).post("/api/v1/guest/session");
    const token = guest.body.data.guestToken as string;
    const res = await request(app)
      .post("/api/v1/tutor/chat")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBeTruthy();
    expect(res.body.error.requestId).toBeTruthy();
  });

  it("protected routes 401 without auth; docs served", async () => {
    const res = await request(app).get("/api/v1/me");
    expect(res.status).toBe(401);
    const docs = await request(app).get("/openapi.json");
    expect(docs.status).toBe(200);
    expect(docs.body.openapi).toContain("3.0");
  });
});
