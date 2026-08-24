"use client";

import { ChevronUp, Download } from "lucide-react";
import { formatSize } from "@/lib/resolve";
import type { Os } from "@/lib/types";

type Props = {
  /** Items the chosen target can install — matches the sidebar's count. */
  count: number;
  sizeMb: number;
  /** Serialized selection, e.g. `git,vscode`. */
  query: string;
  os: Os;
};

/**
 * Floating summary of the kit below `lg`, where the sidebar lives at the far
 * bottom of a very long document. Rendered only when the kit is non-empty:
 * an empty kit has nothing to download and nothing to scroll to.
 *
 * The page adds bottom padding while this renders (see `app/page.tsx`), so
 * the bar never sits on top of the last rows of content.
 */
export function MobileKitBar({ count, sizeMb, query, os }: Props) {
  const linux = os === "linux";

  const viewKit = () => {
    // The sidebar is the full receipt; this scrolls the document down to it.
    document.getElementById("kit-sidebar")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  return (
    <div
      role="region"
      aria-label="Kit summary"
      // `pb-[…env(safe-area-inset-bottom)]` keeps the controls above the home
      // indicator on notched phones; on everything else the env() is zero.
      className="surface border-border bg-primary fixed inset-x-0 bottom-0 z-40 border-t px-4
        pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2">
        {/* The whole summary is the "view kit" affordance — a bigger target
            than a separate small link, and the numbers are what the user is
            reaching for anyway. */}
        <button
          type="button"
          onClick={viewKit}
          className="hover:bg-secondary/40 flex min-h-[44px] min-w-0 grow cursor-pointer
            items-center gap-2 rounded-lg px-2 text-left transition-colors duration-150
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronUp className="text-foreground/60 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {count} {count === 1 ? "item" : "items"} ·{" "}
              <span className="font-mono">{formatSize(sizeMb)}</span>
            </span>
            <span className="text-foreground/60 block text-xs">View kit</span>
          </span>
        </button>

        {/* Same href as the sidebar's download, so the two controls cannot
            serve different scripts. */}
        <a
          href={`/api/script?p=${query}${linux ? "&os=linux" : ""}&download=1`}
          className="text-accent-foreground from-accent flex min-h-[44px] shrink-0 cursor-pointer
            items-center justify-center gap-2 rounded-lg bg-linear-to-b to-emerald-600 px-4
            font-medium shadow-[0_10px_24px_-10px_var(--accent)] transition-all duration-200
            hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-ring"
        >
          <Download className="size-4" aria-hidden />
          Download {linux ? ".sh" : ".ps1"}
        </a>
      </div>
    </div>
  );
}
