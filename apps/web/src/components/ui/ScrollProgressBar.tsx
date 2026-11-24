import { useEffect, useState } from "react";

export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let rafId = 0;

    const updateProgress = () => {
      rafId = 0;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(1, Math.max(0, scrollTop / docHeight)));
    };

    const handleScroll = () => {
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent"
    >
      <div
        className="from-accent-primary to-accent-hover h-full origin-left bg-gradient-to-r will-change-transform"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
