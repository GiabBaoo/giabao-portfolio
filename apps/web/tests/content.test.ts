import { describe, expect, it } from "vitest";
import { getPortfolioContent } from "../src/content/index.ts";

describe("Content architecture & data integrity", () => {
  const en = getPortfolioContent("en");
  const vi = getPortfolioContent("vi");

  it("maintains structural parity between en and vi content", () => {
    expect(en.experiences.map((e) => e.id)).toEqual(vi.experiences.map((e) => e.id));
    expect(en.projects.map((p) => p.id)).toEqual(vi.projects.map((p) => p.id));
    expect(en.skills.length).toBe(vi.skills.length);
    expect(en.certifications.map((c) => c.id)).toEqual(vi.certifications.map((c) => c.id));
  });

  it("enforces WinSoft official position and confidentiality rules", () => {
    for (const content of [en, vi]) {
      const winsoft = content.experiences.find((e) => e.id === "winsoft");
      expect(winsoft).toBeDefined();
      expect(winsoft?.position).toBe("Database & Data Intern");
      expect(winsoft?.kind).toBe("technical");
    }
  });

  it("merges MONO APP and App Money Tracker into a single project record", () => {
    for (const content of [en, vi]) {
      expect(content.projects).toHaveLength(3);
      const monoMatches = content.projects.filter(
        (p) =>
          p.name.toLowerCase().includes("mono") || p.name.toLowerCase().includes("money tracker"),
      );
      expect(monoMatches).toHaveLength(1);
    }
  });

  it("keeps unconfirmed projectType, repositoryUrl, demoUrl unset and includes confirmed Supabase for Coffee Shop", () => {
    for (const content of [en, vi]) {
      for (const project of content.projects) {
        expect(project.projectType).toBeNull();
        expect(project.repositoryUrl).toBeNull();
        expect(project.demoUrl).toBeNull();
      }

      const coffeeShop = content.projects.find((p) => p.id === "coffee-shop-ecommerce");
      expect(coffeeShop).toBeDefined();
      const lowerTech = coffeeShop?.technologies.map((t) => t.toLowerCase()) ?? [];
      expect(lowerTech).toContain("supabase");
      expect(lowerTech).not.toContain("sql server");
      expect(lowerTech).not.toContain("postgresql");
      expect(lowerTech).not.toContain("mysql");
    }
  });

  it("does not fabricate skill proficiency or unconfirmed certification fields", () => {
    for (const content of [en, vi]) {
      for (const skill of content.skills) {
        expect(skill.proficiency).toBeUndefined();
      }
      for (const cert of content.certifications) {
        expect(cert.issuer).toBeNull();
        expect(cert.issueDate).toBeNull();
        expect(cert.credentialUrl).toBeNull();
      }
    }
  });
});
