import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CONTACT_FIELD_LIMITS, type ApiErrorCode } from "@giabao-portfolio/shared";
import { useI18n } from "../../app/providers/i18n-context.ts";
import { useTheme } from "../../app/providers/theme-context.ts";
import type { Profile, SocialPlatform } from "../../content/index.ts";
import type { Messages } from "../../i18n/index.ts";
import { cn } from "../../lib/cn.ts";
import {
  submitContactForm,
  validateContactForm,
  type ContactFieldName,
  type ContactFormValues,
  type ContactValidationErrorCode,
} from "../../lib/contact-api.ts";
import {
  Button,
  Card,
  Container,
  Reveal,
  Section,
  SectionHeader,
  Typography,
} from "../ui/index.ts";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  GitHubIcon,
  LinkedInIcon,
  MailIcon,
} from "../ui/Icons.tsx";
import { TurnstileWidget, type TurnstileWidgetHandle } from "../ui/TurnstileWidget.tsx";

export interface ContactSectionProps {
  profile: Profile;
  turnstileSiteKey?: string;
  turnstileAction?: string;
  requestTimeoutMs?: number;
  fetchFn?: typeof fetch;
}

type FieldErrorState = Partial<
  Record<ContactFieldName, ContactValidationErrorCode | "field_invalid">
>;

type FormFeedback =
  | { type: "idle" }
  | { type: "success" }
  | { type: "error"; messageKey: keyof Messages["contact"]["errors"] | "missing_site_key" };

const INITIAL_FORM_VALUES: ContactFormValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

function renderPlatformIcon(platform: SocialPlatform) {
  switch (platform) {
    case "github":
      return <GitHubIcon className="h-5 w-5" />;
    case "linkedin":
      return <LinkedInIcon className="h-5 w-5" />;
    case "email":
      return <MailIcon className="h-5 w-5" />;
  }
}

function resolveFieldErrorMessage(
  code: ContactValidationErrorCode | "field_invalid" | undefined,
  validationMessages: Messages["contact"]["validation"],
): string | undefined {
  if (!code) {
    return undefined;
  }

  switch (code) {
    case "name_required":
      return validationMessages.nameRequired;
    case "name_too_long":
      return validationMessages.nameTooLong;
    case "email_required":
      return validationMessages.emailRequired;
    case "email_too_long":
      return validationMessages.emailTooLong;
    case "email_invalid":
      return validationMessages.emailInvalid;
    case "subject_too_long":
      return validationMessages.subjectTooLong;
    case "message_required":
      return validationMessages.messageRequired;
    case "message_too_short":
      return validationMessages.messageTooShort;
    case "message_too_long":
      return validationMessages.messageTooLong;
    case "turnstile_required":
      return validationMessages.turnstileRequired;
    case "turnstile_invalid":
      return validationMessages.turnstileInvalid;
    case "field_invalid":
      return validationMessages.fieldInvalid;
  }
}

function mapApiErrorCodeToMessageKey(code: ApiErrorCode): keyof Messages["contact"]["errors"] {
  switch (code) {
    case "VALIDATION_ERROR":
      return "validationError";
    case "TURNSTILE_FAILED":
      return "turnstileFailed";
    case "TURNSTILE_UNAVAILABLE":
      return "turnstileUnavailable";
    case "RATE_LIMITED":
      return "rateLimited";
    case "PAYLOAD_TOO_LARGE":
      return "payloadTooLarge";
    case "UNSUPPORTED_MEDIA_TYPE":
      return "unsupportedMediaType";
    case "SERVICE_UNAVAILABLE":
      return "serviceUnavailable";
    case "NOT_FOUND":
    case "INTERNAL_ERROR":
      return "internalError";
  }
}

export function ContactSection({
  profile,
  turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY,
  turnstileAction = import.meta.env.VITE_TURNSTILE_ACTION,
  requestTimeoutMs,
  fetchFn,
}: ContactSectionProps) {
  const { locale, messages } = useI18n();
  const { resolvedTheme } = useTheme();

  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const copyTimerRef = useRef<number | undefined>(undefined);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const subjectInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [formValues, setFormValues] = useState<ContactFormValues>(INITIAL_FORM_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorState>({});
  const [turnstileStatusNote, setTurnstileStatusNote] = useState<"expired" | "error" | null>(null);
  const [feedback, setFeedback] = useState<FormFeedback>({ type: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSubmittingRef = useRef(false);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);

  const trimmedSiteKey = turnstileSiteKey?.trim() ?? "";
  const trimmedAction = turnstileAction?.trim() ?? "";
  const hasSiteKey = trimmedSiteKey.length > 0;
  const widgetContext = `${resolvedTheme}:${locale}:${trimmedSiteKey}:${trimmedAction}`;

  const [tokenState, setTokenState] = useState<{ context: string; token: string } | null>(null);
  const turnstileToken = tokenState?.context === widgetContext ? tokenState.token : "";

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== undefined) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopyStatus("copied");
      if (copyTimerRef.current !== undefined) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("failed");
      if (copyTimerRef.current !== undefined) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopyStatus("idle"), 3000);
    }
  };

  const updateField = (field: keyof ContactFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));

    if (field !== "website" && fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    if (feedback.type !== "idle") {
      setFeedback({ type: "idle" });
    }
  };

  const clearTurnstileToken = useCallback(() => {
    setTokenState(null);
  }, []);

  const handleTurnstileVerify = useCallback(
    (token: string) => {
      setTokenState({ context: widgetContext, token });
      setTurnstileStatusNote(null);
      setFieldErrors((prev) => {
        if (!prev.turnstileToken) {
          return prev;
        }
        const next = { ...prev };
        delete next.turnstileToken;
        return next;
      });
    },
    [widgetContext],
  );

  const handleTurnstileExpire = useCallback(() => {
    clearTurnstileToken();
    setTurnstileStatusNote("expired");
  }, [clearTurnstileToken]);

  const handleTurnstileError = useCallback(() => {
    clearTurnstileToken();
    setTurnstileStatusNote("error");
  }, [clearTurnstileToken]);

  const handleTurnstileLoadError = useCallback(() => {
    clearTurnstileToken();
  }, [clearTurnstileToken]);

  const resetTurnstileWidget = () => {
    clearTurnstileToken();
    turnstileRef.current?.reset();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    const validation = validateContactForm(formValues, locale, turnstileToken);
    if (!validation.valid) {
      setFieldErrors(validation.fields);

      if (!hasSiteKey && validation.fields.turnstileToken) {
        setFeedback({ type: "error", messageKey: "missing_site_key" });
      } else if (validation.formError === "payload_too_large") {
        setFeedback({ type: "error", messageKey: "payloadTooLarge" });
      } else {
        setFeedback({ type: "error", messageKey: "validationError" });
      }

      if (validation.fields.name) {
        nameInputRef.current?.focus();
      } else if (validation.fields.email) {
        emailInputRef.current?.focus();
      } else if (validation.fields.subject) {
        subjectInputRef.current?.focus();
      } else if (validation.fields.message) {
        messageInputRef.current?.focus();
      }
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setFieldErrors({});
    setFeedback({ type: "idle" });
    setTurnstileStatusNote(null);

    try {
      const result = await submitContactForm(validation.serializedBody, {
        timeoutMs: requestTimeoutMs,
        fetchFn,
      });

      if (result.ok) {
        setFormValues(INITIAL_FORM_VALUES);
        setFieldErrors({});
        setTurnstileStatusNote(null);
        resetTurnstileWidget();
        setFeedback({ type: "success" });
        return;
      }

      if (result.kind === "timeout") {
        resetTurnstileWidget();
        setFeedback({ type: "error", messageKey: "timeoutError" });
        return;
      }

      if (result.kind === "network") {
        resetTurnstileWidget();
        setFeedback({ type: "error", messageKey: "networkError" });
        return;
      }

      if (result.fieldKeys.length > 0) {
        const mappedFields: FieldErrorState = {};
        for (const key of result.fieldKeys) {
          mappedFields[key] = key === "turnstileToken" ? "turnstile_invalid" : "field_invalid";
        }
        setFieldErrors(mappedFields);
      }

      if (result.shouldResetTurnstile) {
        resetTurnstileWidget();
      }

      setFeedback({
        type: "error",
        messageKey: mapApiErrorCodeToMessageKey(result.code),
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const nameError = resolveFieldErrorMessage(fieldErrors.name, messages.contact.validation);
  const emailError = resolveFieldErrorMessage(fieldErrors.email, messages.contact.validation);
  const subjectError = resolveFieldErrorMessage(fieldErrors.subject, messages.contact.validation);
  const messageError = resolveFieldErrorMessage(fieldErrors.message, messages.contact.validation);
  const turnstileError =
    resolveFieldErrorMessage(fieldErrors.turnstileToken, messages.contact.validation) ??
    (turnstileStatusNote === "expired"
      ? messages.contact.turnstile.expired
      : turnstileStatusNote === "error"
        ? messages.contact.turnstile.error
        : undefined);

  const formErrorText =
    feedback.type === "error"
      ? feedback.messageKey === "missing_site_key"
        ? messages.contact.turnstile.missingSiteKey
        : messages.contact.errors[feedback.messageKey]
      : undefined;

  const inputBaseClass =
    "bg-bg-secondary text-small text-text-primary placeholder:text-text-muted focus:border-accent-primary focus-visible:outline-focus-ring w-full rounded-md border px-3.5 py-2.5 transition-[border-color,box-shadow,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <Section
      id="contact"
      spacing="md"
      aria-labelledby="contact-heading"
      className="section-surface-contact border-border-subtle scroll-mt-20 border-t"
    >
      <Container size="xl">
        <Reveal>
          <SectionHeader
            eyebrow={messages.contact.eyebrow}
            heading={messages.contact.heading}
            subtitle={messages.contact.subtitle}
            headingId="contact-heading"
          />
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Direct Channels */}
          <Reveal variant="fade-up" delay={60} className="lg:col-span-5">
            <Card variant="elevated" padding="md" className="space-y-5">
              <Typography variant="h3">{messages.contact.directChannelsTitle}</Typography>

              <div className="space-y-3">
                {profile.socialLinks.map((link) => {
                  const isEmail = link.platform === "email";
                  const displayValue =
                    link.platform === "email"
                      ? profile.email
                      : link.platform === "github"
                        ? "github.com/GiabBaoo"
                        : "linkedin.com/in/bảo-nguyễn";

                  return (
                    <div
                      key={link.platform}
                      className="border-border-subtle bg-bg-secondary hover:border-accent-primary/40 flex items-center justify-between gap-3 rounded-lg border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:hover:translate-y-0"
                    >
                      <a
                        href={link.url}
                        target={isEmail ? undefined : "_blank"}
                        rel={isEmail ? undefined : "noopener noreferrer"}
                        className="group flex min-w-0 flex-1 items-center gap-3 rounded-md"
                      >
                        <span className="bg-accent-soft text-accent-primary group-hover:bg-accent-primary group-hover:text-accent-contrast inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors duration-200">
                          {renderPlatformIcon(link.platform)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-caption text-text-muted font-mono uppercase">
                            {link.label}
                          </p>
                          <p className="text-small text-text-primary group-hover:text-accent-primary truncate font-medium transition-colors">
                            {displayValue}
                          </p>
                        </div>
                        {!isEmail && (
                          <span
                            aria-hidden="true"
                            className="text-text-muted group-hover:text-accent-primary inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                          </span>
                        )}
                      </a>

                      {isEmail && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleCopyEmail()}
                            aria-label={
                              copyStatus === "copied"
                                ? messages.contact.emailCopied
                                : messages.contact.copyEmail
                            }
                          >
                            {copyStatus === "copied" ? (
                              <>
                                <CheckIcon className="text-status-success h-3.5 w-3.5" />
                                <span>{messages.contact.emailCopied}</span>
                              </>
                            ) : (
                              <>
                                <CopyIcon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">
                                  {messages.contact.copyEmail}
                                </span>
                              </>
                            )}
                          </Button>
                          <span role="status" aria-live="polite" className="sr-only">
                            {copyStatus === "copied"
                              ? messages.contact.emailCopied
                              : copyStatus === "failed"
                                ? messages.contact.copyEmailFailed
                                : ""}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </Reveal>

          {/* Live Contact Form */}
          <Reveal variant="fade-up" delay={140} className="lg:col-span-7">
            <Card variant="elevated" padding="md" className="space-y-5">
              <Typography variant="h3">{messages.contact.formTitle}</Typography>

              {feedback.type === "success" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="border-status-success/30 bg-status-success-soft text-small text-text-primary rounded-lg border px-4 py-3"
                >
                  {messages.contact.successMessage}
                </div>
              )}

              {formErrorText && (
                <div
                  role="alert"
                  className="border-status-danger/30 bg-status-danger-soft text-small text-text-primary rounded-lg border px-4 py-3"
                >
                  {formErrorText}
                </div>
              )}

              <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
                {/* Honeypot field: hidden from users, assistive tech, and keyboard navigation */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
                >
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="new-password"
                    aria-hidden="true"
                    readOnly
                    onFocus={(event) => {
                      event.currentTarget.readOnly = false;
                    }}
                    value={formValues.website}
                    onChange={(event) => updateField("website", event.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="group space-y-1.5">
                    <label
                      htmlFor="contact-name"
                      className="text-small text-text-primary group-focus-within:text-accent-primary block font-medium transition-colors duration-150"
                    >
                      {messages.contact.nameLabel}
                    </label>
                    <input
                      ref={nameInputRef}
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      maxLength={CONTACT_FIELD_LIMITS.nameMax}
                      disabled={isSubmitting}
                      value={formValues.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder={messages.contact.namePlaceholder}
                      aria-invalid={Boolean(nameError)}
                      aria-describedby={nameError ? "contact-name-error" : undefined}
                      className={cn(
                        inputBaseClass,
                        nameError ? "border-status-danger" : "border-border-subtle",
                      )}
                    />
                    {nameError && (
                      <p id="contact-name-error" className="text-caption text-status-danger">
                        {nameError}
                      </p>
                    )}
                  </div>

                  <div className="group space-y-1.5">
                    <label
                      htmlFor="contact-email"
                      className="text-small text-text-primary group-focus-within:text-accent-primary block font-medium transition-colors duration-150"
                    >
                      {messages.contact.emailInputLabel}
                    </label>
                    <input
                      ref={emailInputRef}
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={CONTACT_FIELD_LIMITS.emailMax}
                      disabled={isSubmitting}
                      value={formValues.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder={messages.contact.emailPlaceholder}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? "contact-email-error" : undefined}
                      className={cn(
                        inputBaseClass,
                        emailError ? "border-status-danger" : "border-border-subtle",
                      )}
                    />
                    {emailError && (
                      <p id="contact-email-error" className="text-caption text-status-danger">
                        {emailError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="group space-y-1.5">
                  <label
                    htmlFor="contact-subject"
                    className="text-small text-text-primary group-focus-within:text-accent-primary block font-medium transition-colors duration-150"
                  >
                    {messages.contact.subjectLabel}
                  </label>
                  <input
                    ref={subjectInputRef}
                    id="contact-subject"
                    name="subject"
                    type="text"
                    maxLength={CONTACT_FIELD_LIMITS.subjectMax}
                    disabled={isSubmitting}
                    value={formValues.subject}
                    onChange={(event) => updateField("subject", event.target.value)}
                    placeholder={messages.contact.subjectPlaceholder}
                    aria-invalid={Boolean(subjectError)}
                    aria-describedby={subjectError ? "contact-subject-error" : undefined}
                    className={cn(
                      inputBaseClass,
                      subjectError ? "border-status-danger" : "border-border-subtle",
                    )}
                  />
                  {subjectError && (
                    <p id="contact-subject-error" className="text-caption text-status-danger">
                      {subjectError}
                    </p>
                  )}
                </div>

                <div className="group space-y-1.5">
                  <label
                    htmlFor="contact-message"
                    className="text-small text-text-primary group-focus-within:text-accent-primary block font-medium transition-colors duration-150"
                  >
                    {messages.contact.messageLabel}
                  </label>
                  <textarea
                    ref={messageInputRef}
                    id="contact-message"
                    name="message"
                    rows={4}
                    maxLength={CONTACT_FIELD_LIMITS.messageMax}
                    disabled={isSubmitting}
                    value={formValues.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    placeholder={messages.contact.messagePlaceholder}
                    aria-invalid={Boolean(messageError)}
                    aria-describedby={messageError ? "contact-message-error" : undefined}
                    className={cn(
                      inputBaseClass,
                      "resize-none",
                      messageError ? "border-status-danger" : "border-border-subtle",
                    )}
                  />
                  {messageError && (
                    <p id="contact-message-error" className="text-caption text-status-danger">
                      {messageError}
                    </p>
                  )}
                </div>

                <div
                  role="group"
                  aria-labelledby="contact-turnstile-label"
                  aria-describedby={
                    turnstileError && hasSiteKey ? "contact-turnstile-error" : undefined
                  }
                  className="space-y-1.5"
                >
                  <p
                    id="contact-turnstile-label"
                    className="text-small text-text-primary font-medium"
                  >
                    {messages.contact.turnstile.label}
                  </p>
                  <TurnstileWidget
                    ref={turnstileRef}
                    siteKey={trimmedSiteKey}
                    theme={resolvedTheme}
                    locale={locale}
                    action={trimmedAction || undefined}
                    disabled={isSubmitting}
                    loadingLabel={messages.contact.turnstile.loading}
                    loadErrorLabel={messages.contact.turnstile.loadError}
                    retryLabel={messages.contact.turnstile.retry}
                    missingSiteKeyLabel={messages.contact.turnstile.missingSiteKey}
                    onVerify={handleTurnstileVerify}
                    onExpire={handleTurnstileExpire}
                    onError={handleTurnstileError}
                    onLoadError={handleTurnstileLoadError}
                  />
                  {turnstileError && hasSiteKey && (
                    <p
                      id="contact-turnstile-error"
                      role="alert"
                      className="text-caption text-status-danger"
                    >
                      {turnstileError}
                    </p>
                  )}
                </div>

                <div className="pt-1">
                  <Button type="submit" variant="primary" size="md" loading={isSubmitting}>
                    {isSubmitting ? messages.contact.submittingLabel : messages.contact.submitLabel}
                  </Button>
                </div>
              </form>
            </Card>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
