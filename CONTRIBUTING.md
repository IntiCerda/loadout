# Contributing

Most contributions to Loadout are catalog entries, and a catalog entry is not
ordinary data: it becomes a command that runs in somebody else's elevated
PowerShell. Please read this page before opening a pull request that touches
`data/catalog.ts`.

## Before you open a pull request

```bash
npm test
```

Must pass. `npm run lint` must report **0 errors** and `npm run build` must
compile. A pull request that fails any of these will not be merged.

## Catalog item rules

A catalog item is one object in `data/catalog.ts`, typed by `Item` in
`lib/types.ts`.

### Verify the `ref`. Always.

An invented package id is worse than a missing item. It ships a command that
fails — or worse, resolves to something nobody vetted — in an admin shell.

| Installer | How to verify |
|---|---|
| `winget` | `winget search --id <ref> --exact` must return the package |
| `vscode` | `https://marketplace.visualstudio.com/items?itemName=<ref>` must return 200 |
| `npm` | `npm view <ref> version` must resolve |
| `pipx` | `https://pypi.org/pypi/<ref>/json` must return 200 |
| `ollama` | the exact tag must exist on `registry.ollama.ai` / the model card |
| `font` | the zip URL must return 200 on a HEAD request |
| `wsl` | the distro must appear in `wsl --list --online` |

If it does not resolve, **do not guess a variant.** Leave the item out and say
so in the pull request.

### `id` is permanent

It is a slug matching `/^[a-z0-9][a-z0-9.\-:_]*$/`, lowercase, and it appears
in every link anyone has shared. Once merged it can never change: `resolve`
silently drops ids it does not recognise, so a rename turns an old link into a
quietly shorter script rather than an error.

### The rest

- **`description`** — one sentence, sentence case, ending in a period.
- **`sizeMb`** — approximate download size. For `ollama` items it is not
  approximate: take it from `ollama list` or the model card's own layer sizes,
  in MiB. Never guess a model size; models dominate the total the user sees.
- **Every `ollama` item declares `requires: ['ollama']`.**
- **Every `vscode` item declares `requires: ['vscode']`.**
- **`requires` governs inclusion, not order.** The generator groups by installer
  phase, so declaring a requirement does not move anything up the script.
- **`linux` belongs only on `winget` items.** Installers in
  `PORTABLE_INSTALLERS` (`vscode`, `npm`, `pipx`, `ollama`, `claude-plugin`,
  `font`) work on Linux unchanged and must leave it undefined; `wsl` items must
  too, since a WSL distro is meaningless on Linux. A `winget` item without one
  is skipped on the Linux target — which is the correct outcome when there is
  no real apt equivalent. Do not invent one.
- **No `note` text you would not want printed in the UI.** It is shown to the
  user and never emitted into the script.

`lib/catalog.test.ts` enforces the mechanical half of this list. It cannot
check that your `ref` is real — that part is on you.

## Pack rules

Packs live in `data/packs.ts`.

Every pack must keep **at least one id that no union of the other packs can
supply.** This is not style; it is correctness. A pack chip reads as "applied"
when every one of its ids is in the selection, and the selection is the union
of everything applied — so a pack with no distinguishing id lights up green
having never been clicked, and clicking it then strips ids out from under the
packs the user actually did apply. `lib/packs.test.ts` enforces this and has
already caught it once for real.

Each pack carries a comment naming its distinguishing id. Keep it accurate.

## Code

- All code, comments, identifiers, UI copy and commit messages in **English**.
- Conventional commits.
- The generated PowerShell must stay ASCII-only, must never contain a `param()`
  block, and must never call `exit` at the top level. `lib/generate.test.ts`
  enforces all three — do not weaken those tests.
- Only strings from `data/catalog.ts` may reach a generated script. Query-string
  ids are allowlist lookup keys and are never interpolated into output.
