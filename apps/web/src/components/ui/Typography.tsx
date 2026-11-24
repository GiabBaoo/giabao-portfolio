import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

export type TypographyVariant =
  "display" | "h1" | "h2" | "h3" | "body" | "small" | "caption" | "code";

export type TypographyTone = "primary" | "secondary" | "muted" | "accent";

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  tone?: TypographyTone;
  as?: ElementType;
  children: ReactNode;
}

const defaultTagByVariant: Record<TypographyVariant, ElementType> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "p",
  small: "p",
  caption: "span",
  code: "code",
};

const variantClasses: Record<TypographyVariant, string> = {
  display: "text-3xl sm:text-4xl lg:text-display font-bold tracking-tight",
  h1: "text-2xl sm:text-h1 font-bold tracking-tight",
  h2: "text-xl sm:text-h2 font-semibold tracking-tight",
  h3: "text-h3 font-semibold",
  body: "text-body font-normal",
  small: "text-small font-normal",
  caption: "text-caption font-medium uppercase tracking-wider",
  code: "font-mono text-code rounded-sm bg-surface-muted px-1.5 py-0.5",
};

const toneClasses: Record<TypographyTone, string> = {
  primary: "text-text-primary",
  secondary: "text-text-secondary",
  muted: "text-text-muted",
  accent: "text-accent-primary",
};

export function Typography({
  variant = "body",
  tone = "primary",
  as,
  className,
  children,
  ...rest
}: TypographyProps) {
  const Component = as ?? defaultTagByVariant[variant];
  return (
    <Component className={cn(variantClasses[variant], toneClasses[tone], className)} {...rest}>
      {children}
    </Component>
  );
}
