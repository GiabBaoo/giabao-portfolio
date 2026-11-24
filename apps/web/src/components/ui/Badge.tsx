import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

export type BadgeVariant = "neutral" | "accent" | "outline" | "success" | "warning";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  interactive?: boolean;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-surface-muted text-text-secondary border border-border-subtle",
  accent: "bg-accent-soft text-accent-primary border border-accent-primary/25",
  outline: "bg-transparent text-text-secondary border border-border-strong",
  success: "bg-status-success-soft text-status-success border border-status-success/25",
  warning: "bg-status-warning-soft text-status-warning border border-status-warning/25",
};

export function Badge({
  variant = "neutral",
  interactive = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium transition-colors duration-150",
        variantClasses[variant],
        interactive && "badge-interactive",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
