import { ApiError } from "../middleware/error-handler.ts";

export const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const DEFAULT_TURNSTILE_TIMEOUT_MS = 5000;

export const CLOUDFLARE_TEST_SECRET_KEYS = new Set([
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]);

export const LOCAL_TEST_ONLY_HOSTNAMES = new Set(["localhost", "127.0.0.1", "example.com"]);

interface TurnstileSiteverifyResponse {
  success?: unknown;
  hostname?: unknown;
  action?: unknown;
  metadata?: {
    result_with_testing_key?: unknown;
  };
  "error-codes"?: unknown;
}

export interface VerifyTurnstileParams {
  token: string;
  secretKey: string | undefined;
  expectedHostname: string | undefined;
  expectedAction?: string | undefined;
  appEnv?: string | undefined;
  remoteIp?: string | null;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

function throwTurnstileUnavailable(): never {
  throw new ApiError(
    503,
    "TURNSTILE_UNAVAILABLE",
    "Dịch vụ xác thực chống bot tạm thời không khả dụng. Vui lòng thử lại sau.",
  );
}

function throwTurnstileFailed(): never {
  throw new ApiError(
    403,
    "TURNSTILE_FAILED",
    "Xác thực chống bot không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
  );
}

/**
 * Xác thực token Cloudflare Turnstile phía backend qua Siteverify API.
 * - Không bao giờ ghi log token hoặc secret key.
 * - Phân biệt rõ 403 TURNSTILE_FAILED (token/hostname/action sai) với 503 TURNSTILE_UNAVAILABLE (timeout/mạng/5xx/thiếu cấu hình).
 */
export async function verifyTurnstileToken(params: VerifyTurnstileParams): Promise<void> {
  const secretKey = params.secretKey?.trim();
  const expectedHostname = params.expectedHostname?.trim();
  const expectedAction = params.expectedAction?.trim();
  const normalizedEnv = params.appEnv?.trim().toLowerCase() || "production";
  const isLocalOrTestEnv = normalizedEnv === "development" || normalizedEnv === "test";

  if (!secretKey || !expectedHostname) {
    console.error("[api] turnstile_config_missing");
    throwTurnstileUnavailable();
  }

  if (
    !isLocalOrTestEnv &&
    (CLOUDFLARE_TEST_SECRET_KEYS.has(secretKey) ||
      LOCAL_TEST_ONLY_HOSTNAMES.has(expectedHostname.toLowerCase()))
  ) {
    console.error("[api] turnstile_test_config_in_production");
    throwTurnstileUnavailable();
  }

  const formBody = new URLSearchParams({
    secret: secretKey,
    response: params.token,
  });

  if (params.remoteIp) {
    formBody.set("remoteip", params.remoteIp);
  }

  const fetchImpl = params.fetchFn ?? fetch;
  const timeoutMs = params.timeoutMs ?? DEFAULT_TURNSTILE_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  let data: TurnstileSiteverifyResponse;
  try {
    let response: Response;
    try {
      response = await fetchImpl(TURNSTILE_SITEVERIFY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        console.error("[api] turnstile_siteverify_timeout");
      } else {
        console.error("[api] turnstile_siteverify_network_error");
      }
      throwTurnstileUnavailable();
    }

    if (!response.ok) {
      console.error("[api] turnstile_siteverify_http_error", { status: response.status });
      throwTurnstileUnavailable();
    }

    try {
      const parsed: unknown = await response.json();
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        console.error("[api] turnstile_siteverify_invalid_payload");
        throwTurnstileUnavailable();
      }
      data = parsed as TurnstileSiteverifyResponse;
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      if (controller.signal.aborted) {
        console.error("[api] turnstile_siteverify_timeout");
      } else {
        console.error("[api] turnstile_siteverify_parse_error");
      }
      throwTurnstileUnavailable();
    }
  } finally {
    clearTimeout(timeoutId);
  }

  if (data.success !== true) {
    throwTurnstileFailed();
  }

  if (!isLocalOrTestEnv && data.metadata?.result_with_testing_key === true) {
    console.error("[api] turnstile_testing_key_in_production");
    throwTurnstileFailed();
  }

  if (
    typeof data.hostname !== "string" ||
    data.hostname.trim().toLowerCase() !== expectedHostname.toLowerCase()
  ) {
    throwTurnstileFailed();
  }

  if (expectedAction) {
    if (typeof data.action !== "string" || data.action.trim() !== expectedAction) {
      throwTurnstileFailed();
    }
  }
}
