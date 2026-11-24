import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";
import { useInViewOnce } from "../../lib/useInViewOnce.ts";

export type RevealVariant = "fade-up" | "fade" | "scale-up";

export interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  variant?: RevealVariant;
  delay?: number;
  children: ReactNode;
}

export function Reveal({
  variant = "fade-up",
  delay = 0,
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>();

  const mergedStyle: CSSProperties =
    delay > 0 && isInView ? { ...style, transitionDelay: `${delay}ms` } : { ...style };

  return (
    <div
      ref={ref}
      data-reveal-variant={variant}
      data-reveal-state={isInView ? "visible" : "hidden"}
      className={cn("reveal-element", className)}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </div>
  );
}
