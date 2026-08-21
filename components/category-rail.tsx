"use client";

import type { CategoryEntry } from "@/lib/filter";

type Props = {
  entries: CategoryEntry[];
  selected: string;
  onSelect: (id: string) => void;
};

/**
 * Categories as a filter rather than as headings you scroll past. Sticky on a
 * wide screen so the whole catalog stays one click away; a horizontal scroller
 * below `lg`, where a 216px column would eat the grid.
 */
export function CategoryRail({ entries, selected, onSelect }: Props) {
  return (
    <nav
      aria-label="Categories"
      // `--band-h` is the live height of the sticky band above the grid,
      // published by a ResizeObserver in `app/page.tsx`. Sticking to a constant
      // would hide this rail behind the band whenever the script panel or a
      // pack preview makes it taller.
      className="min-w-0 lg:sticky lg:top-[var(--band-h)]"
    >
      <h2 className="text-muted-foreground mb-2 px-3 font-mono text-xs tracking-widest uppercase">
        Categories
      </h2>

      {/* `overflow-x-auto` also gives this box an automatic minimum size of
          zero, so the row scrolls itself instead of widening the page. */}
      <div className="flex gap-1 overflow-x-auto p-1 lg:flex-col lg:overflow-visible lg:p-0">
        {entries.map((entry) => {
          const active = entry.id === selected;

          return (
            <button
              key={entry.id}
              type="button"
              // Not `aria-pressed`: these are mutually exclusive views of one
              // list, and only one is ever current.
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(entry.id)}
              className={`flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2.5 rounded-lg
                border-l-2 px-3 text-sm transition-colors duration-[180ms]
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
                lg:w-full
                ${
                  active
                    ? "border-l-accent bg-primary text-foreground"
                    : "border-l-transparent text-foreground/80 hover:bg-primary/60"
                }`}
            >
              <span className="grow text-left whitespace-nowrap">
                {entry.label}
              </span>
              <span
                className={`font-mono text-xs ${active ? "text-accent" : "text-foreground/60"}`}
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
