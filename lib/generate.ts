import type { Installer, Item } from './types'
import { totalSizeMb, formatSize } from './resolve'
import { BRAND } from './brand'

/**
 * Installers the Windows emitter handles. Excludes the Linux-only variants so
 * that adding one to `Installer` for the Phase 5 bash target can never silently
 * widen this Record and demand a PowerShell emitter that must not exist.
 * `'script'` is pre-excluded; it joins `Installer` in Task 14. `apt` is the
 * Phase 5 Linux target and has no place in a Windows script.
 */
type WindowsInstaller = Exclude<Installer, 'apt' | 'script'>

/**
 * Phase order matters. winget runs first because it installs the commands the
 * later phases call (code, npm, ollama). PATH is refreshed straight after it.
 * Ollama model pulls run last because they are by far the largest downloads,
 * so everything else is already usable if the user interrupts.
 */
const PHASES: { installer: WindowsInstaller; label: string }[] = [
  { installer: 'winget', label: 'Installing applications' },
  { installer: 'wsl', label: 'Installing WSL distros' },
  { installer: 'font', label: 'Installing fonts' },
  { installer: 'vscode', label: 'Installing VS Code extensions' },
  { installer: 'npm', label: 'Installing global npm packages' },
  { installer: 'pipx', label: 'Installing pipx packages' },
  { installer: 'ollama', label: 'Pulling Ollama models' },
  { installer: 'claude-plugin', label: 'Installing Claude Code plugins' },
]

const HELPERS: Record<WindowsInstaller, string> = {
  winget: `function Install-WingetPackage([string]$Id) {
    $found = winget list --id $Id --exact --accept-source-agreements 2>$null |
             Select-String ([regex]::Escape($Id))
    if ($found) {
        Write-Host "  $Id already installed, skipping." -ForegroundColor DarkGray
        return
    }
    winget install --id $Id -e --source winget --silent \`
        --accept-source-agreements --accept-package-agreements
}`,

  wsl: `function Install-WslDistro([string]$Distro) {
    if ($script:SkipWsl) { return }
    # wsl.exe writes UTF-16LE when stdout is redirected, so PowerShell captures
    # one NUL byte per character and a plain match never fires. Strip them, then
    # match exactly -- a substring match would skip "Ubuntu" when only
    # "Ubuntu-22.04" is present.
    $existing = (wsl --list --quiet 2>$null) -replace "\`0", "" | ForEach-Object { $_.Trim() }
    if ($existing -contains $Distro) {
        Write-Host "  $Distro already installed, skipping." -ForegroundColor DarkGray
        return
    }
    wsl --install -d $Distro --no-launch
}`,

  font: `function Install-Font([string]$Url, [string]$Name) {
    $zip = Join-Path $env:TEMP "$Name.zip"
    $dir = Join-Path $env:TEMP $Name
    try {
        Invoke-WebRequest -Uri $Url -OutFile $zip -UseBasicParsing
        Expand-Archive -Path $zip -DestinationPath $dir -Force
    } catch {
        Write-Host "  Could not download $Name, skipping." -ForegroundColor Yellow
        return
    }
    $fonts = (New-Object -ComObject Shell.Application).Namespace(0x14)
    Get-ChildItem -Path $dir -Include '*.ttf','*.otf' -Recurse | ForEach-Object {
        $target = Join-Path "$env:WINDIR\\Fonts" $_.Name
        if (Test-Path $target) {
            Write-Host "  $($_.Name) already installed, skipping." -ForegroundColor DarkGray
        } else {
            $fonts.CopyHere($_.FullName)
        }
    }
}`,

  vscode: `function Install-VSCodeExtension([string]$Id) {
    if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
        Write-Host "  code CLI not found, skipping $Id." -ForegroundColor Yellow
        return
    }
    code --install-extension $Id --force
}`,

  npm: `function Install-NpmGlobal([string]$Package) {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "  npm not found, skipping $Package." -ForegroundColor Yellow
        return
    }
    npm install -g $Package
}`,

  pipx: `function Install-PipxPackage([string]$Package) {
    if (-not (Get-Command pipx -ErrorAction SilentlyContinue)) {
        if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
            Write-Host "  python not found, skipping $Package." -ForegroundColor Yellow
            return
        }
        python -m pip install --user pipx
        python -m pipx ensurepath
    }
    pipx install $Package
}`,

  ollama: `function Install-OllamaModel([string]$Tag) {
    if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
        Write-Host "  ollama not found, skipping $Tag." -ForegroundColor Yellow
        return
    }
    $pulled = ollama list 2>$null | Select-String ([regex]::Escape($Tag))
    if ($pulled) {
        Write-Host "  $Tag already pulled, skipping." -ForegroundColor DarkGray
        return
    }
    ollama pull $Tag
}`,

  'claude-plugin': `function Install-ClaudePlugin([string]$Name) {
    if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
        Write-Host "  claude CLI not found, skipping $Name." -ForegroundColor Yellow
        return
    }
    claude plugin install $Name
}`,
}

/**
 * Emit a value as a single-quoted PowerShell literal. Single-quoted strings do
 * no interpolation, so `$`, a backtick and a double quote are all inert inside
 * one -- only an apostrophe needs doubling.
 *
 * Everything outside printable ASCII is dropped, which covers three hazards
 * with one rule: a newline would break out of the emitted line; any non-ASCII
 * byte violates the ASCII-only contract that `irm | iex` depends on; and a bidi
 * override such as U+202E can make a comment render as something other than
 * what it executes.
 *
 * The catalog is in-repo and trusted, but it grows to ~80 entries with outside
 * contributions, so one mistyped font URL must not become code execution in an
 * elevated shell.
 */
const PRINTABLE_ASCII_ONLY = /[^\x20-\x7E]/g

function psLiteral(value: string): string {
  const flat = value.replace(PRINTABLE_ASCII_ONLY, '')
  return `'${flat.replace(/'/g, "''")}'`
}

/**
 * Same rule for a value emitted as a trailing `#` comment. A newline in
 * `item.name` would otherwise end the comment early and let the rest of the
 * name run as a new, executable PowerShell line.
 */
function commentSafe(value: string): string {
  return value.replace(PRINTABLE_ASCII_ONLY, '')
}

/**
 * `Install-Font` interpolates this into `Join-Path $env:TEMP "$Name.zip"`, and
 * `Join-Path` does not normalise `..` segments. Quoting stops command
 * injection; it does nothing about path traversal, which is a different bug
 * class. Reduce the id to characters that cannot escape a directory.
 */
function pathSafe(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, '')
}

const CALLS: Record<WindowsInstaller, (item: Item) => string> = {
  winget: (i) => `Install-WingetPackage ${psLiteral(i.ref)}`,
  wsl: (i) => `Install-WslDistro ${psLiteral(i.ref)}`,
  font: (i) => `Install-Font ${psLiteral(i.ref)} ${psLiteral(pathSafe(i.id))}`,
  vscode: (i) => `Install-VSCodeExtension ${psLiteral(i.ref)}`,
  npm: (i) => `Install-NpmGlobal ${psLiteral(i.ref)}`,
  pipx: (i) => `Install-PipxPackage ${psLiteral(i.ref)}`,
  ollama: (i) => `Install-OllamaModel ${psLiteral(i.ref)}`,
  'claude-plugin': (i) => `Install-ClaudePlugin ${psLiteral(i.ref)}`,
}

/**
 * Refreshing PATH in-session is what lets the vscode/npm/ollama phases find
 * commands that winget installed moments earlier in the same run.
 */
const REFRESH_PATH = `# Refresh PATH so commands installed above resolve in this same session.
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
            [Environment]::GetEnvironmentVariable('Path','User')`

const ADMIN_GATE = `$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "This script needs an elevated PowerShell." -ForegroundColor Red
    Write-Host "Right-click PowerShell, choose 'Run as Administrator', then run it again." -ForegroundColor Red
    return
}`

/**
 * Windows 10 preflight. winget ships with Windows 11 but on Windows 10 it
 * arrives via App Installer from the Store, so a clean Win10 box fails on the
 * very first winget call with an unhelpful error. Emitted only when the
 * selection actually contains winget items.
 */
const WINGET_PREFLIGHT = `if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "winget is not available on this machine." -ForegroundColor Red
    Write-Host "Windows 11 ships it. On Windows 10, install 'App Installer' from the" -ForegroundColor Red
    Write-Host "Microsoft Store, then run this script again:" -ForegroundColor Red
    Write-Host "  ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1" -ForegroundColor Yellow
    return
}`

/**
 * WSL preflight. `wsl --install` needs Windows 10 build 19041 or newer.
 * Emitted only when the selection contains wsl items.
 */
const WSL_PREFLIGHT = `# Initialised explicitly: under 'irm | iex' this runs in the caller's session
# scope, so a flag left over from an earlier run would silently skip WSL for
# the rest of the console. It also keeps the read below valid under StrictMode.
$script:SkipWsl = $false
$build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
if ($build -lt 19041) {
    Write-Host "WSL2 needs Windows 10 build 19041 or newer (found $build)." -ForegroundColor Yellow
    Write-Host "Skipping the Linux distro steps. Windows Update will get you there." -ForegroundColor Yellow
    $script:SkipWsl = $true
}`

const TRANSCRIPT = `$logFile = Join-Path $env:TEMP ('setup-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
try { Start-Transcript -Path $logFile -Append | Out-Null } catch { }
Write-Host "Log: $logFile" -ForegroundColor DarkGray`

/**
 * Emit a self-contained PowerShell script for the given resolved items.
 *
 * Contract, enforced by lib/generate.test.ts:
 *  - no `param()` block: `iex` rejects scripts that declare parameters
 *  - no top-level `exit`: it would close the user's console under `iex`
 *  - ASCII only: `irm | iex` decoding of non-ASCII is unreliable
 *  - every emitted string comes from the catalog, never from user input
 */
export function generateScript(items: Item[], shareUrl: string): string {
  const sizeLabel = formatSize(totalSizeMb(items))
  const header = [
    `# ${BRAND} -- generated setup script`,
    `# ${shareUrl}`,
    `# ${items.length} item(s), about ${sizeLabel} to download`,
    `#`,
    `# This is plain PowerShell. Read it before you run it -- nothing is hidden.`,
    '',
  ].join('\n')

  if (items.length === 0) {
    return `${header}Write-Host "Nothing selected. Pick some tools first." -ForegroundColor Yellow\n`
  }

  const active = PHASES.map((phase) => ({
    ...phase,
    items: items.filter((item) => item.installer === phase.installer),
  })).filter((phase) => phase.items.length > 0)

  const usedInstallers = active.map((phase) => phase.installer)
  const helpers = usedInstallers.map((installer) => HELPERS[installer]).join('\n\n')

  // Preflights are per-installer: a models-only run has no reason to fail on a
  // Windows 10 App Installer check it never needed.
  const preflights = [
    usedInstallers.includes('winget') ? WINGET_PREFLIGHT : '',
    usedInstallers.includes('wsl') ? WSL_PREFLIGHT : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const blocks = active.map((phase, index) => {
    const step = `Write-Host "[${index + 1}/${active.length}] ${phase.label}..." -ForegroundColor Cyan`
    const calls = phase.items
      .map((item) => `${CALLS[phase.installer](item)}  # ${commentSafe(item.name)}`)
      .join('\n')
    const refresh = phase.installer === 'winget' ? `\n\n${REFRESH_PATH}` : ''
    return `${step}\n${calls}${refresh}`
  })

  return [
    header,
    ADMIN_GATE,
    '',
    preflights,
    '',
    TRANSCRIPT,
    '',
    helpers,
    '',
    ...blocks.map((block) => `${block}\n`),
    `Write-Host ""`,
    `Write-Host "Done. Restart your terminal so PATH changes take effect." -ForegroundColor Green`,
    `try { Stop-Transcript | Out-Null } catch { }`,
    '',
  ].join('\n')
}
