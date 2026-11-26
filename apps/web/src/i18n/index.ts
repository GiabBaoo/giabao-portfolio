import { enMessages } from "./en.ts";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type Locale,
  type Messages,
} from "./types.ts";
import { viMessages } from "./vi.ts";

export { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES };
export type { Locale, Messages };

export const dictionaries: Readonly<Record<Locale, Messages>> = {
  en: enMessages,
  vi: viMessages,
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "vi";
}

export function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function storeLocale(locale: Locale): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

export function detectInitialLocale(): Locale {
  const stored = getStoredLocale();
  if (stored) {
    return stored;
  }
  return DEFAULT_LOCALE;
}

export function replaceLocaleInPath(pathname: string, nextLocale: Locale): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    segments[0] = nextLocale;
    return `/${segments.join("/")}`;
  }
  return `/${nextLocale}${normalized === "/" ? "" : normalized}`;
}
