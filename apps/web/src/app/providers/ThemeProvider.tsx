import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { subscribeMediaQuery } from "../../lib/browser-support.ts";
import {
  THEME_STORAGE_KEY,
  ThemeContext,
  applyThemeToDocument,
  getStoredTheme,
  getSystemTheme,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme-context.ts";

const THEME_TRANSITION_MS = 220;

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemePreference;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(() => defaultTheme ?? getStoredTheme());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());
  const hasMountedRef = useRef(false);

  const resolvedTheme = resolveTheme(theme, systemTheme);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      applyThemeToDocument(resolvedTheme);
      return;
    }

    const root = typeof document !== "undefined" ? document.documentElement : null;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      Boolean(window.matchMedia("(prefers-reduced-motion: reduce)")?.matches);

    if (prefersReducedMotion) {
      applyThemeToDocument(resolvedTheme);
      return;
    }

    root?.classList.add("theme-transitioning");
    applyThemeToDocument(resolvedTheme);

    const timeoutId = window.setTimeout(() => {
      root?.classList.remove("theme-transitioning");
    }, THEME_TRANSITION_MS);

    return () => {
      window.clearTimeout(timeoutId);
      root?.classList.remove("theme-transitioning");
    };
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    if (!mediaQuery) {
      return;
    }

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    return subscribeMediaQuery(mediaQuery, handleChange);
  }, []);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage errors in restricted environments
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
