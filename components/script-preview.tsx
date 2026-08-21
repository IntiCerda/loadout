"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FileCode2 } from "lucide-react";
import type { Os } from "@/lib/types";

/**
 * A token of the generated script, paired with the class that colours it.
 * `className` is undefined for the plain text between tokens.
 */
type Token = { text: string; className?: string };

/**
 * Colours, measured against the panel background (`--background`, #0f172a)
 * with the WCAG relative-luminance formula:
 *
 *   strings   `--accent`   #22c55e   7.83:1
 *   keywords  sky-400                8.33:1
 *   comments  foreground/50          5.08:1
 *   plain     `--foreground`         17.06:1
 *
 * Comments are `/50`, not the `/35` a first draft used: `/35` measures 3.11:1
 * and fails AA outright. Comments are not decoration here -- they carry the
 * share URL and the name of every item -- so they have to be readable, just
 * quieter than the code.
 */
const STRING_CLASS = "text-accent";
const KEYWORD_CLASS = "text-sky-400";
const COMMENT_CLASS = "text-foreground/50";

/**
 * Split the whole script into coloured tokens in a single left-to-right pass.
 *
 * The pattern is built here rather than at module scope on purpose. A `g`
 * regex carries `lastIndex` between calls, so a shared one used with `.test()`
 * or `.exec()` alternates true/false on identical input; building it per call
 * makes that class of bug unreachable. `tokenize` runs once per script, behind
 * a `useMemo`, so the compile is free.
 *
 * Alternation order is load-bearing: strings come first, so a `#` inside a
 * quoted literal cannot open a comment, and the apostrophes inside
 * `"choose 'Run as Administrator'"` are swallowed by the double-quoted match
 * instead of opening a string of their own.
 *
 * Both quote styles are matched. `lib/generate.ts` emits every catalog value
 * through `psLiteral`, which produces a *single*-quoted PowerShell literal and
 * doubles any apostrophe -- so a double-quotes-only pattern would leave the
 * package refs, the one thing a reader is checking, uncoloured. The
 * `'[^']*(?:''[^']*)*'` shape consumes those doubled apostrophes in linear
 * time.
 *
 * Keywords are matched case-sensitively because the emitter writes them in
 * lower case; that is also what stops `ForEach-Object` being half-blue.
 * `param` is in the list although the emitter must never produce it -- if the
 * no-`param()` contract ever regresses, it lights up in the preview. `set` is
 * there for the same reason on the bash side: the generator must never emit
 * `set -e`.
 *
 * One tokenizer serves both targets. The two shells disagree about keywords
 * but not about quoting or `#` comments, which is where the reader is actually
 * checking what a line does.
 */
function tokenize(script: string): Token[] {
  const pattern =
    /('[^']*(?:''[^']*)*'|"[^"]*")|(#[^\n]*)|\b(function|if|elif|else|fi|then|do|done|for|while|return|try|catch|not|param|export|set|local)\b/g;

  const tokens: Token[] = [];
  let cursor = 0;

  for (const match of script.matchAll(pattern)) {
    if (match.index > cursor) {
      tokens.push({ text: script.slice(cursor, match.index) });
    }
    tokens.push({
      text: match[0],
      className: match[1]
        ? STRING_CLASS
        : match[2]
          ? COMMENT_CLASS
          : KEYWORD_CLASS,
    });
    cursor = match.index + match[0].length;
  }

  if (cursor < script.length) tokens.push({ text: script.slice(cursor) });

  return tokens;
}

export function ScriptPreview({ script, os }: { script: string; os: Os }) {
  const [open, setOpen] = useState(false);

  // Tokenising a script nobody has opened is wasted work, and the panel is
  // collapsed by default.
  const tokens = useMemo(() => (open ? tokenize(script) : []), [open, script]);
  const lineCount = useMemo(() => script.split("\n").length, [script]);

  return (
    // Full width, not inside the 320px sidebar. The generated PowerShell has
    // lines up to about 80 characters; at 12px mono that needs roughly 620px,
    // and the sidebar gave it 280. Every real line was clipped, so the one
    // feature this product is built around -- read it before you run it -- was
    // rendered in a column too narrow to read it in.
    <div className="surface border-border bg-primary rounded-xl border p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="script-body"
        className="hover:text-accent focus-visible:outline-ring flex min-h-[44px] w-full
          cursor-pointer items-center justify-between gap-3 rounded-lg px-1 text-left
          font-medium transition-colors duration-200
          focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="flex items-center gap-2">
          <FileCode2 className="text-accent size-4 shrink-0" aria-hidden />
          {open ? "Hide the generated script" : "View the generated script"}
        </span>
        <span className="text-foreground/50 flex items-center gap-2 font-mono text-xs">
          {lineCount} lines
          <ChevronDown
            aria-hidden
            className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open ? (
        // The tokens are spans directly inside <pre>, not one <div> per line.
        // `<pre>` already preserves the newlines, so `textContent` is the
        // script byte for byte -- which is what a select-and-copy gives the
        // user, and what proves the preview matches /api/script. A div per
        // line breaks both: `textContent` concatenates with no separator, and
        // an empty div for a blank line collapses to zero height.
        //
        // The height cap is tighter at `lg`, where this panel sits inside the
        // fixed-height app shell: the band it belongs to shares 100dvh with
        // the grid, and 70vh of script would push the catalog off-screen. The
        // panel already scrolls itself, so the cap costs nothing but a shorter
        // window onto the same text.
        <pre
          id="script-body"
          tabIndex={0}
          role="region"
          aria-label={`Generated ${os === "linux" ? "bash" : "PowerShell"} script`}
          className="border-border bg-background focus-visible:outline-ring mt-3 max-h-[70vh]
            overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed
            focus-visible:outline-2 focus-visible:-outline-offset-2 lg:max-h-[38vh]"
        >
          <code>
            {tokens.map((token, index) =>
              token.className ? (
                <span key={index} className={token.className}>
                  {token.text}
                </span>
              ) : (
                token.text
              ),
            )}
          </code>
        </pre>
      ) : null}
    </div>
  );
}
