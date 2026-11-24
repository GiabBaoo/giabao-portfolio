declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    RATE_LIMITER?: import("../src/env.ts").RateLimiterBinding;
    TURNSTILE_SECRET_KEY?: string;
    TURNSTILE_EXPECTED_HOSTNAME?: string;
    TURNSTILE_EXPECTED_ACTION?: string;
    IP_HASH_SALT?: string;
    TEST_MIGRATIONS: import("@cloudflare/vitest-plugin").D1Migration[];
  }

  interface Exports {
    default: Fetcher;
  }
}
