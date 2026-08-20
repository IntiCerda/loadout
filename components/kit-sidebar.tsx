"use client";

import { useState } from "react";
import { Check, Copy, Download, HardDrive } from "lucide-react";
import type { Item, Os } from "@/lib/types";
import { formatSize } from "@/lib/resolve";

/** Above this, the download is large enough to be worth warning about. */
const LARGE_DOWNLOAD_MB = 20_480;

const OS_LABELS: Record<Os, string> = { windows: "Windows", linux: "Linux" };
const OS_ORDER: Os[] = ["windows", "linux"];

type Props = {
  /** Only what the chosen target can install. */
  items: Item[];
  /** How many selected items the chosen target has to drop. */
  droppedCount: number;
  sizeMb: number;
  /** Serialized selection, e.g. `git,vscode`. */
  query: string;
  /** Live origin, passed down so it matches what the route emits. */
  origin: string;
  os: Os;
  onOsChange: (os: Os) => void;
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
  droppedCount,
  sizeMb,
  query,
  origin,
  os,
  onOsChange,
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
      className="lg:sticky lg:top-8 lg:self-start"
    >
      <div className="border-border bg-primary rounded-xl border p-5">
        {/* Not `/40`: this heading names the landmark and the whole panel, so
            it is essential copy. `/40` measures 3.50:1 on this card and fails
            AA; `/60` is 6.00:1. */}
        <h2
          id="kit-heading"
          className="text-foreground/60 font-mono text-xs tracking-widest uppercase"
        >
          Your kit
        </h2>

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
          <span className="text-3xl font-semibold tabular-nums">
            {items.length}
          </span>
          <span className="text-foreground/60 text-sm">
            {items.length === 1 ? "item" : "items"}
          </span>
        </div>

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
              className={`${CTA} bg-accent text-accent-foreground cursor-pointer hover:opacity-90`}
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
