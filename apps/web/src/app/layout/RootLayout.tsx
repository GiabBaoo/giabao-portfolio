import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { ArrowUpIcon, GitHubIcon, LinkedInIcon, MailIcon } from "../../components/ui/Icons.tsx";
import {
  BackToTopButton,
  Container,
  Divider,
  IconButton,
  LanguageSwitcher,
  ScrollProgressBar,
  ThemeToggle,
  Typography,
} from "../../components/ui/index.ts";
import { getPortfolioContent, type SocialPlatform } from "../../content/index.ts";
import { cn } from "../../lib/cn.ts";
import { MOTION_TIMING } from "../../lib/motion.ts";
import { useActiveSection } from "../../lib/useActiveSection.ts";
import { usePrefersReducedMotion } from "../../lib/usePrefersReducedMotion.ts";
import { useI18n } from "../providers/i18n-context.ts";

const SECTION_IDS = ["about", "skills", "experience", "projects", "education", "contact"] as const;

type SectionId = (typeof SECTION_IDS)[number];

function renderSocialIcon(platform: SocialPlatform) {
  switch (platform) {
    case "github":
      return <GitHubIcon className="h-4 w-4" />;
    case "linkedin":
      return <LinkedInIcon className="h-4 w-4" />;
    case "email":
      return <MailIcon className="h-4 w-4" />;
  }
}

export function RootLayout() {
  const { locale, messages } = useI18n();
  const location = useLocation();
  const content = getPortfolioContent(locale);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > 12,
  );
  const mainRef = useRef<HTMLElement | null>(null);
  const prevLocaleRef = useRef(locale);

  const isHomeRoute = location.pathname === `/${locale}` || location.pathname === `/${locale}/`;
  const activeSection = useActiveSection(SECTION_IDS, isHomeRoute);

  const navItems: readonly { id: SectionId; label: string }[] = [
    { id: "about", label: messages.nav.about },
    { id: "skills", label: messages.nav.skills },
    { id: "experience", label: messages.nav.experience },
    { id: "projects", label: messages.nav.projects },
    { id: "education", label: messages.nav.education },
    { id: "contact", label: messages.nav.contact },
  ];

  useEffect(() => {
    if (prevLocaleRef.current === locale) {
      return;
    }
    prevLocaleRef.current = locale;
    const mainEl = mainRef.current;
    if (prefersReducedMotion || !mainEl) {
      return;
    }
    mainEl.classList.remove("animate-locale-fade");
    void mainEl.offsetWidth;
    mainEl.classList.add("animate-locale-fade");
    const timeoutId = window.setTimeout(() => {
      mainEl.classList.remove("animate-locale-fade");
    }, MOTION_TIMING.normal);

    return () => {
      window.clearTimeout(timeoutId);
      mainEl.classList.remove("animate-locale-fade");
    };
  }, [locale, prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let rafId = 0;
    const handleScroll = () => {
      if (rafId !== 0) {
        return;
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        setIsScrolled(window.scrollY > 12);
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        document.getElementById("mobile-menu-toggle")?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!isHomeRoute || !location.hash) {
      return;
    }
    const targetId = location.hash.replace(/^#/, "");
    const el = document.getElementById(targetId);
    if (el && typeof el.scrollIntoView === "function") {
      try {
        el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      } catch {
        el.scrollIntoView();
      }
    }
  }, [isHomeRoute, location.hash, location.key, prefersReducedMotion]);

  return (
    <div id="top" className="bg-bg-primary text-text-primary flex min-h-dvh flex-col">
      <ScrollProgressBar />

      <a
        href="#main-content"
        className="focus:bg-accent-primary focus:text-small focus:text-accent-contrast sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:font-medium"
      >
        {messages.nav.skipToContent}
      </a>

      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-200",
          isScrolled
            ? "border-border-subtle bg-bg-primary/88 shadow-sm backdrop-blur-md"
            : "border-border-subtle/50 bg-bg-primary/95",
        )}
      >
        <Container size="xl" className="flex h-16 items-center justify-between gap-3">
          <Link
            to={`/${locale}`}
            onClick={() => setMobileMenuOpen(false)}
            className="group text-text-primary hover:text-accent-primary inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-md px-1 font-semibold tracking-tight transition-colors"
          >
            <span className="bg-accent-soft text-caption text-accent-primary border-accent-primary/20 group-hover:bg-accent-primary group-hover:text-accent-contrast inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border font-mono font-bold transition-all duration-200">
              GB
            </span>
            <span className="text-small sm:text-body truncate">{content.profile.name}</span>
          </Link>

          <nav aria-label={messages.nav.primaryLabel} className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isActive = isHomeRoute && activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  to={`/${locale}#${item.id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "text-small relative inline-flex min-h-9 items-center rounded-md px-2.5 font-medium transition-all duration-200",
                    isActive
                      ? "bg-accent-soft text-accent-primary"
                      : "text-text-secondary hover:bg-surface-primary hover:text-text-primary",
                  )}
                >
                  <span>{item.label}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "bg-accent-primary absolute right-2.5 bottom-1 left-2.5 h-0.5 origin-center rounded-full transition-transform duration-200",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </Link>
              );
            })}
            <Divider orientation="vertical" className="mx-2" />
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <IconButton
              id="mobile-menu-toggle"
              aria-label={mobileMenuOpen ? messages.nav.menuClose : messages.nav.menuOpen}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
              variant="outline"
              size="md"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </IconButton>
          </div>
        </Container>

        {mobileMenuOpen && (
          <nav
            id="mobile-nav-panel"
            aria-label={messages.nav.primaryLabel}
            className="animate-menu-slide-down border-border-subtle bg-bg-secondary/95 border-t backdrop-blur-md lg:hidden"
          >
            <Container size="xl" className="flex flex-col gap-1.5 py-4">
              {navItems.map((item) => {
                const isActive = isHomeRoute && activeSection === item.id;
                return (
                  <Link
                    key={item.id}
                    to={`/${locale}#${item.id}`}
                    aria-current={isActive ? "location" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "text-body inline-flex min-h-11 items-center rounded-md px-3 font-medium transition-colors",
                      isActive
                        ? "bg-accent-soft text-accent-primary"
                        : "text-text-primary hover:bg-surface-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Divider className="my-2" />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </Container>
          </nav>
        )}
      </header>

      <main ref={mainRef} id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>

      <footer className="border-border-subtle bg-bg-secondary border-t">
        <Container size="xl" className="py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Typography variant="small" tone="primary" className="font-medium">
                © {new Date().getFullYear()} {messages.common.footerCopyright}
              </Typography>
              <Typography variant="small" tone="muted">
                {messages.common.footerBuiltWith}
              </Typography>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {content.profile.socialLinks.map((link) => {
                const isExternal = link.platform !== "email";
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    aria-label={link.label}
                    className="border-border-subtle bg-surface-primary text-small text-text-secondary hover:border-accent-primary/40 hover:text-text-primary inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-1.5 transition-all duration-200 hover:-translate-y-px motion-reduce:hover:translate-y-0"
                  >
                    {renderSocialIcon(link.platform)}
                    <span>{link.label}</span>
                  </a>
                );
              })}
              <a
                href="#top"
                aria-label={messages.common.backToTop}
                className="border-border-subtle bg-surface-primary text-small text-text-secondary hover:border-accent-primary/40 hover:text-text-primary inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 py-1.5 transition-all duration-200 hover:-translate-y-px motion-reduce:hover:translate-y-0"
              >
                <ArrowUpIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{messages.common.backToTop}</span>
              </a>
            </div>
          </div>
        </Container>
      </footer>

      <BackToTopButton />
    </div>
  );
}
