import { useState } from "react";
import { useI18n } from "../../app/providers/i18n-context.ts";
import type { Experience } from "../../content/index.ts";
import { cn } from "../../lib/cn.ts";
import { useInViewOnce } from "../../lib/useInViewOnce.ts";
import {
  Badge,
  Button,
  Card,
  Container,
  Reveal,
  Section,
  SectionHeader,
  Typography,
} from "../ui/index.ts";
import { BriefcaseIcon, ChevronDownIcon } from "../ui/Icons.tsx";

interface ExperienceSectionProps {
  experiences: readonly Experience[];
}

function formatYearMonth(value: string): string {
  const parts = value.split("-");
  if (parts.length !== 2) {
    return value;
  }
  const [year, month] = parts;
  return `${month}/${year}`;
}

export function ExperienceSection({ experiences }: ExperienceSectionProps) {
  const { messages } = useI18n();
  const [showOther, setShowOther] = useState(true);
  const { ref: timelineRef, isInView: timelineInView } = useInViewOnce<HTMLDivElement>();

  const technicalExperiences = experiences.filter((exp) => exp.kind === "technical");
  const otherExperiences = experiences.filter((exp) => exp.kind === "non-technical");

  const formatPeriod = (startDate: string, endDate: string | null) =>
    `${formatYearMonth(startDate)} – ${endDate ? formatYearMonth(endDate) : messages.common.present}`;

  return (
    <Section
      id="experience"
      spacing="md"
      aria-labelledby="experience-heading"
      className="bg-bg-primary scroll-mt-20"
    >
      <Container size="xl">
        <Reveal>
          <SectionHeader
            eyebrow={messages.experience.eyebrow}
            heading={messages.experience.heading}
            subtitle={messages.experience.subtitle}
            headingId="experience-heading"
          />
        </Reveal>

        <div className="space-y-10">
          {/* Technical Experience */}
          <div className="space-y-4">
            <Reveal>
              <div className="flex items-center gap-2.5">
                <span className="bg-accent-soft text-accent-primary inline-flex h-8 w-8 items-center justify-center rounded-lg">
                  <BriefcaseIcon className="h-4 w-4" />
                </span>
                <Typography variant="h3">{messages.experience.technicalHeading}</Typography>
              </div>
            </Reveal>

            <div ref={timelineRef} className="relative space-y-6 pl-6 sm:pl-8">
              {/* Progressive timeline vertical rail */}
              <span
                aria-hidden="true"
                data-rail-state={timelineInView ? "visible" : "hidden"}
                className="timeline-rail from-accent-primary via-border-strong to-border-subtle absolute top-2 bottom-2 left-1.5 w-0.5 bg-gradient-to-b"
              />

              {technicalExperiences.map((exp, idx) => (
                <Reveal key={exp.id} variant="fade-up" delay={idx * 90}>
                  <article className="relative">
                    {/* Timeline marker with smooth fade-in & scale-in (no continuous pulse) */}
                    <span
                      aria-hidden="true"
                      data-marker-state={timelineInView ? "visible" : "hidden"}
                      style={{ transitionDelay: `${idx * 90 + 80}ms` }}
                      className="timeline-marker bg-accent-primary ring-bg-primary absolute top-6 -left-[1.42rem] z-10 h-3.5 w-3.5 rounded-full ring-4 sm:-left-[1.92rem]"
                    />

                    <Card variant="elevated" padding="md" interactive className="space-y-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Typography variant="h3" as="h4">
                              {exp.position}
                            </Typography>
                            <Badge variant="accent">{messages.experience.technicalBadge}</Badge>
                          </div>
                          <Typography variant="body" tone="accent" className="font-medium">
                            {exp.company}
                          </Typography>
                        </div>

                        <Badge variant="outline" className="w-fit shrink-0 font-mono">
                          {formatPeriod(exp.startDate, exp.endDate)}
                        </Badge>
                      </div>

                      <Typography variant="small" tone="secondary">
                        {exp.description}
                      </Typography>

                      <ul className="text-small text-text-secondary space-y-2">
                        {exp.responsibilities.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-2.5">
                            <span
                              aria-hidden="true"
                              className="bg-accent-primary mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <Typography
                        variant="caption"
                        tone="muted"
                        as="p"
                        className="border-border-subtle border-t pt-3 normal-case"
                      >
                        {messages.experience.confidentialityNote}
                      </Typography>
                    </Card>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Non-Technical / Other Experience */}
          {otherExperiences.length > 0 && (
            <div className="space-y-4">
              <Reveal>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <Typography variant="h3">{messages.experience.otherHeading}</Typography>
                    <Typography variant="small" tone="muted">
                      {messages.experience.otherDescription}
                    </Typography>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    aria-expanded={showOther}
                    aria-controls="other-experience-list"
                    onClick={() => setShowOther((prev) => !prev)}
                    className="w-fit shrink-0"
                  >
                    <span>
                      {showOther
                        ? messages.experience.hideOtherLabel
                        : messages.experience.showOtherLabel}
                    </span>
                    <ChevronDownIcon
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        showOther && "rotate-180",
                      )}
                    />
                  </Button>
                </div>
              </Reveal>

              {showOther && (
                <div
                  id="other-experience-list"
                  className="animate-fade-up grid gap-5 md:grid-cols-3"
                >
                  {otherExperiences.map((exp, idx) => (
                    <Reveal key={exp.id} variant="fade-up" delay={idx * 70} className="h-full">
                      <Card
                        variant="default"
                        padding="md"
                        interactive
                        className="flex h-full flex-col gap-3"
                      >
                        <div className="space-y-1">
                          <Badge variant="outline" className="font-mono">
                            {formatPeriod(exp.startDate, exp.endDate)}
                          </Badge>
                          <Typography variant="h3" as="h4" className="pt-1">
                            {exp.company}
                          </Typography>
                          <Typography variant="small" tone="accent" className="font-medium">
                            {exp.position}
                          </Typography>
                        </div>

                        <Typography variant="small" tone="secondary">
                          {exp.description}
                        </Typography>

                        <ul className="text-small text-text-muted space-y-1.5">
                          {exp.responsibilities.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-2">
                              <span
                                aria-hidden="true"
                                className="bg-text-muted mt-2 h-1 w-1 shrink-0 rounded-full"
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}
