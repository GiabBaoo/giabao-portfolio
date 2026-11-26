import { Navigate, useParams } from "react-router";
import { DEFAULT_LOCALE, isLocale } from "../../i18n/index.ts";
import { I18nProvider } from "../providers/I18nProvider.tsx";
import { RootLayout } from "./RootLayout.tsx";

export function RootRedirect() {
  return <Navigate to={`/${DEFAULT_LOCALE}`} replace />;
}

export function LocaleLayout() {
  const { locale } = useParams<{ locale: string }>();

  if (!isLocale(locale)) {
    return <Navigate to={`/${DEFAULT_LOCALE}`} replace />;
  }

  return (
    <I18nProvider locale={locale}>
      <RootLayout />
    </I18nProvider>
  );
}
