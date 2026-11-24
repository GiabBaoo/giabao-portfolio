import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../src/components/ui/ErrorBoundary.tsx";
import { isChunkLoadError } from "../src/lib/chunk-error.ts";

function ThrowingChild({ error }: { error: Error }): never {
  throw error;
}

describe("ErrorBoundary & chunk error detection", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("identifies dynamic import / chunk load errors accurately", () => {
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("ChunkLoadError: Loading chunk 12 failed"))).toBe(true);
    expect(isChunkLoadError(new Error("Regular runtime error"))).toBe(false);
  });

  it("renders accessible fallback UI when a child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    document.documentElement.lang = "en";

    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error("Render boom")} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
  });
});
