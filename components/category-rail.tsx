"use client";

import type { CSSProperties } from "react";
import {
  Bot,
  Braces,
  Brain,
  Container,
  LayoutGrid,
  PenTool,
  Puzzle,
  Terminal,
  Type,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CategoryEntry } from "@/lib/filter";
import { categoryHue } from "@/lib/hues";

/**
 * One icon per rail entry, keyed by the same ids `categoryEntries` emits
 * (categories plus the `all` sentinel). The icon is what makes the category
 * hue visible at rest — a coloured left edge only shows on the active entry,
 * so without these the rail is a monochrome text list.
 */
const ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  languages: Braces,
  editors: PenTool,
  tools: Wrench,
  containers: Container,
  "ai-apps": Bot,
  "ai-models": Brain,
  extensions: Puzzle,
  fonts: Type,
  linux: Terminal,
};

type Props = {
  entries: CategoryEntry[];
  selected: string;
  onSelect: (id: string) => void;
};

/**
 * Categories as a filter rather than as headings you scroll past. A fixed
 * column of the app shell on a wide screen so the whole catalog stays one
 * click away; a horizontal scroller below `lg`, where a 216px column would
 * eat the grid.
 */
export function CategoryRail({ entries, selected, onSelect }: Props) {
  return (
    <nav
      aria-label="Categories"
      // A full-height column of the fixed shell at `lg`, scrolling itself in
      // the rare viewport too short for nine entries. Below `lg` it is a
      // horizontal scroller in normal flow.
      className="min-w-0 lg:min-h-0 lg:overflow-y-auto"
    >
      <h2 className="text-muted-foreground mb-2 px-3 font-mono text-xs tracking-widest uppercase">
        Categories
      </h2>

      {/* `overflow-x-auto` also gives this box an automatic minimum size of
          zero, so the row scrolls itself instead of widening the page. */}
      <div className="flex gap-1 overflow-x-auto p-1 pr-10 max-lg:[mask-image:linear-gradient(90deg,black_calc(100%-40px),transparent)] lg:flex-col lg:overflow-visible lg:p-0 lg:pr-0">
        {entries.map((entry) => {
          const active = entry.id === selected;
          const Icon = ICONS[entry.id] ?? LayoutGrid;

          return (
            <button
              key={entry.id}
              type="button"
              // Not `aria-pressed`: these are mutually exclusive views of one
              // list, and only one is ever current.
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(entry.id)}
              // `--cat` is this entry's own hue: the edge, icon and count take
              // the category's colour, not the brand green.
              style={{ "--cat": categoryHue(entry.id) } as CSSProperties}
              className={`flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2.5 rounded-lg
                border-l-2 px-3 text-sm transition-colors duration-[180ms]
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
                lg:w-full
                ${
                  active
                    ? "border-l-[var(--cat)] bg-[color-mix(in_srgb,var(--cat)_10%,var(--primary))] text-foreground"
                    : "border-l-transparent text-foreground/80 hover:bg-[color-mix(in_srgb,var(--cat)_7%,transparent)]"
                }`}
            >
              <Icon
                aria-hidden
                className={`size-4 shrink-0 transition-colors duration-[180ms] ${
                  active ? "text-[var(--cat)]" : "text-foreground/50"
                }`}
              />
              <span className="grow text-left whitespace-nowrap">
                {entry.label}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-xs tabular-nums ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--cat)_18%,transparent)] text-[var(--cat)]"
                    : "text-foreground/60"
                }`}
              >
                {entry.count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
