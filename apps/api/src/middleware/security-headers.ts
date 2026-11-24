import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../env.ts";

export const securityHeadersMiddleware: MiddlewareHandler<{
  Bindings: AppBindings;
}> = async (c, next) => {
  await next();

  c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  c.header("Cache-Control", "no-store");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
};
