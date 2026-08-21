"use client";

import { Package } from "lucide-react";
import { packApplied } from "@/lib/filter";
import type { Pack } from "@/lib/types";

type Props = {
  packs: Pack[];
  /** Directly chosen ids only — not the resolved set, since a pack can only remove what it contributed. */
  selectedIds: Set<string>;
  /** Slug of the pack currently being previewed, or null. */
  previewing: string | null;
  onPreview: (slug: string) => void;
};

export function PackChips({
  packs,
  selectedIds,
  previewing,
  onPreview,
}: Props) {
  return (
    // One line that scrolls, not a wrapping block. This row is the top of a
    // sticky band, and a second row of chips costs 52px of every screen for
    // the whole session. `overflow-x-auto` also gives the box an automatic
    // minimum size of zero, so it scrolls itself instead of widening the page;
    // `p-1` keeps the focus rings from being clipped by that same overflow.
    <div
      // The mask fades the right edge out as a "there is more" cue for the
      // horizontal scroll; 40px of trailing padding keeps the last chip clear
      // of the fade once the row is scrolled to its end.
      className="flex gap-2 overflow-x-auto p-1 pr-10 [mask-image:linear-gradient(90deg,black_calc(100%-40px),transparent)]"
      role="group"
      aria-label="Starter packs"
    >
      {packs.map((pack) => {
        const applied = packApplied(pack.items, selectedIds);
        const active = pack.slug === previewing;

        return (
          <button
            key={pack.slug}
            type="button"
            title={pack.description}
            // Not `aria-pressed`. The chip no longer owns a binary state at
            // all: it opens a preview, and the green ring is derived from the
            // selection, so a pack lights up when the user ticks its items by
            // hand. `aria-current` says which preview is open, which is the
            // only state this button does own. The visible label stays inside
            // the accessible name, so WCAG 2.5.3 (label in name) still holds.
            aria-current={active ? "true" : undefined}
            aria-label={`Preview the ${pack.name} pack`}
            onClick={() => onPreview(pack.slug)}
            className={`flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-full border
              px-4 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
              ${
                active
                  ? "border-accent bg-accent text-accent-foreground shadow-[0_8px_20px_-8px_var(--accent)]"
                  : applied
                    ? "border-accent bg-accent/10 text-accent"
                    : "surface border-border bg-primary hover:border-muted-foreground/60"
              }`}
          >
            <Package
              className={`size-4 ${active ? "" : "text-accent"}`}
              aria-hidden
            />
            {pack.name}
            <span
              className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                active
                  ? "bg-accent-foreground/15"
                  : "bg-secondary/50 text-foreground/60"
              }`}
            >
              {pack.items.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
