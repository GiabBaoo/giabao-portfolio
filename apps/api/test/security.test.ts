import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTACT_FIELD_LIMITS,
  apiErrorResponseSchema,
  contactSuccessResponseSchema,
} from "@giabao-portfolio/shared";
import type { AppBindings, RateLimiterBinding } from "../src/env.ts";
import { createApp } from "../src/index.ts";
import { hashClientIp } from "../src/services/request-metadata.ts";

const TEST_SECRET = "turnstile-secret-value-do-not-leak";
const TEST_TOKEN = "turnstile-token-value-do-not-leak";
const TEST_SALT = "ip-hash-salt-value-do-not-leak";

const BASE_PAYLOAD = {
  name: "Nguyễn Gia Bảo",
  email: "recruiter@example.com",
  subject: "Backend Security Review",
  message: "Xin chào, tôi muốn kiểm tra luồng bảo mật Contact API.",
  locale: "vi",
  turnstileToken: TEST_TOKEN,
};

function createPassingTurnstileFetch(
  payload: Record<string, unknown> = { success: true, hostname: "localhost" },
): typeof fetch {
  return async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
}

function createAllowAllLimiter(capturedKeys?: string[]): RateLimiterBinding {
  return {
    async limit({ key }) {
      capturedKeys?.push(key);
      return { success: true };
    },
  };
}

function createBindings(overrides: Partial<AppBindings> = {}): AppBindings {
  return {
    DB: env.DB,
    APP_ENV: "test",
    RATE_LIMITER: createAllowAllLimiter(),
    TURNSTILE_SECRET_KEY: TEST_SECRET,
    TURNSTILE_EXPECTED_HOSTNAME: "localhost",
    IP_HASH_SALT: TEST_SALT,
    ...overrides,
  };
}

async function getMessageCount(): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM contact_messages").first<{
    total: number;
  }>();
  return row?.total ?? 0;
}

describe("Contact API – Security & Anti-spam (Checkpoint 5.3)", () => {
  beforeEach(async () => {
    await env.DB.prepare("DELETE FROM contact_messages").run();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rate Limiting (Workers Rate Limiting binding)", () => {
    it("cho phép request trong giới hạn và chặn với HTTP 429 RATE_LIMITED khi vượt giới hạn (mock binding)", async () => {
      let calls = 0;
      const capturedKeys: string[] = [];
      const mockLimiter: RateLimiterBinding = {
        async limit({ key }) {
          capturedKeys.push(key);
          calls += 1;
          return { success: calls <= 5 };
        },
      };

      const app = createApp({
        contact: { turnstileFetch: createPassingTurnstileFetch() },
      });

      for (let i = 0; i < 5; i += 1) {
        const res = await app.fetch(
          new Request("http://localhost/api/contact", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "CF-Connecting-IP": "198.51.100.42",
            },
            body: JSON.stringify(BASE_PAYLOAD),
          }),
          createBindings({ RATE_LIMITER: mockLimiter }),
        );
        expect(res.status).toBe(201);
      }

      const blocked = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": "198.51.100.42",
          },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({ RATE_LIMITER: mockLimiter }),
      );

      expect(blocked.status).toBe(429);
      const json = apiErrorResponseSchema.parse(await blocked.json());
      expect(json.error.code).toBe("RATE_LIMITED");
      expect(capturedKeys).toEqual(Array(6).fill("contact:ip:198.51.100.42"));
      expect(await getMessageCount()).toBe(5);
    });

    it("chỉ sử dụng CF-Connecting-IP và bỏ qua X-Forwarded-For do client tự gửi", async () => {
      const capturedKeys: string[] = [];
      const app = createApp({
        contact: { turnstileFetch: createPassingTurnstileFetch() },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": "1.2.3.4",
          },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({ RATE_LIMITER: createAllowAllLimiter(capturedKeys) }),
      );

      expect(res.status).toBe(201);
      expect(capturedKeys).toEqual(["contact:missing-ip"]);
    });

    it("không làm lộ thông tin nội bộ khi RATE_LIMITER binding ném lỗi", async () => {
      const brokenLimiter: RateLimiterBinding = {
        async limit() {
          throw new Error("INTERNAL_CF_BINDING_SECRET_FAILURE");
        },
      };

      const app = createApp({
        contact: { turnstileFetch: createPassingTurnstileFetch() },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": "198.51.100.99",
          },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({ RATE_LIMITER: brokenLimiter }),
      );

      expect(res.status).toBe(500);
      const raw = await res.text();
      expect(raw).not.toContain("INTERNAL_CF_BINDING_SECRET_FAILURE");
      const json = apiErrorResponseSchema.parse(JSON.parse(raw));
      expect(json.error.code).toBe("INTERNAL_ERROR");
      expect(await getMessageCount()).toBe(0);
    });

    it("trả về HTTP 500 INTERNAL_ERROR và không bypass khi RATE_LIMITER binding là undefined", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let turnstileCalled = false;
      const app = createApp({
        contact: {
          turnstileFetch: async () => {
            turnstileCalled = true;
            return new Response(JSON.stringify({ success: true, hostname: "localhost" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          },
        },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": "198.51.100.101",
          },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({ RATE_LIMITER: undefined }),
      );

      expect(res.status).toBe(500);
      const json = apiErrorResponseSchema.parse(await res.json());
      expect(json.error.code).toBe("INTERNAL_ERROR");
      expect(turnstileCalled).toBe(false);
      expect(await getMessageCount()).toBe(0);
      expect(errorSpy).toHaveBeenCalled();
    });

    it("chặn request thứ 6 liên tiếp cùng IP bằng RATE_LIMITER thật trong Miniflare local (limit=5/60s)", async () => {
      expect(env.RATE_LIMITER).toBeDefined();
      const app = createApp({
        contact: { turnstileFetch: createPassingTurnstileFetch() },
      });
      const testIp = "198.51.100.250";

      for (let i = 0; i < 5; i += 1) {
        const res = await app.fetch(
          new Request("http://localhost/api/contact", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "CF-Connecting-IP": testIp,
            },
            body: JSON.stringify(BASE_PAYLOAD),
          }),
          createBindings({ RATE_LIMITER: env.RATE_LIMITER }),
        );
        expect(res.status).toBe(201);
      }

      const sixth = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": testIp,
          },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({ RATE_LIMITER: env.RATE_LIMITER }),
      );

      expect(sixth.status).toBe(429);
      const json = apiErrorResponseSchema.parse(await sixth.json());
      expect(json.error.code).toBe("RATE_LIMITED");
      expect(await getMessageCount()).toBe(5);
    });
  });

  describe("Cloudflare Turnstile Siteverify", () => {
    it("chấp nhận token hợp lệ khớp hostname và action (khi action được cấu hình) bằng HTTP POST", async () => {
      let calledUrl = "";
      let calledMethod = "";
      let calledBody = "";
      const mockFetch: typeof fetch = async (input, init) => {
        calledUrl =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        calledMethod = init?.method ?? (input instanceof Request ? input.method : "");
        calledBody = typeof init?.body === "string" ? init.body : "";
        return new Response(
          JSON.stringify({
            success: true,
            hostname: "giabao.workers.dev",
            action: "contact_form",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      };

      const app = createApp({ contact: { turnstileFetch: mockFetch } });
      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": "203.0.113.55",
          },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({
          TURNSTILE_EXPECTED_HOSTNAME: "giabao.workers.dev",
          TURNSTILE_EXPECTED_ACTION: "contact_form",
        }),
      );

      expect(res.status).toBe(201);
      expect(calledUrl).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
      expect(calledMethod).toBe("POST");
      const sentParams = new URLSearchParams(calledBody);
      expect(sentParams.get("secret")).toBe(TEST_SECRET);
      expect(sentParams.get("response")).toBe(TEST_TOKEN);
      expect(sentParams.get("remoteip")).toBe("203.0.113.55");
      expect(await getMessageCount()).toBe(1);
    });

    it("trả về HTTP 503 TURNSTILE_UNAVAILABLE khi thiếu TURNSTILE_SECRET_KEY hoặc TURNSTILE_EXPECTED_HOSTNAME", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let fetchCalled = false;
      const app = createApp({
        contact: {
          turnstileFetch: async () => {
            fetchCalled = true;
            return new Response(JSON.stringify({ success: true, hostname: "localhost" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          },
        },
      });

      const missingSecretRes = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({ TURNSTILE_SECRET_KEY: undefined }),
      );
      expect(missingSecretRes.status).toBe(503);
      expect(apiErrorResponseSchema.parse(await missingSecretRes.json()).error.code).toBe(
        "TURNSTILE_UNAVAILABLE",
      );

      const missingHostnameRes = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({ TURNSTILE_EXPECTED_HOSTNAME: undefined }),
      );
      expect(missingHostnameRes.status).toBe(503);
      expect(apiErrorResponseSchema.parse(await missingHostnameRes.json()).error.code).toBe(
        "TURNSTILE_UNAVAILABLE",
      );

      expect(fetchCalled).toBe(false);
      expect(await getMessageCount()).toBe(0);
      expect(errorSpy).toHaveBeenCalled();
    });

    it("trả về HTTP 403 TURNSTILE_FAILED khi token không hợp lệ và không insert D1", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const app = createApp({
        contact: {
          turnstileFetch: createPassingTurnstileFetch({
            success: false,
            "error-codes": ["invalid-input-response"],
          }),
        },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings(),
      );

      expect(res.status).toBe(403);
      const raw = await res.text();
      expect(raw).not.toContain(TEST_SECRET);
      expect(raw).not.toContain(TEST_TOKEN);
      const json = apiErrorResponseSchema.parse(JSON.parse(raw));
      expect(json.error.code).toBe("TURNSTILE_FAILED");
      expect(await getMessageCount()).toBe(0);

      const logged = JSON.stringify(errorSpy.mock.calls);
      expect(logged).not.toContain(TEST_SECRET);
      expect(logged).not.toContain(TEST_TOKEN);
    });

    it("trả về HTTP 403 TURNSTILE_FAILED khi hostname không khớp", async () => {
      const app = createApp({
        contact: {
          turnstileFetch: createPassingTurnstileFetch({
            success: true,
            hostname: "attacker.example.com",
          }),
        },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({ TURNSTILE_EXPECTED_HOSTNAME: "giabao.workers.dev" }),
      );

      expect(res.status).toBe(403);
      const json = apiErrorResponseSchema.parse(await res.json());
      expect(json.error.code).toBe("TURNSTILE_FAILED");
      expect(await getMessageCount()).toBe(0);
    });

    it("trả về HTTP 403 TURNSTILE_FAILED khi action không khớp với TURNSTILE_EXPECTED_ACTION", async () => {
      const app = createApp({
        contact: {
          turnstileFetch: createPassingTurnstileFetch({
            success: true,
            hostname: "localhost",
            action: "newsletter_signup",
          }),
        },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({ TURNSTILE_EXPECTED_ACTION: "contact_form" }),
      );

      expect(res.status).toBe(403);
      const json = apiErrorResponseSchema.parse(await res.json());
      expect(json.error.code).toBe("TURNSTILE_FAILED");
      expect(await getMessageCount()).toBe(0);
    });

    it("trả về HTTP 503 TURNSTILE_UNAVAILABLE khi Siteverify bị timeout (AbortController)", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const slowFetch: typeof fetch = (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });

      const app = createApp({
        contact: {
          turnstileFetch: slowFetch,
          turnstileTimeoutMs: 25,
        },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings(),
      );

      expect(res.status).toBe(503);
      const raw = await res.text();
      expect(raw).not.toContain(TEST_SECRET);
      expect(raw).not.toContain(TEST_TOKEN);
      const json = apiErrorResponseSchema.parse(JSON.parse(raw));
      expect(json.error.code).toBe("TURNSTILE_UNAVAILABLE");
      expect(await getMessageCount()).toBe(0);

      const logged = JSON.stringify(errorSpy.mock.calls);
      expect(logged).not.toContain(TEST_SECRET);
      expect(logged).not.toContain(TEST_TOKEN);
    });

    it("trả về HTTP 503 TURNSTILE_UNAVAILABLE và hủy request bằng AbortController khi response headers đã trả về nhưng body bị treo", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let signalAborted = false;
      const hangingBodyFetch: typeof fetch = async (_input, init) => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            init?.signal?.addEventListener("abort", () => {
              signalAborted = true;
              controller.error(new DOMException("Aborted", "AbortError"));
            });
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const app = createApp({
        contact: {
          turnstileFetch: hangingBodyFetch,
          turnstileTimeoutMs: 30,
        },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings(),
      );

      expect(signalAborted).toBe(true);
      expect(res.status).toBe(503);
      const raw = await res.text();
      expect(raw).not.toContain(TEST_SECRET);
      expect(raw).not.toContain(TEST_TOKEN);
      const json = apiErrorResponseSchema.parse(JSON.parse(raw));
      expect(json.error.code).toBe("TURNSTILE_UNAVAILABLE");
      expect(await getMessageCount()).toBe(0);

      const logged = JSON.stringify(errorSpy.mock.calls);
      expect(logged).not.toContain(TEST_SECRET);
      expect(logged).not.toContain(TEST_TOKEN);
    });

    it("trả về HTTP 503 TURNSTILE_UNAVAILABLE khi xảy ra lỗi mạng", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const networkErrorFetch: typeof fetch = async () => {
        throw new TypeError("fetch failed: network unreachable");
      };

      const app = createApp({
        contact: { turnstileFetch: networkErrorFetch },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings(),
      );

      expect(res.status).toBe(503);
      const json = apiErrorResponseSchema.parse(await res.json());
      expect(json.error.code).toBe("TURNSTILE_UNAVAILABLE");
      expect(await getMessageCount()).toBe(0);

      const logged = JSON.stringify(errorSpy.mock.calls);
      expect(logged).not.toContain(TEST_SECRET);
      expect(logged).not.toContain(TEST_TOKEN);
    });

    it("trả về HTTP 503 TURNSTILE_UNAVAILABLE khi Cloudflare Siteverify trả lỗi HTTP 5xx hoặc JSON hỏng", async () => {
      const serverErrorApp = createApp({
        contact: {
          turnstileFetch: async () => new Response("Bad Gateway", { status: 502 }),
        },
      });

      const res502 = await serverErrorApp.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings(),
      );
      expect(res502.status).toBe(503);
      expect(apiErrorResponseSchema.parse(await res502.json()).error.code).toBe(
        "TURNSTILE_UNAVAILABLE",
      );

      const invalidJsonApp = createApp({
        contact: {
          turnstileFetch: async () =>
            new Response("not-json", {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
        },
      });

      const resInvalidJson = await invalidJsonApp.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings(),
      );
      expect(resInvalidJson.status).toBe(503);
      expect(apiErrorResponseSchema.parse(await resInvalidJson.json()).error.code).toBe(
        "TURNSTILE_UNAVAILABLE",
      );
      expect(await getMessageCount()).toBe(0);
    });

    it("cho phép dummy secret + hostname example.com trong APP_ENV=development và vẫn kiểm tra khớp hostname", async () => {
      const dummySecret = "1x0000000000000000000000000000000AA";
      const appMatching = createApp({
        contact: {
          turnstileFetch: createPassingTurnstileFetch({
            success: true,
            hostname: "example.com",
            metadata: { result_with_testing_key: true },
          }),
        },
      });

      const okRes = await appMatching.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({
          APP_ENV: "development",
          TURNSTILE_SECRET_KEY: dummySecret,
          TURNSTILE_EXPECTED_HOSTNAME: "example.com",
        }),
      );
      expect(okRes.status).toBe(201);
      expect(await getMessageCount()).toBe(1);

      const mismatchRes = await appMatching.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({
          APP_ENV: "development",
          TURNSTILE_SECRET_KEY: dummySecret,
          TURNSTILE_EXPECTED_HOSTNAME: "localhost",
        }),
      );
      expect(mismatchRes.status).toBe(403);
      expect(apiErrorResponseSchema.parse(await mismatchRes.json()).error.code).toBe(
        "TURNSTILE_FAILED",
      );
      expect(await getMessageCount()).toBe(1);
    });

    it("chặn dummy secret, hostname test và metadata result_with_testing_key trong production (kể cả khi APP_ENV không đặt)", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let fetchCalls = 0;
      const app = createApp({
        contact: {
          turnstileFetch: async () => {
            fetchCalls += 1;
            return new Response(
              JSON.stringify({
                success: true,
                hostname: "giabao.workers.dev",
                metadata: { result_with_testing_key: true },
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          },
        },
      });

      const dummySecret = "1x0000000000000000000000000000000AA";
      const dummySecretRes = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({
          APP_ENV: "production",
          TURNSTILE_SECRET_KEY: dummySecret,
          TURNSTILE_EXPECTED_HOSTNAME: "giabao.workers.dev",
        }),
      );
      expect(dummySecretRes.status).toBe(503);
      expect(apiErrorResponseSchema.parse(await dummySecretRes.json()).error.code).toBe(
        "TURNSTILE_UNAVAILABLE",
      );

      const testHostnameRes = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({
          APP_ENV: undefined,
          TURNSTILE_SECRET_KEY: TEST_SECRET,
          TURNSTILE_EXPECTED_HOSTNAME: "example.com",
        }),
      );
      expect(testHostnameRes.status).toBe(503);
      expect(apiErrorResponseSchema.parse(await testHostnameRes.json()).error.code).toBe(
        "TURNSTILE_UNAVAILABLE",
      );
      expect(fetchCalls).toBe(0);

      const testingMetadataRes = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({
          APP_ENV: "production",
          TURNSTILE_SECRET_KEY: TEST_SECRET,
          TURNSTILE_EXPECTED_HOSTNAME: "giabao.workers.dev",
        }),
      );
      expect(fetchCalls).toBe(1);
      expect(testingMetadataRes.status).toBe(403);
      expect(apiErrorResponseSchema.parse(await testingMetadataRes.json()).error.code).toBe(
        "TURNSTILE_FAILED",
      );

      const logged = JSON.stringify(errorSpy.mock.calls);
      expect(logged).not.toContain(dummySecret);
      expect(await getMessageCount()).toBe(0);
    });
  });

  describe("Honeypot (trường website)", () => {
    it("tiếp tục xử lý bình thường và lưu D1 khi website rỗng hoặc chỉ chứa khoảng trắng", async () => {
      let turnstileCalls = 0;
      const app = createApp({
        contact: {
          turnstileFetch: async () => {
            turnstileCalls += 1;
            return new Response(JSON.stringify({ success: true, hostname: "localhost" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          },
        },
      });

      const resEmpty = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...BASE_PAYLOAD,
            website: "",
          }),
        }),
        createBindings(),
      );

      expect(resEmpty.status).toBe(201);
      expect(contactSuccessResponseSchema.parse(await resEmpty.json())).toEqual({ ok: true });

      const resWhitespace = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...BASE_PAYLOAD,
            website: "   \t\n  ",
          }),
        }),
        createBindings(),
      );

      expect(resWhitespace.status).toBe(201);
      expect(contactSuccessResponseSchema.parse(await resWhitespace.json())).toEqual({ ok: true });
      expect(turnstileCalls).toBe(2);
      expect(await getMessageCount()).toBe(2);
    });

    it("trả về HTTP 201 giống thành công bình thường nhưng không gọi Turnstile, không ghi D1 và không log khi website có nội dung (kể cả khi thiếu turnstileToken)", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      let turnstileCalled = false;
      const app = createApp({
        contact: {
          turnstileFetch: async () => {
            turnstileCalled = true;
            return new Response(JSON.stringify({ success: true, hostname: "localhost" }), {
              status: 200,
            });
          },
        },
      });

      const honeypotValue = "https://spam-bot.invalid/offer";
      const resWithToken = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...BASE_PAYLOAD,
            website: honeypotValue,
          }),
        }),
        createBindings(),
      );

      expect(resWithToken.status).toBe(201);
      expect(contactSuccessResponseSchema.parse(await resWithToken.json())).toEqual({ ok: true });

      const botPayloadWithoutToken = {
        name: "Spam Bot",
        email: "bot@spam.invalid",
        message: "Buy cheap links now!",
        locale: "en",
        website: honeypotValue,
      };
      const resWithoutToken = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(botPayloadWithoutToken),
        }),
        createBindings(),
      );

      expect(resWithoutToken.status).toBe(201);
      expect(contactSuccessResponseSchema.parse(await resWithoutToken.json())).toEqual({
        ok: true,
      });
      expect(turnstileCalled).toBe(false);
      expect(await getMessageCount()).toBe(0);

      const allLogs = JSON.stringify([
        ...logSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
      ]);
      expect(allLogs).not.toContain(honeypotValue);
    });

    it("không tiết lộ lỗi validation honeypot và không ghi D1 khi bot gửi website sai kiểu kèm payload không hợp lệ", async () => {
      let turnstileCalled = false;
      const app = createApp({
        contact: {
          turnstileFetch: async () => {
            turnstileCalled = true;
            return new Response(JSON.stringify({ success: true, hostname: "localhost" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          },
        },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Bot",
            email: "invalid-email",
            message: "short",
            locale: "en",
            website: 12345,
          }),
        }),
        createBindings(),
      );

      expect(res.status).toBe(400);
      const raw = await res.text();
      expect(raw).not.toContain("website");
      const json = apiErrorResponseSchema.parse(JSON.parse(raw));
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.fields?.website).toBeUndefined();
      expect(json.error.fields?.email).toBeTruthy();
      expect(json.error.fields?.turnstileToken).toBeTruthy();
      expect(turnstileCalled).toBe(false);
      expect(await getMessageCount()).toBe(0);
    });
  });

  describe("Hash IP & User-Agent", () => {
    it("lưu ip_hash dạng SHA-256 hex 64 ký tự, không lưu IP gốc và không làm lộ salt", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const rawIp = "203.0.113.77";
      const expectedHash = await hashClientIp(rawIp, TEST_SALT);
      expect(expectedHash).toMatch(/^[0-9a-f]{64}$/);

      const app = createApp({
        contact: { turnstileFetch: createPassingTurnstileFetch() },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": rawIp,
          },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings(),
      );

      expect(res.status).toBe(201);
      const rawResponse = await res.text();
      expect(rawResponse).not.toContain(rawIp);
      expect(rawResponse).not.toContain(TEST_SALT);

      const saved = await env.DB.prepare(
        "SELECT ip_hash, user_agent FROM contact_messages LIMIT 1",
      ).first<{ ip_hash: string | null; user_agent: string | null }>();

      expect(saved?.ip_hash).toBe(expectedHash);
      expect(saved?.ip_hash).not.toContain(rawIp);
      expect(saved?.ip_hash).not.toContain(TEST_SALT);
      expect(saved?.user_agent).toBeNull();

      const allLogs = JSON.stringify([...warnSpy.mock.calls, ...errorSpy.mock.calls]);
      expect(allLogs).not.toContain(rawIp);
      expect(allLogs).not.toContain(TEST_SALT);
    });

    it("không crash và lưu ip_hash = NULL khi thiếu CF-Connecting-IP (không dùng X-Forwarded-For)", async () => {
      const app = createApp({
        contact: { turnstileFetch: createPassingTurnstileFetch() },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": "198.51.100.123",
          },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings(),
      );

      expect(res.status).toBe(201);
      const saved = await env.DB.prepare("SELECT ip_hash FROM contact_messages LIMIT 1").first<{
        ip_hash: string | null;
      }>();
      expect(saved?.ip_hash).toBeNull();
    });

    it("lưu ip_hash = NULL, không lưu IP gốc và không log IP/salt khi có CF-Connecting-IP nhưng thiếu IP_HASH_SALT", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const rawIp = "203.0.113.88";
      const app = createApp({
        contact: { turnstileFetch: createPassingTurnstileFetch() },
      });

      const res = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": rawIp,
          },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings({ IP_HASH_SALT: undefined }),
      );

      expect(res.status).toBe(201);
      const saved = await env.DB.prepare("SELECT ip_hash FROM contact_messages LIMIT 1").first<{
        ip_hash: string | null;
      }>();
      expect(saved?.ip_hash).toBeNull();

      expect(warnSpy).toHaveBeenCalledWith("[api] ip_hash_salt_missing");
      const allLogs = JSON.stringify([
        ...logSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
      ]);
      expect(allLogs).not.toContain(rawIp);
      expect(allLogs).not.toContain(TEST_SALT);
    });

    it("cắt User-Agent dài hơn 512 ký tự xuống đúng 512 ký tự và cho phép thiếu User-Agent", async () => {
      const app = createApp({
        contact: { turnstileFetch: createPassingTurnstileFetch() },
      });

      const longUserAgent = "Mozilla/5.0 " + "A".repeat(700);
      const resLong = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": longUserAgent,
          },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings(),
      );
      expect(resLong.status).toBe(201);

      const resMissing = await app.fetch(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(BASE_PAYLOAD),
        }),
        createBindings(),
      );
      expect(resMissing.status).toBe(201);

      const rows = await env.DB.prepare(
        "SELECT user_agent FROM contact_messages ORDER BY id ASC",
      ).all<{ user_agent: string | null }>();

      expect(rows.results).toHaveLength(2);
      expect(rows.results[0]?.user_agent?.length).toBe(CONTACT_FIELD_LIMITS.userAgentMax);
      expect(rows.results[0]?.user_agent).toBe(
        longUserAgent.slice(0, CONTACT_FIELD_LIMITS.userAgentMax),
      );
      expect(rows.results[1]?.user_agent).toBeNull();
    });
  });

  describe("Security Headers (/api/*)", () => {
    it("gắn đầy đủ CSP, Cache-Control: no-store, HSTS và security headers trên API responses", async () => {
      const app = createApp();
      const res = await app.fetch(new Request("http://localhost/api/health"), createBindings());

      expect(res.headers.get("Content-Security-Policy")).toBe(
        "default-src 'none'; frame-ancestors 'none'",
      );
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(res.headers.get("Strict-Transport-Security")).toBe(
        "max-age=31536000; includeSubDomains",
      );
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
      expect(res.headers.get("Permissions-Policy")).toBe(
        "camera=(), microphone=(), geolocation=()",
      );
    });
  });
});
