"use client";

import { useState } from "react";
import { Check, Copy, Download, HardDrive, Lock, Trash2, X } from "lucide-react";
import type { Item, Os } from "@/lib/types";
import { formatSize } from "@/lib/resolve";

/** Above this, the download is large enough to be worth warning about. */
const LARGE_DOWNLOAD_MB = 20_480;

/**
 * Full-bar ceiling for the size meter: 5 GiB, roughly a kitchen-sink kit with
 * a couple of local models. Purely presentational — the label next to it
 * carries the real number, this is just the at-a-glance weight of the kit.
 */
const METER_CEILING_MB = 5_120;

const OS_LABELS: Record<Os, string> = { windows: "Windows", linux: "Linux" };
const OS_ORDER: Os[] = ["windows", "linux"];

type Props = {
  /** Only what the chosen target can install. */
  items: Item[];
  /** Ids pulled in by `requires` — removable only via what needs them. */
  requiredIds: Set<string>;
  /** How many selected items the chosen target has to drop. */
  droppedCount: number;
  sizeMb: number;
  /** Serialized selection, e.g. `git,vscode`. */
  query: string;
  /** Live origin, passed down so it matches what the route emits. */
  origin: string;
  os: Os;
  onOsChange: (os: Os) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

type CopyStatus = "idle" | "copied" | "failed";

/**
 * Shared by the download control in both of its shapes, so the disabled state
 * is the same box in the same place and the layout does not shift.
 */
const CTA =
  "flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 font-medium " +
  "transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-ring";

export function KitSidebar({
  items,
  requiredIds,
  droppedCount,
  sizeMb,
  query,
  origin,
  os,
  onOsChange,
  onRemove,
  onClear,
}: Props) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const empty = items.length === 0;
  const linux = os === "linux";

  const scriptUrl = `${origin}/api/script?p=${query}${linux ? "&os=linux" : ""}`;

  // Not `curl ... | sudo bash`: that pipes the script into a shell whose stdin
  // is the pipe, which is exactly the no-tty hang the generator guards
  // against. The URL is single-quoted INSIDE the command substitution because
  // its `&` would otherwise background the curl and leave `os=linux` running
  // as a bare assignment — an empty script, and no error to explain it.
  const oneLiner = linux
    ? `sudo bash -c "$(curl -fsSL '${scriptUrl}')"`
    : `irm "${scriptUrl}" | iex`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(oneLiner);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      // `writeText` rejects on an insecure origin, when the document is not
      // focused, and when the permission is denied — and `navigator.clipboard`
      // is undefined outright over plain HTTP. Without this the promise
      // rejects unhandled and the button just does nothing. The failed state
      // stays up until the next attempt, because it renders the command for
      // the user to copy by hand and a timeout would yank it away mid-drag.
      setStatus("failed");
    }
  };

  return (
    // `aside` is a `complementary` landmark, and an unlabelled landmark is a
    // list entry a screen-reader user cannot tell apart from any other. The
    // heading it already renders is the name.
    <aside
      aria-labelledby="kit-heading"
      // A full-height column of the fixed shell at `lg`, scrolling itself
      // when the viewport is shorter than the panel — which is what keeps the
      // download and copy controls reachable with the script panel open.
      //
      // `relative` is load-bearing: the `sr-only` live region at the bottom of
      // the card is `position: absolute`, and without a positioned ancestor
      // its containing block is the initial containing block — so whenever
      // this column scrolls, that box's static position extended the
      // DOCUMENT's scroll area past the fixed shell, unclippable by any
      // ancestor overflow because none of them was its containing block.
      className="relative lg:min-h-0 lg:overflow-y-auto"
    >
      <div className="surface border-border bg-primary relative overflow-hidden rounded-xl border p-5">
        {/* Accent hairline along the top edge, matching the item cards, so the
            three kinds of raised surface share one visual language. */}
        <span
          aria-hidden
          className="from-accent absolute inset-x-0 top-0 h-px bg-linear-to-r via-sky-400 to-transparent opacity-50"
        />
        {/* Not `/40`: this heading names the landmark and the whole panel, so
            it is essential copy. `/40` measures 3.50:1 on this card and fails
            AA; `/60` is 6.00:1. */}
        <div className="flex items-center justify-between">
          <h2
            id="kit-heading"
            className="text-foreground/60 font-mono text-xs tracking-widest uppercase"
          >
            Your kit
          </h2>
          {empty ? null : (
            <button
              type="button"
              onClick={onClear}
              className="text-foreground/60 hover:text-warning flex min-h-[24px] cursor-pointer
                items-center gap-1 rounded font-mono text-xs transition-colors duration-150
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Clear
            </button>
          )}
        </div>

        {/* Toggle buttons in a labelled group, not `role="radiogroup"`. A
            radio group owes the user arrow-key navigation and a roving
            tabindex; two buttons owe nothing beyond Tab, and `aria-pressed`
            already announces which one is live. */}
        <div
          role="group"
          aria-label="Target operating system"
          className="border-border mt-3 grid grid-cols-2 gap-1 rounded-lg border p-1"
        >
          {OS_ORDER.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={os === value}
              onClick={() => onOsChange(value)}
              className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-md
                px-3 text-sm font-medium transition-colors duration-200
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
                ${
                  os === value
                    ? "bg-secondary text-foreground"
                    : "text-foreground/60 hover:bg-secondary/40"
                }`}
            >
              {OS_LABELS[value]}
            </button>
          ))}
        </div>

        {linux && droppedCount > 0 ? (
          // Said before the download, not discovered inside it. The script
          // names each one; this is the number that makes the user look.
          <p className="text-warning mt-2 text-xs">
            {droppedCount} selected{" "}
            {droppedCount === 1 ? "item is" : "items are"} not available on
            Linux
          </p>
        ) : null}

        <div className="mt-3 flex items-baseline gap-3">
          <span
            className={`text-3xl font-semibold tabular-nums ${
              empty
                ? ""
                : "from-accent bg-linear-to-r to-sky-400 bg-clip-text text-transparent"
            }`}
          >
            {items.length}
          </span>
          <span className="text-foreground/60 text-sm">
            {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        {empty ? (
          <p className="text-foreground/50 mt-2 text-xs">
            Tick anything in the catalog — dependencies come along on their
            own.
          </p>
        ) : null}

        <p
          className={`mt-1 flex items-center gap-1.5 font-mono text-sm ${
            // `text-destructive` (#ef4444) measures 3.89:1 on this card
            // (--primary, #1e293b) and fails WCAG AA. `--warning` is the same
            // hue lightened to 5.29:1.
            sizeMb > LARGE_DOWNLOAD_MB ? "text-warning" : "text-foreground/60"
          }`}
        >
          <HardDrive className="size-4" aria-hidden />
          {formatSize(sizeMb)} to download
        </p>

        {/* The label above is the accessible value; this bar only restates it
            visually, so it is hidden from assistive tech rather than being a
            second, vaguer announcement of the same number. */}
        <div
          aria-hidden
          className="bg-secondary/40 mt-2 h-1.5 overflow-hidden rounded-full"
        >
          <div
            className="from-accent bg-linear-to-r h-full rounded-full to-sky-400 transition-[width] duration-200"
            style={{
              width: `${Math.min(100, (sizeMb / METER_CEILING_MB) * 100)}%`,
            }}
          />
        </div>

        {empty ? null : (
          // The kit itself, not just its totals: what a stranger checks before
          // running anything is "what exactly is in this". Dependencies show a
          // lock — they leave when the item that needed them does.
          <ul
            aria-label="Items in your kit"
            // Capped at roughly nine rows, then it scrolls itself: a big kit
            // must not push the download button below the fold — the list is
            // the receipt, the button is the point.
            className="border-border/60 mt-4 flex max-h-64 flex-col gap-0.5 overflow-y-auto border-t pt-3"
          >
            {items.map((item) => {
              const locked = requiredIds.has(item.id);
              return (
                <li
                  key={item.id}
                  className="group/row flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-sm"
                >
                  <span
                    aria-hidden
                    className="bg-muted text-foreground/80 relative flex size-5 shrink-0 items-center justify-center rounded-[5px] font-mono text-[10px] font-bold"
                  >
                    {item.name[0]}
                    {/* eslint-disable-next-line @next/next/no-img-element -- same
                        static-PNG case as the card's logo */}
                    <img
                      src={`/logos/${item.id}.png`}
                      alt=""
                      width={20}
                      height={20}
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                      ref={(img) => {
                        if (img?.complete && img.naturalWidth === 0) {
                          img.style.display = "none";
                        }
                      }}
                      className={`absolute inset-0 size-5 rounded-[5px] object-contain ${
                        item.logoOnLight ? "bg-foreground p-px" : "bg-muted"
                      }`}
                    />
                  </span>
                  <span className="min-w-0 grow truncate">{item.name}</span>
                  {item.sizeMb ? (
                    <span className="text-foreground/50 shrink-0 font-mono text-xs">
                      {formatSize(item.sizeMb)}
                    </span>
                  ) : null}
                  {locked ? (
                    <span
                      className="text-foreground/50 flex size-6 shrink-0 items-center justify-center"
                      title="Required by another item"
                    >
                      <Lock className="size-3" aria-hidden />
                      <span className="sr-only">required by another item</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => onRemove(item.id)}
                      className="text-foreground/50 hover:bg-destructive/15 hover:text-warning flex
                        size-6 shrink-0 cursor-pointer items-center justify-center rounded
                        transition-colors duration-150
                        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {empty ? (
            // A real disabled button, not an `<a>` with `pointer-events-none`:
            // that anchor keeps its place in the tab order and still navigates
            // on Enter, so the "disabled" download is one keypress away from
            // serving a script for an empty selection. A `<button disabled>`
            // is unreachable and unactivatable, and is still announced as a
            // dimmed control rather than vanishing from the accessibility tree
            // the way an href-less anchor would.
            <button
              type="button"
              disabled
              className={`${CTA} bg-accent text-accent-foreground cursor-not-allowed opacity-40`}
            >
              <Download className="size-4" aria-hidden />
              Download {linux ? ".sh" : ".ps1"}
            </button>
          ) : (
            // A plain anchor, not `<Link>`: Next prefetches links in the
            // viewport, which would generate the script on every render.
            <a
              href={`/api/script?p=${query}${linux ? "&os=linux" : ""}&download=1`}
              className={`${CTA} text-accent-foreground from-accent cursor-pointer bg-linear-to-b to-emerald-600
                shadow-[0_10px_24px_-10px_var(--accent)] hover:brightness-110`}
            >
              <Download className="size-4" aria-hidden />
              Download {linux ? ".sh" : ".ps1"}
            </a>
          )}

          <button
            type="button"
            onClick={copy}
            disabled={empty}
            // `enabled:` on the hover pair, and no `pointer-events-none`: a
            // disabled button already ignores clicks, and removing pointer
            // events would take `cursor-not-allowed` with it.
            className={`${CTA} border-border enabled:hover:border-secondary enabled:hover:bg-secondary/40
              cursor-pointer border disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {status === "copied" ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            {status === "copied" ? "Copied" : "Copy one-liner"}
          </button>
        </div>

        {status === "failed" ? (
          <div className="mt-3">
            <p className="text-warning text-xs">
              The browser blocked the clipboard. Copy it by hand:
            </p>
            <code className="border-border bg-background text-foreground/80 mt-1 block rounded-md border p-2 font-mono text-xs break-all select-all">
              {oneLiner}
            </code>
          </div>
        ) : null}

        <p aria-live="polite" className="sr-only">
          {status === "copied" ? "One-liner copied to clipboard" : ""}
          {status === "failed"
            ? "Copying failed. The one-liner is shown below the button, select it to copy it by hand."
            : ""}
        </p>

      </div>
    </aside>
  );
}
