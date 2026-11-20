import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

describe("Brain Nest Backend Health & Security Tests", () => {
  const app = createApp();

  it("GET / should return 200 operational status", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Brain Nest Intelligence Platform API");
    expect(res.body.status).toBe("operational");
  });

  it("GET /api/v1/health should report health status and version", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("healthy");
    expect(res.body.data.version).toBe("1.0.0");
  });

  it("Unauthenticated request to protected route /api/v1/documents should return 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/documents");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("Unauthenticated request to /api/v1/notes should return 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/notes");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("Unauthenticated request to /api/v1/wallet should return 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/wallet");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("Invalid token to protected route should be rejected with 401", async () => {
    const res = await request(app)
      .get("/api/v1/documents")
      .set("Authorization", "Bearer invalid-tampered-token");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("Unauthenticated request to /api/v1/graph should return 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/graph");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("Unauthenticated request to /api/v1/graph/presets should return 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/graph/presets");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
