import { describe, it, expect } from 'vitest'
import { generateBash, linuxSupported } from './generate-linux'
import type { Item } from './types'

const base = { description: '', category: 'tools' } as const

const git: Item = {
  ...base,
  id: 'git',
  name: 'Git',
  installer: 'winget',
  ref: 'Git.Git',
  linux: { installer: 'apt', ref: 'git' },
}
const ollama: Item = {
  ...base,
  id: 'ollama',
  name: 'Ollama',
  installer: 'winget',
  ref: 'Ollama.Ollama',
  linux: { installer: 'script', ref: 'https://ollama.com/install.sh' },
}
const deno: Item = {
  ...base,
  id: 'deno',
  name: 'Deno',
  installer: 'winget',
  ref: 'DenoLand.Deno',
  linux: {
    installer: 'script',
    ref: 'https://deno.land/install.sh',
    userScoped: true,
  },
}
const docker: Item = {
  ...base,
  id: 'd',
  name: 'Docker Desktop',
  installer: 'winget',
  ref: 'Docker.DockerDesktop',
}
const distro: Item = {
  ...base,
  id: 'u',
  name: 'Ubuntu',
  installer: 'wsl',
  ref: 'Ubuntu',
}
const ext: Item = {
  ...base,
  id: 'ext',
  name: 'GitLens',
  installer: 'vscode',
  ref: 'eamodio.gitlens',
}
const font: Item = {
  ...base,
  id: 'font-x',
  name: 'Fira Code',
  installer: 'font',
  ref: 'https://example.test/fira.zip',
}
const model: Item = {
  ...base,
  id: 'm',
  name: 'Qwen',
  installer: 'ollama',
  ref: 'qwen2.5-coder:7b',
  sizeMb: 4700,
}

const URL = 'https://example.test/?p=git&os=linux'

describe('linuxSupported', () => {
  it('accepts a winget item that declares a linux ref', () => {
    expect(linuxSupported(git)).toBe(true)
  })

  it('rejects a winget item with no linux ref', () => {
    expect(linuxSupported(docker)).toBe(false)
  })

  it('rejects wsl items, which cannot exist on linux', () => {
    expect(linuxSupported(distro)).toBe(false)
  })

  it('accepts portable installers without any linux ref', () => {
    expect(linuxSupported(model)).toBe(true)
  })
})

describe('generateBash', () => {
  it('starts with a shebang', () => {
    expect(generateBash([git], URL).startsWith('#!/usr/bin/env bash')).toBe(true)
  })

  it('never reads stdin, because curl | bash leaves no tty', () => {
    const script = generateBash([git], URL)
    expect(script).toContain('DEBIAN_FRONTEND=noninteractive')
    expect(script).toContain('-y')
    expect(script).not.toMatch(/\bread\s+-[rp]/)
  })

  it('closes stdin on the vendor install script it cannot audit', () => {
    // Our own commands are non-interactive by construction. A vendor script is
    // somebody else's code, so the no-tty rule is imposed on it from outside.
    expect(generateBash([ollama], URL)).toContain('bash "$tmp" </dev/null')
  })

  it('checks for non-interactive root rather than calling bare sudo', () => {
    const script = generateBash([git], URL)
    expect(script).toContain('id -u')
    expect(script).not.toMatch(/^\s*sudo /m)
  })

  it('quotes the url inside the suggested sudo one-liner', () => {
    // An unquoted `&` inside `$( )` backgrounds the curl and runs `os=linux`
    // as an assignment, so the user gets an empty script and no error.
    expect(generateBash([git], URL)).toContain("curl -fsSL '<script url>'")
  })

  it('does not set -e, so one failed package does not abort the run', () => {
    expect(generateBash([git], URL)).not.toMatch(/^set -e/m)
  })

  it('emits ASCII only', () => {
    expect(generateBash([git, model], URL)).toMatch(/^[\x00-\x7F]*$/)
  })

  it('uses the linux ref, never the windows one', () => {
    const script = generateBash([git], URL)
    expect(script).toContain('git')
    expect(script).not.toContain('Git.Git')
  })

  it('routes a script-installer item through the vendor helper', () => {
    const script = generateBash([ollama], URL)
    expect(script).toContain("script_install 'https://ollama.com/install.sh'")
    expect(script).not.toContain('apt_install')
  })

  it('runs a user-scoped vendor script as the invoking user, not as root', () => {
    // deno's installer unpacks into $HOME. Run as root that is /root/.deno --
    // a toolchain the desktop user never sees, which looks like success.
    const script = generateBash([deno], URL)
    expect(script).toContain("script_install 'https://deno.land/install.sh' user")
    expect(script).toContain('as_user()')
    expect(script).toContain('as_user bash "$tmp" </dev/null')
    // mktemp creates the file 0600 owned by root; without the chmod the
    // runuser target cannot read the script it is asked to run.
    expect(script).toContain('chmod 644 "$tmp"')
  })

  it('keeps a root vendor script running as root, without the user marker', () => {
    // Ollama's installer writes system-wide and needs root. The call must not
    // carry the user marker, and ollama alone must not drag in as_user.
    const script = generateBash([ollama], URL)
    expect(script).not.toContain("script_install 'https://ollama.com/install.sh' user")
    expect(script).not.toContain('as_user()')
  })

  it('names the items it dropped instead of silently omitting them', () => {
    const script = generateBash([git, docker, distro], URL)
    expect(script).toContain('Docker Desktop')
    expect(script).toContain('not available on Linux')
  })

  it('pulls ollama models last, as on windows', () => {
    expect(generateBash([model, git], URL).indexOf('qwen2.5-coder:7b')).toBeGreaterThan(
      generateBash([model, git], URL).indexOf('apt-get'),
    )
  })

  it('returns a runnable no-op when nothing is supported', () => {
    expect(generateBash([docker, distro], URL)).toContain('Nothing to install')
  })

  it('includes the share url so the script is traceable back to a selection', () => {
    expect(generateBash([git], URL)).toContain(URL)
  })

  it('emits only the helpers for the installers actually used', () => {
    const script = generateBash([git], URL)
    expect(script).toContain('apt_install()')
    expect(script).not.toContain('ollama_pull()')
  })

  it('runs user-scoped installers as the invoking user, not as root', () => {
    // Left as root these land in /root -- extensions the desktop user never
    // sees, pipx shims not on their PATH. That looks like success.
    const script = generateBash([ext], URL)
    expect(script).toContain('as_user code --install-extension')
    expect(script).toContain('runuser -u "$SUDO_USER" --')
  })

  it('omits the as_user helper when no phase writes into a home directory', () => {
    expect(generateBash([git], URL)).not.toContain('as_user()')
  })

  it('refreshes the apt index only when a phase installs through apt', () => {
    expect(generateBash([git], URL)).toContain('apt-get update -y')
    expect(generateBash([model], URL)).not.toContain('apt-get update -y')
  })

  it('numbers phases against the count of non-empty phases', () => {
    const script = generateBash([git, ext], URL)
    expect(script).toContain('[1/2]')
    expect(script).toContain('[2/2]')
    expect(script).not.toContain('[3/2]')
  })

  it('reports the total download size of what actually installs', () => {
    // `docker` is dropped on this target, so counting its bytes would promise
    // a download that never happens.
    expect(generateBash([model, { ...docker, sizeMb: 5000 }], URL)).toContain('4.6 GB')
  })

  it('emits no trailing whitespace on any line', () => {
    const offenders = generateBash([git, ollama, font, ext, model], URL)
      .split('\n')
      .filter((line) => /[^\S\n]+$/.test(line))
    expect(offenders).toEqual([])
  })

  it('neutralises a catalog ref that attempts shell injection via single-quote breakout', () => {
    const evil: Item = {
      ...base,
      id: 'evil',
      name: 'Evil',
      installer: 'winget',
      ref: 'W.W',
      linux: { installer: 'apt', ref: "foo'; echo INJECTED-VIA-REF; :'" },
    }
    const script = generateBash([evil], URL)
    const line = script.split('\n').find((l) => l.startsWith('apt_install '))
    expect(line).toBeDefined()
    // A bash single-quoted string ends at the first apostrophe and has NO
    // escape inside it, so PowerShell's doubling rule would produce `''` --
    // an empty string -- and let the rest of the payload out onto the command
    // line. `'\''` closes, escapes, reopens: the whole thing stays one word.
    expect(line).toBe(
      String.raw`apt_install 'foo'\''; echo INJECTED-VIA-REF; :'\'''  # Evil`,
    )
    const lines = script.split('\n')
    expect(lines.some((l) => /^\s*echo INJECTED-VIA-REF/.test(l))).toBe(false)
  })

  it('strips non-ascii from catalog strings, because the contract is ascii-only', () => {
    const accented: Item = {
      ...base,
      id: 'cafe',
      name: 'Café',
      installer: 'winget',
      ref: 'W.W',
      linux: { installer: 'apt', ref: 'café-’bin' },
    }
    const script = generateBash([accented], URL)
    expect(script).toMatch(/^[\x00-\x7F]*$/)
    expect(script).toContain("apt_install 'caf-bin'")
  })

  it('strips control characters from a catalog name so a newline cannot escape the trailing comment', () => {
    const evil: Item = {
      ...base,
      id: 'evil2',
      name: 'Evil\necho INJECTED-VIA-NAME',
      installer: 'winget',
      ref: 'W.W',
      linux: { installer: 'apt', ref: 'safe' },
    }
    const lines = generateBash([evil], URL).split('\n')
    expect(lines.some((l) => /^\s*echo INJECTED-VIA-NAME/.test(l))).toBe(false)
    const callLine = lines.find((l) => l.includes('INJECTED-VIA-NAME'))
    expect(callLine).toBeDefined()
    expect(callLine).toMatch(/#.*INJECTED-VIA-NAME/)
  })

  it('quotes a dropped item name too, since it is echoed rather than commented', () => {
    const evil: Item = {
      ...base,
      id: 'evil3',
      name: "Evil'; echo INJECTED-VIA-NAME; :'",
      installer: 'wsl',
      ref: 'Ubuntu',
    }
    const lines = generateBash([evil, git], URL).split('\n')
    expect(lines.some((l) => /^\s*echo INJECTED-VIA-NAME/.test(l))).toBe(false)
  })
})
