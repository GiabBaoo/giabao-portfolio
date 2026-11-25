import { Hono } from "hono";
import type { AppBindings } from "./env.ts";
import { buildErrorBody, handleApiError } from "./middleware/error-handler.ts";
import { securityHeadersMiddleware } from "./middleware/security-headers.ts";
import { adminRoute } from "./routes/admin.ts";
import { createContactRoute, type ContactRouteDependencies } from "./routes/contact.ts";
import { healthRoute } from "./routes/health.ts";
import { mediaRoute } from "./routes/media.ts";
import { portfolioRoute } from "./routes/portfolio.ts";

export interface ApiAppDependencies {
  contact?: ContactRouteDependencies;
}

export function createApp(deps: ApiAppDependencies = {}) {
  const app = new Hono<{ Bindings: AppBindings }>();

  app.onError(handleApiError);
  app.use("/api/*", securityHeadersMiddleware);

  app.route("/api/health", healthRoute);
  app.route("/api/contact", createContactRoute(deps.contact));
  app.route("/api/portfolio", portfolioRoute);
  app.route("/api/media", mediaRoute);
  app.route("/api/admin", adminRoute);

  app.all("/api/*", (c) => {
    return c.json(buildErrorBody("NOT_FOUND", "Endpoint API không tồn tại"), 404);
  });

  return app;
}

const app = createApp();

export default app;