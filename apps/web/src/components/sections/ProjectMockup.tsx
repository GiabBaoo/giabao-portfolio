import { cn } from "../../lib/cn.ts";

interface ProjectMockupProps {
  readonly slug: string;
  readonly badgeLabel: string;
}

interface MockupTheme {
  readonly gradientClass: string;
  readonly accentLineClass: string;
}

const MOCKUP_THEMES: Record<string, MockupTheme> = {
  "power-company-database": {
    gradientClass:
      "from-blue-950 via-slate-900 to-blue-900 dark:from-[#0b1933] dark:via-[#0f2244] dark:to-[#132c57]",
    accentLineClass: "text-sky-300",
  },
  "coffee-shop-ecommerce": {
    gradientClass:
      "from-indigo-950 via-slate-900 to-blue-950 dark:from-[#12183a] dark:via-[#142047] dark:to-[#0f2447]",
    accentLineClass: "text-indigo-300",
  },
  "mono-app": {
    gradientClass:
      "from-slate-900 via-blue-950 to-teal-950 dark:from-[#0d1c33] dark:via-[#0d253f] dark:to-[#0c2d3a]",
    accentLineClass: "text-teal-300",
  },
};

const DEFAULT_THEME: MockupTheme = {
  gradientClass:
    "from-slate-900 via-blue-950 to-slate-800 dark:from-[#0c182e] dark:via-[#112240] dark:to-[#162b4d]",
  accentLineClass: "text-sky-300",
};

function renderIllustration(slug: string) {
  if (slug === "power-company-database") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 pt-5 pb-4">
        <div className="grid w-full max-w-[230px] grid-cols-3 gap-2.5">
          {["R1", "R2", "R3"].map((region) => (
            <div
              key={region}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-400/10 p-2 backdrop-blur-xs"
            >
              <span className="font-mono text-[0.65rem] font-semibold text-sky-200">{region}</span>
              <div className="flex gap-1">
                <span className="h-2.5 w-2.5 rounded-xs border border-sky-300/60 bg-sky-400/40" />
                <span className="h-2.5 w-2.5 rounded-xs border border-sky-300/60 bg-sky-400/20" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex w-full max-w-[210px] items-center gap-1.5">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-400/60 to-sky-400/80" />
          <span className="rounded-full border border-sky-300/30 bg-slate-950/60 px-2 py-0.5 font-mono text-[0.625rem] text-sky-200">
            SHARDING · 3×2 NODES
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-sky-400/60 to-sky-400/80" />
        </div>
      </div>
    );
  }

  if (slug === "coffee-shop-ecommerce") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 px-6 pt-5 pb-4">
        <div className="flex w-full max-w-[235px] items-center justify-between gap-2">
          <div className="flex-1 rounded-lg border border-indigo-300/25 bg-indigo-400/10 px-2.5 py-2">
            <div className="h-1.5 w-10 rounded-full bg-indigo-300/60" />
            <div className="mt-1.5 h-1.5 w-14 rounded-full bg-white/25" />
            <span className="mt-2 block font-mono text-[0.6rem] text-indigo-200">ASP.NET API</span>
          </div>
          <span className="font-mono text-xs text-indigo-300/80">→</span>
          <div className="flex-1 rounded-lg border border-sky-300/25 bg-sky-400/10 px-2.5 py-2">
            <div className="h-1.5 w-12 rounded-full bg-sky-300/60" />
            <div className="mt-1.5 h-1.5 w-8 rounded-full bg-emerald-300/60" />
            <span className="mt-2 block font-mono text-[0.6rem] text-sky-200">VNPay · Report</span>
          </div>
        </div>
        <div className="flex w-full max-w-[235px] items-center justify-between rounded-md border border-white/10 bg-slate-950/45 px-2.5 py-1 font-mono text-[0.625rem] text-slate-300">
          <span>ORDER FLOW</span>
          <span className="text-emerald-300">SANDBOX READY</span>
        </div>
      </div>
    );
  }

  if (slug === "mono-app") {
    return (
      <div className="flex h-full w-full items-center justify-center gap-4 px-6 pt-5 pb-4">
        <div className="flex h-24 w-28 flex-col justify-end rounded-lg border border-teal-300/25 bg-slate-950/50 p-2.5">
          <div className="flex items-end justify-between gap-1.5">
            <span className="h-6 w-3 rounded-t-xs bg-sky-400/50" />
            <span className="h-11 w-3 rounded-t-xs bg-teal-400/75" />
            <span className="h-8 w-3 rounded-t-xs bg-sky-400/60" />
            <span className="h-14 w-3 rounded-t-xs bg-teal-300/85" />
            <span className="h-9 w-3 rounded-t-xs bg-sky-400/55" />
          </div>
          <span className="mt-1.5 font-mono text-[0.58rem] text-teal-200">ANALYTICS</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 rounded-md border border-teal-300/25 bg-teal-400/10 px-2.5 py-1.5">
            {[4, 10, 14, 8, 12, 5].map((height, idx) => (
              <span
                key={idx}
                className="w-1 rounded-full bg-teal-300/80"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
          <span className="font-mono text-[0.625rem] text-slate-300">VOICE · SQLITE</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-6 pt-5 pb-4">
      <div className="w-full max-w-[220px] space-y-2 rounded-lg border border-white/15 bg-slate-950/45 p-3 font-mono text-[0.65rem] text-sky-200">
        <div className="h-2 w-20 rounded-full bg-sky-300/60" />
        <div className="h-1.5 w-32 rounded-full bg-white/25" />
        <div className="h-1.5 w-24 rounded-full bg-white/20" />
      </div>
    </div>
  );
}

export function ProjectMockup({ slug, badgeLabel }: ProjectMockupProps) {
  const theme = MOCKUP_THEMES[slug] ?? DEFAULT_THEME;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "border-border-subtle relative aspect-[16/9] w-full overflow-hidden border-b bg-gradient-to-br",
        theme.gradientClass,
      )}
    >
      {/* Subtle architectural grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Zoomable illustration layer (pointer-capable hover only) */}
      <div className="relative z-10 h-full w-full transition-transform duration-300 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]">
        {renderIllustration(slug)}
      </div>

      {/* Explicit non-screenshot label */}
      <span
        className={cn(
          "absolute top-2.5 right-2.5 z-20 rounded-full border border-white/15 bg-slate-950/60 px-2 py-0.5 font-mono text-[0.65rem] backdrop-blur-xs",
          theme.accentLineClass,
        )}
      >
        {badgeLabel}
      </span>
    </div>
  );
}
