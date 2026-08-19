@AGENTS.md

# Pila

Ninite for Windows developers. Pick tools, extensions, fonts, global packages
and local AI models from a catalog; get one readable install script.

**The implementation plan is the source of truth:**
`docs/superpowers/plans/2026-08-19-pila.md`. Read the task you are on and the
Global Constraints section before writing anything. The design spec is
`docs/superpowers/specs/2026-08-19-pila-design.md`.

## Stack facts that differ from training data

- **Next.js 16**, not 15. Read `node_modules/next/dist/docs/` before writing
  App Router code, per the block in `AGENTS.md`.
- **shadcn/ui is on Base UI (`@base-ui/react`), not Radix.** Import paths and
  component APIs differ from Radix examples.
- Tailwind **v4** — tokens live in the `@theme` block in `app/globals.css`,
  there is no `tailwind.config.ts`.
- `@vitejs/plugin-react` is pinned to `^5`. v6 pulls `@babel/core@^8` and fails
  to resolve against the `@babel/preset-typescript@^7` in the tree.

## Non-negotiable

- All code, comments, identifiers, UI copy and commit messages in **English**.
- Conventional commits. Author `Inti` only. Never add `Co-Authored-By` or any
  AI attribution.
- The generated PowerShell must never contain a `param()` block or a top-level
  `exit`, and must be ASCII-only. The generated bash must never read stdin,
  never call bare `sudo`, and never `set -e`. These are enforced by tests in
  `lib/generate.test.ts` and `lib/generate-linux.test.ts` — do not weaken them.
- Only strings from `data/catalog.ts` may reach a generated script. Query-string
  ids are allowlist lookup keys, never interpolated into output.
- Run `npm test` and `npm run build` before claiming a task is done, and paste
  the real output.
