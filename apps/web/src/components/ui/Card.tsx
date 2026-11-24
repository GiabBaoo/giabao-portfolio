import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

export type CardVariant = "default" | "elevated" | "muted";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  children: ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-surface-primary border border-border-subtle shadow-sm",
  elevated: "bg-surface-elevated border border-border-subtle shadow-md",
  muted: "bg-surface-muted/60 border border-border-subtle",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Card({
  variant = "default",
  padding = "md",
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl transition-[border-color,box-shadow,background-color] duration-200",
        variantClasses[variant],
        paddingClasses[padding],
        interactive && "card-interactive",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
