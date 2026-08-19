import { describe, it, expect } from 'vitest'
import { parseIds, serializeIds, MAX_IDS } from './url'

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
