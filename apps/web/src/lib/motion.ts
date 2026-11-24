/**
 * Shared Motion Design System timing & stagger constants (Apple / Linear balanced).
 * Keeps component animation delays consistent and easy to maintain.
 */
export const MOTION_TIMING = {
  fast: 150,
  normal: 200,
  medium: 300,
  reveal: 520,
} as const;

export const MOTION_STAGGER = {
  tight: 45,
  normal: 75,
  relaxed: 95,
} as const;

export const HERO_DELAYS = {
  eyebrow: 0,
  name: 60,
  title: 130,
  summary: 195,
  highlights: 250,
  cta: 320,
  social: 380,
  panel: 170,
} as const;

/**
 * Computes a capped stagger delay in milliseconds so long lists never feel sluggish.
 */
export function staggerDelay(
  index: number,
  step: number = MOTION_STAGGER.normal,
  base: number = 0,
  maxDelay: number = 420,
): number {
  return Math.min(base + index * step, maxDelay);
}
