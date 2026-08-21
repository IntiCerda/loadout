"use client";

import { useEffect, useRef } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);

  // `/` focuses the search from anywhere that is not already a text field —
  // the shortcut every catalog-shaped site has taught people to try. This
  // effect only wires a listener; no state is set, so it does not fight the
  // no-setState-in-effect rule the rest of the app follows.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative mb-3">
      <Search
        aria-hidden
        className="text-foreground/50 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Escape clears rather than just blurring: a cleared box says the
          // grid is unfiltered again; a blurred full one does not.
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
          }
        }}
        placeholder="Search tools, models, extensions…"
        aria-label="Search the catalog"
        aria-keyshortcuts="/"
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
      ) : (
        <kbd
          aria-hidden
          className="border-border/60 text-foreground/50 absolute top-1/2 right-3 -translate-y-1/2
            rounded border px-1.5 py-0.5 font-mono text-[11px]"
        >
          /
        </kbd>
      )}
    </div>
  );
}
