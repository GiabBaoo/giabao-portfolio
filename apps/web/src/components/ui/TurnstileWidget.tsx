import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { loadTurnstileScript, type TurnstileRenderOptions } from "../../lib/turnstile-loader.ts";
import { Button } from "./Button.tsx";

export interface TurnstileWidgetHandle {
  reset: () => void;
}

export interface TurnstileWidgetProps {
  ref?: Ref<TurnstileWidgetHandle>;
  siteKey?: string;
  theme: "light" | "dark";
  locale: "en" | "vi";
  action?: string;
  loadTimeoutMs?: number;
  disabled?: boolean;
  loadingLabel: string;
  loadErrorLabel: string;
  retryLabel: string;
  missingSiteKeyLabel: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
  onLoadError?: () => void;
  onReady?: () => void;
}

interface WidgetLoadState {
  key: string;
  status: "ready" | "load_error";
}

export function TurnstileWidget({
  ref,
  siteKey,
  theme,
  locale,
  action,
  loadTimeoutMs,
  disabled = false,
  loadingLabel,
  loadErrorLabel,
  retryLabel,
  missingSiteKeyLabel,
  onVerify,
  onExpire,
  onError,
  onLoadError,
  onReady,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadState, setLoadState] = useState<WidgetLoadState | null>(null);

  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  const onLoadErrorRef = useRef(onLoadError);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
    onLoadErrorRef.current = onLoadError;
    onReadyRef.current = onReady;
  }, [onVerify, onExpire, onError, onLoadError, onReady]);

  const trimmedSiteKey = siteKey?.trim() ?? "";
  const trimmedAction = action?.trim() ?? "";
  const isMissingKey = trimmedSiteKey.length === 0;
  const widgetKey = `${trimmedSiteKey}:${theme}:${locale}:${trimmedAction}:${retryCount}`;

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        const widgetId = widgetIdRef.current;
        if (widgetId && typeof window !== "undefined" && window.turnstile) {
          try {
            window.turnstile.reset(widgetId);
          } catch {
            // Widget may already have been removed during teardown
          }
        }
      },
    }),
    [],
  );

  useEffect(() => {
    if (isMissingKey) {
      return;
    }

    let cancelled = false;
    let renderedWidgetId: string | null = null;

    loadTurnstileScript({ timeoutMs: loadTimeoutMs })
      .then((turnstile) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const renderOptions: TurnstileRenderOptions = {
          sitekey: trimmedSiteKey,
          theme,
          language: locale,
          callback: (token: string) => {
            if (!cancelled) {
              onVerifyRef.current(token);
            }
          },
          "expired-callback": () => {
            if (!cancelled) {
              onExpireRef.current();
            }
          },
          "error-callback": () => {
            if (!cancelled) {
              onErrorRef.current();
            }
          },
          "timeout-callback": () => {
            if (!cancelled) {
              onExpireRef.current();
            }
          },
        };

        if (trimmedAction.length > 0) {
          renderOptions.action = trimmedAction;
        }

        renderedWidgetId = turnstile.render(containerRef.current, renderOptions);
        widgetIdRef.current = renderedWidgetId;
        setLoadState({ key: widgetKey, status: "ready" });
        onReadyRef.current?.();
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setLoadState({ key: widgetKey, status: "load_error" });
        onLoadErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      if (renderedWidgetId !== null) {
        if (widgetIdRef.current === renderedWidgetId) {
          widgetIdRef.current = null;
        }
        if (typeof window !== "undefined" && window.turnstile) {
          try {
            window.turnstile.remove(renderedWidgetId);
          } catch {
            // Ignore cleanup errors if widget was already removed
          }
        }
      }
    };
  }, [isMissingKey, trimmedSiteKey, theme, locale, trimmedAction, loadTimeoutMs, widgetKey]);

  if (isMissingKey) {
    return (
      <div
        role="note"
        className="border-status-warning/30 bg-status-warning-soft text-small text-text-secondary rounded-lg border px-4 py-3"
      >
        {missingSiteKeyLabel}
      </div>
    );
  }

  const effectiveStatus = loadState?.key === widgetKey ? loadState.status : "loading";

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        data-testid="turnstile-container"
        className={effectiveStatus === "load_error" ? "hidden" : "min-h-[65px]"}
      />

      {effectiveStatus === "loading" && (
        <p className="text-caption text-text-muted" role="status" aria-live="polite">
          {loadingLabel}
        </p>
      )}

      {effectiveStatus === "load_error" && (
        <div
          role="alert"
          className="border-status-danger/30 bg-status-danger-soft text-small text-text-primary flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
        >
          <span>{loadErrorLabel}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setRetryCount((count) => count + 1)}
          >
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
