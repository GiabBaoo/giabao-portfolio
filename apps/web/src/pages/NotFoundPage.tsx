import { Link } from "react-router";
import { useI18n } from "../app/providers/i18n-context.ts";
import { Badge, Card, Container, Section, Typography } from "../components/ui/index.ts";

export function NotFoundPage() {
  const { locale, messages } = useI18n();

  return (
    <Section spacing="lg">
      <Container size="sm">
        <Card variant="elevated" padding="lg" className="text-center">
          <Badge variant="accent">{messages.notFound.badge}</Badge>
          <Typography variant="h1" className="mt-4">
            {messages.notFound.title}
          </Typography>
          <Typography variant="body" tone="secondary" className="mt-3">
            {messages.notFound.description}
          </Typography>
          <div className="mt-6">
            <Link
              to={`/${locale}`}
              className="bg-accent-primary text-small text-accent-contrast hover:bg-accent-hover inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 font-medium transition-colors"
            >
              {messages.notFound.backHome}
            </Link>
          </div>
        </Card>
      </Container>
    </Section>
  );
}
