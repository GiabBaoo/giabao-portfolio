import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CONTACT_BODY_LIMIT_BYTES,
  CONTACT_FIELD_LIMITS,
  apiErrorResponseSchema,
  contactSuccessResponseSchema,
} from "@giabao-portfolio/shared";
import type { AppBindings, RateLimiterBinding } from "../src/env.ts";
import { createApp } from "../src/index.ts";

interface ContactMessageRow {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  locale: string;
  ip_hash: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
}

const TEST_SECRET_KEY = "test-turnstile-secret-never-leak";
const TEST_IP_SALT = "test-ip-hash-salt-never-leak";

const VALID_PAYLOAD = {
  name: "  Nguyễn Gia Bảo  ",
  email: "  recruiter@example.com  ",
  subject: "  Backend Engineer Opportunity  ",
  message: "  Xin chào, tôi muốn trao đổi về vị trí Backend Developer.  ",
  locale: "vi",
  turnstileToken: "valid-turnstile-token-001",
};

function createAllowAllRateLimiter(): RateLimiterBinding {
  return {
    async limit() {
      return { success: true };
    },
  };
}

function createPassingTurnstileFetch(hostname = "localhost"): typeof fetch {
  return async () =>
    new Response(JSON.stringify({ success: true, hostname }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
}

function createTestBindings(overrides: Partial<AppBindings> = {}): AppBindings {
  return {
    DB: env.DB,
    APP_ENV: "test",
    RATE_LIMITER: createAllowAllRateLimiter(),
    TURNSTILE_SECRET_KEY: TEST_SECRET_KEY,
    TURNSTILE_EXPECTED_HOSTNAME: "localhost",
    IP_HASH_SALT: TEST_IP_SALT,
    ...overrides,
  };
}

function postContact(
  body: BodyInit | null,
  headers: Record<string, string> = {},
  bindingOverrides: Partial<AppBindings> = {},
) {
  const testApp = createApp({
    contact: {
      turnstileFetch: createPassingTurnstileFetch(),
    },
  });

  return testApp.fetch(
    new Request("http://localhost/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body,
    }),
    createTestBindings(bindingOverrides),
  );
}

describe("POST /api/contact (Regression & Core Pipeline)", () => {
  beforeEach(async () => {
    await env.DB.prepare("DELETE FROM contact_messages").run();
  });

  it("lưu tin nhắn hợp lệ đã chuẩn hóa vào D1 và trả về HTTP 201", async () => {
    const response = await postContact(JSON.stringify(VALID_PAYLOAD), {
      "CF-Connecting-IP": "203.0.113.10",
      "User-Agent": "Mozilla/5.0 TestBrowser",
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");

    const json = contactSuccessResponseSchema.parse(await response.json());
    expect(json).toEqual({ ok: true });

    const rows = await env.DB.prepare(
      "SELECT id, name, email, subject, message, locale, ip_hash, user_agent, status, created_at FROM contact_messages",
    ).all<ContactMessageRow>();

    expect(rows.results).toHaveLength(1);
    const saved = rows.results[0];
    expect(saved).toBeDefined();
    expect(saved?.name).toBe("Nguyễn Gia Bảo");
    expect(saved?.email).toBe("recruiter@example.com");
    expect(saved?.subject).toBe("Backend Engineer Opportunity");
    expect(saved?.message).toBe("Xin chào, tôi muốn trao đổi về vị trí Backend Developer.");
    expect(saved?.locale).toBe("vi");
    expect(saved?.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(saved?.ip_hash).not.toBe("203.0.113.10");
    expect(saved?.user_agent).toBe("Mozilla/5.0 TestBrowser");
    expect(saved?.status).toBe("new");
    expect(saved?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("lưu subject là NULL trong D1 khi không gửi subject hoặc subject toàn khoảng trắng", async () => {
    const res1 = await postContact(
      JSON.stringify({
        name: "Jane Doe",
        email: "jane@example.com",
        message: "Hello, this is a valid message without subject.",
        locale: "en",
        turnstileToken: "valid-token-1",
      }),
    );
    expect(res1.status).toBe(201);

    const res2 = await postContact(
      JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
        subject: "    ",
        message: "Hello, this is a valid message with blank subject.",
        locale: "en",
        turnstileToken: "valid-token-2",
      }),
    );
    expect(res2.status).toBe(201);

    const rows = await env.DB.prepare(
      "SELECT name, subject FROM contact_messages ORDER BY id ASC",
    ).all<{ name: string; subject: string | null }>();

    expect(rows.results).toEqual([
      { name: "Jane Doe", subject: null },
      { name: "John Doe", subject: null },
    ]);
  });

  it("trả về HTTP 400 VALIDATION_ERROR khi email không hợp lệ", async () => {
    const response = await postContact(
      JSON.stringify({
        ...VALID_PAYLOAD,
        email: "not-an-email",
      }),
    );

    expect(response.status).toBe(400);
    const json = apiErrorResponseSchema.parse(await response.json());
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.fields?.email).toBeTruthy();

    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM contact_messages").first<{
      total: number;
    }>();
    expect(count?.total).toBe(0);
  });

  it("trả về HTTP 400 VALIDATION_ERROR khi thiếu name hoặc name toàn khoảng trắng", async () => {
    const missingName = await postContact(
      JSON.stringify({
        email: "recruiter@example.com",
        message: "Xin chào, đây là tin nhắn hợp lệ đủ độ dài.",
        locale: "vi",
        turnstileToken: "valid-token",
      }),
    );
    expect(missingName.status).toBe(400);
    const missingJson = apiErrorResponseSchema.parse(await missingName.json());
    expect(missingJson.error.code).toBe("VALIDATION_ERROR");
    expect(missingJson.error.fields?.name).toBeTruthy();

    const blankName = await postContact(
      JSON.stringify({
        ...VALID_PAYLOAD,
        name: "   ",
      }),
    );
    expect(blankName.status).toBe(400);
    const blankJson = apiErrorResponseSchema.parse(await blankName.json());
    expect(blankJson.error.code).toBe("VALIDATION_ERROR");
    expect(blankJson.error.fields?.name).toBeTruthy();
  });

  it("trả về HTTP 400 VALIDATION_ERROR khi message quá ngắn hoặc quá dài", async () => {
    const tooShort = await postContact(
      JSON.stringify({
        ...VALID_PAYLOAD,
        message: "Quá ngắn",
      }),
    );
    expect(tooShort.status).toBe(400);
    const shortJson = apiErrorResponseSchema.parse(await tooShort.json());
    expect(shortJson.error.code).toBe("VALIDATION_ERROR");
    expect(shortJson.error.fields?.message).toBeTruthy();

    const tooLong = await postContact(
      JSON.stringify({
        ...VALID_PAYLOAD,
        message: "a".repeat(CONTACT_FIELD_LIMITS.messageMax + 1),
      }),
    );
    expect(tooLong.status).toBe(400);
    const longJson = apiErrorResponseSchema.parse(await tooLong.json());
    expect(longJson.error.code).toBe("VALIDATION_ERROR");
    expect(longJson.error.fields?.message).toBeTruthy();
  });

  it("trả về HTTP 400 VALIDATION_ERROR khi subject vượt quá 150 ký tự", async () => {
    const response = await postContact(
      JSON.stringify({
        ...VALID_PAYLOAD,
        subject: "s".repeat(CONTACT_FIELD_LIMITS.subjectMax + 1),
      }),
    );

    expect(response.status).toBe(400);
    const json = apiErrorResponseSchema.parse(await response.json());
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.fields?.subject).toBeTruthy();
  });

  it("trả về HTTP 400 VALIDATION_ERROR khi locale không hợp lệ hoặc thiếu turnstileToken", async () => {
    const badLocale = await postContact(
      JSON.stringify({
        ...VALID_PAYLOAD,
        locale: "jp",
      }),
    );

    expect(badLocale.status).toBe(400);
    const badLocaleJson = apiErrorResponseSchema.parse(await badLocale.json());
    expect(badLocaleJson.error.code).toBe("VALIDATION_ERROR");
    expect(badLocaleJson.error.fields?.locale).toBeTruthy();

    const missingToken = await postContact(
      JSON.stringify({
        name: "Nguyễn Gia Bảo",
        email: "recruiter@example.com",
        message: "Xin chào, đây là tin nhắn hợp lệ đủ độ dài.",
        locale: "vi",
      }),
    );
    expect(missingToken.status).toBe(400);
    const missingTokenJson = apiErrorResponseSchema.parse(await missingToken.json());
    expect(missingTokenJson.error.code).toBe("VALIDATION_ERROR");
    expect(missingTokenJson.error.fields?.turnstileToken).toBeTruthy();
  });

  it("chấp nhận Content-Type application/json kèm charset=utf-8", async () => {
    const response = await postContact(JSON.stringify(VALID_PAYLOAD), {
      "Content-Type": "application/json; charset=utf-8",
    });

    expect(response.status).toBe(201);
    const json = contactSuccessResponseSchema.parse(await response.json());
    expect(json).toEqual({ ok: true });
  });

  it("không cung cấp endpoint công khai GET /api/contact (trả về 404 NOT_FOUND)", async () => {
    const response = await exports.default.fetch("http://localhost/api/contact", {
      method: "GET",
    });

    expect(response.status).toBe(404);
    const json = apiErrorResponseSchema.parse(await response.json());
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("trả về HTTP 400 VALIDATION_ERROR khi JSON không hợp lệ, rỗng hoặc không phải object", async () => {
    const emptyBody = await postContact("");
    expect(emptyBody.status).toBe(400);
    const emptyBodyJson = apiErrorResponseSchema.parse(await emptyBody.json());
    expect(emptyBodyJson.error.code).toBe("VALIDATION_ERROR");

    const invalidJson = await postContact("{ invalid json");
    expect(invalidJson.status).toBe(400);
    const invalidJsonBody = apiErrorResponseSchema.parse(await invalidJson.json());
    expect(invalidJsonBody.error.code).toBe("VALIDATION_ERROR");

    const arrayJson = await postContact("[]");
    expect(arrayJson.status).toBe(400);
    const arrayJsonBody = apiErrorResponseSchema.parse(await arrayJson.json());
    expect(arrayJsonBody.error.code).toBe("VALIDATION_ERROR");
  });

  it("trả về HTTP 415 UNSUPPORTED_MEDIA_TYPE khi thiếu hoặc sai Content-Type", async () => {
    const plainText = await exports.default.fetch("http://localhost/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(VALID_PAYLOAD),
    });

    expect(plainText.status).toBe(415);
    const plainTextJson = apiErrorResponseSchema.parse(await plainText.json());
    expect(plainTextJson.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");

    const missingHeader = await exports.default.fetch("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify(VALID_PAYLOAD),
    });

    expect(missingHeader.status).toBe(415);
    const missingHeaderJson = apiErrorResponseSchema.parse(await missingHeader.json());
    expect(missingHeaderJson.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("trả về HTTP 413 PAYLOAD_TOO_LARGE khi request body vượt quá 10 KB", async () => {
    const oversizedPayload = JSON.stringify({
      ...VALID_PAYLOAD,
      message: "x".repeat(CONTACT_BODY_LIMIT_BYTES + 256),
    });

    const response = await postContact(oversizedPayload);

    expect(response.status).toBe(413);
    const json = apiErrorResponseSchema.parse(await response.json());
    expect(json.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("trả về HTTP 500 INTERNAL_ERROR và không làm lộ thông tin SQL/DB khi D1 lỗi", async () => {
    const failingDb = {
      prepare() {
        return {
          bind() {
            return {
              async run() {
                throw new Error(
                  "D1_ERROR: SQLITE_ERROR: near INSERT INTO contact_messages secret_credential",
                );
              },
            };
          },
        };
      },
    } as unknown as D1Database;

    const response = await postContact(JSON.stringify(VALID_PAYLOAD), {}, { DB: failingDb });

    expect(response.status).toBe(500);
    const rawText = await response.text();
    expect(rawText).not.toContain("SQLITE");
    expect(rawText).not.toContain("D1_ERROR");
    expect(rawText).not.toContain("INSERT INTO");
    expect(rawText).not.toContain("secret_credential");

    const json = apiErrorResponseSchema.parse(JSON.parse(rawText));
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});
