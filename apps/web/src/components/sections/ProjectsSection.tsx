import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useI18n } from "../../app/providers/i18n-context.ts";
import type { Project, ProjectType } from "../../content/index.ts";
import { cn } from "../../lib/cn.ts";
import { Badge, Card, Container, Reveal, Section, SectionHeader, Typography } from "../ui/index.ts";
import { ExternalLinkIcon, GitHubIcon } from "../ui/Icons.tsx";
import { ProjectMockup } from "./ProjectMockup.tsx";

export type ProjectFilterValue = "all" | Exclude<ProjectType, null>;

interface ProjectsSectionProps {
  projects: readonly Project[];
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  const { locale, messages } = useI18n();
  const [activeFilter, setActiveFilter] = useState<ProjectFilterValue>("all");

  const availableFilters = useMemo(() => {
    const personalCount = projects.filter((p) => p.projectType === "personal").length;
    const academicCount = projects.filter((p) => p.projectType === "academic").length;

    const options: Array<{ value: ProjectFilterValue; label: string; count: number }> = [
      { value: "all", label: messages.projects.filterAll, count: projects.length },
    ];

    if (personalCount > 0) {
      options.push({
        value: "personal",
        label: messages.projects.filterPersonal,
        count: personalCount,
      });
    }

    if (academicCount > 0) {
      options.push({
        value: "academic",
        label: messages.projects.filterAcademic,
        count: academicCount,
      });
    }

    return options;
  }, [
    messages.projects.filterAcademic,
    messages.projects.filterAll,
    messages.projects.filterPersonal,
    projects,
  ]);

  const effectiveFilter = availableFilters.some((opt) => opt.value === activeFilter)
    ? activeFilter
    : "all";

  const filteredProjects = useMemo(() => {
    if (effectiveFilter === "all") {
      return projects;
    }
    return projects.filter((project) => project.projectType === effectiveFilter);
  }, [effectiveFilter, projects]);

  const showFilterBar = availableFilters.length > 1;

  return (
    <Section
      id="projects"
      spacing="md"
      aria-labelledby="projects-heading"
      className="section-surface-projects border-border-subtle scroll-mt-20 border-y"
    >
      <Container size="xl">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              eyebrow={messages.projects.eyebrow}
              heading={messages.projects.heading}
              subtitle={messages.projects.subtitle}
              headingId="projects-heading"
            />

            {showFilterBar && (
              <div
                role="group"
                aria-label={messages.projects.filterGroupLabel}
                className="border-border-subtle bg-bg-primary mb-8 inline-flex w-fit items-center gap-1 rounded-lg border p-1 shadow-sm sm:mb-10"
              >
                {availableFilters.map((option) => {
                  const isSelected = effectiveFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setActiveFilter(option.value)}
                      className={cn(
                        "text-small inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all duration-200 active:scale-95",
                        "focus-visible:outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2",
                        isSelected
                          ? "bg-accent-primary text-accent-contrast shadow-sm"
                          : "text-text-secondary hover:bg-surface-primary hover:text-text-primary",
                      )}
                    >
                      <span>{option.label}</span>
                      <span className="text-caption font-mono opacity-80">({option.count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Reveal>

        {filteredProjects.length === 0 ? (
          <Card variant="default" padding="lg" className="text-center">
            <Typography variant="body" tone="muted">
              {messages.projects.emptyFilterState}
            </Typography>
          </Card>
        ) : (
          <div
            key={effectiveFilter}
            className="animate-filter-enter grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredProjects.map((project, idx) => {
              const hasLinks = Boolean(project.repositoryUrl || project.demoUrl);
              return (
                <Reveal key={project.id} variant="fade-up" delay={idx * 75} className="h-full">
                  <Card
                    variant="elevated"
                    padding="none"
                    interactive
                    className="group flex h-full flex-col overflow-hidden"
                  >
                    {project.imageUrl ? (
                      <div className="border-border-subtle bg-bg-secondary aspect-video w-full overflow-hidden border-b">
                        <img
                          src={project.imageUrl}
                          alt={project.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]"
                        />
                      </div>
                    ) : (
                      <ProjectMockup
                        slug={project.slug}
                        badgeLabel={messages.projects.mockupBadge}
                      />
                    )}

                    <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <Typography
                            variant="h3"
                            as="h3"
                            className="group-hover:text-accent-primary transition-colors duration-200"
                          >
                            {project.name}
                          </Typography>
                          {project.projectType && (
                            <Badge variant="accent">
                              {project.projectType === "personal"
                                ? messages.projects.typePersonal
                                : messages.projects.typeAcademic}
                            </Badge>
                          )}
                        </div>

                        <Typography variant="small" tone="secondary">
                          {project.description}
                        </Typography>

                        {project.role && (
                          <Typography variant="small" tone="muted">
                            <span className="text-text-primary font-medium">
                              {messages.projects.roleLabel}:
                            </span>{" "}
                            {project.role}
                          </Typography>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Typography variant="caption" tone="muted" as="p" className="font-mono">
                          {messages.projects.keyFeaturesLabel}
                        </Typography>
                        <ul className="text-small text-text-secondary space-y-1.5">
                          {project.features.map((feature, featureIdx) => (
                            <li key={featureIdx} className="flex items-start gap-2">
                              <span
                                aria-hidden="true"
                                className="bg-accent-primary mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                              />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-auto space-y-4 pt-2">
                        <div className="space-y-2">
                          <Typography variant="caption" tone="muted" as="p" className="font-mono">
                            {messages.projects.technologiesLabel}
                          </Typography>
                          <ul
                            className="flex flex-wrap gap-1.5"
                            aria-label={`${project.name} ${messages.projects.technologiesLabel}`}
                          >
                            {project.technologies.map((tech) => (
                              <li key={tech}>
                                <Badge variant="neutral" interactive className="font-mono">
                                  {tech}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="border-border-subtle space-y-3 border-t pt-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/${locale}/projects/${project.slug}`}
                              className="btn-hover-lift border-border-strong bg-surface-primary text-small text-text-primary hover:bg-surface-muted hover:border-accent-primary/50 focus-visible:outline-focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
                            >
                              <span>{messages.projects.viewDetails}</span>
                            </Link>
                            {hasLinks && project.repositoryUrl && (
                              <a
                                href={project.repositoryUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-hover-lift border-border-strong bg-surface-primary text-small text-text-primary hover:bg-surface-muted hover:border-accent-primary/50 inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.98]"
                              >
                                <GitHubIcon className="h-4 w-4" />
                                <span>{messages.projects.viewGithub}</span>
                              </a>
                            )}
                            {hasLinks && project.demoUrl && (
                              <a
                                href={project.demoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/btn btn-hover-lift bg-accent-primary text-small text-accent-contrast hover:bg-accent-hover inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 font-medium shadow-sm transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:shadow-md active:scale-[0.98]"
                              >
                                <ExternalLinkIcon className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                                <span>{messages.projects.viewDemo}</span>
                              </a>
                            )}
                          </div>
                          {!hasLinks && (
                            <Typography
                              variant="caption"
                              tone="muted"
                              as="p"
                              className="normal-case"
                            >
                              {messages.projects.linksPendingNote}
                            </Typography>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        )}
      </Container>
    </Section>
  );
}
