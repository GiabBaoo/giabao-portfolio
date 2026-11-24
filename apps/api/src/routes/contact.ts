import { Hono } from "hono";
import {
  CONTACT_BODY_LIMIT_BYTES,
  contactSubmissionSchema,
  type ContactSuccessResponse,
} from "@giabao-portfolio/shared";
import type { AppBindings } from "../env.ts";
import { ApiError } from "../middleware/error-handler.ts";
import { insertContactMessage } from "../services/contact-repository.ts";
import { enforceContactRateLimit } from "../services/rate-limit.ts";
import {
  extractCloudflareClientIp,
  hashClientIp,
  normalizeUserAgent,
} from "../services/request-metadata.ts";
import { verifyTurnstileToken } from "../services/turnstile.ts";

export interface ContactRouteDependencies {
  verifyTurnstile?: typeof verifyTurnstileToken;
  turnstileFetch?: typeof fetch;
  turnstileTimeoutMs?: number;
}

function isJsonContentType(contentType: string | undefined): boolean {
  if (!contentType) {
    return false;
  }

  const mediaType = contentType.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

async function readBodyWithinLimit(request: Request, maxBytes: number): Promise<string> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const parsedLength = Number(contentLengthHeader);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new ApiError(
        413,
        "PAYLOAD_TOO_LARGE",
        "Kích thước dữ liệu gửi lên vượt quá giới hạn cho phép",
      );
    }
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new ApiError(
            413,
            "PAYLOAD_TOO_LARGE",
            "Kích thước dữ liệu gửi lên vượt quá giới hạn cho phép",
          );
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(combined);
}

function parseJsonObject(rawBody: string): Record<string, unknown> {
  if (rawBody.trim().length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Dữ liệu JSON không hợp lệ");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Dữ liệu JSON không hợp lệ");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Dữ liệu JSON phải là một đối tượng hợp lệ");
  }

  return parsed as Record<string, unknown>;
}

function isHoneypotTriggered(website: unknown): boolean {
  return typeof website === "string" && website.trim().length > 0;
}

export function createContactRoute(deps: ContactRouteDependencies = {}) {
  const route = new Hono<{ Bindings: AppBindings }>();
  const verifyTurnstile = deps.verifyTurnstile ?? verifyTurnstileToken;

  route.post("/", async (c) => {
    // 1. Kiểm tra Content-Type
    if (!isJsonContentType(c.req.header("content-type"))) {
      throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type phải là application/json");
    }

    // 2. Giới hạn kích thước request body (10 KB)
    const rawBody = await readBodyWithinLimit(c.req.raw, CONTACT_BODY_LIMIT_BYTES);

    // 3. Rate limiting theo CF-Connecting-IP (Workers Rate Limiting binding)
    const clientIp = extractCloudflareClientIp(c.req.raw.headers);
    await enforceContactRateLimit(c.env.RATE_LIMITER, clientIp);

    // 4. Parse JSON an toàn
    const payload = parseJsonObject(rawBody);

    // 5. Kiểm tra honeypot trực tiếp từ JSON object sau khi parse:
    //    nếu website là string và sau trim có nội dung thì trả thành công giả, không gọi Turnstile, không ghi D1, không log
    if (isHoneypotTriggered(payload.website)) {
      const fakeSuccess: ContactSuccessResponse = { ok: true };
      return c.json(fakeSuccess, 201);
    }

    // 6. Validate và chuẩn hóa dữ liệu bằng schema Zod dùng chung
    //    Loại bỏ trường honeypot website trước khi validate để bot gửi sai kiểu không nhận được lỗi validation tiết lộ honeypot
    const validationPayload: Record<string, unknown> = { ...payload };
    delete validationPayload.website;

    const validation = contactSubmissionSchema.safeParse(validationPayload);
    if (!validation.success) {
      const fields: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const fieldKey = issue.path[0];
        const normalizedKey = typeof fieldKey === "string" ? fieldKey : "_form";
        if (!(normalizedKey in fields)) {
          fields[normalizedKey] = issue.message;
        }
      }

      throw new ApiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fields);
    }

    // 7. Xác thực Cloudflare Turnstile phía backend
    await verifyTurnstile({
      token: validation.data.turnstileToken,
      secretKey: c.env.TURNSTILE_SECRET_KEY,
      expectedHostname: c.env.TURNSTILE_EXPECTED_HOSTNAME,
      expectedAction: c.env.TURNSTILE_EXPECTED_ACTION,
      appEnv: c.env.APP_ENV,
      remoteIp: clientIp,
      fetchFn: deps.turnstileFetch,
      timeoutMs: deps.turnstileTimeoutMs,
    });

    // 8. Hash IP bằng Web Crypto SHA-256(IP + IP_HASH_SALT) — không lưu IP gốc
    const ipHash = await hashClientIp(clientIp, c.env.IP_HASH_SALT);

    // 9. Chuẩn hóa User-Agent (tối đa 512 ký tự, tùy chọn)
    const userAgent = normalizeUserAgent(c.req.raw.headers.get("user-agent"));

    // 10. Insert dữ liệu đã chuẩn hóa vào Cloudflare D1 bằng prepared statement
    try {
      await insertContactMessage(c.env.DB, validation.data, {
        ipHash,
        userAgent,
      });
    } catch {
      console.error("[api] contact_insert_failed");
      throw new ApiError(
        500,
        "INTERNAL_ERROR",
        "Không thể lưu tin nhắn lúc này. Vui lòng thử lại sau.",
      );
    }

    const responseBody: ContactSuccessResponse = { ok: true };
    return c.json(responseBody, 201);
  });

  return route;
}

export const contactRoute = createContactRoute();
