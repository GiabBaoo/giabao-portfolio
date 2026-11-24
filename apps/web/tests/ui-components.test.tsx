import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../src/app/providers/I18nProvider.tsx";
import { ThemeProvider } from "../src/app/providers/ThemeProvider.tsx";
import {
  BackToTopButton,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  IconButton,
  LanguageSwitcher,
  Reveal,
  ScrollProgressBar,
  Section,
  ThemeToggle,
  Typography,
} from "../src/components/ui/index.ts";
import { ProjectMockup } from "../src/components/sections/ProjectMockup.tsx";
import { SqlProfileWindow } from "../src/components/sections/SqlProfileWindow.tsx";

describe("Base UI components", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all base UI components with proper semantics and accessibility", () => {
    render(
      <MemoryRouter initialEntries={["/en"]}>
        <ThemeProvider defaultTheme="dark">
          <I18nProvider locale="en">
            <Section aria-label="Test section">
              <Container size="md">
                <Card variant="elevated">
                  <Typography variant="h2">Heading</Typography>
                  <Typography variant="code">SELECT 1;</Typography>
                  <Badge variant="accent">SQL</Badge>
                  <Divider />
                  <Button variant="primary">Action</Button>
                  <Button variant="ghost" disabled>
                    Disabled Action
                  </Button>
                  <IconButton aria-label="Close panel">
                    <span aria-hidden="true">×</span>
                  </IconButton>
                  <ThemeToggle />
                  <LanguageSwitcher />
                </Card>
              </Container>
            </Section>
          </I18nProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Heading" })).toBeInTheDocument();
    expect(screen.getByText("SELECT 1;").tagName).toBe("CODE");
    expect(screen.getByRole("button", { name: "Action" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Disabled Action" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close panel" })).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Color theme" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Language switcher" })).toBeInTheDocument();
  });

  it("renders enhanced motion, loading, SQL profile window, and project mockup components", () => {
    render(
      <MemoryRouter initialEntries={["/en"]}>
        <ThemeProvider defaultTheme="dark">
          <I18nProvider locale="en">
            <ScrollProgressBar />
            <Reveal variant="fade-up" delay={50}>
              <Button variant="primary" loading>
                Submitting
              </Button>
            </Reveal>
            <SqlProfileWindow location="Ho Chi Minh City, Vietnam" />
            <ProjectMockup slug="power-company-database" badgeLabel="Illustrative diagram" />
            <BackToTopButton />
          </I18nProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const loadingBtn = screen.getByRole("button", { name: "Submitting" });
    expect(loadingBtn).toBeDisabled();
    expect(loadingBtn).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("region", { name: "Decorative T-SQL preview" })).toBeInTheDocument();
    expect(screen.getByText("profile.sql")).toBeInTheDocument();
    expect(screen.getByText("Illustrative diagram")).toBeInTheDocument();
  });
});
