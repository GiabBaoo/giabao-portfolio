import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPortfolioContent } from "../src/content/index.ts";
import { AdminPage, mergeGitHubProjectsIntoList } from "../src/pages/AdminPage.tsx";

describe("mergeGitHubProjectsIntoList", () => {
  it("updates matched projects by repositoryUrl or slug and prepends new projects", () => {
    const existing = [
      {
        id: "existing-1",
        slug: "his-reporting",
        name: "Old Name",
        description: "Old Description",
        technologies: ["SQL"],
        features: ["Old feature"],
        role: "Backend Dev",
        imageUrl: null,
        repositoryUrl: "https://github.com/GiabBaoo/his-reporting/",
        demoUrl: null,
        projectType: "personal" as const,
      },
    ];

    const incoming = [
      {
        id: "gh-1",
        slug: "his-reporting",
        name: "HIS Reporting v2",
        description: "Updated from README",
        technologies: ["TypeScript", "SQL Server"],
        features: ["Fast query", "RBAC"],
        role: "Developer",
        imageUrl: null,
        repositoryUrl: "https://github.com/GiabBaoo/his-reporting",
        demoUrl: "https://demo.example.com",
        projectType: "personal" as const,
      },
      {
        id: "gh-2",
        slug: "new-tool",
        name: "New Tool",
        description: "Brand new repo",
        technologies: ["Go"],
        features: ["CLI"],
        role: "Developer",
        imageUrl: null,
        repositoryUrl: "https://github.com/GiabBaoo/new-tool",
        demoUrl: null,
        projectType: "personal" as const,
      },
    ];

    const merged = mergeGitHubProjectsIntoList(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.slug).toBe("new-tool");
    expect(merged[1]?.id).toBe("existing-1");
    expect(merged[1]?.name).toBe("HIS Reporting v2");
    expect(merged[1]?.description).toBe("Updated from README");
    expect(merged[1]?.features).toEqual(["Fast query", "RBAC"]);
    expect(merged[1]?.demoUrl).toBe("https://demo.example.com");
  });
});

describe("AdminPage GitHub dual-locale sync & synchronized VI->EN save", () => {
  beforeEach(() => {
    window.sessionStorage.setItem("giabao_portfolio_admin_token", "test-token");
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("syncs GitHub projects into both VI and EN drafts and saves both VI and EN when clicking save on VI tab", async () => {
    const viContent = getPortfolioContent("vi");
    const enContent = getPortfolioContent("en");

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method ?? "GET";

      if (url === "/api/admin/session") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (url === "/api/portfolio") {
        return new Response(
          JSON.stringify({
            ok: true,
            contentByLocale: { vi: viContent, en: enContent },
            media: { avatar: null, cv: null },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "/api/admin/sync/github" && method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            projects: [
              {
                id: "gh-999",
                slug: "med-sync-readme",
                name: "MedSync README Title",
                description: "Mô tả lấy từ README.md",
                technologies: ["TypeScript", "SQL Server"],
                features: ["Đồng bộ bệnh án"],
                role: "Developer",
                imageUrl: null,
                repositoryUrl: "https://github.com/GiabBaoo/med-sync-readme",
                demoUrl: "https://medsync.example.com",
                projectType: "personal",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "/api/admin/portfolio/vi" && method === "PUT") {
        const sent = JSON.parse(String(init?.body)) as { projects: unknown[] };
        return new Response(
          JSON.stringify({
            ok: true,
            locale: "vi",
            content: sent,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "/api/admin/portfolio/en" && method === "PUT") {
        return new Response(
          JSON.stringify({ ok: true, locale: "en" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminPage />
      </MemoryRouter>,
    );

    const itemsTab = await screen.findByRole("button", { name: /3\. Kinh nghiệm, Dự án & Kỹ năng/i });
    fireEvent.click(itemsTab);

    const syncButton = await screen.findByRole("button", {
      name: /Đồng bộ từ GitHub \(GiabBaoo\)/i,
    });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(
        screen.getAllByText(
          "Đã đồng bộ 1 dự án từ GitHub (lấy từ README.md) cho cả 2 bản VI và EN. Bấm 'Lưu cả 2 bản (VI & EN)' để áp dụng.",
        ).length,
      ).toBeGreaterThan(0);
    });

    const saveBothButton = screen.getByRole("button", { name: "Lưu cả 2 bản (VI & EN)" });
    fireEvent.click(saveBothButton);

    await waitFor(() => {
      expect(
        screen.getByText("Đã lưu đồng bộ cả 2 bản Tiếng Việt (VI) và Tiếng Anh (EN) lên D1!"),
      ).toBeInTheDocument();
    });

    const putCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
    const putUrls = putCalls.map(([url]) => String(url));
    expect(putUrls).toEqual(["/api/admin/portfolio/vi", "/api/admin/portfolio/en"]);

    for (const [, init] of putCalls) {
      const sentPayload = JSON.parse(String(init?.body)) as { projects: Array<{ slug: string }> };
      expect(sentPayload.projects[0]?.slug).toBe("med-sync-readme");
    }
  });

  it("translates projects via VI save, syncs translatedProjects into EN save while keeping EN profile, and saves EN alone on EN tab", async () => {
    const viContent = getPortfolioContent("vi");
    const enContent = getPortfolioContent("en");
    const translatedProjects = [
      {
        id: "gh-translated-1",
        slug: "translated-his-project",
        name: "Translated HIS Reporting System",
        description: "Auto-translated English description",
        technologies: ["TypeScript", "SQL Server"],
        features: ["Auto-translated feature"],
        role: "Lead Developer",
        imageUrl: null,
        repositoryUrl: "https://github.com/GiabBaoo/his-reporting",
        demoUrl: null,
        projectType: "personal" as const,
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method ?? "GET";

      if (url === "/api/admin/session") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (url === "/api/portfolio") {
        return new Response(
          JSON.stringify({
            ok: true,
            contentByLocale: { vi: viContent, en: enContent },
            media: { avatar: null, cv: null },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "/api/admin/portfolio/vi" && method === "PUT") {
        return new Response(
          JSON.stringify({
            ok: true,
            locale: "vi",
            content: viContent,
            translatedProjects,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "/api/admin/portfolio/en" && method === "PUT") {
        return new Response(
          JSON.stringify({
            ok: true,
            locale: "en",
            content: enContent,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminPage />
      </MemoryRouter>,
    );

    const itemsTab = await screen.findByRole("button", { name: /3\. Kinh nghiệm, Dự án & Kỹ năng/i });
    fireEvent.click(itemsTab);

    const saveBothButton = await screen.findByRole("button", { name: "Lưu cả 2 bản (VI & EN)" });
    fireEvent.click(saveBothButton);

    await waitFor(() => {
      expect(
        screen.getByText("Đã lưu đồng bộ cả 2 bản Tiếng Việt (VI) và Tiếng Anh (EN) lên D1!"),
      ).toBeInTheDocument();
    });

    const putCallsAfterViSave = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
    expect(putCallsAfterViSave.map(([url]) => String(url))).toEqual([
      "/api/admin/portfolio/vi",
      "/api/admin/portfolio/en",
    ]);
    const syncedEnPayload = JSON.parse(String(putCallsAfterViSave[1]?.[1]?.body)) as {
      profile: { summary: string };
      projects: Array<{ name: string }>;
    };
    expect(syncedEnPayload.profile.summary).toBe(enContent.profile.summary);
    expect(syncedEnPayload.projects[0]?.name).toBe("Translated HIS Reporting System");

    const enTabButton = screen.getByRole("button", { name: /^en$/i });
    fireEvent.click(enTabButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Translated HIS Reporting System")).toBeInTheDocument();
    });

    const saveEnButton = screen.getByRole("button", { name: "Lưu bản EN" });
    fireEvent.click(saveEnButton);

    await waitFor(() => {
      expect(screen.getByText("Đã lưu nội dung bản Tiếng Anh (EN) lên D1!")).toBeInTheDocument();
    });

    const allPutUrls = fetchMock.mock.calls
      .filter(([, init]) => init?.method === "PUT")
      .map(([url]) => String(url));
    expect(allPutUrls).toEqual([
      "/api/admin/portfolio/vi",
      "/api/admin/portfolio/en",
      "/api/admin/portfolio/en",
    ]);
  });
});
