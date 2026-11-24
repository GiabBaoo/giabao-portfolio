import { useI18n } from "../../app/providers/i18n-context.ts";
import type { Certification, Education } from "../../content/index.ts";
import { Badge, Card, Container, Reveal, Section, SectionHeader, Typography } from "../ui/index.ts";
import { AwardIcon, ExternalLinkIcon, GraduationCapIcon } from "../ui/Icons.tsx";

interface EducationSectionProps {
  education: Education;
  certifications: readonly Certification[];
}

export function EducationSection({ education, certifications }: EducationSectionProps) {
  const { messages } = useI18n();

  return (
    <Section
      id="education"
      spacing="md"
      aria-labelledby="education-heading"
      className="bg-bg-primary scroll-mt-20"
    >
      <Container size="xl">
        <Reveal>
          <SectionHeader
            eyebrow={messages.education.eyebrow}
            heading={messages.education.heading}
            headingId="education-heading"
          />
        </Reveal>

        <div className="space-y-8">
          <Reveal variant="fade-up" delay={60}>
            <Card variant="elevated" padding="md" interactive className="group space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3.5">
                  <span className="bg-accent-soft text-accent-primary border-accent-primary/20 mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105">
                    <GraduationCapIcon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <Typography variant="h3">{education.institution}</Typography>
                    <Typography variant="body" tone="secondary">
                      {education.degree}
                    </Typography>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <Badge variant="outline" className="font-mono">
                    {education.period}
                  </Badge>
                  <Badge variant="accent" className="font-mono">
                    {messages.education.gpaLabel}: {education.gpa}
                  </Badge>
                </div>
              </div>
            </Card>
          </Reveal>

          {certifications.length > 0 && (
            <div className="space-y-4">
              <Reveal>
                <div className="space-y-1">
                  <Typography variant="h3">{messages.education.certificationsHeading}</Typography>
                  <Typography variant="small" tone="muted">
                    {messages.education.certificationsSubtitle}
                  </Typography>
                </div>
              </Reveal>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {certifications.map((cert, idx) => (
                  <Reveal key={cert.id} variant="fade-up" delay={idx * 70} className="h-full">
                    <Card
                      variant="default"
                      padding="sm"
                      interactive
                      className="group flex h-full flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="bg-surface-muted text-text-muted group-hover:bg-accent-soft group-hover:text-accent-primary mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200">
                          <AwardIcon className="h-4 w-4" />
                        </span>
                        <div className="space-y-1">
                          <Typography variant="small" tone="primary" className="font-medium">
                            {cert.name}
                          </Typography>
                          {(cert.issuer || cert.issueDate) && (
                            <Typography
                              variant="caption"
                              tone="muted"
                              as="p"
                              className="normal-case"
                            >
                              {[cert.issuer, cert.issueDate].filter(Boolean).join(" · ")}
                            </Typography>
                          )}
                        </div>
                      </div>

                      {cert.credentialUrl && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/link text-small text-accent-primary hover:text-accent-hover inline-flex w-fit items-center gap-1.5 font-medium transition-colors"
                        >
                          <span>{messages.education.viewCredential}</span>
                          <ExternalLinkIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                        </a>
                      )}
                    </Card>
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}
