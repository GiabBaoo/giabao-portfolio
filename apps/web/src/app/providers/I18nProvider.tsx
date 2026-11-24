import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { dictionaries, replaceLocaleInPath, storeLocale, type Locale } from "../../i18n/index.ts";
import { I18nContext } from "./i18n-context.ts";

interface I18nProviderProps {
  locale: Locale;
  children: ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const messages = dictionaries[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = messages.meta.siteTitle;
    storeLocale(locale);

    const updateMeta = (selector: string, content: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      if (el) {
        el.setAttribute("content", content);
      }
    };

    updateMeta('meta[name="description"]', messages.meta.siteDescription);
    updateMeta('meta[property="og:title"]', messages.meta.siteTitle);
    updateMeta('meta[property="og:description"]', messages.meta.siteDescription);
    updateMeta('meta[property="og:locale"]', locale === "vi" ? "vi_VN" : "en_US");
  }, [locale, messages.meta.siteDescription, messages.meta.siteTitle]);

  const switchLocale = useCallback(
    (nextLocale: Locale) => {
      if (nextLocale === locale) {
        return;
      }
      storeLocale(nextLocale);
      const nextPath = replaceLocaleInPath(location.pathname, nextLocale);
      void navigate(`${nextPath}${location.search}${location.hash}`);
    },
    [locale, location.hash, location.pathname, location.search, navigate],
  );

  const value = useMemo(
    () => ({
      locale,
      messages,
      switchLocale,
    }),
    [locale, messages, switchLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
