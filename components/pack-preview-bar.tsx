"use client";

import { Plus, Trash2, X } from "lucide-react";
import { formatSize } from "@/lib/resolve";

type Props = {
  /** Display name of the pack being previewed. */
  name: string;
  /** Resolved item count — what the grid below is showing. */
  count: number;
  /** Download total for the resolved items the current target can install. */
  sizeMb: number;
  /** True when every id the pack contributes is already in the kit. */
  applied: boolean;
  onConfirm: () => void;
  onExit: () => void;
};

const ACTION =
  "flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg " +
  "px-4 text-sm font-medium transition-all duration-200 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * The banner that turns a pack chip into a proposal instead of a mutation. It
 * states what the grid below is showing and what the button will do, and it
 * owns nothing: the kit does not change until `onConfirm` runs.
 */
export function PackPreviewBar({
  name,
  count,
  sizeMb,
  applied,
  onConfirm,
  onExit,
}: Props) {
  return (
    <div className="border-accent/40 bg-primary mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border p-3 sm:p-4">
      {/* No live region on this sentence. The bar mounts and unmounts with
          the preview, and a live region inserted at the same moment as its
          text is announced unreliably; `app/page.tsx` keeps a permanent
          `aria-live` node that is already in the accessibility tree when the
          text arrives. */}
      <p className="min-w-0 grow text-sm">
        <span className="text-foreground/60">Previewing </span>
        <span className="font-medium">{name}</span>
        <span className="text-foreground/60">
          {" — "}
          {count} {count === 1 ? "item" : "items"}, {formatSize(sizeMb)}
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className={
            applied
              ? `${ACTION} border-warning text-warning hover:bg-warning/10 border`
              : `${ACTION} bg-accent text-accent-foreground hover:opacity-90`
          }
        >
          {applied ? (
            <Trash2 className="size-4" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          {applied ? "Remove from kit" : "Add to kit"}
        </button>

        <button
          type="button"
          onClick={onExit}
          className={`${ACTION} border-border hover:border-secondary hover:bg-secondary/40 border`}
        >
          <X className="size-4" aria-hidden />
          Close preview
        </button>
      </div>
    </div>
  );
}
