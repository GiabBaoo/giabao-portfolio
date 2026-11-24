import { Typography } from "./Typography.tsx";

interface SectionHeaderProps {
  eyebrow: string;
  heading: string;
  subtitle?: string;
  headingId?: string;
}

export function SectionHeader({ eyebrow, heading, subtitle, headingId }: SectionHeaderProps) {
  return (
    <div className="mb-8 max-w-2xl space-y-2.5 sm:mb-10">
      <Typography variant="caption" tone="accent" as="p" className="font-mono">
        {eyebrow}
      </Typography>
      <Typography variant="h2" id={headingId}>
        {heading}
      </Typography>
      {subtitle && (
        <Typography variant="body" tone="secondary">
          {subtitle}
        </Typography>
      )}
    </div>
  );
}
