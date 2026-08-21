"use client";

import { Check, Lock } from "lucide-react";
import type { Item } from "@/lib/types";
import { formatSize } from "@/lib/resolve";

type Props = {
  item: Item;
  checked: boolean;
  /** True when another selection pulled this item in via `requires`. */
  required: boolean;
  /** True when the current target OS has no way to install this item. */
  unavailable: boolean;
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

export function ItemCard({
  item,
  checked,
  required,
  unavailable,
  index,
  onToggle,
}: Props) {
  const active = checked || required;

  // Pulled in by another selection and never chosen directly, so it cannot be
  // dropped on its own. The input stays focusable; the change is a no-op.
  const locked = required && !checked;

  const descriptionId = `${item.id}-desc`;
  const lockId = `${item.id}-lock`;
  const unavailableId = `${item.id}-unavailable`;

  // Still selectable, and still counted in the URL: the user may be building a
  // kit for both targets, and switching back to Windows must not silently have
  // dropped anything. It is marked, not removed.
  const describedBy = [
    descriptionId,
    locked ? lockId : "",
    unavailable ? unavailableId : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label
      // The stagger rides on the card itself rather than a wrapper div: the
      // cards are direct grid children and grid stretches them to equal
      // heights per row, which an extra block-level wrapper would break.
      style={{
        animationDelay: `${Math.min(index, MAX_STAGGERED) * STAGGER_MS}ms`,
      }}
      className={`card-in group relative flex min-h-[44px] flex-col gap-2 rounded-xl border p-3.5
        transition-all duration-[180ms] hover:-translate-y-0.5
        focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring
        ${
          active
            ? "border-accent bg-accent/5"
            : "border-border bg-primary hover:border-muted-foreground/60"
        }
        ${locked ? "cursor-not-allowed" : "cursor-pointer active:scale-[0.97]"}
        ${unavailable ? "opacity-60" : ""}`}
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
        aria-describedby={describedBy}
        onChange={() => {
          if (!locked) onToggle(item.id);
        }}
      />

      <span className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="bg-muted text-foreground relative flex size-[34px] shrink-0 items-center justify-center rounded-[9px] font-mono text-sm font-bold"
        >
          {item.name[0]}
          {/* Monogram underneath, logo over it. Not every item has a file, so
              the failing image hides itself and the letter is what is left.
              Its own opaque background is what stops the letter showing
              through a transparent logo when the file DOES exist. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static 128px
              PNGs in /public; next/image would add a loader round trip and a
              layout wrapper for a 34px square that never resizes. */}
          <img
            src={`/logos/${item.id}.png`}
            alt=""
            width={34}
            height={34}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            ref={(img) => {
              // The 404 for a logo that does not exist usually lands BEFORE
              // hydration attaches `onError` -- `error` does not bubble, so
              // React cannot delegate it and misses the one that already
              // fired. A ref callback runs at that same moment and can ask
              // the element what happened. Not state, not an effect.
              if (img?.complete && img.naturalWidth === 0) {
                img.style.display = "none";
              }
            }}
            className={`absolute inset-0 size-[34px] rounded-[9px] object-contain ${
              item.logoOnLight ? "bg-foreground p-[3px]" : "bg-muted"
            }`}
          />
        </span>

        <span className="flex min-w-0 grow flex-col">
          <span className="leading-tight font-medium">{item.name}</span>
          {item.provider ? (
            <span className="text-muted-foreground mt-0.5 font-mono text-[11px]">
              {item.provider}
            </span>
          ) : null}
        </span>

        <span
          aria-hidden
          className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors duration-[180ms]
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

      <span className="text-foreground/50 flex items-center gap-2 font-mono text-xs">
        <span>{item.installer}</span>
        {item.sizeMb ? <span>{formatSize(item.sizeMb)}</span> : null}
      </span>

      {locked ? (
        <span id={lockId} className="text-accent text-xs">
          {/* Not "required by your selection": the same card renders inside a
              pack preview, where nothing is selected yet and the requirement
              comes from the pack. This wording is true in both. */}
          Required by another item
        </span>
      ) : null}

      {unavailable ? (
        <span id={unavailableId} className="text-warning text-xs">
          Not available on Linux
        </span>
      ) : null}
    </label>
  );
}
