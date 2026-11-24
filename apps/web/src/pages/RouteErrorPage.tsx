import { useEffect } from "react";
import { Link, useParams, useRouteError } from "react-router";
import { Badge, Button, Card, Container, Section, Typography } from "../components/ui/index.ts";
import { DEFAULT_LOCALE, dictionaries, isLocale } from "../i18n/index.ts";
import {
  attemptOneTimeChunkReload,
  clearChunkReloadFlag,
  isChunkLoadError,
} from "../lib/chunk-error.ts";

export function RouteErrorPage() {
  const error = useRouteError();
  const { locale: paramLocale } = useParams<{ locale?: string }>();
  const locale = isLocale(paramLocale) ? paramLocale : DEFAULT_LOCALE;
  const messages = dictionaries[locale];
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (chunkError) {
      attemptOneTimeChunkReload();
    }
  }, [chunkError]);

  const handleReload = () => {
    clearChunkReloadFlag();
    window.location.reload();
  };

  return (
    <div className="bg-bg-primary text-text-primary flex min-h-dvh items-center justify-center">
      <Section spacing="lg" className="w-full">
        <Container size="sm">
          <Card variant="elevated" padding="lg" className="text-center" role="alert">
            <Badge variant="accent">{messages.errorBoundary.badge}</Badge>
            <Typography variant="h1" className="mt-4">
              {messages.errorBoundary.title}
            </Typography>
            <Typography variant="body" tone="secondary" className="mt-3">
              {chunkError
                ? messages.errorBoundary.chunkErrorDescription
                : messages.errorBoundary.description}
            </Typography>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button variant="primary" size="md" onClick={handleReload}>
                {messages.errorBoundary.reload}
              </Button>
              <Link
                to={`/${locale}`}
                className="border-border-strong bg-surface-primary text-small text-text-primary hover:bg-surface-muted focus-visible:outline-focus-ring inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {messages.errorBoundary.backHome}
              </Link>
            </div>
          </Card>
        </Container>
      </Section>
    </div>
  );
}
