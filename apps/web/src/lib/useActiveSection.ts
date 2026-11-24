import { useEffect, useState } from "react";

function getInitialHashSection(sectionIds: readonly string[], enabled: boolean): string | null {
  if (!enabled || typeof window === "undefined") {
    return null;
  }
  const hashId = window.location.hash.replace(/^#/, "");
  return hashId && sectionIds.includes(hashId) ? hashId : null;
}

export function useActiveSection(sectionIds: readonly string[], enabled = true): string | null {
  const [activeId, setActiveId] = useState<string | null>(() =>
    getInitialHashSection(sectionIds, enabled),
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const handleHashChange = () => {
      const nextHash = window.location.hash.replace(/^#/, "");
      if (nextHash && sectionIds.includes(nextHash)) {
        setActiveId(nextHash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    if (typeof IntersectionObserver === "undefined") {
      return () => {
        window.removeEventListener("hashchange", handleHashChange);
      };
    }

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) {
      return () => {
        window.removeEventListener("hashchange", handleHashChange);
      };
    }

    const visibleRatios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleRatios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        let bestId: string | null = null;
        let bestRatio = 0;

        for (const id of sectionIds) {
          const ratio = visibleRatios.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }

        if (bestId) {
          setActiveId(bestId);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.15, 0.35, 0.6],
      },
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [enabled, sectionIds]);

  return activeId;
}
