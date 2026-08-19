"use client";

import { Package } from "lucide-react";
import type { Pack } from "@/lib/types";

type Props = {
  packs: Pack[];
  /** Directly chosen ids only — not the resolved set, since a pack can only remove what it contributed. */
  selectedIds: Set<string>;
  onApply: (ids: string[]) => void;
};

export function PackChips({ packs, selectedIds, onApply }: Props) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Starter packs"
    >
      {packs.map((pack) => {
        const applied = pack.items.every((id) => selectedIds.has(id));

        return (
          <button
            key={pack.slug}
            type="button"
            title={pack.description}
            // Deliberately NOT `aria-pressed`. This is not a toggle button: the
            // green state is derived from the selection, so a pack lights up
            // when the user happens to tick its items by hand, and pressing it
            // then REMOVES them. "Pressed" would promise a button-owned binary
            // state that flips on press — here it flips without a press, and a
            // press on a "pressed" chip deletes work the user did elsewhere.
            // Announcing the action instead is true at every moment. The
            // visible label stays inside the accessible name, so WCAG 2.5.3
            // (label in name) still holds.
            aria-label={`${applied ? "Remove" : "Add"} the ${pack.name} pack`}
            onClick={() => onApply(pack.items)}
            className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border
              px-4 text-sm font-medium transition-all duration-200 active:scale-[0.97]
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
              ${
                applied
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-secondary hover:bg-secondary/40"
              }`}
          >
            <Package className="size-4" aria-hidden />
            {pack.name}
          </button>
        );
      })}
    </div>
  );
}
