import { useI18n } from "../../app/providers/i18n-context.ts";
import type { Education, Profile } from "../../content/index.ts";
import { Card, Container, Reveal, Section, SectionHeader, Typography } from "../ui/index.ts";
import { DownloadIcon } from "../ui/Icons.tsx";

interface AboutSectionProps {
  profile: Profile;
  education: Education;
  currentRole: string;
}

export function AboutSection({ profile, education, currentRole }: AboutSectionProps) {
  const { messages } = useI18n();

  return (
    <Section
      id="about"
      spacing="md"
      aria-labelledby="about-heading"
      className="bg-bg-primary scroll-mt-20"
    >
      <Container size="xl">
        <Reveal>
          <SectionHeader
            eyebrow={messages.about.eyebrow}
            heading={messages.about.heading}
            headingId="about-heading"
          />
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="space-y-4 lg:col-span-7">
            {profile.aboutParagraphs.map((paragraph, index) => (
              <Reveal key={index} delay={index * 70}>
                <Typography variant="body" tone="secondary">
                  {paragraph}
                </Typography>
              </Reveal>
            ))}
          </div>

          <Reveal variant="scale-up" delay={120} className="lg:col-span-5">
            <Card variant="elevated" padding="md" interactive className="space-y-4">
              <Typography variant="h3">{messages.about.quickFactsTitle}</Typography>
              <dl className="divide-border-subtle divide-y">
                <div className="pb-3.5">
                  <dt className="text-caption text-text-muted font-mono uppercase">
                    {messages.about.currentRoleLabel}
                  </dt>
                  <dd className="text-small text-text-primary mt-1 font-medium">{currentRole}</dd>
                </div>
                <div className="py-3.5">
                  <dt className="text-caption text-text-muted font-mono uppercase">
                    {messages.about.educationLabel}
                  </dt>
                  <dd className="text-small text-text-primary mt-1 font-medium">
                    {education.institution}
                  </dd>
                  <dd className="text-small text-text-muted mt-0.5">{education.degree}</dd>
                </div>
                <div className="py-3.5">
                  <dt className="text-caption text-text-muted font-mono uppercase">
                    {messages.about.focusLabel}
                  </dt>
                  <dd className="text-small text-text-primary mt-1 font-medium">
                    {messages.about.focusValue}
                  </dd>
                </div>
                <div className="pt-3.5">
                  <dt className="text-caption text-text-muted font-mono uppercase">
                    {messages.about.locationLabel}
                  </dt>
                  <dd className="text-small text-text-secondary mt-1">{profile.location}</dd>
                </div>
              </dl>

              {profile.cvUrl && (
                <div className="border-border-subtle border-t pt-4">
                  <a
                    href={profile.cvUrl}
                    download
                    className="btn-hover-lift border-border-strong bg-surface-primary text-small text-text-primary hover:bg-surface-muted hover:border-accent-primary/50 focus-visible:outline-focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 active:scale-[0.98]"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    <span>{messages.hero.downloadCvCta}</span>
                  </a>
                </div>
              )}
            </Card>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
