import { describe, it, expect } from 'vitest'
import { catalog } from '@/data/catalog'
import { packs } from '@/data/packs'
import { PORTABLE_INSTALLERS } from './types'
import { resolve } from './resolve'

const ids = new Set(catalog.map((item) => item.id))

/**
 * Kept byte-identical to the pattern in `lib/url.ts`. An id that does not match
 * it is unreachable through a shared link: `parseIds` drops it, `resolve` never
 * sees it, and the item silently vanishes from the script the user thought they
 * had built.
 */
const ID_PATTERN = /^[a-z0-9][a-z0-9.\-:_]*$/

describe('catalog integrity', () => {
  it('has unique ids', () => {
    expect(ids.size).toBe(catalog.length)
  })

  it('has url-safe ids that survive parseIds', () => {
    for (const item of catalog) expect(item.id).toMatch(ID_PATTERN)
  })

  it('has no dangling requires', () => {
    for (const item of catalog) {
      for (const dep of item.requires ?? []) {
        expect(ids, `${item.id} requires missing ${dep}`).toContain(dep)
      }
    }
  })

  it('gives every item a non-empty name, description and ref', () => {
    for (const item of catalog) {
      expect(item.name.length, item.id).toBeGreaterThan(0)
      expect(item.description.length, item.id).toBeGreaterThan(0)
      expect(item.ref.length, item.id).toBeGreaterThan(0)
    }
  })

  it('never puts a linux ref on a portable installer, which needs none', () => {
    for (const item of catalog.filter((i) =>
      PORTABLE_INSTALLERS.includes(i.installer),
    )) {
      expect(
        item.linux,
        `${item.id} is portable and must not declare a linux ref`,
      ).toBeUndefined()
    }
  })

  it('never puts a linux ref on a wsl item, which cannot exist on linux', () => {
    for (const item of catalog.filter((i) => i.installer === 'wsl')) {
      expect(item.linux, item.id).toBeUndefined()
    }
  })

  it('requires ollama for every ollama model', () => {
    for (const item of catalog.filter((i) => i.installer === 'ollama')) {
      expect(item.requires ?? [], item.id).toContain('ollama')
    }
  })

  it('requires vscode for every vscode extension', () => {
    for (const item of catalog.filter((i) => i.installer === 'vscode')) {
      expect(item.requires ?? [], item.id).toContain('vscode')
    }
  })

  it('gives every ollama model a size, since they dominate the total', () => {
    for (const item of catalog.filter((i) => i.installer === 'ollama')) {
      expect(item.sizeMb, item.id).toBeGreaterThan(0)
    }
  })
})

// Pack integrity already lives in lib/packs.test.ts, landed in Task 10 --
// including the union-containment rule. Do not duplicate it here. Add only
// this one, which that file does not cover:
describe('packs resolve', () => {
  it('resolves every pack to a non-empty selection', () => {
    for (const pack of packs) {
      expect(resolve(pack.items, catalog).length, pack.slug).toBeGreaterThan(0)
    }
  })
})
