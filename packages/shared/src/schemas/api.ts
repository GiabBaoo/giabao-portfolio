import "../zod-config";
import { z } from "zod";

export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "TURNSTILE_FAILED",
  "TURNSTILE_UNAVAILABLE",
  "RATE_LIMITED",
  "GITHUB_RATE_LIMIT",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "NOT_FOUND",
  "SERVICE_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);

export const apiErrorDetailSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string().min(1),
  fields: z.record(z.string(), z.string()).optional(),
});

export const apiErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: apiErrorDetailSchema,
});

export const apiSuccessResponseSchema = z.object({
  ok: z.literal(true),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type ApiSuccessResponse = z.infer<typeof apiSuccessResponseSchema>;
