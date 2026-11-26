import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTACT_BODY_LIMIT_BYTES } from "@giabao-portfolio/shared";
import { I18nProvider } from "../src/app/providers/I18nProvider.tsx";
import { ThemeProvider } from "../src/app/providers/ThemeProvider.tsx";
import { routes } from "../src/app/router.tsx";
import {
  ContactSection,
  type ContactSectionProps,
} from "../src/components/sections/ContactSection.tsx";
import { getPortfolioContent } from "../src/content/index.ts";
import type { Locale } from "../src/i18n/index.ts";
import { getUtf8ByteLength, validateContactForm } from "../src/lib/contact-api.ts";
import {
  resetTurnstileLoaderForTests,
  type TurnstileApi,
  type TurnstileRenderOptions,
} from "../src/lib/turnstile-loader.ts";

function installMockTurnstile() {
  let widgetSeq = 1;
  const callbacks: TurnstileRenderOptions[] = [];

  const api: TurnstileApi = {
    render: vi.fn((_container: HTMLElement | string, options: TurnstileRenderOptions) => {
      callbacks.push(options);
      return `contact-widget-${widgetSeq++}`;
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };

  window.turnstile = api;
  return { api, callbacks };
}

function renderContactSection(
  options: {
    locale?: Locale;
    theme?: "light" | "dark";
    props?: Partial<ContactSectionProps>;
  } = {},
) {
  const locale = options.locale ?? "en";
  const theme = options.theme ?? "dark";
  const content = getPortfolioContent(locale);

  const memoryRouter = createMemoryRouter(
    [
      {
        path: `/${locale}`,
        element: (
          <ThemeProvider defaultTheme={theme}>
            <I18nProvider locale={locale}>
              <ContactSection
                profile={content.profile}
                turnstileSiteKey="1x00000000000000000000AA"
                {...options.props}
              />
            </I18nProvider>
          </ThemeProvider>
        ),
      },
    ],
    { initialEntries: [`/${locale}`] },
  );

  return render(<RouterProvider router={memoryRouter} />);
}

function fillValidFields() {
  fireEvent.change(screen.getByLabelText(/name|họ và tên/i), {
    target: { value: "Nguyen Van A" },
  });
  fireEvent.change(screen.getByLabelText(/^email$/i), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/subject|tiêu đề/i), {
    target: { value: "Backend opportunity" },
  });
  fireEvent.change(screen.getByLabelText(/message|nội dung tin nhắn/i), {
    target: { value: "Hello Gia Bao, I would like to discuss a backend engineering role." },
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ContactSection & contact-api integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.turnstile;
    resetTurnstileLoaderForTests();
  });

  afterEach(() => {
    cleanup();
    delete window.turnstile;
    resetTurnstileLoaderForTests();
  });

  it("validates required fields and email/message rules in EN and VI without sending API request", async () => {
    installMockTurnstile();
    const fetchMock = vi.fn();

    renderContactSection({ locale: "en", props: { fetchFn: fetchMock } });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(screen.getByText("Please enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your message.")).toBeInTheDocument();
    expect(
      screen.getByText("Please complete the security verification before sending."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    cleanup();

    renderContactSection({ locale: "vi", props: { fetchFn: fetchMock } });
    fireEvent.change(screen.getByLabelText("Họ và tên"), { target: { value: "Bao" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "invalid-email" } });
    fireEvent.change(screen.getByLabelText("Nội dung tin nhắn"), { target: { value: "Ngan" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    expect(screen.getByText("Địa chỉ email không đúng định dạng.")).toBeInTheDocument();
    expect(screen.getByText("Nội dung tin nhắn phải có ít nhất 10 ký tự.")).toBeInTheDocument();
    expect(
      screen.getByText("Vui lòng hoàn tất xác thực bảo mật trước khi gửi."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects UTF-8 payloads over CONTACT_BODY_LIMIT_BYTES even when character length is under 5000", () => {
    // 3,600 Vietnamese characters (3 bytes each in UTF-8) = 10,800 bytes > 10,240 bytes,
    // even though 3,600 <= CONTACT_FIELD_LIMITS.messageMax (5,000)
    const multiByteMessage = "ế".repeat(3600);
    expect(multiByteMessage.length).toBeLessThan(5000);
    expect(getUtf8ByteLength(multiByteMessage)).toBeGreaterThan(CONTACT_BODY_LIMIT_BYTES);

    const validation = validateContactForm(
      {
        name: "Nguyen Gia Bao",
        email: "bao@example.com",
        subject: "",
        message: multiByteMessage,
        website: "",
      },
      "en",
      "valid-turnstile-token",
    );

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.formError).toBe("payload_too_large");
    }
  });

  it("blocks API submission in ContactSection when UTF-8 JSON exceeds 10 KB", async () => {
    const { callbacks } = installMockTurnstile();
    const fetchMock = vi.fn();

    renderContactSection({ locale: "en", props: { fetchFn: fetchMock } });

    await waitFor(() => {
      expect(callbacks).toHaveLength(1);
    });

    act(() => {
      callbacks[0]?.callback?.("token-utf8-check");
    });

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Nguyen Van A" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "ế".repeat(3600) },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      screen.getByText(
        "Message data exceeds the 10 KB limit. Please shorten your message and try again.",
      ),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows clicking Submit without Turnstile token (Method A), shows required error, and sends no API request", async () => {
    installMockTurnstile();
    const fetchMock = vi.fn();

    renderContactSection({ locale: "en", props: { fetchFn: fetchMock } });
    fillValidFields();

    const submitButton = screen.getByRole("button", { name: "Send Message" });
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    expect(
      screen.getByText("Please complete the security verification before sending."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits successfully (201), sends website: '' honeypot, resets form and Turnstile widget", async () => {
    const { api, callbacks } = installMockTurnstile();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { ok: true }));

    renderContactSection({ locale: "en", props: { fetchFn: fetchMock } });

    await waitFor(() => {
      expect(callbacks).toHaveLength(1);
    });

    // Verify honeypot accessibility attributes
    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]');
    expect(honeypot).toBeTruthy();
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("aria-hidden", "true");

    fillValidFields();
    act(() => {
      callbacks[0]?.callback?.("turnstile-ok-token");
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      await screen.findByText(/your message has been sent\. thank you for reaching out/i),
    ).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/contact");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      name: "Nguyen Van A",
      email: "user@example.com",
      subject: "Backend opportunity",
      message: "Hello Gia Bao, I would like to discuss a backend engineering role.",
      locale: "en",
      turnstileToken: "turnstile-ok-token",
      website: "",
    });

    // Form fields reset after success
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Subject (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");

    // Turnstile widget reset after success
    expect(api.reset).toHaveBeenCalledWith("contact-widget-1");
  });

  it("handles 400 VALIDATION_ERROR without turnstileToken: keeps token & user data, maps to EN (no raw VI backend message)", async () => {
    const { api, callbacks } = installMockTurnstile();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(400, {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Dữ liệu không hợp lệ",
          fields: { email: "Địa chỉ email không đúng định dạng" },
        },
      }),
    );

    renderContactSection({ locale: "en", props: { fetchFn: fetchMock } });
    await waitFor(() => expect(callbacks).toHaveLength(1));

    fillValidFields();
    act(() => {
      callbacks[0]?.callback?.("keep-this-token");
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      await screen.findByText("Please review the highlighted fields and try again."),
    ).toBeInTheDocument();
    expect(screen.getByText("Please check this field and try again.")).toBeInTheDocument();
    // Never show raw Vietnamese backend message in EN mode
    expect(screen.queryByText(/Dữ liệu không hợp lệ/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Địa chỉ email không đúng định dạng/i)).not.toBeInTheDocument();

    // Token and user data preserved
    expect(api.reset).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toHaveValue("Nguyen Van A");
    expect(screen.getByLabelText("Email")).toHaveValue("user@example.com");
  });

  it("handles 400 VALIDATION_ERROR with turnstileToken field: resets token and preserves user data", async () => {
    const { api, callbacks } = installMockTurnstile();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(400, {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Dữ liệu không hợp lệ",
          fields: { turnstileToken: "Mã xác thực chống bot không hợp lệ" },
        },
      }),
    );

    renderContactSection({ locale: "en", props: { fetchFn: fetchMock } });
    await waitFor(() => expect(callbacks).toHaveLength(1));

    fillValidFields();
    act(() => {
      callbacks[0]?.callback?.("bad-token");
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      await screen.findByText("Security verification token is invalid. Please verify again."),
    ).toBeInTheDocument();
    expect(api.reset).toHaveBeenCalledWith("contact-widget-1");
    expect(screen.getByLabelText("Message")).toHaveValue(
      "Hello Gia Bao, I would like to discuss a backend engineering role.",
    );
  });

  it.each([
    {
      status: 403,
      code: "TURNSTILE_FAILED",
      expectedEn: "Security verification failed. Please complete the check again.",
      shouldReset: true,
    },
    {
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      expectedEn:
        "Message data exceeds the 10 KB limit. Please shorten your message and try again.",
      shouldReset: false,
    },
    {
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      expectedEn: "Request format was rejected. Please refresh the page and try again.",
      shouldReset: false,
    },
    {
      status: 429,
      code: "RATE_LIMITED",
      expectedEn: "Too many requests. Please wait a few minutes before sending another message.",
      shouldReset: false,
    },
    {
      status: 500,
      code: "INTERNAL_ERROR",
      expectedEn:
        "Unable to send your message right now. Please try again later or use Email directly.",
      shouldReset: true,
    },
    {
      status: 503,
      code: "TURNSTILE_UNAVAILABLE",
      expectedEn:
        "Security verification service is temporarily unavailable. Please try again shortly.",
      shouldReset: true,
    },
  ])(
    "handles HTTP $status ($code): resets Turnstile=$shouldReset and preserves user input",
    async ({ status, code, expectedEn, shouldReset }) => {
      const { api, callbacks } = installMockTurnstile();
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse(status, {
          ok: false,
          error: {
            code,
            message: "Thông báo tiếng Việt từ backend",
          },
        }),
      );

      renderContactSection({ locale: "en", props: { fetchFn: fetchMock } });
      await waitFor(() => expect(callbacks).toHaveLength(1));

      fillValidFields();
      act(() => {
        callbacks[0]?.callback?.("token-for-status-test");
      });

      fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

      expect(await screen.findByText(expectedEn)).toBeInTheDocument();
      expect(screen.queryByText(/Thông báo tiếng Việt từ backend/)).not.toBeInTheDocument();

      if (shouldReset) {
        expect(api.reset).toHaveBeenCalledWith("contact-widget-1");
      } else {
        expect(api.reset).not.toHaveBeenCalled();
      }

      // User data always preserved on failure
      expect(screen.getByLabelText("Name")).toHaveValue("Nguyen Van A");
      expect(screen.getByLabelText("Email")).toHaveValue("user@example.com");
      expect(screen.getByLabelText("Subject (optional)")).toHaveValue("Backend opportunity");
      expect(screen.getByLabelText("Message")).toHaveValue(
        "Hello Gia Bao, I would like to discuss a backend engineering role.",
      );
    },
  );

  it("handles network error: resets Turnstile and preserves user data", async () => {
    const { api, callbacks } = installMockTurnstile();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    renderContactSection({ locale: "en", props: { fetchFn: fetchMock } });
    await waitFor(() => expect(callbacks).toHaveLength(1));

    fillValidFields();
    act(() => {
      callbacks[0]?.callback?.("token-network");
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      await screen.findByText(
        "Network error while sending your message. Please check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(api.reset).toHaveBeenCalledWith("contact-widget-1");
    expect(screen.getByLabelText("Name")).toHaveValue("Nguyen Van A");
  });

  it("handles request timeout: resets Turnstile and preserves user data", async () => {
    const { api, callbacks } = installMockTurnstile();
    const fetchMock = vi.fn().mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const abortError = new Error("Aborted");
            abortError.name = "AbortError";
            reject(abortError);
          });
        }),
    );

    renderContactSection({
      locale: "en",
      props: { fetchFn: fetchMock, requestTimeoutMs: 40 },
    });
    await waitFor(() => expect(callbacks).toHaveLength(1));

    fillValidFields();
    act(() => {
      callbacks[0]?.callback?.("token-timeout");
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(
      await screen.findByText(
        "The request timed out. Please complete the verification again and retry.",
      ),
    ).toBeInTheDocument();
    expect(api.reset).toHaveBeenCalledWith("contact-widget-1");
    expect(screen.getByLabelText("Name")).toHaveValue("Nguyen Van A");
  });

  it("prevents double-submit when form is submitted rapidly while request is in flight", async () => {
    const { callbacks } = installMockTurnstile();
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    renderContactSection({ locale: "en", props: { fetchFn: fetchMock } });
    await waitFor(() => expect(callbacks).toHaveLength(1));

    fillValidFields();
    act(() => {
      callbacks[0]?.callback?.("token-double-submit");
    });

    const form = screen.getByRole("button", { name: "Send Message" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();

    act(() => {
      resolveFetch(jsonResponse(201, { ok: true }));
    });

    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("shows missing site key notice and blocks submission when VITE_TURNSTILE_SITE_KEY is absent", () => {
    const fetchMock = vi.fn();

    renderContactSection({
      locale: "en",
      props: {
        turnstileSiteKey: "",
        fetchFn: fetchMock,
      },
    });

    expect(
      screen.getByText(/contact form verification is not configured in this environment/i),
    ).toBeInTheDocument();

    fillValidFields();
    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /contact form verification is not configured in this environment/i,
    );
  });
});

describe("HomePage lazy ContactSection & Turnstile mounting", () => {
  let ioCallbacks: IntersectionObserverCallback[] = [];

  beforeEach(() => {
    ioCallbacks = [];
    window.localStorage.clear();
    delete window.turnstile;
    resetTurnstileLoaderForTests();

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "300px 0px";
      readonly thresholds = [0];
      constructor(callback: IntersectionObserverCallback) {
        ioCallbacks.push(callback);
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete window.turnstile;
    resetTurnstileLoaderForTests();
  });

  it("defers ContactSection and Turnstile until IntersectionObserver triggers and preserves form data", async () => {
    const memoryRouter = createMemoryRouter(routes, { initialEntries: ["/en"] });
    render(
      <ThemeProvider defaultTheme="dark">
        <RouterProvider router={memoryRouter} />
      </ThemeProvider>,
    );

    // Anchor #contact placeholder exists, but form & Turnstile are not mounted yet
    expect(document.getElementById("contact")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send message/i })).not.toBeInTheDocument();
    expect(document.querySelectorAll('script[data-turnstile-script="true"]')).toHaveLength(0);

    // Simulate scrolling near Contact section
    const contactEl = document.getElementById("contact")!;
    act(() => {
      for (const cb of ioCallbacks) {
        cb(
          [
            {
              isIntersecting: true,
              intersectionRatio: 1,
              target: contactEl,
            } as unknown as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        );
      }
    });

    const submitButton = await screen.findByRole(
      "button",
      { name: /send message/i },
      { timeout: 5000 },
    );
    expect(submitButton).toBeInTheDocument();

    // Type into form and ensure leaving viewport does not unmount or lose form data
    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Preserved User" } });

    act(() => {
      for (const cb of ioCallbacks) {
        cb(
          [
            {
              isIntersecting: false,
              intersectionRatio: 0,
              target: contactEl,
            } as unknown as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        );
      }
    });

    expect(screen.getByLabelText("Name")).toHaveValue("Preserved User");
  });

  it("mounts ContactSection immediately when navigating to #contact", async () => {
    const memoryRouter = createMemoryRouter(routes, { initialEntries: ["/en#contact"] });
    render(
      <ThemeProvider defaultTheme="dark">
        <RouterProvider router={memoryRouter} />
      </ThemeProvider>,
    );

    expect(await screen.findByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("mounts ContactSection immediately when IntersectionObserver is unavailable", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const memoryRouter = createMemoryRouter(routes, { initialEntries: ["/en"] });
    render(
      <ThemeProvider defaultTheme="dark">
        <RouterProvider router={memoryRouter} />
      </ThemeProvider>,
    );

    expect(await screen.findByRole("button", { name: /send message/i })).toBeInTheDocument();
  });
});
