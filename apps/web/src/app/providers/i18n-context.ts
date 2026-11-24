import { createContext, useContext } from "react";
import type { Locale, Messages } from "../../i18n/index.ts";

export interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  switchLocale: (nextLocale: Locale) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
