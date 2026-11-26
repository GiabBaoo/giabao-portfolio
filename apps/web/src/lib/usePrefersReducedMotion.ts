import { useEffect, useState } from "react";
import { subscribeMediaQuery } from "./browser-support.ts";

function getInitialReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return Boolean(window.matchMedia("(prefers-reduced-motion: reduce)")?.matches);
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState<boolean>(getInitialReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) {
      return;
    }

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    return subscribeMediaQuery(mediaQuery, handleChange);
  }, []);

  return prefersReducedMotion;
}
