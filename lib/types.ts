export type Os = 'windows' | 'linux'

export type Installer =
  | 'winget'
  | 'apt'
  | 'script'
  | 'vscode'
  | 'npm'
  | 'pipx'
  | 'ollama'
  | 'claude-plugin'
  | 'font'
  | 'wsl'

/**
 * Installers whose command and package name are identical on every OS. Items
 * using these need no per-OS data at all — which is why only the ~30 `winget`
 * items ever need a `linux` field.
 */
export const PORTABLE_INSTALLERS: Installer[] = [
  'vscode',
  'npm',
  'pipx',
  'ollama',
  'claude-plugin',
  'font', // same download URL; only the install destination differs
]

export type Category =
  | 'languages'
  | 'editors'
  | 'tools'
  | 'containers'
  | 'ai-apps'
  | 'ai-models'
  | 'extensions'
  | 'fonts'
  | 'linux'

export type Item = {
  /** URL-safe slug. Stable forever — it appears in shared links. */
  id: string
  name: string
  description: string
  category: Category
  installer: Installer
  /** winget ID, extension ID, package name, model tag, distro name, or font zip URL. */
  ref: string
  /**
   * Linux equivalent, required only when `installer` is `winget`.
   *
   * `apt` means the package is in Debian/Ubuntu default repositories and
   * installs with a plain `apt-get install`. `script` means the vendor
   * publishes an official install script and `ref` is its https URL — the only
   * honest option for tools that ship no distro package at all, Ollama being
   * the first of them.
   *
   * Items on a PORTABLE_INSTALLERS installer work on Linux as-is and must
   * leave this undefined. A `winget` item that omits it has no Linux
   * counterpart and is skipped for that target — as are all `wsl` items,
   * which are meaningless on Linux.
   *
   * This field exists from day one on purpose. The Linux generator lands in
   * Phase 5 and is cheap; backfilling this across 80 catalog entries later
   * would not be.
   */
  linux?:
    | { installer: 'apt'; ref: string }
    | { installer: 'script'; ref: string }
  /**
   * Ids of items that must be included whenever this one is selected.
   *
   * Governs inclusion only, not install order: `resolve` uses it to pull in
   * transitive dependencies but returns them in catalog order, and `generate`
   * groups the result by installer phase -- so a `winget` item is emitted
   * before a `wsl` item that declares it as a requirement.
   */
  requires?: string[]
  /**
   * Who makes the thing, when that is a useful way to narrow a category —
   * the organisation behind a local model, not the package publisher.
   *
   * UI only, never emitted into a script. Set it for a whole category or not
   * at all: `providersOf` hides the filter unless every item in the category
   * carries one, because a chip row that silently drops untagged items is
   * worse than no chip row.
   */
  provider?: string
  /**
   * Render the logo on a light plate. Only for marks the vendor drew for a
   * light background -- k9s is a black dog, fd is dark grey folders, and both
   * vanish on the slate card. It is a per-item fact, not a rule: Docker's
   * white whale disappears on a light plate, so this must never be inferred.
   * The mark itself is never recoloured.
   */
  logoOnLight?: boolean
  /** Approximate download size in megabytes. */
  sizeMb?: number
  /** Shown in the UI only. Never emitted into the script. */
  note?: string
}

export type Pack = {
  slug: string
  name: string
  description: string
  items: string[]
}

export const CATEGORY_LABELS: Record<Category, string> = {
  languages: 'Languages',
  editors: 'Editors',
  tools: 'Tools',
  containers: 'Containers',
  'ai-apps': 'AI apps',
  'ai-models': 'Local AI models',
  extensions: 'VS Code extensions',
  fonts: 'Fonts',
  linux: 'Linux',
}

export const CATEGORY_ORDER: Category[] = [
  'languages',
  'editors',
  'tools',
  'containers',
  'ai-apps',
  'ai-models',
  'extensions',
  'fonts',
  'linux',
]
