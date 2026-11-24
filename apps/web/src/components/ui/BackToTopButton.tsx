import { useEffect, useState } from "react";
import { useI18n } from "../../app/providers/i18n-context.ts";
import { cn } from "../../lib/cn.ts";
import { usePrefersReducedMotion } from "../../lib/usePrefersReducedMotion.ts";
import { ArrowUpIcon } from "./Icons.tsx";

export function BackToTopButton() {
  const { messages } = useI18n();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && window.scrollY > 400,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let rafId = 0;
    const handleScroll = () => {
      if (rafId !== 0) {
        return;
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        setVisible(window.scrollY > 400);
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={messages.common.backToTop}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "group border-border-strong bg-surface-elevated/95 text-text-primary hover:border-accent-primary/60 hover:text-accent-primary fixed right-5 bottom-5 z-40 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-lg transition-[opacity,transform,border-color,color,box-shadow] duration-200 ease-out sm:right-7 sm:bottom-7",
        "active:scale-95 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5",
        "focus-visible:outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUpIcon className="h-4 w-4 transition-transform duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-0.5" />
    </button>
  );
}
