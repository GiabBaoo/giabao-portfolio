import { useI18n } from "../../app/providers/i18n-context.ts";
import { SUPPORTED_LOCALES, type Locale } from "../../i18n/index.ts";
import { cn } from "../../lib/cn.ts";

export interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, messages, switchLocale } = useI18n();

  const ariaLabelByLocale: Record<Locale, string> = {
    en: messages.language.switchToEn,
    vi: messages.language.switchToVi,
  };

  return (
    <div
      role="group"
      aria-label={messages.language.groupLabel}
      className={cn(
        "border-border-subtle bg-surface-primary inline-flex items-center rounded-lg border p-0.5",
        className,
      )}
    >
      {SUPPORTED_LOCALES.map((item) => {
        const isActive = locale === item;
        return (
          <button
            key={item}
            type="button"
            aria-label={ariaLabelByLocale[item]}
            aria-pressed={isActive}
            onClick={() => switchLocale(item)}
            className={cn(
              "text-caption inline-flex min-h-9 min-w-10 cursor-pointer items-center justify-center rounded-md px-2.5 font-semibold uppercase transition-all duration-200 active:scale-95",
              "focus-visible:outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-1",
              isActive
                ? "bg-accent-primary text-accent-contrast shadow-sm"
                : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
