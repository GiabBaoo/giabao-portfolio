import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../src/app/providers/I18nProvider.tsx";
import { ThemeProvider } from "../src/app/providers/ThemeProvider.tsx";
import { SqlProfileWindow } from "../src/components/sections/SqlProfileWindow.tsx";
import { BackToTopButton, ThemeToggle } from "../src/components/ui/index.ts";
import { HERO_DELAYS, MOTION_TIMING, staggerDelay } from "../src/lib/motion.ts";

describe("Motion Design System & Accessibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("computes bounded stagger delays and exposes balanced motion tokens", () => {
    expect(MOTION_TIMING.fast).toBe(150);
    expect(MOTION_TIMING.normal).toBe(200);
    expect(MOTION_TIMING.medium).toBe(300);
    expect(MOTION_TIMING.reveal).toBe(520);
    expect(HERO_DELAYS.title).toBeGreaterThan(HERO_DELAYS.name);

    expect(staggerDelay(0, 75, 0)).toBe(0);
    expect(staggerDelay(2, 75, 50)).toBe(200);
    expect(staggerDelay(20, 75, 0, 420)).toBe(420);
  });

  it("renders full SQL query immediately when prefers-reduced-motion is enabled", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    render(
      <MemoryRouter initialEntries={["/en"]}>
        <ThemeProvider defaultTheme="dark">
          <I18nProvider locale="en">
            <SqlProfileWindow location="Ho Chi Minh City, Vietnam" />
          </I18nProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const region = screen.getByRole("region", { name: "Decorative T-SQL preview" });
    expect(region.textContent).toContain("SELECT role, stack, location");
    expect(region.textContent).toContain("FROM dbo.DeveloperProfile");
    expect(region.textContent).toContain("WHERE name = N'Nguyen Gia Bao';");
  });

  it("applies controlled theme-transitioning class only on user toggle and cleans it up", () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={["/en"]}>
        <ThemeProvider defaultTheme="dark">
          <I18nProvider locale="en">
            <ThemeToggle />
          </I18nProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    // No transition class on initial mount (prevents initial flash)
    expect(document.documentElement.classList.contains("theme-transitioning")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(document.documentElement.classList.contains("theme-transitioning")).toBe(true);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(document.documentElement.classList.contains("theme-transitioning")).toBe(false);
  });

  it("keeps BackToTopButton out of tab order until scrolled and scrolls with reduced-motion fallback", () => {
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    render(
      <MemoryRouter initialEntries={["/en"]}>
        <ThemeProvider defaultTheme="dark">
          <I18nProvider locale="en">
            <BackToTopButton />
          </I18nProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const btn = screen.getByLabelText(/back to top/i);
    expect(btn).toHaveAttribute("tabindex", "-1");
    expect(btn).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(btn);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });
});
