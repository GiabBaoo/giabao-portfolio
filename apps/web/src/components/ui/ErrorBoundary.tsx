import { Component, type ReactNode } from "react";
import { dictionaries, isLocale, type Locale } from "../../i18n/index.ts";
import {
  attemptOneTimeChunkReload,
  clearChunkReloadFlag,
  isChunkLoadError,
} from "../../lib/chunk-error.ts";
import { Badge } from "./Badge.tsx";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { Container } from "./Container.tsx";
import { Section } from "./Section.tsx";
import { Typography } from "./Typography.tsx";

export interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  isChunkError: boolean;
}

function detectDocumentLocale(): Locale {
  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang?.toLowerCase();
    if (isLocale(lang)) {
      return lang;
    }
  }
  return "en";
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    isChunkError: false,
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: unknown): void {
    if (isChunkLoadError(error)) {
      attemptOneTimeChunkReload();
    }
  }

  private handleReload = () => {
    clearChunkReloadFlag();
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const locale = detectDocumentLocale();
    const messages = dictionaries[locale];

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
                {this.state.isChunkError
                  ? messages.errorBoundary.chunkErrorDescription
                  : messages.errorBoundary.description}
              </Typography>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button variant="primary" size="md" onClick={this.handleReload}>
                  {messages.errorBoundary.reload}
                </Button>
                <a
                  href={`/${locale}`}
                  className="border-border-strong bg-surface-primary text-small text-text-primary hover:bg-surface-muted focus-visible:outline-focus-ring inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {messages.errorBoundary.backHome}
                </a>
              </div>
            </Card>
          </Container>
        </Section>
      </div>
    );
  }
}
