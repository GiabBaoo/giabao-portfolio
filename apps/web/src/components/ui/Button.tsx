import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-primary text-accent-contrast hover:bg-accent-hover hover:shadow-md border border-transparent shadow-sm",
  secondary:
    "bg-surface-primary text-text-primary hover:bg-surface-muted hover:border-border-strong border border-border-subtle",
  outline:
    "bg-transparent text-text-primary hover:bg-surface-primary hover:border-accent-primary/50 border border-border-strong",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-primary hover:text-text-primary border border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-small rounded-md gap-1.5",
  md: "min-h-11 px-4 py-2 text-small rounded-md gap-2",
  lg: "min-h-12 px-5 py-2.5 text-body rounded-lg gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "btn-hover-lift inline-flex cursor-pointer items-center justify-center font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out",
        "active:translate-y-0 active:scale-[0.98]",
        "focus-visible:outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
