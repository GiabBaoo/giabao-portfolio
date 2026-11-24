import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiErrorCode, ApiErrorResponse } from "@giabao-portfolio/shared";
import type { AppBindings } from "../env.ts";

export class ApiError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: ApiErrorCode;
  readonly fields?: Record<string, string>;

  constructor(
    status: ContentfulStatusCode,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function buildErrorBody(
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string>,
): ApiErrorResponse {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(fields && Object.keys(fields).length > 0 ? { fields } : {}),
    },
  };
}

export const handleApiError: ErrorHandler<{ Bindings: AppBindings }> = (err, c) => {
  if (err instanceof ApiError) {
    return c.json(buildErrorBody(err.code, err.message, err.fields), err.status);
  }

  // Tuyệt đối không ghi log nội dung tin nhắn, email, IP gốc, SQL hay stack trace nhạy cảm
  console.error("[api] unhandled_error", {
    name: err instanceof Error ? err.name : "UnknownError",
  });

  return c.json(
    buildErrorBody("INTERNAL_ERROR", "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."),
    500,
  );
};
