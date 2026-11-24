import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { apiErrorResponseSchema, healthResponseSchema } from "@giabao-portfolio/shared";
import app from "../src/index.ts";

describe("GET /api/health", () => {
  it("trả về HTTP 200, security headers và JSON đúng định dạng khi D1 hoạt động", async () => {
    const response = await exports.default.fetch("http://localhost/api/health");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");

    const json = await response.json();
    const parsed = healthResponseSchema.safeParse(json);

    expect(parsed.success).toBe(true);
    expect(json).toEqual({
      ok: true,
      data: {
        status: "healthy",
        database: "connected",
      },
    });
  });

  it("trả về HTTP 503 và không lộ chi tiết lỗi khi kết nối D1 thất bại", async () => {
    const brokenDb = {
      prepare() {
        throw new Error("D1_ERROR: SQLITE_CANTOPEN internal_secret_path");
      },
    } as unknown as D1Database;

    const response = await app.fetch(new Request("http://localhost/api/health"), {
      DB: brokenDb,
    });

    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain("SQLITE");
    expect(text).not.toContain("internal_secret_path");

    const json = JSON.parse(text);
    const parsed = apiErrorResponseSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(json.error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("trả về HTTP 404 theo response envelope thống nhất cho endpoint /api/* không tồn tại", async () => {
    const response = await exports.default.fetch("http://localhost/api/unknown");
    expect(response.status).toBe(404);

    const json = await response.json();
    const parsed = apiErrorResponseSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(json).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Endpoint API không tồn tại",
      },
    });
  });
});
