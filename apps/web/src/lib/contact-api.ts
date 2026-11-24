import {
  CONTACT_BODY_LIMIT_BYTES,
  CONTACT_FIELD_LIMITS,
  apiErrorResponseSchema,
  contactSubmissionSchema,
  contactSuccessResponseSchema,
  type ApiErrorCode,
  type SupportedLocale,
} from "@giabao-portfolio/shared";

export const CONTACT_ENDPOINT = "/api/contact";
export const DEFAULT_CONTACT_REQUEST_TIMEOUT_MS = 15_000;

export interface ContactFormValues {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
}

export interface ContactRequestPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
  locale: SupportedLocale;
  turnstileToken: string;
  website: string;
}

export type ContactFieldName = "name" | "email" | "subject" | "message" | "turnstileToken";

export type ContactValidationErrorCode =
  | "name_required"
  | "name_too_long"
  | "email_required"
  | "email_too_long"
  | "email_invalid"
  | "subject_too_long"
  | "message_required"
  | "message_too_short"
  | "message_too_long"
  | "turnstile_required"
  | "turnstile_invalid";

export type ContactFieldErrors = Partial<Record<ContactFieldName, ContactValidationErrorCode>>;

export type ContactValidationResult =
  | {
      valid: true;
      payload: ContactRequestPayload;
      serializedBody: string;
      byteLength: number;
    }
  | {
      valid: false;
      fields: ContactFieldErrors;
      formError?: "payload_too_large" | "validation_error";
    };

export type ContactSubmitResult =
  | { ok: true }
  | {
      ok: false;
      kind: "api";
      status: number;
      code: ApiErrorCode;
      fieldKeys: readonly ContactFieldName[];
      shouldResetTurnstile: boolean;
    }
  | {
      ok: false;
      kind: "network";
      shouldResetTurnstile: true;
    }
  | {
      ok: false;
      kind: "timeout";
      shouldResetTurnstile: true;
    };

export interface SubmitContactOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  endpoint?: string;
}

const KNOWN_FIELD_NAMES = new Set<ContactFieldName>([
  "name",
  "email",
  "subject",
  "message",
  "turnstileToken",
]);

export function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function buildContactPayload(
  values: ContactFormValues,
  locale: SupportedLocale,
  turnstileToken: string,
): ContactRequestPayload {
  const trimmedSubject = values.subject.trim();
  const payload: ContactRequestPayload = {
    name: values.name.trim(),
    email: values.email.trim(),
    message: values.message.trim(),
    locale,
    turnstileToken: turnstileToken.trim(),
    website: values.website,
  };

  if (trimmedSubject.length > 0) {
    payload.subject = trimmedSubject;
  }

  return payload;
}

export function validateContactForm(
  values: ContactFormValues,
  locale: SupportedLocale,
  turnstileToken: string,
): ContactValidationResult {
  const fields: ContactFieldErrors = {};

  const trimmedName = values.name.trim();
  if (trimmedName.length < CONTACT_FIELD_LIMITS.nameMin) {
    fields.name = "name_required";
  } else if (trimmedName.length > CONTACT_FIELD_LIMITS.nameMax) {
    fields.name = "name_too_long";
  }

  const trimmedEmail = values.email.trim();
  if (trimmedEmail.length === 0) {
    fields.email = "email_required";
  } else if (trimmedEmail.length > CONTACT_FIELD_LIMITS.emailMax) {
    fields.email = "email_too_long";
  } else if (!contactSubmissionSchema.shape.email.safeParse(trimmedEmail).success) {
    fields.email = "email_invalid";
  }

  const trimmedSubject = values.subject.trim();
  if (trimmedSubject.length > CONTACT_FIELD_LIMITS.subjectMax) {
    fields.subject = "subject_too_long";
  }

  const trimmedMessage = values.message.trim();
  if (trimmedMessage.length === 0) {
    fields.message = "message_required";
  } else if (trimmedMessage.length < CONTACT_FIELD_LIMITS.messageMin) {
    fields.message = "message_too_short";
  } else if (trimmedMessage.length > CONTACT_FIELD_LIMITS.messageMax) {
    fields.message = "message_too_long";
  }

  const trimmedToken = turnstileToken.trim();
  if (trimmedToken.length === 0) {
    fields.turnstileToken = "turnstile_required";
  } else if (trimmedToken.length > CONTACT_FIELD_LIMITS.turnstileTokenMax) {
    fields.turnstileToken = "turnstile_invalid";
  }

  const payload = buildContactPayload(values, locale, turnstileToken);
  const serializedBody = JSON.stringify(payload);
  const byteLength = getUtf8ByteLength(serializedBody);

  if (byteLength > CONTACT_BODY_LIMIT_BYTES) {
    return {
      valid: false,
      fields,
      formError: "payload_too_large",
    };
  }

  if (Object.keys(fields).length > 0) {
    return {
      valid: false,
      fields,
      formError: "validation_error",
    };
  }

  return {
    valid: true,
    payload,
    serializedBody,
    byteLength,
  };
}

function mapStatusToFallbackErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return "VALIDATION_ERROR";
    case 403:
      return "TURNSTILE_FAILED";
    case 404:
      return "NOT_FOUND";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 415:
      return "UNSUPPORTED_MEDIA_TYPE";
    case 429:
      return "RATE_LIMITED";
    case 503:
      return "SERVICE_UNAVAILABLE";
    default:
      return "INTERNAL_ERROR";
  }
}

export function shouldResetTurnstileForApiError(
  status: number,
  code: ApiErrorCode,
  fieldKeys: readonly ContactFieldName[],
): boolean {
  if (status === 400 || code === "VALIDATION_ERROR") {
    return fieldKeys.includes("turnstileToken");
  }

  if (
    status === 413 ||
    status === 415 ||
    status === 429 ||
    code === "PAYLOAD_TOO_LARGE" ||
    code === "UNSUPPORTED_MEDIA_TYPE" ||
    code === "RATE_LIMITED"
  ) {
    return false;
  }

  return true;
}

export async function submitContactForm(
  serializedBody: string,
  options: SubmitContactOptions = {},
): Promise<ContactSubmitResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_CONTACT_REQUEST_TIMEOUT_MS;
  const endpoint = options.endpoint ?? CONTACT_ENDPOINT;

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: serializedBody,
      signal: controller.signal,
    });

    let parsedJson: unknown = null;
    try {
      parsedJson = await response.json();
    } catch {
      parsedJson = null;
    }

    if (response.ok) {
      const successCheck = contactSuccessResponseSchema.safeParse(parsedJson);
      if (successCheck.success) {
        return { ok: true };
      }

      return {
        ok: false,
        kind: "api",
        status: response.status,
        code: "INTERNAL_ERROR",
        fieldKeys: [],
        shouldResetTurnstile: true,
      };
    }

    const errorCheck = apiErrorResponseSchema.safeParse(parsedJson);
    const code: ApiErrorCode = errorCheck.success
      ? errorCheck.data.error.code
      : mapStatusToFallbackErrorCode(response.status);

    const rawFields = errorCheck.success ? errorCheck.data.error.fields : undefined;
    const fieldKeys: ContactFieldName[] = rawFields
      ? Object.keys(rawFields).filter((key): key is ContactFieldName =>
          KNOWN_FIELD_NAMES.has(key as ContactFieldName),
        )
      : [];

    return {
      ok: false,
      kind: "api",
      status: response.status,
      code,
      fieldKeys,
      shouldResetTurnstile: shouldResetTurnstileForApiError(response.status, code, fieldKeys),
    };
  } catch (error) {
    if (timedOut || (error instanceof Error && error.name === "AbortError")) {
      return {
        ok: false,
        kind: "timeout",
        shouldResetTurnstile: true,
      };
    }

    return {
      ok: false,
      kind: "network",
      shouldResetTurnstile: true,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
