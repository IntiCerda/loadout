import { describe, it, expect } from 'vitest'
import { parseIds, serializeIds, MAX_IDS, MAX_RAW_LENGTH } from './url'

describe('parseIds', () => {
  it('returns an empty array for null', () => {
    expect(parseIds(null)).toEqual([])
  })

  it('splits on commas and trims whitespace', () => {
    expect(parseIds('git, vscode ,go')).toEqual(['git', 'vscode', 'go'])
  })

  it('drops empty segments', () => {
    expect(parseIds('git,,vscode,')).toEqual(['git', 'vscode'])
  })

  it('deduplicates while preserving first-seen order', () => {
    expect(parseIds('git,vscode,git')).toEqual(['git', 'vscode'])
  })

  it('drops ids with characters outside the allowed set', () => {
    expect(parseIds('git,<script>,vs code,ok-1')).toEqual(['git', 'ok-1'])
  })

  it('allows dots, colons, dashes and underscores used by model tags', () => {
    expect(parseIds('qwen2.5-coder_7b,nomic:latest')).toEqual([
      'qwen2.5-coder_7b',
      'nomic:latest',
    ])
  })

  it('caps the number of ids', () => {
    const many = Array.from({ length: MAX_IDS + 50 }, (_, i) => `id${i}`)
    expect(parseIds(many.join(','))).toHaveLength(MAX_IDS)
  })

  it('truncates the raw string before splitting it, not just the id list', () => {
    // Distinct, long ids on purpose. Both judges independently proved that
    // `'a,'.repeat(n)` is deduped to a single id and passes even with the
    // slice deleted -- a test that cannot fail is not a test.
    const pad = 'x'.repeat(90)
    const raw = Array.from({ length: 500 }, (_, i) => `id${i}${pad}`).join(',')
    expect(raw.length).toBeGreaterThan(MAX_RAW_LENGTH)

    // Roughly 86 of these fit in the 8192-character window, so MAX_IDS never
    // binds. Delete the slice and this returns MAX_IDS instead, and fails.
    const ids = parseIds(raw)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.length).toBeLessThan(MAX_IDS)
    expect(ids).not.toContain(`id499${pad}`)
  })
})

describe('serializeIds', () => {
  it('joins with commas', () => {
    expect(serializeIds(['git', 'vscode'])).toBe('git,vscode')
  })

  it('round-trips through parseIds', () => {
    const ids = ['git', 'vscode', 'qwen2.5-coder_7b']
    expect(parseIds(serializeIds(ids))).toEqual(ids)
  })
})
