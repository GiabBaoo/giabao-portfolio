import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

export type IconButtonVariant = "ghost" | "outline" | "secondary";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  children: ReactNode;
}

const variantClasses: Record<IconButtonVariant, string> = {
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-primary hover:text-text-primary border border-transparent",
  outline: "bg-transparent text-text-primary hover:bg-surface-primary border border-border-strong",
  secondary:
    "bg-surface-primary text-text-primary hover:bg-surface-muted border border-border-subtle",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "h-9 w-9 rounded-md",
  md: "h-11 w-11 rounded-md",
  lg: "h-12 w-12 rounded-lg",
};

export function IconButton({
  variant = "ghost",
  size = "md",
  type = "button",
  className,
  disabled,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out",
        "active:scale-95",
        "focus-visible:outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
