import type { ReactNode } from "react";
import { useI18n } from "../../app/providers/i18n-context.ts";
import { useTheme, type ThemePreference } from "../../app/providers/theme-context.ts";
import { cn } from "../../lib/cn.ts";

interface ThemeOption {
  readonly value: ThemePreference;
  readonly icon: ReactNode;
}

const themeOptions: readonly ThemeOption[] = [
  {
    value: "light",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
  },
  {
    value: "dark",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    ),
  },
  {
    value: "system",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8m-4-4v4" />
      </svg>
    ),
  },
];

export interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { messages } = useI18n();

  const labelMap: Record<ThemePreference, string> = {
    light: messages.theme.light,
    dark: messages.theme.dark,
    system: messages.theme.system,
  };

  return (
    <div
      role="group"
      aria-label={messages.theme.groupLabel}
      className={cn(
        "border-border-subtle bg-surface-primary inline-flex items-center rounded-lg border p-0.5",
        className,
      )}
    >
      {themeOptions.map((option) => {
        const isActive = theme === option.value;
        const label = labelMap[option.value];
        return (
          <button
            key={option.value}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "text-caption inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-md px-2 font-medium transition-all duration-200 active:scale-95",
              "focus-visible:outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-1",
              isActive
                ? "bg-accent-primary text-accent-contrast shadow-sm"
                : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
            )}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
