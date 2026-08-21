"use client";

import { Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (query: string) => void;
};

/**
 * Free-text filter over the visible slice of the catalog. Controlled from the
 * URL like every other filter — typing rewrites `?q=` via replaceState, so a
 * search never adds history entries and a shared link reproduces it.
 */
export function SearchBox({ value, onChange }: Props) {
  return (
    <div className="relative mb-3">
      <Search
        aria-hidden
        className="text-foreground/50 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search tools, models, extensions…"
        aria-label="Search the catalog"
        className="border-border bg-primary/60 placeholder:text-foreground/50 focus-visible:outline-ring
          min-h-[44px] w-full rounded-lg border pr-10 pl-9 text-sm transition-colors
          duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="text-foreground/50 hover:bg-secondary/40 hover:text-foreground absolute
            top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center
            justify-center rounded transition-colors duration-150
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
