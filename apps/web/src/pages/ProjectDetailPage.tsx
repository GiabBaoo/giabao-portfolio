import { Link, useParams } from "react-router";
import { useI18n } from "../app/providers/i18n-context.ts";
import { ProjectMockup } from "../components/sections/ProjectMockup.tsx";
import { Badge, Card, Container, Section, Typography } from "../components/ui/index.ts";
import { ExternalLinkIcon, GitHubIcon } from "../components/ui/Icons.tsx";
import { getPortfolioContent } from "../content/index.ts";

export function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { locale, messages } = useI18n();
  const content = getPortfolioContent(locale);
  const project = content.projects.find((item) => item.slug === slug);

  if (!project) {
    return (
      <Section spacing="lg">
        <Container size="sm">
          <Card variant="elevated" padding="lg" className="text-center">
            <Badge variant="accent">404</Badge>
            <Typography variant="h1" className="mt-4">
              {messages.projects.notFoundTitle}
            </Typography>
            <Typography variant="body" tone="secondary" className="mt-3">
              {messages.projects.notFoundDescription}
            </Typography>
            <div className="mt-6">
              <Link
                to={`/${locale}#projects`}
                className="bg-accent-primary text-small text-accent-contrast hover:bg-accent-hover focus-visible:outline-focus-ring inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {messages.projects.backToProjects}
              </Link>
            </div>
          </Card>
        </Container>
      </Section>
    );
  }

  const hasLinks = Boolean(project.repositoryUrl || project.demoUrl);

  return (
    <Section spacing="md">
      <Container size="lg" className="space-y-8">
        <div>
          <Link
            to={`/${locale}#projects`}
            className="text-small text-text-secondary hover:text-accent-primary focus-visible:outline-focus-ring inline-flex min-h-10 items-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span aria-hidden="true">←</span>
            <span>{messages.projects.backToProjects}</span>
          </Link>
        </div>

        <Card variant="elevated" padding="none" className="overflow-hidden">
          {project.imageUrl ? (
            <div className="border-border-subtle bg-bg-secondary aspect-video w-full overflow-hidden border-b">
              <img
                src={project.imageUrl}
                alt={project.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <ProjectMockup slug={project.slug} badgeLabel={messages.projects.mockupBadge} />
          )}

          <div className="space-y-6 p-6 sm:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Typography variant="h1">{project.name}</Typography>
                {project.projectType && (
                  <Badge variant="accent">
                    {project.projectType === "personal"
                      ? messages.projects.typePersonal
                      : messages.projects.typeAcademic}
                  </Badge>
                )}
              </div>

              <Typography variant="body" tone="secondary">
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

            <div className="space-y-2.5">
              <Typography variant="caption" tone="muted" as="h2" className="font-mono">
                {messages.projects.keyFeaturesLabel}
              </Typography>
              <ul className="text-body text-text-secondary space-y-2">
                {project.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="bg-accent-primary mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2.5">
              <Typography variant="caption" tone="muted" as="h2" className="font-mono">
                {messages.projects.technologiesLabel}
              </Typography>
              <ul
                className="flex flex-wrap gap-2"
                aria-label={`${project.name} ${messages.projects.technologiesLabel}`}
              >
                {project.technologies.map((tech) => (
                  <li key={tech}>
                    <Badge variant="neutral" className="font-mono">
                      {tech}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-border-subtle border-t pt-5">
              {hasLinks ? (
                <div className="flex flex-wrap items-center gap-3">
                  {project.repositoryUrl && (
                    <a
                      href={project.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-hover-lift border-border-strong bg-surface-primary text-small text-text-primary hover:bg-surface-muted hover:border-accent-primary/50 inline-flex min-h-11 items-center gap-2 rounded-md border px-4 py-2 font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200"
                    >
                      <GitHubIcon className="h-4 w-4" />
                      <span>{messages.projects.viewGithub}</span>
                    </a>
                  )}
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-hover-lift bg-accent-primary text-small text-accent-contrast hover:bg-accent-hover inline-flex min-h-11 items-center gap-2 rounded-md px-4 py-2 font-medium shadow-sm transition-[color,background-color,border-color,box-shadow,transform] duration-200"
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                      <span>{messages.projects.viewDemo}</span>
                    </a>
                  )}
                </div>
              ) : (
                <Typography variant="small" tone="muted" as="p">
                  {messages.projects.linksPendingNote}
                </Typography>
              )}
            </div>
          </div>
        </Card>
      </Container>
    </Section>
  );
}

export default ProjectDetailPage;
