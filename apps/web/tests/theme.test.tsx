import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../src/app/providers/I18nProvider.tsx";
import { ThemeProvider } from "../src/app/providers/ThemeProvider.tsx";
import { THEME_STORAGE_KEY } from "../src/app/providers/theme-context.ts";
import { ThemeToggle } from "../src/components/ui/ThemeToggle.tsx";

function createMatchMediaMock(initialDark: boolean) {
  let matches = initialDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mediaQueryList = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatchChange(nextDark: boolean) {
      matches = nextDark;
      const event = { matches: nextDark } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
  };

  return mediaQueryList;
}

describe("ThemeProvider & ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("applies dark/light/system theme and persists choice to localStorage", () => {
    const mq = createMatchMediaMock(true);
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => mq),
    );

    render(
      <MemoryRouter initialEntries={["/en"]}>
        <ThemeProvider>
          <I18nProvider locale="en">
            <ThemeToggle />
          </I18nProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Default is system -> dark
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");

    // Switch to light
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");

    // Switch to dark
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Switch back to system and react to OS preference change
    fireEvent.click(screen.getByRole("button", { name: "System" }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      mq.dispatchChange(false);
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
