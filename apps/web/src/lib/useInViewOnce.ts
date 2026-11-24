import { useEffect, useRef, useState, type RefObject } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion.ts";

interface UseInViewOnceOptions {
  readonly threshold?: number;
  readonly rootMargin?: string;
}

export function useInViewOnce<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOnceOptions = {},
): {
  readonly ref: RefObject<T | null>;
  readonly isInView: boolean;
  readonly hasObserver: boolean;
} {
  const { threshold = 0.12, rootMargin = "0px 0px -36px 0px" } = options;
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasObserver = typeof window !== "undefined" && typeof IntersectionObserver !== "undefined";

  const [isInView, setIsInView] = useState<boolean>(() => !hasObserver || prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion || !hasObserver || isInView) {
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [hasObserver, isInView, prefersReducedMotion, rootMargin, threshold]);

  return {
    ref,
    isInView: prefersReducedMotion || !hasObserver ? true : isInView,
    hasObserver,
  };
}
