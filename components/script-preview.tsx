"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

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
 * no-`param()` contract ever regresses, it lights up in the preview.
 */
function tokenize(script: string): Token[] {
  const pattern =
    /('[^']*(?:''[^']*)*'|"[^"]*")|(#[^\n]*)|\b(function|if|else|return|try|catch|not|param)\b/g;

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

export function ScriptPreview({ script }: { script: string }) {
  const [open, setOpen] = useState(false);

  // Tokenising a script nobody has opened is wasted work, and the panel is
  // collapsed by default.
  const tokens = useMemo(() => (open ? tokenize(script) : []), [open, script]);
  const lineCount = useMemo(() => script.split("\n").length, [script]);

  return (
    <div className="border-border mt-5 border-t pt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="script-body"
        className="hover:text-accent focus-visible:outline-ring flex min-h-[44px] w-full
          cursor-pointer items-center justify-between gap-2 rounded-lg px-1 text-left
          text-sm font-medium transition-colors duration-200
          focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span>{open ? "Hide script" : "View script"}</span>
        <span className="text-foreground/40 flex items-center gap-2 font-mono text-xs">
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
        <pre
          id="script-body"
          tabIndex={0}
          role="region"
          aria-label="Generated PowerShell script"
          className="border-border bg-background focus-visible:outline-ring mt-2 max-h-[60vh]
            overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed
            focus-visible:outline-2 focus-visible:-outline-offset-2"
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
