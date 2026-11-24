import type { ReactNode } from "react";
import { useI18n } from "../../app/providers/i18n-context.ts";
import type { DomainTerm, Skill, SkillCategory } from "../../content/index.ts";
import { cn } from "../../lib/cn.ts";
import { Badge, Card, Container, Reveal, Section, SectionHeader, Typography } from "../ui/index.ts";
import { CodeIcon, DatabaseIcon, HeartPulseIcon, ServerIcon } from "../ui/Icons.tsx";

interface SkillsSectionProps {
  skills: readonly Skill[];
  healthcareGlossary: readonly DomainTerm[];
}

const CATEGORY_ORDER: readonly SkillCategory[] = ["databases", "backend", "other", "healthcare"];

interface CategoryStyle {
  readonly icon: ReactNode;
  readonly iconContainerClass: string;
  readonly topAccentClass: string;
}

const CATEGORY_STYLES: Record<SkillCategory, CategoryStyle> = {
  databases: {
    icon: <DatabaseIcon className="h-4 w-4" />,
    iconContainerClass:
      "bg-blue-600/12 text-blue-700 border-blue-600/20 dark:bg-sky-400/15 dark:text-sky-300 dark:border-sky-400/25",
    topAccentClass: "border-t-2 border-t-blue-600/70 dark:border-t-sky-400/75",
  },
  backend: {
    icon: <ServerIcon className="h-4 w-4" />,
    iconContainerClass:
      "bg-indigo-600/12 text-indigo-700 border-indigo-600/20 dark:bg-indigo-400/15 dark:text-indigo-300 dark:border-indigo-400/25",
    topAccentClass: "border-t-2 border-t-indigo-600/65 dark:border-t-indigo-400/70",
  },
  other: {
    icon: <CodeIcon className="h-4 w-4" />,
    iconContainerClass:
      "bg-slate-600/10 text-slate-700 border-slate-500/20 dark:bg-slate-400/15 dark:text-slate-300 dark:border-slate-400/25",
    topAccentClass: "border-t-2 border-t-slate-400/60 dark:border-t-slate-500/70",
  },
  healthcare: {
    icon: <HeartPulseIcon className="h-4 w-4" />,
    iconContainerClass:
      "bg-teal-600/12 text-teal-700 border-teal-600/20 dark:bg-teal-400/15 dark:text-teal-300 dark:border-teal-400/25",
    topAccentClass: "border-t-2 border-t-teal-600/60 dark:border-t-teal-400/65",
  },
};

export function SkillsSection({ skills, healthcareGlossary }: SkillsSectionProps) {
  const { messages } = useI18n();

  const groupedSkills = CATEGORY_ORDER.map((category) => ({
    category,
    label: messages.skillCategories[category],
    items: skills.filter((skill) => skill.category === category),
    isPrimary: category === "databases" || category === "backend",
    style: CATEGORY_STYLES[category],
  })).filter((group) => group.items.length > 0);

  return (
    <Section
      id="skills"
      spacing="md"
      aria-labelledby="skills-heading"
      className="section-surface-tinted border-border-subtle scroll-mt-20 border-y"
    >
      <Container size="xl">
        <Reveal>
          <SectionHeader
            eyebrow={messages.skills.eyebrow}
            heading={messages.skills.heading}
            subtitle={messages.skills.subtitle}
            headingId="skills-heading"
          />
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {groupedSkills.map((group, idx) => (
            <Reveal key={group.category} variant="fade-up" delay={idx * 80} className="h-full">
              <Card
                variant={group.isPrimary ? "elevated" : "default"}
                padding="md"
                interactive
                className={cn("group flex h-full flex-col gap-4", group.style.topAccentClass)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105",
                        group.style.iconContainerClass,
                      )}
                    >
                      {group.style.icon}
                    </span>
                    <Typography variant="h3">{group.label}</Typography>
                  </div>
                  <span className="text-caption border-border-subtle bg-bg-secondary text-text-muted rounded-md border px-2 py-0.5 font-mono">
                    {group.items.length}
                  </span>
                </div>

                <ul className="flex flex-wrap gap-2" aria-label={group.label}>
                  {group.items.map((skill) => (
                    <li key={skill.name}>
                      <Badge
                        variant={group.isPrimary ? "accent" : "neutral"}
                        interactive
                        className="px-3 py-1 text-[0.8125rem]"
                      >
                        {skill.name}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ))}
        </div>

        {healthcareGlossary.length > 0 && (
          <Reveal variant="fade-up" delay={140}>
            <Card variant="muted" padding="md" className="mt-6 space-y-3">
              <div className="space-y-1">
                <Typography variant="h3" as="h3">
                  {messages.skills.glossaryHeading}
                </Typography>
                <Typography variant="small" tone="muted">
                  {messages.skills.glossaryDescription}
                </Typography>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {healthcareGlossary.map((term) => (
                  <div
                    key={term.abbr}
                    className="border-border-subtle bg-bg-primary hover:border-accent-primary/40 rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:hover:translate-y-0"
                  >
                    <dt className="text-small text-accent-primary font-mono font-semibold">
                      {term.abbr}
                    </dt>
                    <dd className="text-small text-text-secondary mt-1">{term.meaning}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Reveal>
        )}
      </Container>
    </Section>
  );
}
