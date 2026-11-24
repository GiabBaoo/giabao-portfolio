import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

export type SectionSpacing = "sm" | "md" | "lg";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  spacing?: SectionSpacing;
  children: ReactNode;
}

const spacingClasses: Record<SectionSpacing, string> = {
  sm: "py-8 sm:py-10",
  md: "py-12 sm:py-16",
  lg: "py-16 sm:py-22",
};

export function Section({ spacing = "md", className, children, ...rest }: SectionProps) {
  return (
    <section className={cn("w-full", spacingClasses[spacing], className)} {...rest}>
      {children}
    </section>
  );
}
