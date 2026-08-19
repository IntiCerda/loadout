"use client";

import { Check, Lock } from "lucide-react";
import type { Item } from "@/lib/types";
import { formatSize } from "@/lib/resolve";

type Props = {
  item: Item;
  checked: boolean;
  /** True when another selection pulled this item in via `requires`. */
  required: boolean;
  /** Position within its category, used to stagger the entrance animation. */
  index: number;
  onToggle: (id: string) => void;
};

/** Milliseconds between one card's entrance and the next. */
const STAGGER_MS = 25;

/**
 * Past this the wave stops reading as a wave and starts reading as a wait.
 * The catalog grows in Task 13, so this is a ceiling, not a formality.
 */
const MAX_STAGGERED = 16;

export function ItemCard({ item, checked, required, index, onToggle }: Props) {
  const active = checked || required;

  // Pulled in by another selection and never chosen directly, so it cannot be
  // dropped on its own. The input stays focusable; the change is a no-op.
  const locked = required && !checked;

  const descriptionId = `${item.id}-desc`;
  const lockId = `${item.id}-lock`;

  return (
    <label
      // The stagger rides on the card itself rather than a wrapper div: the
      // cards are direct grid children and grid stretches them to equal
      // heights per row, which an extra block-level wrapper would break.
      style={{
        animationDelay: `${Math.min(index, MAX_STAGGERED) * STAGGER_MS}ms`,
      }}
      className={`card-in group relative flex min-h-[44px] flex-col gap-1 rounded-lg border p-4
        transition-all duration-200
        focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring
        ${
          active
            ? "border-accent bg-accent/5"
            : "border-border bg-primary hover:border-secondary hover:bg-secondary/40"
        }
        ${locked ? "cursor-not-allowed" : "cursor-pointer active:scale-[0.97]"}`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={active}
        // `aria-disabled` rather than `disabled`: a disabled input leaves the
        // tab order and assistive tech skips it, so a keyboard user would
        // silently lose every card a dependency pulled in, with no explanation
        // of why. This keeps the card reachable and announced, and blocks the
        // toggle in the handler instead.
        aria-disabled={locked || undefined}
        aria-describedby={locked ? `${descriptionId} ${lockId}` : descriptionId}
        onChange={() => {
          if (!locked) onToggle(item.id);
        }}
      />

      <span className="flex items-start justify-between gap-2">
        <span className="leading-tight font-medium">{item.name}</span>
        <span
          aria-hidden
          className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors duration-200
            ${active ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}
        >
          {locked ? (
            <Lock className="size-3" />
          ) : active ? (
            <Check className="size-3.5" />
          ) : null}
        </span>
      </span>

      <span id={descriptionId} className="text-foreground/60 text-sm">
        {item.description}
      </span>

      <span className="text-foreground/40 mt-1 flex items-center gap-2 font-mono text-xs">
        <span>{item.installer}</span>
        {item.sizeMb ? <span>{formatSize(item.sizeMb)}</span> : null}
      </span>

      {locked ? (
        <span id={lockId} className="text-accent text-xs">
          Required by your selection
        </span>
      ) : null}
    </label>
  );
}
