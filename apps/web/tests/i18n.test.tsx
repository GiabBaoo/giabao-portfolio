import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../src/app/providers/ThemeProvider.tsx";
import { routes } from "../src/app/router.tsx";
import { dictionaries, LOCALE_STORAGE_KEY, replaceLocaleInPath } from "../src/i18n/index.ts";

function collectLeafValues(obj: Record<string, unknown>, prefix = ""): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      entries.push(...collectLeafValues(value as Record<string, unknown>, fullKey));
    } else {
      entries.push([fullKey, value]);
    }
  }
  return entries;
}

describe("i18n dictionaries & bilingual routing", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps en and vi dictionaries in sync with non-empty strings", () => {
    const enLeaves = collectLeafValues(dictionaries.en as unknown as Record<string, unknown>);
    const viLeaves = collectLeafValues(dictionaries.vi as unknown as Record<string, unknown>);

    expect(enLeaves.map(([k]) => k)).toEqual(viLeaves.map(([k]) => k));
    for (const [, value] of [...enLeaves, ...viLeaves]) {
      expect(typeof value).toBe("string");
      expect((value as string).trim().length).toBeGreaterThan(0);
    }
  });

  it("replaces locale prefix in path accurately", () => {
    expect(replaceLocaleInPath("/en", "vi")).toBe("/vi");
    expect(replaceLocaleInPath("/vi/projects", "en")).toBe("/en/projects");
    expect(replaceLocaleInPath("/", "vi")).toBe("/vi");
  });

  it("renders /en, switches to /vi via LanguageSwitcher, and syncs html lang", () => {
    const memoryRouter = createMemoryRouter(routes, { initialEntries: ["/en"] });

    render(
      <ThemeProvider defaultTheme="dark">
        <RouterProvider router={memoryRouter} />
      </ThemeProvider>,
    );

    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByText("Nguyen Gia Bao", { selector: "h1" })).toBeInTheDocument();

    const enButton = screen.getByRole("button", { name: "EN — Switch language to English" });
    const viButton = screen.getByRole("button", { name: "VI — Switch language to Vietnamese" });
    expect(enButton.getAttribute("aria-label")?.toLowerCase()).toContain(
      enButton.textContent?.trim().toLowerCase() ?? "",
    );
    expect(viButton.getAttribute("aria-label")?.toLowerCase()).toContain(
      viButton.textContent?.trim().toLowerCase() ?? "",
    );

    fireEvent.click(viButton);

    expect(memoryRouter.state.location.pathname).toBe("/vi");
    expect(document.documentElement.lang).toBe("vi");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("vi");
    expect(screen.getByText("Nguyễn Gia Bảo", { selector: "h1" })).toBeInTheDocument();

    const viLocaleEnButton = screen.getByRole("button", {
      name: "EN — Chuyển ngôn ngữ sang Tiếng Anh",
    });
    const viLocaleViButton = screen.getByRole("button", {
      name: "VI — Chuyển ngôn ngữ sang Tiếng Việt",
    });
    expect(viLocaleEnButton.getAttribute("aria-label")?.toLowerCase()).toContain(
      viLocaleEnButton.textContent?.trim().toLowerCase() ?? "",
    );
    expect(viLocaleViButton.getAttribute("aria-label")?.toLowerCase()).toContain(
      viLocaleViButton.textContent?.trim().toLowerCase() ?? "",
    );
  });

  it("redirects invalid locale paths to default locale", () => {
    const memoryRouter = createMemoryRouter(routes, { initialEntries: ["/fr"] });

    render(
      <ThemeProvider defaultTheme="dark">
        <RouterProvider router={memoryRouter} />
      </ThemeProvider>,
    );

    expect(memoryRouter.state.location.pathname).toBe("/en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("redirects root and unprefixed fallback paths to /en by default even if localStorage has vi", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "vi");

    const rootRouter = createMemoryRouter(routes, { initialEntries: ["/"] });
    render(
      <ThemeProvider defaultTheme="dark">
        <RouterProvider router={rootRouter} />
      </ThemeProvider>,
    );

    expect(rootRouter.state.location.pathname).toBe("/en");
    expect(document.documentElement.lang).toBe("en");

    cleanup();

    const fallbackRouter = createMemoryRouter(routes, { initialEntries: ["/unknown/path"] });
    render(
      <ThemeProvider defaultTheme="dark">
        <RouterProvider router={fallbackRouter} />
      </ThemeProvider>,
    );

    expect(fallbackRouter.state.location.pathname).toBe("/en");
    expect(document.documentElement.lang).toBe("en");
  });
});
