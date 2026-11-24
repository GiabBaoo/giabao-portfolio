import type { RateLimiterBinding } from "../env.ts";
import { ApiError } from "../middleware/error-handler.ts";

const RATE_LIMIT_KEY_PREFIX = "contact:ip:";
const MISSING_IP_RATE_LIMIT_KEY = "contact:missing-ip";

export function buildRateLimitKey(clientIp: string | null): string {
  return clientIp ? `${RATE_LIMIT_KEY_PREFIX}${clientIp}` : MISSING_IP_RATE_LIMIT_KEY;
}

/**
 * Kiểm tra giới hạn tần suất bằng Cloudflare Workers Rate Limiting binding (`RATE_LIMITER`).
 * Không sử dụng bộ nhớ trong (in-memory Map).
 * Lưu ý: Workers Rate Limiting áp dụng theo từng colo/location và có tính eventual consistency.
 */
export async function enforceContactRateLimit(
  rateLimiter: RateLimiterBinding | undefined,
  clientIp: string | null,
): Promise<void> {
  if (!rateLimiter) {
    console.error("[api] rate_limiter_binding_missing");
    throw new ApiError(500, "INTERNAL_ERROR", "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
  }

  const key = buildRateLimitKey(clientIp);
  let outcome: { success: boolean };

  try {
    outcome = await rateLimiter.limit({ key });
  } catch {
    console.error("[api] rate_limiter_check_failed");
    throw new ApiError(500, "INTERNAL_ERROR", "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
  }

  if (!outcome.success) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.",
    );
  }
}
