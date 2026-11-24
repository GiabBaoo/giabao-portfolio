import { CONTACT_FIELD_LIMITS } from "@giabao-portfolio/shared";

/**
 * Chỉ đọc địa chỉ IP do Cloudflare cung cấp qua header CF-Connecting-IP.
 * Tuyệt đối không fallback sang X-Forwarded-For hoặc header do client tự gửi.
 */
export function extractCloudflareClientIp(headers: Headers): string | null {
  const raw = headers.get("cf-connecting-ip");
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Băm địa chỉ IP bằng Web Crypto SHA-256(IP + IP_HASH_SALT) trả về chuỗi hex 64 ký tự.
 * Lưu ý: dữ liệu sau khi băm là pseudonymized (giả danh hóa), không phải ẩn danh tuyệt đối.
 * Nếu thiếu IP hoặc thiếu salt thì trả về null (không lưu IP gốc, không tạo hash giả).
 */
export async function hashClientIp(
  ip: string | null,
  salt: string | undefined,
): Promise<string | null> {
  if (!ip) {
    return null;
  }

  const normalizedSalt = salt?.trim();
  if (!normalizedSalt) {
    console.warn("[api] ip_hash_salt_missing");
    return null;
  }

  const encoded = new TextEncoder().encode(`${ip}${normalizedSalt}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = new Uint8Array(digest);

  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex;
}

/**
 * Chuẩn hóa header User-Agent: không bắt buộc, cắt tối đa 512 ký tự trước khi lưu D1.
 */
export function normalizeUserAgent(userAgentHeader: string | null): string | null {
  if (!userAgentHeader) {
    return null;
  }

  const trimmed = userAgentHeader.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, CONTACT_FIELD_LIMITS.userAgentMax);
}
