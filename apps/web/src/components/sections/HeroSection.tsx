import { Link } from "react-router";
import { useI18n } from "../../app/providers/i18n-context.ts";
import type { Profile, SocialPlatform } from "../../content/index.ts";
import { Badge, Card, Container, Section, Typography } from "../ui/index.ts";
import {
  ArrowDownIcon,
  DatabaseIcon,
  DownloadIcon,
  GitHubIcon,
  LinkedInIcon,
  MailIcon,
  MapPinIcon,
} from "../ui/Icons.tsx";
import { SqlProfileWindow } from "./SqlProfileWindow.tsx";

interface HeroSectionProps {
  profile: Profile;
}

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

export function HeroSection({ profile }: HeroSectionProps) {
  const { locale, messages } = useI18n();

  return (
    <Section
      spacing="lg"
      className="hero-surface border-border-subtle relative overflow-hidden border-b"
    >
      {/* Decorative grid & slow-drifting ambient glow (non-interactive, static on mobile/reduced-motion) */}
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="hero-ambient-primary pointer-events-none absolute -top-28 -left-24 h-80 w-80 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="hero-ambient-secondary pointer-events-none absolute -right-24 -bottom-24 hidden h-80 w-80 rounded-full blur-3xl md:block"
      />

      <Container size="xl" className="relative z-10">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="accent" className="gap-1.5 font-mono">
                <DatabaseIcon className="h-3.5 w-3.5" />
                <span>{messages.hero.eyebrow}</span>
              </Badge>
              <span className="text-small text-text-muted inline-flex items-center gap-1.5">
                <MapPinIcon className="h-3.5 w-3.5" />
                <span>{profile.location}</span>
              </span>
            </div>

            <div className="space-y-2.5">
              <Typography variant="display">{profile.name}</Typography>
              <Typography variant="h2" tone="accent" as="p" className="font-medium">
                {profile.title}
              </Typography>
            </div>

            <Typography variant="body" tone="secondary" className="max-w-2xl">
              {profile.summary}
            </Typography>

            <div className="space-y-2.5">
              <Typography variant="caption" tone="muted" as="p" className="font-mono">
                {messages.hero.coreFocusLabel}
              </Typography>
              <ul className="flex flex-wrap gap-2" aria-label={messages.hero.coreFocusLabel}>
                {profile.heroHighlights.map((item) => (
                  <li key={item}>
                    <Badge variant="neutral" interactive className="font-mono">
                      {item}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to={`/${locale}#projects`}
                className="group btn-hover-lift bg-accent-primary text-small text-accent-contrast hover:bg-accent-hover focus-visible:outline-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 font-medium shadow-sm transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 active:scale-[0.98]"
              >
                <span>{messages.hero.viewProjectsCta}</span>
                <ArrowDownIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
              </Link>

              {profile.cvUrl && (
                <a
                  href={profile.cvUrl}
                  download
                  className="btn-hover-lift border-border-strong bg-surface-primary text-small text-text-primary hover:bg-surface-muted hover:border-accent-primary/50 focus-visible:outline-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-5 py-2.5 font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 active:scale-[0.98]"
                >
                  <DownloadIcon className="h-4 w-4" />
                  <span>{messages.hero.downloadCvCta}</span>
                </a>
              )}

              <Link
                to={`/${locale}#contact`}
                className="btn-hover-lift border-border-strong text-small text-text-primary hover:bg-surface-primary hover:border-accent-primary/50 focus-visible:outline-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-transparent px-5 py-2.5 font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 active:scale-[0.98]"
              >
                <span>{messages.hero.contactCta}</span>
              </Link>
            </div>

            <div
              aria-label={messages.hero.socialLinksLabel}
              className="flex flex-wrap items-center gap-2 pt-1"
            >
              {profile.socialLinks.map((link) => {
                const isExternal = link.platform !== "email";
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="btn-hover-lift border-border-subtle bg-bg-secondary/90 text-small text-text-secondary hover:border-accent-primary/40 hover:text-text-primary inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-1.5 font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:shadow-sm"
                  >
                    {renderSocialIcon(link.platform)}
                    <span>{link.label}</span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5">
            {profile.avatarUrl ? (
              <Card
                variant="elevated"
                padding="sm"
                interactive
                className="mx-auto max-w-sm overflow-hidden"
              >
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              </Card>
            ) : (
              <SqlProfileWindow location={profile.location} />
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
