export const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const DEFAULT_TURNSTILE_LOAD_TIMEOUT_MS = 10_000;

export interface TurnstileRenderOptions {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  language?: string;
  action?: string;
  size?: "normal" | "compact" | "flexible";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: (errorCode?: string) => void;
  "timeout-callback"?: () => void;
}

export interface TurnstileApi {
  render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileLoadErrorReason = "load_error" | "timeout";

export class TurnstileLoadError extends Error {
  readonly reason: TurnstileLoadErrorReason;

  constructor(reason: TurnstileLoadErrorReason, message: string) {
    super(message);
    this.name = "TurnstileLoadError";
    this.reason = reason;
  }
}

export interface LoadTurnstileOptions {
  timeoutMs?: number;
}

const SCRIPT_SELECTOR =
  'script[data-turnstile-script="true"], script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]';

let inFlightPromise: Promise<TurnstileApi> | null = null;

export function loadTurnstileScript(options: LoadTurnstileOptions = {}): Promise<TurnstileApi> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(
      new TurnstileLoadError("load_error", "Turnstile is unavailable outside a browser context."),
    );
  }

  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TURNSTILE_LOAD_TIMEOUT_MS;

  inFlightPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
    const createdByLoader = !existingScript;
    const script = existingScript ?? document.createElement("script");

    if (createdByLoader) {
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = "true";
    }

    let settled = false;
    let timeoutId: number | undefined;

    const cleanup = () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const fail = (reason: TurnstileLoadErrorReason, message: string) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      inFlightPromise = null;
      if (createdByLoader && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      reject(new TurnstileLoadError(reason, message));
    };

    const handleLoad = () => {
      if (settled) {
        return;
      }
      if (window.turnstile) {
        settled = true;
        cleanup();
        inFlightPromise = null;
        resolve(window.turnstile);
      } else {
        fail("load_error", "Turnstile script loaded without exposing window.turnstile.");
      }
    };

    const handleError = () => {
      fail("load_error", "Failed to load Cloudflare Turnstile script.");
    };

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    timeoutId = window.setTimeout(() => {
      fail("timeout", "Timed out while loading Cloudflare Turnstile script.");
    }, timeoutMs);

    if (createdByLoader) {
      document.head.appendChild(script);
    }
  });

  return inFlightPromise;
}

export function resetTurnstileLoaderForTests(): void {
  inFlightPromise = null;
}
