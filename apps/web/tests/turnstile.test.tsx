import { StrictMode, createRef } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "../src/components/ui/TurnstileWidget.tsx";
import {
  TURNSTILE_SCRIPT_URL,
  loadTurnstileScript,
  resetTurnstileLoaderForTests,
  type TurnstileApi,
  type TurnstileRenderOptions,
} from "../src/lib/turnstile-loader.ts";

function createMockTurnstile() {
  let nextId = 1;
  const renderedOptions: TurnstileRenderOptions[] = [];

  const api: TurnstileApi = {
    render: vi.fn((_container: HTMLElement | string, options: TurnstileRenderOptions) => {
      renderedOptions.push(options);
      return `widget-${nextId++}`;
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };

  return { api, renderedOptions };
}

function removeTurnstileScripts() {
  document.querySelectorAll("script").forEach((script) => {
    if (
      script.src.includes("challenges.cloudflare.com/turnstile") ||
      script.dataset.turnstileScript
    ) {
      script.remove();
    }
  });
}

describe("Turnstile script loader & React wrapper", () => {
  beforeEach(() => {
    delete window.turnstile;
    removeTurnstileScripts();
    resetTurnstileLoaderForTests();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    delete window.turnstile;
    removeTurnstileScripts();
    resetTurnstileLoaderForTests();
  });

  it("loads the explicit Turnstile script as a singleton without duplicating script tags", async () => {
    const p1 = loadTurnstileScript();
    const p2 = loadTurnstileScript();

    expect(p1).toBe(p2);

    const scripts = document.querySelectorAll('script[data-turnstile-script="true"]');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute("src", TURNSTILE_SCRIPT_URL);

    const { api } = createMockTurnstile();
    window.turnstile = api;
    scripts[0]!.dispatchEvent(new Event("load"));

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(api);
    expect(r2).toBe(api);
  });

  it("rejects on script load error and removes failed script so retry can succeed", async () => {
    const failPromise = loadTurnstileScript();
    const firstScript = document.querySelector('script[data-turnstile-script="true"]');
    expect(firstScript).toBeTruthy();

    firstScript!.dispatchEvent(new Event("error"));

    await expect(failPromise).rejects.toMatchObject({ reason: "load_error" });
    expect(document.querySelectorAll('script[data-turnstile-script="true"]')).toHaveLength(0);

    const retryPromise = loadTurnstileScript();
    const secondScript = document.querySelector('script[data-turnstile-script="true"]');
    expect(secondScript).toBeTruthy();

    const { api } = createMockTurnstile();
    window.turnstile = api;
    secondScript!.dispatchEvent(new Event("load"));

    await expect(retryPromise).resolves.toBe(api);
  });

  it("rejects with timeout when script does not load in time", async () => {
    vi.useFakeTimers();

    const promise = loadTurnstileScript({ timeoutMs: 1500 });
    const assertion = expect(promise).rejects.toMatchObject({ reason: "timeout" });

    await vi.advanceTimersByTimeAsync(1500);
    await assertion;
    expect(document.querySelectorAll('script[data-turnstile-script="true"]')).toHaveLength(0);
  });

  it("handles render, verify, expire, error, reset, and optional action", async () => {
    const { api, renderedOptions } = createMockTurnstile();
    window.turnstile = api;

    const onVerify = vi.fn();
    const onExpire = vi.fn();
    const onError = vi.fn();
    const widgetRef = createRef<TurnstileWidgetHandle>();

    render(
      <TurnstileWidget
        ref={widgetRef}
        siteKey="1x00000000000000000000AA"
        theme="dark"
        locale="en"
        loadingLabel="Loading..."
        loadErrorLabel="Load error"
        retryLabel="Retry"
        missingSiteKeyLabel="Missing key"
        onVerify={onVerify}
        onExpire={onExpire}
        onError={onError}
      />,
    );

    await waitFor(() => {
      expect(api.render).toHaveBeenCalledTimes(1);
    });

    // Action must NOT be passed when not configured
    expect(renderedOptions[0]).not.toHaveProperty("action");
    expect(renderedOptions[0]).toMatchObject({
      sitekey: "1x00000000000000000000AA",
      theme: "dark",
      language: "en",
    });

    act(() => {
      renderedOptions[0]?.callback?.("verified-token-123");
    });
    expect(onVerify).toHaveBeenCalledWith("verified-token-123");

    act(() => {
      renderedOptions[0]?.["expired-callback"]?.();
    });
    expect(onExpire).toHaveBeenCalledTimes(1);

    act(() => {
      renderedOptions[0]?.["error-callback"]?.();
    });
    expect(onError).toHaveBeenCalledTimes(1);

    act(() => {
      widgetRef.current?.reset();
    });
    expect(api.reset).toHaveBeenCalledWith("widget-1");
  });

  it("passes action only when explicitly configured", async () => {
    const { api, renderedOptions } = createMockTurnstile();
    window.turnstile = api;

    render(
      <TurnstileWidget
        siteKey="1x00000000000000000000AA"
        theme="light"
        locale="vi"
        action="contact_form"
        loadingLabel="Loading..."
        loadErrorLabel="Load error"
        retryLabel="Retry"
        missingSiteKeyLabel="Missing key"
        onVerify={vi.fn()}
        onExpire={vi.fn()}
        onError={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(api.render).toHaveBeenCalledTimes(1);
    });
    expect(renderedOptions[0]?.action).toBe("contact_form");
  });

  it("removes old widget and renders a new widget when theme or locale changes", async () => {
    const { api, renderedOptions } = createMockTurnstile();
    window.turnstile = api;

    const { rerender } = render(
      <TurnstileWidget
        siteKey="1x00000000000000000000AA"
        theme="dark"
        locale="en"
        loadingLabel="Loading..."
        loadErrorLabel="Load error"
        retryLabel="Retry"
        missingSiteKeyLabel="Missing key"
        onVerify={vi.fn()}
        onExpire={vi.fn()}
        onError={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(api.render).toHaveBeenCalledTimes(1);
    });

    rerender(
      <TurnstileWidget
        siteKey="1x00000000000000000000AA"
        theme="light"
        locale="en"
        loadingLabel="Loading..."
        loadErrorLabel="Load error"
        retryLabel="Retry"
        missingSiteKeyLabel="Missing key"
        onVerify={vi.fn()}
        onExpire={vi.fn()}
        onError={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(api.render).toHaveBeenCalledTimes(2);
    });
    expect(api.remove).toHaveBeenCalledWith("widget-1");
    expect(renderedOptions[1]).toMatchObject({ theme: "light", language: "en" });

    rerender(
      <TurnstileWidget
        siteKey="1x00000000000000000000AA"
        theme="light"
        locale="vi"
        loadingLabel="Loading..."
        loadErrorLabel="Load error"
        retryLabel="Retry"
        missingSiteKeyLabel="Missing key"
        onVerify={vi.fn()}
        onExpire={vi.fn()}
        onError={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(api.render).toHaveBeenCalledTimes(3);
    });
    expect(api.remove).toHaveBeenCalledWith("widget-2");
    expect(renderedOptions[2]).toMatchObject({ theme: "light", language: "vi" });
  });

  it("handles React StrictMode safely without duplicate script tags or leaked widgets", async () => {
    const { api } = createMockTurnstile();

    const { unmount } = render(
      <StrictMode>
        <TurnstileWidget
          siteKey="1x00000000000000000000AA"
          theme="dark"
          locale="en"
          loadingLabel="Loading..."
          loadErrorLabel="Load error"
          retryLabel="Retry"
          missingSiteKeyLabel="Missing key"
          onVerify={vi.fn()}
          onExpire={vi.fn()}
          onError={vi.fn()}
        />
      </StrictMode>,
    );

    // Only one script tag injected despite StrictMode double effect invocation
    const scripts = document.querySelectorAll('script[data-turnstile-script="true"]');
    expect(scripts).toHaveLength(1);

    // Complete script loading after StrictMode has already cleaned up the first mount
    window.turnstile = api;
    act(() => {
      scripts[0]!.dispatchEvent(new Event("load"));
    });

    await waitFor(() => {
      expect(api.render).toHaveBeenCalledTimes(1);
    });

    unmount();
    expect(api.remove).toHaveBeenCalledWith("widget-1");
  });

  it("does not render widget if component unmounts before script finishes loading", async () => {
    const { api } = createMockTurnstile();

    const { unmount } = render(
      <TurnstileWidget
        siteKey="1x00000000000000000000AA"
        theme="dark"
        locale="en"
        loadingLabel="Loading..."
        loadErrorLabel="Load error"
        retryLabel="Retry"
        missingSiteKeyLabel="Missing key"
        onVerify={vi.fn()}
        onExpire={vi.fn()}
        onError={vi.fn()}
      />,
    );

    const script = document.querySelector('script[data-turnstile-script="true"]');
    expect(script).toBeTruthy();

    unmount();

    window.turnstile = api;
    act(() => {
      script!.dispatchEvent(new Event("load"));
    });

    // Allow microtasks to flush
    await Promise.resolve();
    expect(api.render).not.toHaveBeenCalled();
  });

  it("renders load error UI and supports retry when script fails", async () => {
    const onLoadError = vi.fn();
    render(
      <TurnstileWidget
        siteKey="1x00000000000000000000AA"
        theme="dark"
        locale="en"
        loadingLabel="Loading..."
        loadErrorLabel="Widget failed to load"
        retryLabel="Retry"
        missingSiteKeyLabel="Missing key"
        onVerify={vi.fn()}
        onExpire={vi.fn()}
        onError={vi.fn()}
        onLoadError={onLoadError}
      />,
    );

    const firstScript = document.querySelector('script[data-turnstile-script="true"]');
    act(() => {
      firstScript!.dispatchEvent(new Event("error"));
    });

    expect(await screen.findByText("Widget failed to load")).toBeInTheDocument();
    expect(onLoadError).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    const secondScript = document.querySelector('script[data-turnstile-script="true"]');
    expect(secondScript).toBeTruthy();

    const { api } = createMockTurnstile();
    window.turnstile = api;
    act(() => {
      secondScript!.dispatchEvent(new Event("load"));
    });

    await waitFor(() => {
      expect(api.render).toHaveBeenCalledTimes(1);
    });
  });

  it("renders missing site key notice and does not inject Turnstile script", () => {
    render(
      <TurnstileWidget
        siteKey=""
        theme="dark"
        locale="en"
        loadingLabel="Loading..."
        loadErrorLabel="Load error"
        retryLabel="Retry"
        missingSiteKeyLabel="Verification not configured"
        onVerify={vi.fn()}
        onExpire={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(screen.getByText("Verification not configured")).toBeInTheDocument();
    expect(document.querySelectorAll('script[data-turnstile-script="true"]')).toHaveLength(0);
  });
});
