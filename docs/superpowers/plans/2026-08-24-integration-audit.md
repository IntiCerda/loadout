# 2026-08-24 — Full-page audit and integration plan

Everything below was decided from measured evidence, not taste. Execution
order optimizes user pain first, shop-window second, durability third.

## Audit findings (evidence)

| # | Finding | Evidence |
|---|---------|----------|
| A1 | Mobile: the kit is unreachable | At 375x812 with 4 items, the Download button sits at y=19341 of a 19506px page — **23.4 viewports** of scrolling. |
| A2 | Packs ignore 61 of 123 items | `data/packs.ts` untouched by the catalog expansion; DevOps has no Terraform/kubectl/Helm, no pack uses any new item. |
| A3 | No way to see only your kit | 123 items; the only view of the selection is the sidebar list. |
| A4 | Share is implicit | The URL is the share artifact but nothing in the UI says so or copies it. |
| A5 | README screenshots predate the redesign | `docs/screenshot*.png` show the pre-depth, pre-rail UI. |
| A6 | Catalog rots silently | 123 verified refs, zero re-verification. Registries move (winget ids get renamed, models get re-tagged, font URLs die). |
| A7 | Generated bash never ran on a real Ubuntu | Blocked on Docker Desktop being down (still down today). Known bug queued behind it: `script_install` runs deno/bun/zed into `/root` under sudo. |

## Phases, in this order

1. **Mobile kit bar** (A1) — floating bottom bar below `lg` when the kit is
   non-empty: item count, total size, Download. Fixes the 23-viewport hole.
2. **Kit-only view + Share** (A3, A4) — an "In kit (N)" toggle chip beside the
   search box filtering the grid to the resolved selection; a "Share kit"
   button in the sidebar copying the share URL.
3. **Packs refresh** (A2) — fold the new catalog into the eight packs where it
   genuinely belongs; add "Cloud Ops" (terraform/kubectl/helm/k9s/aws/azure)
   and "Polyglot" or similar if it earns its chip. Union-containment test
   holds (every pack keeps a distinguishing id).
4. **README + screenshots** (A5) — regenerate screenshots from production,
   rewrite the feature list to what the product now is.
5. **CI ref verifier** (A6) — weekly GitHub Action re-checking every ref:
   npm/PyPI/marketplace/ollama/font by HTTP, winget against the
   `microsoft/winget-pkgs` manifest tree (runners have no working winget).
   Fails loudly with the list of rotten refs.
6. **Ubuntu container run** (A7) — try to bring Docker Desktop up; if it
   comes up, run the generated bash in `ubuntu:24.04`, fix the `/root`
   user-scoped-install bug it reproduces. If Docker stays down, this remains
   the only open item.

## Rules carried through every phase

- Gates before every push: vitest, eslint 0, tsc clean, build green.
- Verify on production after every deploy, with the exact repro when fixing.
- Catalog/pack ids only ever reference verified entries.
- No new dependencies.

## Outcome (same day)

All six phases landed. New open items discovered by the container run, for a
future session: the generated bash has no curl preflight (each vendor install
degrades to a named skip — acceptable but silent-ish), and deno/bun's vendor
installers need `unzip`, which bare noble lacks. Same class of fix: an
apt-installed prerequisites step or a preflight naming what is missing.
