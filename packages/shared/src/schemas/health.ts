import "../zod-config";
import { z } from "zod";

export const healthStatusSchema = z.enum(["healthy", "degraded"]);
export const healthDatabaseStatusSchema = z.enum(["connected", "unavailable"]);

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    status: healthStatusSchema,
    database: healthDatabaseStatusSchema,
  }),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type HealthDatabaseStatus = z.infer<typeof healthDatabaseStatusSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
