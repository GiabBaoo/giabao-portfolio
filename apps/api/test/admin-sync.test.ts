import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioContentSchema, projectSchema, type PortfolioContentDTO } from "@giabao-portfolio/shared";
import type { AppBindings } from "../src/env.ts";
import { createApp } from "../src/index.ts";
import { parseReadmeMetadata, translateViToEn } from "../src/routes/admin.ts";

function createAdminBindings(overrides: Partial<AppBindings> = {}): AppBindings {
  return {
    DB: env.DB,
    APP_ENV: "test",
    ADMIN_PASSWORD: "super-secret-admin-password",
    GITHUB_TOKEN: "ghp_test_token_123",
    ...overrides,
  };
}

describe("parseReadmeMetadata", () => {
  it("extracts project name from H1, cleans HTML/links/formatting, extracts Vietnamese prose and features", () => {
    const markdown = `
\`\`\`bash
# comment inside code block should not become title
echo "hello"
\`\`\`

# <img src="logo.png" width="24" /> **HIS** [Reporting Engine](https://example.com) \`v2\`

[![Build Status](https://img.shields.io/badge/build-passing-green)](https://ci.example.com)

---

Hệ thống báo cáo **HIS** tối ưu hóa truy vấn T-SQL cho bệnh viện đa khoa, hỗ trợ xuất báo cáo BHYT nhanh chóng.

Tích hợp Stored Procedure và chỉ mục phù hợp để giảm tải cho máy chủ SQL Server.

## Tính năng nổi bật
- [x] Đồng bộ dữ liệu **bệnh nhân** theo thời gian thực từ HIS
- Xuất báo cáo [Mẫu 79a/80a](https://example.com/bhyt) chuẩn BHYT
- Phân quyền truy cập theo \`khoa/phòng\`
- Cảnh báo truy vấn chậm vượt ngưỡng 500ms
- Theo dõi lịch sử chạy batch tự động
- Mục thứ 6 sẽ bị bỏ qua vì tối đa 5 ý
`;

    const result = parseReadmeMetadata(markdown, "his-reporting", "Fallback desc");

    expect(result.name).toBe("HIS Reporting Engine v2");
    expect(result.description).toContain("Hệ thống báo cáo HIS tối ưu hóa truy vấn T-SQL");
    expect(result.description).toContain("Tích hợp Stored Procedure");
    expect(result.description.length).toBeLessThanOrEqual(420);
    expect(result.description).not.toContain("Build Status");
    expect(result.description).not.toContain("---");
    expect(result.features).toHaveLength(5);
    expect(result.features[0]).toBe("Đồng bộ dữ liệu bệnh nhân theo thời gian thực từ HIS");
    expect(result.features[1]).toBe("Xuất báo cáo Mẫu 79a/80a chuẩn BHYT");
    expect(result.features[2]).toBe("Phân quyền truy cập theo khoa/phòng");
  });

  it("falls back to repo name and description when README is empty or badge-only", () => {
    const markdown = `
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
---
<p align="center"><img src="banner.png" /></p>
`;

    const result = parseReadmeMetadata(markdown, "sql-monitor", "Công cụ giám sát SQL Server");

    expect(result.name).toBe("sql-monitor");
    expect(result.description).toBe("Công cụ giám sát SQL Server");
    expect(result.features).toEqual([]);
  });

  it("caps description to 420 chars and each feature under 140 chars", () => {
    const longParagraph = "Đây là đoạn mô tả rất dài về hệ thống quản lý dữ liệu y tế. ".repeat(15);
    const longFeature = "Tính năng đồng bộ dữ liệu rất dài ".repeat(8);
    const markdown = `# Hospital Sync\n\n${longParagraph}\n\n## Features\n- ${longFeature}\n`;

    const result = parseReadmeMetadata(markdown, "hospital-sync", "Fallback");
    expect(result.description.length).toBeLessThanOrEqual(420);
    expect(result.features).toHaveLength(1);
    expect(result.features[0]!.length).toBeLessThan(140);
  });
});

describe("POST /api/admin/sync/github", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches owner and collaborator public repos when GITHUB_TOKEN is set and reads README via repo.full_name", async () => {
    const calls: Array<{ url: string; headers: Record<string, string> }> = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({ url, headers });

      if (
        url ===
        "https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&visibility=public&per_page=100&sort=updated"
      ) {
        return new Response(
          JSON.stringify([
            {
              id: 1,
              name: "GiabBaoo",
              full_name: "GiabBaoo/GiabBaoo",
              description: "Profile repo",
              html_url: "https://github.com/GiabBaoo/GiabBaoo",
              homepage: null,
              fork: false,
              language: null,
            },
            {
              id: 2,
              name: "forked-repo",
              full_name: "GiabBaoo/forked-repo",
              description: "Fork",
              html_url: "https://github.com/GiabBaoo/forked-repo",
              homepage: null,
              fork: true,
              language: "TypeScript",
            },
            {
              id: 101,
              name: "his-api",
              full_name: "GiabBaoo/his-api",
              description: "API fallback",
              html_url: "https://github.com/GiabBaoo/his-api",
              homepage: "https://his.example.com",
              fork: false,
              language: "TypeScript",
              topics: ["hono", "sql-server"],
            },
            {
              id: 102,
              name: "no-readme-repo",
              full_name: "GiabBaoo/no-readme-repo",
              description: null,
              html_url: "https://github.com/GiabBaoo/no-readme-repo",
              homepage: null,
              fork: false,
              language: "SQL",
            },
            {
              id: 103,
              name: "shared-his",
              full_name: "partner-org/shared-his",
              description: "Collaborator project",
              html_url: "https://github.com/partner-org/shared-his",
              homepage: null,
              fork: false,
              language: "C#",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "https://api.github.com/repos/GiabBaoo/his-api/readme") {
        return new Response(
          `# HIS Gateway API\n\nCổng API kết nối dữ liệu HIS bệnh viện.\n\n## Chức năng\n- Truy vấn hồ sơ bệnh án\n- Kiểm tra bảo mật RBAC\n`,
          { status: 200 },
        );
      }

      if (url === "https://api.github.com/repos/GiabBaoo/no-readme-repo/readme") {
        return new Response("Not Found", { status: 404 });
      }

      if (url === "https://api.github.com/repos/partner-org/shared-his/readme") {
        return new Response(
          `# Shared HIS Module\n\nModule cộng tác quản lý đơn thuốc điện tử.\n\n## Features\n- Đồng bộ đơn thuốc\n`,
          { status: 200 },
        );
      }

      return new Response("Unexpected", { status: 500 });
    });

    const app = createApp();
    const res = await app.fetch(
      new Request("http://localhost/api/admin/sync/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer super-secret-admin-password",
        },
        body: JSON.stringify({ username: "GiabBaoo", includeForks: false }),
      }),
      createAdminBindings(),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; projects: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.projects).toHaveLength(3);

    const parsedFirst = projectSchema.parse(body.projects[0]);
    expect(parsedFirst.name).toBe("HIS Gateway API");
    expect(parsedFirst.description).toBe("Cổng API kết nối dữ liệu HIS bệnh viện.");
    expect(parsedFirst.features).toEqual([
      "Truy vấn hồ sơ bệnh án",
      "Kiểm tra bảo mật RBAC",
    ]);
    expect(parsedFirst.technologies).toEqual(["hono", "sql-server", "TypeScript"]);
    expect(parsedFirst.demoUrl).toBe("https://his.example.com");

    const parsedSecond = projectSchema.parse(body.projects[1]);
    expect(parsedSecond.name).toBe("no-readme-repo");
    expect(parsedSecond.description).toBe("Dự án mã nguồn mở trên GitHub");
    expect(parsedSecond.features).toEqual([]);

    const parsedCollab = projectSchema.parse(body.projects[2]);
    expect(parsedCollab.name).toBe("Shared HIS Module");
    expect(parsedCollab.description).toBe("Module cộng tác quản lý đơn thuốc điện tử.");
    expect(parsedCollab.features).toEqual(["Đồng bộ đơn thuốc"]);
    expect(parsedCollab.repositoryUrl).toBe("https://github.com/partner-org/shared-his");

    const readmeCalls = calls.filter((call) => call.url.endsWith("/readme"));
    expect(readmeCalls).toHaveLength(3);
    expect(readmeCalls.map((call) => call.url)).toContain(
      "https://api.github.com/repos/partner-org/shared-his/readme",
    );
    for (const call of readmeCalls) {
      expect(call.headers.Accept).toBe("application/vnd.github.raw+json");
      expect(call.headers["User-Agent"]).toBe("giabao-portfolio-cms");
      expect(call.headers.Authorization).toBe("Bearer ghp_test_token_123");
    }
  });

  it("falls back to /users/:username/repos?type=all when GITHUB_TOKEN is missing", async () => {
    const calledUrls: string[] = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calledUrls.push(url);

      if (url === "https://api.github.com/users/GiabBaoo/repos?type=all&per_page=100&sort=updated") {
        return new Response(
          JSON.stringify([
            {
              id: 201,
              name: "public-tool",
              full_name: "GiabBaoo/public-tool",
              description: "Public CLI tool",
              html_url: "https://github.com/GiabBaoo/public-tool",
              homepage: null,
              fork: false,
              language: "Go",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === "https://api.github.com/repos/GiabBaoo/public-tool/readme") {
        return new Response("# Public Tool\n\nFast CLI.", { status: 200 });
      }

      return new Response("Unexpected", { status: 500 });
    });

    const app = createApp();
    const res = await app.fetch(
      new Request("http://localhost/api/admin/sync/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer super-secret-admin-password",
        },
        body: JSON.stringify({ username: "GiabBaoo", includeForks: false }),
      }),
      createAdminBindings({ GITHUB_TOKEN: "" }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; projects: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.projects).toHaveLength(1);
    expect(calledUrls).toContain(
      "https://api.github.com/users/GiabBaoo/repos?type=all&per_page=100&sort=updated",
    );
    expect(calledUrls).toContain("https://api.github.com/repos/GiabBaoo/public-tool/readme");
  });
});

describe("translateViToEn", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty or non-diacritic text directly without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(await translateViToEn("")).toBe("");
    expect(await translateViToEn("   ")).toBe("   ");
    expect(await translateViToEn("HIS Gateway API v2")).toBe("HIS Gateway API v2");
    expect(await translateViToEn("Backend Developer")).toBe("Backend Developer");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("translates Vietnamese text with User-Agent Mozilla/5.0 and joins returned segments", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify([
          [
            ["Hospital management system. ", "Hệ thống quản lý bệnh viện. ", null, null, 1],
            ["Supports BHYT export.", "Hỗ trợ xuất BHYT.", null, null, 1],
          ],
          null,
          "vi",
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const translated = await translateViToEn(
      "Hệ thống quản lý bệnh viện. Hỗ trợ xuất BHYT.",
    );

    expect(translated).toBe("Hospital management system. Supports BHYT export.");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&q=",
    );
    expect((fetchSpy.mock.calls[0]?.[1]?.headers as Record<string, string>)?.["User-Agent"]).toBe(
      "Mozilla/5.0",
    );
  });

  it("returns original text when fetch fails or returns non-OK", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    expect(await translateViToEn("Quản lý bệnh án")).toBe("Quản lý bệnh án");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("Error", { status: 503 }));
    expect(await translateViToEn("Báo cáo BHYT")).toBe("Báo cáo BHYT");
  });
});

function createSamplePortfolio(overrides: Partial<PortfolioContentDTO> = {}): PortfolioContentDTO {
  return {
    profile: {
      name: "Nguyễn Gia Bảo",
      title: "Backend & Data Engineer",
      location: "TP.HCM",
      email: "giabao@example.com",
      summary: "Tóm tắt hồ sơ",
      heroHighlights: ["SQL Server"],
      aboutParagraphs: ["Đoạn giới thiệu"],
      cvUrl: null,
      avatarUrl: null,
      socialLinks: [{ platform: "github", label: "GitHub", url: "https://github.com/GiabBaoo" }],
    },
    education: {
      institution: "Đại học Công nghệ",
      degree: "Kỹ sư CNTT",
      gpa: "3.5/4.0",
      period: "2020 - 2024",
    },
    experiences: [],
    projects: [
      {
        id: "proj-1",
        slug: "his-reporting",
        name: "Hệ thống báo cáo HIS",
        description: "Tối ưu truy vấn dữ liệu y tế",
        technologies: ["TypeScript", "SQL Server"],
        features: ["Xuất báo cáo BHYT", "RBAC"],
        role: "Lập trình viên chính",
        imageUrl: null,
        repositoryUrl: "https://github.com/GiabBaoo/his-reporting",
        demoUrl: "https://his.example.com",
        projectType: "personal",
      },
    ],
    skills: [{ name: "SQL Server", category: "databases", proficiency: null }],
    healthcareGlossary: [{ abbr: "HIS", meaning: "Hospital Information System" }],
    certifications: [],
    ...overrides,
  };
}

describe("PUT /api/admin/portfolio/:locale & GET /api/portfolio", () => {
  beforeEach(async () => {
    await env.DB.prepare("DELETE FROM portfolio_contents").run();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("upserts VI row in D1 and returns translatedProjects when saving VI", async () => {
    const translations: Record<string, string> = {
      "Hệ thống báo cáo HIS": "HIS Reporting System",
      "Tối ưu truy vấn dữ liệu y tế": "Optimize healthcare data queries",
      "Lập trình viên chính": "Lead Developer",
      "Xuất báo cáo BHYT": "Export BHYT reports",
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const q = url.searchParams.get("q") ?? "";
      const enText = translations[q] ?? q;
      return new Response(JSON.stringify([[[enText, q]]]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const viPayload = createSamplePortfolio();
    const app = createApp();
    const res = await app.fetch(
      new Request("http://localhost/api/admin/portfolio/vi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer super-secret-admin-password",
        },
        body: JSON.stringify(viPayload),
      }),
      createAdminBindings(),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      locale: string;
      content: PortfolioContentDTO;
      translatedProjects: PortfolioContentDTO["projects"];
    };

    expect(body.ok).toBe(true);
    expect(body.locale).toBe("vi");
    expect(body.content.projects[0]?.name).toBe("Hệ thống báo cáo HIS");

    const enProject = body.translatedProjects[0]!;
    expect(enProject.id).toBe("proj-1");
    expect(enProject.slug).toBe("his-reporting");
    expect(enProject.name).toBe("HIS Reporting System");
    expect(enProject.description).toBe("Optimize healthcare data queries");
    expect(enProject.role).toBe("Lead Developer");
    expect(enProject.features).toEqual(["Export BHYT reports", "RBAC"]);
    expect(enProject.technologies).toEqual(["TypeScript", "SQL Server"]);
    expect(enProject.imageUrl).toBeNull();
    expect(enProject.repositoryUrl).toBe("https://github.com/GiabBaoo/his-reporting");
    expect(enProject.demoUrl).toBe("https://his.example.com");
    expect(enProject.projectType).toBe("personal");

    const viRow = await env.DB.prepare(
      "SELECT content_json FROM portfolio_contents WHERE locale = ?",
    )
      .bind("vi")
      .first<{ content_json: string }>();

    expect(viRow).not.toBeNull();
    const savedVi = portfolioContentSchema.parse(JSON.parse(viRow!.content_json));
    expect(savedVi.projects[0]?.name).toBe("Hệ thống báo cáo HIS");
  });

  it("upserts EN row (inserts if missing and updates if present) and GET /api/portfolio returns no-store, no-cache, must-revalidate", async () => {
    const app = createApp();
    const firstEn = createSamplePortfolio({
      profile: {
        name: "Gia Bao Nguyen",
        title: "Backend & Healthcare Data Engineer",
        location: "Ho Chi Minh City",
        email: "giabao@example.com",
        summary: "Initial English summary",
        heroHighlights: ["SQL Server"],
        aboutParagraphs: ["Initial English about"],
        cvUrl: null,
        avatarUrl: null,
        socialLinks: [{ platform: "github", label: "GitHub", url: "https://github.com/GiabBaoo" }],
      },
    });

    const insertRes = await app.fetch(
      new Request("http://localhost/api/admin/portfolio/en", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer super-secret-admin-password",
        },
        body: JSON.stringify(firstEn),
      }),
      createAdminBindings(),
    );
    expect(insertRes.status).toBe(200);

    const updatedEn = createSamplePortfolio({
      ...firstEn,
      profile: {
        ...firstEn.profile,
        summary: "Updated English summary",
      },
    });

    const updateRes = await app.fetch(
      new Request("http://localhost/api/admin/portfolio/en", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer super-secret-admin-password",
        },
        body: JSON.stringify(updatedEn),
      }),
      createAdminBindings(),
    );
    expect(updateRes.status).toBe(200);

    const viPayload = createSamplePortfolio();
    await app.fetch(
      new Request("http://localhost/api/admin/portfolio/vi", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer super-secret-admin-password",
        },
        body: JSON.stringify(viPayload),
      }),
      createAdminBindings(),
    );

    const publicRes = await app.fetch(
      new Request("http://localhost/api/portfolio"),
      createAdminBindings(),
    );
    expect(publicRes.status).toBe(200);
    expect(publicRes.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );

    const publicBody = (await publicRes.json()) as {
      ok: boolean;
      contentByLocale: { vi: PortfolioContentDTO | null; en: PortfolioContentDTO | null };
    };
    expect(publicBody.ok).toBe(true);
    expect(publicBody.contentByLocale.vi?.profile.summary).toBe("Tóm tắt hồ sơ");
    expect(publicBody.contentByLocale.en?.profile.summary).toBe("Updated English summary");
  });
});
