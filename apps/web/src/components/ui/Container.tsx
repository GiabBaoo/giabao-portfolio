import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

export type ContainerSize = "sm" | "md" | "lg" | "xl";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  children: ReactNode;
}

const sizeClasses: Record<ContainerSize, string> = {
  sm: "max-w-[var(--container-sm)]",
  md: "max-w-[var(--container-md)]",
  lg: "max-w-[var(--container-lg)]",
  xl: "max-w-[var(--container-xl)]",
};

export function Container({ size = "lg", className, children, ...rest }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", sizeClasses[size], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
