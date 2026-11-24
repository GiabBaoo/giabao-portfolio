import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../src/app/providers/ThemeProvider.tsx";
import { I18nProvider } from "../src/app/providers/I18nProvider.tsx";
import { routes } from "../src/app/router.tsx";
import { ProjectsSection } from "../src/components/sections/ProjectsSection.tsx";
import type { Project } from "../src/content/index.ts";

function renderApp(initialPath = "/en", defaultTheme: "light" | "dark" | "system" = "dark") {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const result = render(
    <ThemeProvider defaultTheme={defaultTheme}>
      <RouterProvider router={memoryRouter} />
    </ThemeProvider>,
  );
  return { ...result, memoryRouter };
}

describe("Stage 4 – Complete Portfolio Website", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.lang = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all primary sections and verified profile details in English", async () => {
    renderApp("/en");

    // Hero
    expect(screen.getByRole("heading", { level: 1, name: "Nguyen Gia Bao" })).toBeInTheDocument();
    expect(screen.getByText("Backend Developer | Database-focused Developer")).toBeInTheDocument();

    // No broken Download CV link when cvUrl is null
    expect(screen.queryByRole("link", { name: /download cv/i })).not.toBeInTheDocument();

    // Section landmarks
    expect(document.getElementById("about")).toBeInTheDocument();
    expect(document.getElementById("skills")).toBeInTheDocument();
    expect(document.getElementById("experience")).toBeInTheDocument();
    expect(document.getElementById("projects")).toBeInTheDocument();
    expect(document.getElementById("education")).toBeInTheDocument();
    expect(document.getElementById("contact")).toBeInTheDocument();

    // Experience: WinSoft Database & Data Intern + non-technical entries
    const experienceSection = document.getElementById("experience")!;
    expect(within(experienceSection).getByText("WinSoft")).toBeInTheDocument();
    expect(within(experienceSection).getByText("Database & Data Intern")).toBeInTheDocument();
    expect(within(experienceSection).getByText("JEN&CO")).toBeInTheDocument();
    expect(within(experienceSection).getByText("AR GROUP")).toBeInTheDocument();
    expect(
      within(experienceSection).getByText("Zwilling J.A. Henckels (Vietnam)"),
    ).toBeInTheDocument();

    // Projects: 3 confirmed projects, MONO APP appears once, no filter buttons when projectType is null
    const projectsSection = document.getElementById("projects")!;
    expect(within(projectsSection).getByText("Power Company Database")).toBeInTheDocument();
    expect(within(projectsSection).getByText("Coffee Shop E-commerce")).toBeInTheDocument();
    expect(within(projectsSection).getByText("MONO APP (App Money Tracker)")).toBeInTheDocument();
    expect(
      within(projectsSection).queryByRole("group", { name: /filter projects/i }),
    ).not.toBeInTheDocument();

    // Education & Certifications
    const educationSection = document.getElementById("education")!;
    expect(within(educationSection).getByText(/HUFLIT/)).toBeInTheDocument();
    expect(within(educationSection).getByText(/3\.2 \/ 4\.0/)).toBeInTheDocument();
    expect(within(educationSection).getByText("AI Fundamentals")).toBeInTheDocument();

    // Contact: verified links & active Stage 5 contact form (lazy-loaded)
    const emailLink = await screen.findByRole(
      "link",
      {
        name: /truyennguyen744@gmail\.com/i,
      },
      { timeout: 5000 },
    );
    expect(emailLink).toHaveAttribute("href", "mailto:truyennguyen744@gmail.com");

    const contactSection = document.getElementById("contact")!;
    const submitButton = within(contactSection).getByRole("button", {
      name: /send message/i,
    });
    expect(submitButton).toBeEnabled();
  });

  it("switches between EN and VI while preserving theme preference", () => {
    renderApp("/en", "light");

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.lang).toBe("en");

    fireEvent.click(screen.getByRole("button", { name: "VI — Switch language to Vietnamese" }));

    expect(document.documentElement.lang).toBe("vi");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(screen.getByRole("heading", { level: 1, name: "Nguyễn Gia Bảo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dự án tiêu biểu" })).toBeInTheDocument();
  });

  it("opens and closes the mobile hamburger navigation menu", () => {
    renderApp("/en");

    const openBtn = screen.getByRole("button", { name: "Open navigation menu" });
    expect(openBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(openBtn);

    const closeBtn = screen.getByRole("button", { name: "Close navigation menu" });
    expect(closeBtn).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("mobile-nav-panel")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.getElementById("mobile-nav-panel")).not.toBeInTheDocument();
  });

  it("toggles other (non-technical) experience visibility", () => {
    renderApp("/en");

    const toggleBtn = screen.getByRole("button", { name: /hide other experience/i });
    expect(document.getElementById("other-experience-list")).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(document.getElementById("other-experience-list")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show other experience/i }));
    expect(document.getElementById("other-experience-list")).toBeInTheDocument();
  });

  it("renders and filters confirmed project types when projectType is present", () => {
    const confirmedProjects: readonly Project[] = [
      {
        id: "p1",
        slug: "p1",
        name: "Confirmed Personal Project",
        description: "Personal project description",
        technologies: ["Node.js"],
        features: ["Feature A"],
        role: "Backend Developer",
        imageUrl: null,
        repositoryUrl: "https://github.com/GiabBaoo/example",
        demoUrl: null,
        projectType: "personal",
      },
      {
        id: "p2",
        slug: "p2",
        name: "Confirmed Academic Project",
        description: "Academic project description",
        technologies: ["SQL Server"],
        features: ["Feature B"],
        role: null,
        imageUrl: null,
        repositoryUrl: null,
        demoUrl: null,
        projectType: "academic",
      },
    ];

    const memoryRouter = createMemoryRouter(
      [
        {
          path: "/en",
          element: (
            <I18nProvider locale="en">
              <ProjectsSection projects={confirmedProjects} />
            </I18nProvider>
          ),
        },
      ],
      { initialEntries: ["/en"] },
    );

    render(<RouterProvider router={memoryRouter} />);

    expect(screen.getByText("Confirmed Personal Project")).toBeInTheDocument();
    expect(screen.getByText("Confirmed Academic Project")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /personal/i }));
    expect(screen.getByText("Confirmed Personal Project")).toBeInTheDocument();
    expect(screen.queryByText("Confirmed Academic Project")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /academic/i }));
    expect(screen.queryByText("Confirmed Personal Project")).not.toBeInTheDocument();
    expect(screen.getByText("Confirmed Academic Project")).toBeInTheDocument();
  });
});
