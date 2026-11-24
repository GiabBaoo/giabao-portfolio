import { useEffect, useState } from "react";
import { useI18n } from "../../app/providers/i18n-context.ts";
import { cn } from "../../lib/cn.ts";
import { usePrefersReducedMotion } from "../../lib/usePrefersReducedMotion.ts";
import { Badge, Card } from "../ui/index.ts";
import { TerminalIcon } from "../ui/Icons.tsx";

interface SqlProfileWindowProps {
  readonly location: string;
}

type TokenKind = "keyword" | "identifier" | "string" | "punctuation" | "plain";

interface SqlToken {
  readonly text: string;
  readonly kind: TokenKind;
}

const SQL_LINES: readonly (readonly SqlToken[])[] = [
  [
    { text: "SELECT", kind: "keyword" },
    { text: " role, stack, location", kind: "identifier" },
  ],
  [
    { text: "FROM", kind: "keyword" },
    { text: " dbo.", kind: "punctuation" },
    { text: "DeveloperProfile", kind: "identifier" },
  ],
  [
    { text: "WHERE", kind: "keyword" },
    { text: " name ", kind: "identifier" },
    { text: "=", kind: "punctuation" },
    { text: " N'Nguyen Gia Bao'", kind: "string" },
    { text: ";", kind: "punctuation" },
  ],
];

interface IndexedToken extends SqlToken {
  readonly start: number;
  readonly end: number;
}

interface IndexedSqlLine {
  readonly lineNumber: number;
  readonly start: number;
  readonly end: number;
  readonly tokens: readonly IndexedToken[];
}

const INDEXED_SQL_LINES: readonly IndexedSqlLine[] = SQL_LINES.reduce<{
  offset: number;
  lines: IndexedSqlLine[];
}>(
  (acc, line, lineIdx) => {
    const builtLine = line.reduce<{ offset: number; tokens: IndexedToken[] }>(
      (lineAcc, token) => {
        const start = lineAcc.offset;
        const end = start + token.text.length;
        return {
          offset: end,
          tokens: [...lineAcc.tokens, { ...token, start, end }],
        };
      },
      { offset: acc.offset, tokens: [] },
    );

    return {
      offset: builtLine.offset,
      lines: [
        ...acc.lines,
        {
          lineNumber: lineIdx + 1,
          start: acc.offset,
          end: builtLine.offset,
          tokens: builtLine.tokens,
        },
      ],
    };
  },
  { offset: 0, lines: [] },
).lines;

const TOTAL_CHARS = INDEXED_SQL_LINES[INDEXED_SQL_LINES.length - 1]?.end ?? 0;

const TOKEN_CLASSES: Record<TokenKind, string> = {
  keyword: "text-blue-600 dark:text-sky-400 font-semibold",
  identifier: "text-slate-800 dark:text-slate-100",
  string: "text-emerald-700 dark:text-emerald-400",
  punctuation: "text-slate-500 dark:text-slate-400",
  plain: "text-slate-700 dark:text-slate-200",
};

export function SqlProfileWindow({ location }: SqlProfileWindowProps) {
  const { messages } = useI18n();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [typedCount, setTypedCount] = useState<number>(() =>
    prefersReducedMotion ? TOTAL_CHARS : 0,
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    let intervalId: number | undefined;

    const startTimeout = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setTypedCount((prev) => {
          if (prev >= TOTAL_CHARS) {
            if (intervalId !== undefined) {
              window.clearInterval(intervalId);
            }
            return prev;
          }
          return prev + 1;
        });
      }, 20);
    }, 180);

    return () => {
      window.clearTimeout(startTimeout);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [prefersReducedMotion]);

  const effectiveTypedCount = prefersReducedMotion ? TOTAL_CHARS : typedCount;

  const renderedLines = INDEXED_SQL_LINES.map((line, lineIdx) => {
    const slicedTokens = line.tokens.map((token, tokenIdx) => {
      const visibleLength = Math.max(
        0,
        Math.min(token.text.length, effectiveTypedCount - token.start),
      );
      return {
        key: `${lineIdx}-${tokenIdx}`,
        kind: token.kind,
        text: token.text.slice(0, visibleLength),
      };
    });

    const isActiveLine =
      (effectiveTypedCount > line.start && effectiveTypedCount < line.end) ||
      (lineIdx === 0 && effectiveTypedCount === 0) ||
      (lineIdx === INDEXED_SQL_LINES.length - 1 && effectiveTypedCount >= TOTAL_CHARS);

    const isRevealed = prefersReducedMotion || effectiveTypedCount > line.start || lineIdx === 0;

    return { lineNumber: line.lineNumber, tokens: slicedTokens, isActiveLine, isRevealed };
  });

  const isTyping = !prefersReducedMotion && effectiveTypedCount < TOTAL_CHARS;

  return (
    <div className="relative">
      {/* Subtle ambient glow behind editor window */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-[radial-gradient(circle_at_50%_45%,var(--glow-accent),transparent_70%)] blur-2xl"
      />

      <Card
        variant="elevated"
        padding="none"
        interactive
        className="border-border-subtle/90 bg-surface-elevated/95 relative overflow-hidden"
      >
        {/* Soft top border highlight */}
        <div
          aria-hidden="true"
          className="via-accent-primary/40 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
        />

        {/* Terminal / Code Editor Chrome */}
        <div className="border-border-subtle bg-bg-secondary/95 flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80 dark:bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80 dark:bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 dark:bg-emerald-400/70" />
            </div>
            <div className="text-caption text-text-secondary flex items-center gap-1.5 font-mono font-medium">
              <TerminalIcon className="text-accent-primary h-3.5 w-3.5" />
              <span>{messages.hero.snapshotTitle}</span>
            </div>
          </div>

          <Badge variant="outline" className="font-mono text-[0.7rem]">
            TSQL / Backend
          </Badge>
        </div>

        {/* Decorative Syntax-Highlighted SQL Block */}
        <div
          role="region"
          aria-label={messages.hero.decorativeQueryLabel}
          className="border-border-subtle bg-surface-primary/70 border-b px-4 py-3.5 font-mono text-[0.8rem] leading-6 sm:px-5"
        >
          <div className="min-h-[4.5rem] space-y-0.5">
            {renderedLines.map((line) => (
              <div
                key={line.lineNumber}
                className={cn(
                  "-mx-1 flex items-baseline gap-3 rounded-xs px-1 transition-colors duration-200",
                  line.isRevealed && !prefersReducedMotion && "animate-sql-line",
                  isTyping && line.isActiveLine && "bg-accent-primary/[0.06]",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "w-4 shrink-0 text-right text-[0.7rem] transition-colors duration-200 select-none",
                    line.isActiveLine ? "text-accent-primary/80" : "text-text-muted/60",
                  )}
                >
                  {line.lineNumber}
                </span>
                <code className="break-words whitespace-pre-wrap">
                  {line.tokens.map((token) =>
                    token.text ? (
                      <span key={token.key} className={TOKEN_CLASSES[token.kind]}>
                        {token.text}
                      </span>
                    ) : null,
                  )}
                  {line.isActiveLine && (
                    <span
                      aria-hidden="true"
                      className="bg-accent-primary animate-cursor-blink ml-0.5 inline-block h-3.5 w-1.5 align-middle"
                    />
                  )}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Profile Result Set (Always immediately readable) */}
        <dl className="divide-border-subtle divide-y p-5 sm:p-6">
          <div className="pb-3.5">
            <dt className="text-caption text-text-muted font-mono uppercase">
              {messages.hero.snapshotRoleLabel}
            </dt>
            <dd className="text-small text-text-primary mt-1 font-medium">
              {messages.hero.snapshotRoleValue}
            </dd>
          </div>

          <div className="py-3.5">
            <dt className="text-caption text-text-muted font-mono uppercase">
              {messages.hero.snapshotUniversityLabel}
            </dt>
            <dd className="text-small text-text-primary mt-1 font-medium">
              {messages.hero.snapshotUniversityValue}
            </dd>
          </div>

          <div className="py-3.5">
            <dt className="text-caption text-text-muted font-mono uppercase">
              {messages.hero.snapshotPrimaryStackLabel}
            </dt>
            <dd className="text-small text-accent-primary mt-1 font-mono">
              {messages.hero.snapshotPrimaryStackValue}
            </dd>
          </div>

          <div className="pt-3.5">
            <dt className="text-caption text-text-muted font-mono uppercase">
              {messages.hero.snapshotLocationLabel}
            </dt>
            <dd className="text-small text-text-secondary mt-1">{location}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
