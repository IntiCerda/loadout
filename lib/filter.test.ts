import { describe, it, expect } from 'vitest'
import {
  ALL,
  categoryEntries,
  filterItems,
  providersOf,
  readCategory,
  readProvider,
} from './filter'
import type { Item } from './types'

const base = { description: '', installer: 'ollama', ref: 'r' } as const

const items: Item[] = [
  { ...base, id: 'a', name: 'A', category: 'ai-models', provider: 'Meta' },
  { ...base, id: 'b', name: 'B', category: 'ai-models', provider: 'Alibaba' },
  { ...base, id: 'c', name: 'C', category: 'ai-models', provider: 'Meta' },
  { ...base, id: 'f', name: 'F', category: 'fonts', installer: 'font' },
]

describe('categoryEntries', () => {
  it('leads with All over the whole catalog', () => {
    expect(categoryEntries(items)[0]).toEqual({ id: ALL, label: 'All', count: 4 })
  })

  it('counts each category', () => {
    expect(categoryEntries(items).slice(1)).toEqual([
      { id: 'ai-models', label: 'Local AI models', count: 3 },
      { id: 'fonts', label: 'Fonts', count: 1 },
    ])
  })

  it('omits categories with no items, since they would filter to nothing', () => {
    expect(categoryEntries(items).map((e) => e.id)).not.toContain('tools')
  })
})

describe('readCategory', () => {
  it('falls back to All for null', () => {
    expect(readCategory(null)).toBe(ALL)
  })

  it('falls back to All for a category that does not exist', () => {
    expect(readCategory('not-a-category')).toBe(ALL)
  })

  it('accepts a known category', () => {
    expect(readCategory('fonts')).toBe('fonts')
  })
})

describe('providersOf', () => {
  it('lists distinct providers in first-seen order', () => {
    const inCategory = filterItems(items, 'ai-models', ALL)
    expect(providersOf(inCategory)).toEqual(['Meta', 'Alibaba'])
  })

  it('offers nothing when a single provider covers everything', () => {
    expect(providersOf([items[0], items[2]])).toEqual([])
  })

  it('offers nothing for a category with no providers at all', () => {
    expect(providersOf(filterItems(items, 'fonts', ALL))).toEqual([])
  })

  it('offers nothing when only some items carry a provider', () => {
    // The control would hide every untagged item behind a chip that never
    // names them, which is a filter that lies about the catalog.
    expect(providersOf(items)).toEqual([])
  })

  it('offers nothing for an empty set', () => {
    expect(providersOf([])).toEqual([])
  })
})

describe('readProvider', () => {
  const models = filterItems(items, 'ai-models', ALL)

  it('falls back to All for null', () => {
    expect(readProvider(null, models)).toBe(ALL)
  })

  it('accepts a provider the category offers', () => {
    expect(readProvider('Meta', models)).toBe('Meta')
  })

  it('drops a provider the category does not offer', () => {
    // Switching category with a provider still pinned must not strand the
    // user on an empty grid with no control left to clear it.
    expect(readProvider('Meta', filterItems(items, 'fonts', ALL))).toBe(ALL)
  })
})

describe('filterItems', () => {
  it('returns everything for All/All', () => {
    expect(filterItems(items, ALL, ALL)).toHaveLength(4)
  })

  it('filters by category', () => {
    expect(filterItems(items, 'fonts', ALL).map((i) => i.id)).toEqual(['f'])
  })

  it('filters by provider', () => {
    expect(filterItems(items, ALL, 'Meta').map((i) => i.id)).toEqual(['a', 'c'])
  })

  it('applies both filters together', () => {
    expect(filterItems(items, 'ai-models', 'Alibaba').map((i) => i.id)).toEqual([
      'b',
    ])
  })

  it('preserves catalog order', () => {
    expect(filterItems(items, 'ai-models', ALL).map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})
