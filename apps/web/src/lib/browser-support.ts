export function supportsIntersectionObserver(): boolean {
  return (
    typeof window !== "undefined" &&
    "IntersectionObserver" in window &&
    typeof window.IntersectionObserver === "function"
  );
}

interface LegacyMediaQueryList {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
}

export function subscribeMediaQuery(
  mediaQuery: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void,
): () => void {
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", listener);
    return () => {
      mediaQuery.removeEventListener("change", listener);
    };
  }

  const legacyMediaQuery = mediaQuery as unknown as LegacyMediaQueryList;
  if (typeof legacyMediaQuery.addListener === "function") {
    legacyMediaQuery.addListener(listener);
    return () => {
      legacyMediaQuery.removeListener?.(listener);
    };
  }

  return () => {};
}
