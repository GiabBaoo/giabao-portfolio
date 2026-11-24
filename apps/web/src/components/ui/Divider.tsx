import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn.ts";

export type DividerOrientation = "horizontal" | "vertical";

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: DividerOrientation;
}

export function Divider({ orientation = "horizontal", className, ...rest }: DividerProps) {
  if (orientation === "vertical") {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={cn("bg-border-subtle inline-block h-5 w-px shrink-0", className)}
        {...rest}
      />
    );
  }

  return (
    <hr
      aria-orientation="horizontal"
      className={cn("border-border-subtle w-full border-0 border-t", className)}
      {...rest}
    />
  );
}
