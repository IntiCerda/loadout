import { ChevronDown, Sparkles, Terminal } from "lucide-react";
import { BRAND, TAGLINE } from "@/lib/brand";
import { catalog } from "@/data/catalog";
import { packs } from "@/data/packs";

/** Milliseconds per character. The whole line takes `length * this`. */
const MS_PER_CHAR = 35;

type Props = {
  /**
   * Live origin, the same value the sidebar copies. Showing a different host
   * up here than the button below puts on the clipboard is a bug users notice,
   * and `SITE_URL` is build-time-inlined on the client, so it skews on preview
   * deployments and in dev.
   */
  origin: string;
};

export function Hero({ origin }: Props) {
  // Protocol dropped for width only. `irm` accepts a bare host and the host
  // itself still matches the one-liner the sidebar copies.
  const line = `irm ${origin.replace(/^https?:\/\//, "")}/api/script?p=go,git,vscode | iex`;

  return (
    // `hero-scroll` fades and drifts the hero as it scrolls out (CSS
    // scroll-driven, `lg` + supporting browsers only).
    <header className="hero-scroll relative overflow-hidden py-16 sm:py-24">
      {/* Ambient light. Decorative only, hidden from assistive tech. */}
      <div
        aria-hidden
        className="bg-accent/10 pointer-events-none absolute -top-32 left-1/4 size-96 rounded-full blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 right-1/4 size-80 rounded-full bg-sky-500/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <p className="border-accent/25 bg-accent/10 text-accent mx-auto mb-6 flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs">
          <Sparkles className="size-3.5" aria-hidden />
          {catalog.length} tools · {packs.length} packs · Windows + Debian
        </p>

        {/* Gradient ink, static. `bg-clip-text` needs the transparent text
            colour to show the gradient through the glyphs. */}
        <h1 className="from-accent via-emerald-300 bg-linear-to-r to-sky-400 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-6xl">
          {BRAND}
        </h1>
        <p className="text-foreground/70 mt-4 text-xl">{TAGLINE}</p>
        <p className="text-foreground/50 mx-auto mt-3 max-w-xl">
          Apps, VS Code extensions, fonts, global packages and local AI models.
          One readable script for Windows or Debian, no installer to trust.
        </p>

        <div className="surface border-border bg-primary shadow-accent/5 mt-8 flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-mono text-sm">
          {/* Terminal chrome: the three window dots every developer reads as
              "this is a terminal", then the prompt icon. Decoration only. */}
          <span aria-hidden className="flex shrink-0 items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#f87171]/70" />
            <span className="size-2.5 rounded-full bg-[#fbbf24]/70" />
            <span className="size-2.5 rounded-full bg-[#22c55e]/70" />
          </span>
          <span aria-hidden className="bg-border h-4 w-px shrink-0" />
          <Terminal className="text-accent size-4 shrink-0" aria-hidden />
          <code className="text-foreground/80 flex items-center overflow-x-auto whitespace-nowrap">
            {/*
              The reveal is a CSS `steps()` animation over the width of a
              monospace line, not a `setInterval` over a substring. The full
              command is in the DOM from the first byte of HTML, so there is no
              blank frame, no flash of the finished line before an effect
              clears it, and nothing to hydrate. It also means the existing
              `prefers-reduced-motion` block in globals.css already governs it:
              a stylesheet `!important` beats these inline declarations, so
              reduced motion collapses the animation to its end state instead
              of the hero having to re-implement the media query in JS.

              Duration and step count are inline because they depend on the
              length of the line, which depends on the live origin.
            */}
            <span
              // `shrink-0` is load-bearing: as a flex item this span would
              // otherwise shrink below its own width on a narrow viewport and
              // `overflow: hidden` would clip the tail of the command off for
              // good. Held at full width, the overflow moves out to the
              // scrollable `<code>` where it belongs.
              className="type-line shrink-0"
              style={{
                width: `${line.length}ch`,
                animationDuration: `${line.length * MS_PER_CHAR}ms`,
                animationTimingFunction: `steps(${line.length}, end)`,
              }}
            >
              {line}
            </span>
            <span
              aria-hidden
              className="bg-accent ml-0.5 inline-block h-4 w-2 shrink-0 animate-pulse"
            />
          </code>
        </div>

        {/* Scroll cue, `lg` only: that is where the app below is a fixed shell
            the document snaps onto, so "there is more down there" is worth a
            hint. Decorative — the content is one ordinary scroll away. */}
        <div aria-hidden className="mt-10 hidden justify-center lg:flex">
          <ChevronDown className="text-foreground/40 size-5 animate-bounce" />
        </div>
      </div>
    </header>
  );
}
