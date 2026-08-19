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
    expect(generateScript([git, ext, model], URL)).not.toContain('param(')
  })

  it('never emits a top-level exit, because it would close the console', () => {
    const lines = generateScript([git], URL).split('\n')
    expect(lines.some((l) => /^\s*exit\b/.test(l))).toBe(false)
  })

  it('emits an administrator check', () => {
    expect(generateScript([git], URL)).toContain('WindowsBuiltInRole]::Administrator')
  })

  it('emits ASCII only', () => {
    // eslint-disable-next-line no-control-regex
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

  it('returns a runnable no-op message for an empty selection', () => {
    const script = generateScript([], URL)
    expect(script).toContain('Nothing selected')
    expect(script).not.toContain('function Install-WingetPackage')
  })
})
