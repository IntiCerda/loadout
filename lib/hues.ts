import type { Category } from './types'

/**
 * One accent hue per category, used everywhere a category needs a colour: the
 * rail's active edge and count, the provider chips' active state, and the
 * hairline / hover glow on each item card. All Tailwind 400-level shades
 * (500 for the brand green): every one measures at least 4.5:1 on the darkest
 * surface it renders text on (`--primary`, #1e293b), so a count or a chip
 * label in its category hue still passes WCAG AA.
 */
export const CATEGORY_HUES: Record<Category, string> = {
  languages: '#22c55e', // green — the brand accent
  editors: '#38bdf8', // sky
  tools: '#a78bfa', // violet
  containers: '#fbbf24', // amber
  'ai-apps': '#fb7185', // rose
  'ai-models': '#22d3ee', // cyan
  extensions: '#a3e635', // lime
  fonts: '#e879f9', // fuchsia
  linux: '#fb923c', // orange
}

/**
 * Hue for a category id that may also be the `ALL` sentinel or anything a
 * hand-edited URL produced. Unknown ids get the brand accent, so the UI never
 * renders `var(--cat)` as empty (which would paint transparent).
 */
export function categoryHue(category: string): string {
  return CATEGORY_HUES[category as Category] ?? CATEGORY_HUES.languages
}
