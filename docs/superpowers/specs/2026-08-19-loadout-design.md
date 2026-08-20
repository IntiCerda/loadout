# Loadout — Design Spec

**Date:** 2026-08-19
**Status:** Approved (pending name confirmation)

## Problem

Setting up a Windows dev machine means running dozens of installers by hand, or
maintaining hardcoded PowerShell scripts that rot. Ninite solves this for
consumer apps but stops there: it does not handle VS Code extensions,
programming fonts, global CLI packages, WSL distros, local AI models, or
Claude Code plugins. It also ships an opaque binary — you cannot read what it
will do to your machine before running it.

The predecessor repo (`IntiCerda/Script-Dev-W10-W11`) hardcodes one fixed
package list across three PowerShell scripts. Every change to the desired
toolchain requires editing the scripts.

## Solution

A public web app where the user picks items from a curated catalog and receives
a single generated PowerShell script — either as a `.ps1` download or as a
copy-paste one-liner. The generated script is plain readable PowerShell,
auditable before execution.

## Core Insight

Every catalog item is "a thing installed by one command". Only the command
changes. This collapses apps, extensions, fonts, libraries, and AI models into
a single data model with eight emitters.

| Installer | Command | Examples |
|---|---|---|
| `winget` | `winget install --id X -e` | Git, VS Code, Docker Desktop, Ollama |
| `vscode` | `code --install-extension X` | GitLens, Continue.dev, themes |
| `npm` | `npm install -g X` | `@anthropic-ai/claude-code`, `pnpm`, `tsx` |
| `pipx` | `pipx install X` | `aider-chat`, `ruff`, `uv` |
| `ollama` | `ollama pull X` | `qwen2.5-coder:7b`, `nomic-embed-text` |
| `claude-plugin` | `claude plugin install X` | skills, MCP servers |
| `font` | download + register | JetBrains Mono, Nerd Fonts |
| `wsl` | `wsl --install -d X` | Ubuntu, Debian |

## Differentiators

1. **Beyond apps** — extensions, fonts, global libraries, WSL distros, local
   LLM models, Claude Code plugins.
2. **Curated packs** — one click selects a coherent stack ("Go Backend",
   "React Frontend", "Data/ML", "DevOps + Docker", "AI Local").
3. **Live script preview** — the generated PowerShell renders as the user
   selects. Transparency Ninite does not offer, and the primary craft
   demonstration.
4. **Shareable URL** — selection lives in `?p=git,vscode,go`. No account, no
   backend session.
5. **Two delivery modes** — `.ps1` download or `irm ... | iex` one-liner, both
   served by the same route handler.
6. **Dependency resolution** — selecting `qwen2.5-coder:7b` auto-selects
   Ollama; selecting a VS Code extension auto-selects VS Code.
7. **Total download size** — running total in GB. Ollama models are 4–40 GB
   each; no comparable tool warns before the download starts.

## Architecture

```
                    data/catalog.ts  (single source of truth, typed)
                            |
              +-------------+-------------+
              |                           |
       lib/resolve.ts               lib/generate.ts
   (expand requires, sum size)   (group by installer, emit PS1)
              |                           |
              +-------------+-------------+
                            |
              +-------------+-------------+
              |                           |
     app/page.tsx (client)      app/api/script/route.ts
       live preview + UI          text/plain + .ps1 download
```

Selection state lives in the URL query string. The same pure functions feed
both the browser preview and the server route, so the previewed script is
byte-identical to the delivered script.

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 App Router, TypeScript | Native Vercel deploy, zero config. Scaffolded at 16.3.1; App Router APIs differ from 15. |
| Styling | Tailwind v4 | |
| Components | shadcn/ui (Base UI) | Accessible primitives, vendored not vendor-locked. The shadcn CLI now defaults to `@base-ui/react`, not Radix. |
| Icons | Lucide | SVG only, never emoji |
| Catalog | Typed TS module in-repo | No database. Data changes on commit, not at runtime. A DB adds ops burden with no benefit. |
| State | URL `searchParams` | Sharing is free, no session, no backend |
| Tests | Vitest | Pure functions carry the correctness; no E2E in v1 |

**Checkbox implementation:** native `<input type="checkbox">` inside a styled
label, not a component-library Checkbox. A 200-item grid of them is 200 React
subscriptions; the native input is accessible by default, keyboard-navigable by
default, and free. shadcn is used for Dialog, Tooltip, Accordion, and Button,
where native equivalents are genuinely painful.

## Visual Direction

Modern Dark — the recommended system for developer tools.

| Token | Value | Role |
|---|---|---|
| `--color-background` | `#0F172A` | Deep slate; never `#000000` (OLED smear) |
| `--color-foreground` | `#F8FAFC` | |
| `--color-primary` | `#1E293B` | |
| `--color-secondary` | `#334155` | |
| `--color-accent` | `#22C55E` | "Run green" — this is an installer |
| `--color-muted` | `#272F42` | |
| `--color-border` | `#475569` | |
| `--color-destructive` | `#EF4444` | Size warnings |

Typography: **Inter** for UI, **JetBrains Mono** for the script preview.

Motion: grid stagger on load (400ms, `back.out(1.4)`), press-scale `0.97` on
cards, transitions 150–300ms, `prefers-reduced-motion` respected throughout.

### Layout

Single page, no navigation — Ninite's model.

```
+------------------------------------------------------+
|  HERO: self-typing terminal with the one-liner       |
|  ambient light blobs behind                          |
+------------------------------------------------------+
|  [Go Backend] [React] [Data/ML] [DevOps] [AI Local]  |  packs
+---------------------------------+--------------------+
|  CATALOG                        |  YOUR KIT (sticky) |
|  checkbox card grid             |  ----------------  |
|  grouped by category            |  12 items          |
|  > Languages                    |  18.4 GB           |
|  > Editors                      |                    |
|  > Local AI                     |  [Download .ps1]   |
|  > Extensions                   |  [Copy one-liner]  |
|  > Fonts                        |                    |
|                                 |  v View script     |
|                                 |  (mono, highlight) |
+---------------------------------+--------------------+
```

## Generated Script Contract

The emitted PowerShell must:

1. Contain **no `param()` block** — `iex` fails on scripts that declare
   parameters, which would break the one-liner delivery mode.
2. Check for administrator rights and exit with a readable message if absent.
3. Be idempotent — every installer emitter checks before installing, preserving
   the `Install-WingetPackage` pattern from the predecessor repo.
4. Emit phases in dependency order:
   1. Admin check + transcript logging to `%TEMP%`
   2. `winget` packages
   3. PATH refresh from Machine + User (so `code`, `npm`, `ollama` resolve in
      the same session)
   4. `wsl` distros
   5. fonts
   6. `vscode` extensions
   7. `npm` globals
   8. `pipx` packages
   9. `ollama` model pulls (largest downloads last)
   10. `claude-plugin` installs
5. Print a numbered step header per non-empty phase.

## Platform Targets

**Windows 10 (build 19041+) and Windows 11**, shipping in v1. Windows 10 is the
harder target and the one to verify against:

| Trap | Why it breaks | Guard |
|---|---|---|
| `winget` absent | Preinstalled on Windows 11; on Windows 10 it arrives via App Installer from the Store. A clean Win10 box fails on the first winget call with an unhelpful error. | Preflight `Get-Command winget`, print the Store link, `return` |
| `wsl --install` on old builds | Needs build 19041+ | Preflight the build number, skip WSL phases with a message rather than failing the run |

**Debian/Ubuntu** ships in Phase 5. Five of the eight installers — `vscode`,
`npm`, `pipx`, `ollama`, `claude-plugin` — are byte-identical across operating
systems, so only the system-package layer is genuinely new work. That layer is
not trivial: VS Code, Docker and Ollama are not in Debian's default
repositories, which is why `linux.installer` has both an `apt` and a `script`
variant.

The bash generator's hard contract mirrors the PowerShell one:

- **Nothing may read stdin.** `curl | bash` leaves no controlling terminal, so
  an apt confirmation or a sudo password prompt hangs forever with no output.
  Every command is non-interactive by construction
  (`DEBIAN_FRONTEND=noninteractive`, `-y`).
- **No bare `sudo`.** The script gates on `id -u` and instructs
  `sudo bash -c "$(curl -fsSL ...)"`, never `curl ... | sudo bash`.
- **No `set -e`.** One failed package must not abort the run, matching the
  Windows behaviour.
- ASCII only, same reason.

## Non-Goals (v1)

- No user accounts, no saved kits server-side. The URL is the saved kit.
- No macOS output in any phase. macOS via Homebrew is a later consideration.
- Linux (Debian/Ubuntu) output is **out of scope for v1 but in scope for the
  project** — it ships in Phase 5. The `Item` type carries Linux targeting from
  day one because backfilling a field across 80 catalog entries is the
  expensive part; the second generator is not.
- No database. The catalog ships with the code.
- No interactive terminal TUI picker. The one-liner covers terminal delivery;
  an arrow-key menu is separate work with no native PowerShell support.
- No E2E browser tests. Pure-function coverage plus a route smoke test.

## Open Decision

**Name.** Working name is `Loadout` ("stack" in Spanish). It appears in exactly
one constant (`lib/brand.ts`), the page metadata, and the README — changing it
is a find-and-replace, not a refactor. Alternatives considered: `StackForge`,
`winup`.

## Relationship to `Script-Dev-W10-W11`

The predecessor repo's three hardcoded scripts become the seed content for the
five launch packs. That repo stays as-is; its README one-liners keep working.
Loadout is a new repository so the Vercel project deploys from a clean root and
the portfolio piece carries its own name.
