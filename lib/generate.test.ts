import { describe, it, expect } from 'vitest'
import { generateScript } from './generate'
import type { Item } from './types'

const base = { description: '', category: 'tools' } as const

const git: Item = { ...base, id: 'git', name: 'Git', installer: 'winget', ref: 'Git.Git' }
const ext: Item = { ...base, id: 'ext', name: 'GitLens', installer: 'vscode', ref: 'eamodio.gitlens' }
const model: Item = { ...base, id: 'm', name: 'Qwen', installer: 'ollama', ref: 'qwen2.5-coder:7b', sizeMb: 4700 }

const URL = 'https://example.test/?p=git'

describe('generateScript', () => {
  it('never emits a param block, because iex rejects it', () => {
    expect(generateScript([git, ext, model], URL).toLowerCase()).not.toContain('param(')
  })

  it('never emits a top-level exit, because it would close the console', () => {
    const lines = generateScript([git], URL).split('\n')
    expect(lines.some((l) => /^\s*exit\b/i.test(l))).toBe(false)
  })

  it('emits an administrator check', () => {
    expect(generateScript([git], URL)).toContain('WindowsBuiltInRole]::Administrator')
  })

  it('emits ASCII only', () => {
    expect(generateScript([git, ext, model], URL)).toMatch(/^[\x00-\x7F]*$/)
  })

  it('includes the share url so the script is traceable back to a selection', () => {
    expect(generateScript([git], URL)).toContain(URL)
  })

  it('emits only the helpers for the installers actually used', () => {
    const script = generateScript([git], URL)
    expect(script).toContain('function Install-WingetPackage')
    expect(script).not.toContain('function Install-OllamaModel')
  })

  it('emits the ref of each selected item', () => {
    const script = generateScript([git, ext, model], URL)
    expect(script).toContain('Git.Git')
    expect(script).toContain('eamodio.gitlens')
    expect(script).toContain('qwen2.5-coder:7b')
  })

  it('refreshes PATH after winget so later phases can find new commands', () => {
    const script = generateScript([git, ext], URL)
    const wingetAt = script.indexOf('Git.Git')
    const pathAt = script.indexOf("GetEnvironmentVariable('Path','Machine')")
    const extAt = script.indexOf('eamodio.gitlens')
    expect(wingetAt).toBeLessThan(pathAt)
    expect(pathAt).toBeLessThan(extAt)
  })

  it('pulls ollama models last, since they are the largest downloads', () => {
    const script = generateScript([model, git, ext], URL)
    expect(script.indexOf('qwen2.5-coder:7b')).toBeGreaterThan(script.indexOf('eamodio.gitlens'))
  })

  it('numbers phases against the count of non-empty phases', () => {
    const script = generateScript([git, ext], URL)
    expect(script).toContain('[1/2]')
    expect(script).toContain('[2/2]')
    expect(script).not.toContain('[3/2]')
  })

  it('reports the total download size in the header', () => {
    expect(generateScript([model], URL)).toContain('4.6 GB')
  })

  it('preflights winget, because Windows 10 does not always have it', () => {
    const script = generateScript([git], URL)
    expect(script).toContain('Get-Command winget')
    expect(script).toContain('9NBLGGH4NNS1')
  })

  it('omits the winget preflight when no winget items are selected', () => {
    expect(generateScript([model], URL)).not.toContain('9NBLGGH4NNS1')
  })

  it('preflights the Windows build number when wsl items are selected', () => {
    const distro: Item = { ...base, id: 'u', name: 'Ubuntu', installer: 'wsl', ref: 'Ubuntu' }
    expect(generateScript([distro], URL)).toContain('19041')
  })

  it('omits the wsl preflight when no wsl items are selected', () => {
    expect(generateScript([git], URL)).not.toContain('19041')
  })

  it('initialises the wsl skip flag, because iex runs in the caller session scope', () => {
    const distro: Item = { ...base, id: 'u', name: 'Ubuntu', installer: 'wsl', ref: 'Ubuntu' }
    const script = generateScript([distro], URL)
    // Found by running it, not by reading it: without this init a user on an
    // old build who runs Windows Update and re-runs in the SAME console
    // inherits a stale $true and gets WSL silently skipped forever.
    expect(script).toContain('$script:SkipWsl = $false')
    expect(script.indexOf('$script:SkipWsl = $false')).toBeLessThan(
      script.indexOf('$script:SkipWsl = $true'),
    )
  })

  it('emits no trailing whitespace on any line', () => {
    const offenders = generateScript([git, ext, model], URL)
      .split('\n')
      .filter((line) => /[^\S\n]+$/.test(line))
    expect(offenders).toEqual([])
  })

  it('strips non-ascii from catalog strings, because the contract is ascii-only', () => {
    const accented: Item = {
      ...base,
      id: 'cafe',
      name: 'Caf\u00e9',
      installer: 'winget',
      ref: 'Fo\u2019o.Bar-\u00e9',
    }
    const script = generateScript([accented], URL)
    // A contributor pasting a smart quote or an accent from a doc must not
    // silently break `irm | iex` decoding. U+202E is stripped by the same
    // rule, so a bidi override cannot make a comment read as something other
    // than what it runs.
    expect(script).toMatch(/^[\x00-\x7F]*$/)
    expect(script).toContain("Install-WingetPackage 'Foo.Bar-'")
  })

  it('strips path separators from the font id, which lands inside Join-Path', () => {
    const evil: Item = {
      ...base,
      id: '..',
      name: 'Traversal',
      installer: 'font',
      ref: 'https://example.test/f.zip',
    }
    // Quoting stops command injection; Join-Path does not normalise `..`, so
    // traversal is a separate bug class needing a separate rule.
    const line = generateScript([evil], URL)
      .split('\n')
      .find((l) => l.startsWith('Install-Font '))
    expect(line).toBe("Install-Font 'https://example.test/f.zip' ''  # Traversal")
  })

  it('returns a runnable no-op message for an empty selection', () => {
    const script = generateScript([], URL)
    expect(script).toContain('Nothing selected')
    expect(script).not.toContain('function Install-WingetPackage')
  })

  it('neutralises a catalog ref that attempts PowerShell injection via double-quote breakout', () => {
    const evil: Item = {
      ...base,
      id: 'evil',
      name: 'Evil',
      installer: 'winget',
      ref: 'Foo"; Write-Host "INJECTED-VIA-REF" -ForegroundColor Magenta; Write-Host "',
    }
    const script = generateScript([evil], URL)
    const line = script.split('\n').find((l) => l.startsWith('Install-WingetPackage '))
    expect(line).toBeDefined()
    // The payload lands only inside a single-quoted literal, so it is inert
    // -- confirmed by the whole call being one quoted argument, not by the
    // substring being absent (it legitimately appears, just neutralised).
    expect(line).toMatch(
      /^Install-WingetPackage 'Foo"; Write-Host "INJECTED-VIA-REF" -ForegroundColor Magenta; Write-Host "'/,
    )
    // No stray Write-Host call escapes onto its own executable line.
    const lines = script.split('\n')
    expect(lines.some((l) => /^\s*Write-Host "INJECTED-VIA-REF"/.test(l))).toBe(false)
  })

  it('strips control characters from a catalog name so a newline cannot escape the trailing comment', () => {
    const evil: Item = {
      ...base,
      id: 'evil2',
      name: 'Evil\nWrite-Host "INJECTED-VIA-NAME"',
      installer: 'winget',
      ref: 'Safe.Ref',
    }
    const script = generateScript([evil], URL)
    // The newline is stripped, so the payload stays glued onto the same
    // comment line as the call instead of starting an executable line of
    // its own.
    const lines = script.split('\n')
    expect(lines.some((l) => /^\s*Write-Host "INJECTED-VIA-NAME"/.test(l))).toBe(false)
    const callLine = lines.find((l) => l.includes('INJECTED-VIA-NAME'))
    expect(callLine).toBeDefined()
    expect(callLine).toMatch(/#.*INJECTED-VIA-NAME/)
  })
})
