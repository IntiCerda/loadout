import type { Installer, Item } from './types'
import { commentSafe } from './generate'
import { totalSizeMb, formatSize } from './resolve'
import { BRAND } from './brand'

/**
 * Installers the bash emitter handles. `winget` and `wsl` are Windows-only by
 * construction: a `winget` item reaches Linux only through its `linux` field,
 * and a `wsl` item has no meaning on Linux at all. Deriving this from
 * `Installer` rather than listing it is what makes the Records below fail to
 * compile when a ninth installer is added, instead of silently emitting
 * nothing for it.
 */
type LinuxInstaller = Exclude<Installer, 'winget' | 'wsl'>

/**
 * The Linux command and package name for an item, or `null` when it has none.
 *
 * Returning the resolved pair rather than a boolean is what removes every
 * non-null assertion downstream: `item.linux!` is only sound because
 * `linuxSupported` was called first, and nothing in the type system enforces
 * that ordering.
 */
function linuxTarget(
  item: Item,
): { installer: LinuxInstaller; ref: string; userScoped?: boolean } | null {
  if (item.installer === 'wsl') return null
  if (item.installer === 'winget') return item.linux ?? null
  return { installer: item.installer, ref: item.ref }
}

/**
 * An item runs on Linux when its installer is portable, or when it is a
 * `winget` item that declares a Linux equivalent. `wsl` items never do.
 */
export function linuxSupported(item: Item): boolean {
  return linuxTarget(item) !== null
}

/**
 * Emit a value as a single-quoted bash literal.
 *
 * The rules are NOT the PowerShell ones. A bash single-quoted string ends at
 * the first apostrophe and has no escape character inside it at all, so the
 * PowerShell fix -- doubling -- is wrong here. It is not, measured against
 * real bash, an injection: doubling preserves quote parity, so every payload
 * still arrives as exactly one argument. What it does is silently *delete*
 * every apostrophe -- `a'b` arrives as `ab`, `end'` as `end`, `'''` as the
 * empty string. A package name that is quietly not the name in the catalog is
 * its own kind of bad. The only portable idiom is to close the quote, emit an
 * escaped apostrophe, and reopen: `'\''`.
 *
 * Everything else -- `$`, backtick, `"`, `;`, `|`, `&`, `$(...)` -- is inert
 * inside single quotes, so this one rule covers the whole class.
 *
 * Non-printable-ASCII is dropped by the same rule the Windows emitter uses:
 * a newline would end the emitted line, a non-ASCII byte violates the
 * ASCII-only contract, and a bidi override such as U+202E can make a line
 * render as something other than what it runs.
 */
function shLiteral(value: string): string {
  return `'${commentSafe(value).replace(/'/g, "'\\''")}'`
}

/**
 * `curl | bash` gives the script no controlling terminal. Anything that reads
 * stdin -- an apt confirmation prompt, a sudo password prompt -- hangs forever
 * with no output. This is the Linux mirror of the Windows `param()` trap:
 * every command below must be non-interactive by construction.
 *
 * The suggested re-run form quotes the URL inside the command substitution on
 * purpose. `bash -c "$(curl -fsSL http://x/api/script?p=git&os=linux)"` puts an
 * unquoted `&` inside `$( )`, which backgrounds the curl and then runs
 * `os=linux` as an assignment -- the user gets an empty script and no error.
 */
const ROOT_GATE = `if [ "$(id -u)" -ne 0 ]; then
  echo "This script installs system packages and must run as root." >&2
  echo "Re-run it like this, keeping the quotes around the URL:" >&2
  echo "  sudo bash -c \\"\\$(curl -fsSL '<script url>')\\"" >&2
  echo "Never 'curl ... | sudo bash' -- that leaves the script no terminal." >&2
  exit 1
fi`

/**
 * Run a command as the human who invoked sudo, not as root.
 *
 * Four of the eight phases install into `$HOME`. Left as root they would land
 * in `/root` -- VS Code extensions the desktop user never sees, pipx shims not
 * on their PATH -- which looks like success and installs nothing usable.
 * `runuser -- ` takes its argv directly, with no intermediate shell, so a
 * package name can never be re-parsed as a command. Falls back to running in
 * place when `SUDO_USER` is unset, which is the real root-login case.
 */
const AS_USER = `as_user() {
  if [ -n "$SUDO_USER" ] && command -v runuser >/dev/null 2>&1; then
    runuser -u "$SUDO_USER" -- "$@"
  else
    "$@"
  fi
}`

const HELPERS: Record<LinuxInstaller, string> = {
  apt: `apt_install() {
  if dpkg -s "$1" >/dev/null 2>&1; then
    echo "  $1 already installed, skipping."
    return
  fi
  apt-get install -y --no-install-recommends "$1"
}`,

  // Downloaded to a file and run with stdin closed rather than piped straight
  // into bash. A vendor script read from its own stdin cannot prompt, but it
  // also cannot read anything else -- and several of them do. Closing stdin
  // explicitly makes the no-tty rule hold for code we did not write.
  //
  // "$2" = user marks an installer that unpacks into $HOME (deno, bun, zed).
  // Run as root those land in /root -- a toolchain the desktop user never
  // sees -- so they go through as_user. The chmod matters: mktemp creates the
  // file 0600 owned by root, which the target of runuser cannot read.
  script: `script_install() {
  echo "  running vendor install script: $1"
  tmp="$(mktemp)"
  if curl -fsSL "$1" -o "$tmp"; then
    if [ "$2" = user ]; then
      chmod 644 "$tmp"
      as_user bash "$tmp" </dev/null
    else
      bash "$tmp" </dev/null
    fi
  else
    echo "  could not download $1, skipping."
  fi
  rm -f "$tmp"
}`,

  // /usr/local/share/fonts, not $HOME: this runs as root, so a user-scoped
  // font directory would be /root/.local/share/fonts and no desktop session
  // would ever look there.
  font: `font_install() {
  dir="/usr/local/share/fonts"
  mkdir -p "$dir"
  if ! command -v unzip >/dev/null 2>&1; then
    apt-get install -y --no-install-recommends unzip
  fi
  tmp="$(mktemp -d)"
  if curl -fsSL "$1" -o "$tmp/font.zip"; then
    unzip -oq "$tmp/font.zip" -d "$tmp"
    find "$tmp" -type f -name '*.ttf' -exec cp -n -t "$dir" {} +
    find "$tmp" -type f -name '*.otf' -exec cp -n -t "$dir" {} +
    if command -v fc-cache >/dev/null 2>&1; then
      fc-cache -f >/dev/null
    fi
  else
    echo "  could not download the archive, skipping."
  fi
  rm -rf "$tmp"
}`,

  vscode: `vscode_ext() {
  if ! command -v code >/dev/null 2>&1; then
    echo "  code CLI not found, skipping $1."
    return
  fi
  as_user code --install-extension "$1" --force --no-sandbox
}`,

  // No as_user: -g installs into the system prefix, which is what root should
  // be writing.
  npm: `npm_global() {
  if ! command -v npm >/dev/null 2>&1; then
    echo "  npm not found, skipping $1."
    return
  fi
  npm install -g "$1"
}`,

  pipx: `pipx_install() {
  if ! command -v pipx >/dev/null 2>&1; then
    apt-get install -y --no-install-recommends pipx
  fi
  as_user pipx install "$1"
}`,

  // No as_user: `ollama pull` is a request to the local server, which stores
  // models under its own service account rather than the caller's home.
  ollama: `ollama_pull() {
  if ! command -v ollama >/dev/null 2>&1; then
    echo "  ollama not found, skipping $1."
    return
  fi
  if ollama list 2>/dev/null | grep -qF "$1"; then
    echo "  $1 already pulled, skipping."
    return
  fi
  ollama pull "$1"
}`,

  'claude-plugin': `claude_plugin() {
  if ! command -v claude >/dev/null 2>&1; then
    echo "  claude CLI not found, skipping $1."
    return
  fi
  as_user claude plugin install "$1"
}`,
}

const CALLS: Record<
  LinuxInstaller,
  (ref: string, userScoped?: boolean) => string
> = {
  apt: (ref) => `apt_install ${shLiteral(ref)}`,
  script: (ref, userScoped) =>
    `script_install ${shLiteral(ref)}${userScoped ? ' user' : ''}`,
  font: (ref) => `font_install ${shLiteral(ref)}`,
  vscode: (ref) => `vscode_ext ${shLiteral(ref)}`,
  npm: (ref) => `npm_global ${shLiteral(ref)}`,
  pipx: (ref) => `pipx_install ${shLiteral(ref)}`,
  ollama: (ref) => `ollama_pull ${shLiteral(ref)}`,
  'claude-plugin': (ref) => `claude_plugin ${shLiteral(ref)}`,
}

/**
 * Same ordering rationale as the Windows generator: system packages and vendor
 * installers first so later phases find the commands they need, model pulls
 * near the end because they are by far the largest downloads.
 */
const PHASES: { installer: LinuxInstaller; label: string }[] = [
  { installer: 'apt', label: 'Installing system packages' },
  { installer: 'script', label: 'Running vendor installers' },
  { installer: 'font', label: 'Installing fonts' },
  { installer: 'vscode', label: 'Installing VS Code extensions' },
  { installer: 'npm', label: 'Installing global npm packages' },
  { installer: 'pipx', label: 'Installing pipx packages' },
  { installer: 'ollama', label: 'Pulling Ollama models' },
  { installer: 'claude-plugin', label: 'Installing Claude Code plugins' },
]

/** Phases that install a package through apt and so need a fresh index. */
const APT_DEPENDENT: LinuxInstaller[] = ['apt', 'pipx', 'font']

/**
 * Vendor install scripts that unpack a zip archive and so need `unzip`, which
 * bare Ubuntu lacks. Keyed by the exact catalog ref rather than by the
 * `userScoped` flag: userScoped means "installs into $HOME", and zed is
 * user-scoped but ships a tarball. A const list here is less machinery than a
 * new catalog field for two known URLs, at the cost of extending it if a
 * zip-based installer is ever added.
 */
const ZIP_SCRIPTS = ['https://deno.land/install.sh', 'https://bun.sh/install']

/**
 * Every vendor install script is fetched with curl over https, and a bare
 * image -- docker's ubuntu:24.04 -- ships neither curl nor CA certificates,
 * so without this every script item degrades to a named skip the script
 * itself could have fixed. Check first: a machine that already has them
 * never touches apt, which is what keeps a second run free and safe.
 */
function prereqBlock(scriptRefs: string[]): string {
  const wantUnzip = scriptRefs.some((ref) => ZIP_SCRIPTS.includes(ref))
  return [
    `missing=""`,
    `command -v curl >/dev/null 2>&1 || missing="curl"`,
    `dpkg -s ca-certificates >/dev/null 2>&1 || missing="$missing ca-certificates"`,
    ...(wantUnzip
      ? [`command -v unzip >/dev/null 2>&1 || missing="$missing unzip"`]
      : []),
    `if [ -n "$missing" ]; then`,
    `  echo "Installing prerequisites for the vendor installers:$missing"`,
    `  apt-get update -y`,
    // $missing is intentionally unquoted: it is a fixed space-separated list
    // of package names from this function, never catalog or user input.
    `  apt-get install -y --no-install-recommends $missing`,
    `fi`,
  ].join('\n')
}

/**
 * Phases that write into the invoking user's home directory. `script` is not
 * here because it is user-scoped per item, not per installer -- see the
 * `userScoped` flag on the linux ref.
 */
const USER_SCOPED: LinuxInstaller[] = ['vscode', 'pipx', 'claude-plugin']

/**
 * Emit a self-contained bash script for the given resolved items.
 *
 * Contract, enforced by lib/generate-linux.test.ts:
 *  - nothing reads stdin: `curl | bash` leaves no controlling terminal, so a
 *    prompt hangs forever with no output
 *  - no bare `sudo`: the script gates on `id -u` and tells the user how to
 *    re-run it, rather than prompting for a password it cannot read
 *  - no `set -e`: one failed package must not abort the run, matching Windows
 *  - ASCII only, for the same reason the PowerShell target is
 *  - every emitted string comes from the catalog, never from user input
 */
export function generateBash(items: Item[], shareUrl: string): string {
  const supported = items.filter(linuxSupported)
  const dropped = items.filter((item) => !linuxSupported(item))

  const header = [
    '#!/usr/bin/env bash',
    `# ${BRAND} -- generated setup script (Debian/Ubuntu)`,
    `# ${commentSafe(shareUrl)}`,
    `# ${supported.length} item(s), about ${formatSize(totalSizeMb(supported))} to download`,
    '#',
    '# This is plain bash. Read it before you run it -- nothing is hidden.',
    '',
  ].join('\n')

  // Named, never silently omitted. A Linux script that is quietly shorter than
  // the kit the user built is the one failure mode they cannot debug.
  const notes = dropped.length
    ? [
        `echo 'Skipped -- not available on Linux:'`,
        ...dropped.map((item) => `echo ${shLiteral(`  - ${item.name}`)}`),
        `echo ""`,
        '',
      ].join('\n')
    : ''

  if (supported.length === 0) {
    return `${header}echo "Nothing to install for this target."\n${notes}`
  }

  const active = PHASES.map((phase) => ({
    ...phase,
    items: supported.filter(
      (item) => linuxTarget(item)?.installer === phase.installer,
    ),
  })).filter((phase) => phase.items.length > 0)

  const used = active.map((phase) => phase.installer)
  const scriptRefs = supported.flatMap((item) => {
    const target = linuxTarget(item)
    return target?.installer === 'script' ? [target.ref] : []
  })
  // The script helper's user branch calls as_user, so a user-scoped script
  // item forces the helper in even when no USER_SCOPED phase is active. The
  // branch is dead without such an item, which is what makes omitting as_user
  // safe in the root-scripts-only case.
  const needsAsUser =
    used.some((installer) => USER_SCOPED.includes(installer)) ||
    supported.some((item) => linuxTarget(item)?.userScoped)
  const helpers = [
    needsAsUser ? AS_USER : '',
    ...used.map((installer) => HELPERS[installer]),
  ]
    .filter(Boolean)
    .join('\n\n')

  const blocks = active.map((phase, index) => {
    const step = `echo '[${index + 1}/${active.length}] ${phase.label}...'`
    const calls = phase.items
      .map((item) => {
        const target = linuxTarget(item)
        // Unreachable: `active` is built from items that already resolved.
        // Kept as a value rather than a `!` so the type is honest.
        if (!target) return ''
        return `${CALLS[target.installer](target.ref, target.userScoped)}  # ${commentSafe(item.name)}`
      })
      .filter(Boolean)
      .join('\n')
    return `${step}\n${calls}\n`
  })

  return [
    header,
    ROOT_GATE,
    '',
    // Belt and braces with the `-y` on every call below: this also covers the
    // dpkg configure step, which prompts on a changed config file even when
    // apt-get itself was told not to.
    'export DEBIAN_FRONTEND=noninteractive',
    used.some((installer) => APT_DEPENDENT.includes(installer))
      ? 'apt-get update -y\n'
      : '',
    scriptRefs.length > 0 ? `${prereqBlock(scriptRefs)}\n` : '',
    helpers,
    '',
    notes,
    ...blocks,
    'echo ""',
    'echo "Done. Open a new shell so PATH changes take effect."',
    '',
  ]
    .filter((part) => part !== '')
    .join('\n')
}
