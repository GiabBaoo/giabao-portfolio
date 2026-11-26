export interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface AppBindings {
  DB: D1Database;
  MEDIA_BUCKET?: R2Bucket;
  APP_ENV?: string;
  RATE_LIMITER?: RateLimiterBinding;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
  TURNSTILE_EXPECTED_ACTION?: string;
  IP_HASH_SALT?: string;
  RESEND_API_KEY?: string;
  ADMIN_PASSWORD?: string;
  GITHUB_TOKEN?: string;
}