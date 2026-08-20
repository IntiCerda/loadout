"use client";

import { ALL } from "@/lib/filter";

type Props = {
  /** Empty when the current category has no useful provider split. */
  providers: string[];
  selected: string;
  onSelect: (provider: string) => void;
};

/**
 * Sub-filter for a category whose items come from more than one maker. Renders
 * nothing at all when there is no choice to offer — an empty control is a
 * promise the category cannot keep.
 */
export function ProviderChips({ providers, selected, onSelect }: Props) {
  if (providers.length === 0) return null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filter by provider"
    >
      <span className="text-muted-foreground mr-1 text-sm">Provider</span>

      {[ALL, ...providers].map((provider) => {
        const active = provider === selected;
        const label = provider === ALL ? "All" : provider;

        return (
          <button
            key={provider}
            type="button"
            aria-current={active ? "true" : undefined}
            onClick={() => onSelect(provider)}
            className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3
              text-sm transition-colors duration-[180ms]
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
              ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-foreground/80 hover:border-muted-foreground/60 hover:bg-primary"
              }`}
          >
            <span
              aria-hidden
              className="bg-secondary text-foreground flex size-5 items-center justify-center rounded font-mono text-[10px] font-bold"
            >
              {label[0]}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
