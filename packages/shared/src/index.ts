import "./zod-config";

export {
  API_ERROR_CODES,
  apiErrorCodeSchema,
  apiErrorDetailSchema,
  apiErrorResponseSchema,
  apiSuccessResponseSchema,
  type ApiErrorCode,
  type ApiErrorDetail,
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from "./schemas/api";

export {
  CONTACT_BODY_LIMIT_BYTES,
  CONTACT_FIELD_LIMITS,
  SUPPORTED_LOCALES,
  contactSubmissionSchema,
  contactSuccessResponseSchema,
  localeSchema,
  type ContactSubmission,
  type ContactSubmissionInput,
  type ContactSuccessResponse,
  type SupportedLocale,
} from "./schemas/contact";

export {
  healthDatabaseStatusSchema,
  healthResponseSchema,
  healthStatusSchema,
  type HealthDatabaseStatus,
  type HealthResponse,
  type HealthStatus,
} from "./schemas/health";
export * from "./schemas/portfolio";
