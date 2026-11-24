import { Hono } from "hono";
import type { HealthResponse } from "@giabao-portfolio/shared";
import type { AppBindings } from "../env.ts";
import { buildErrorBody } from "../middleware/error-handler.ts";
import { checkDatabaseHealth } from "../services/contact-repository.ts";

export const healthRoute = new Hono<{ Bindings: AppBindings }>();

healthRoute.get("/", async (c) => {
  try {
    await checkDatabaseHealth(c.env.DB);

    const body: HealthResponse = {
      ok: true,
      data: {
        status: "healthy",
        database: "connected",
      },
    };

    return c.json(body, 200);
  } catch {
    console.error("[api] health_check_db_failed");

    return c.json(buildErrorBody("SERVICE_UNAVAILABLE", "Dịch vụ tạm thời không khả dụng"), 503);
  }
});
