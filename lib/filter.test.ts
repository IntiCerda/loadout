import { describe, it, expect } from 'vitest'
import {
  ALL,
  categoryEntries,
  filterItems,
  packApplied,
  providersOf,
  readCategory,
  readPack,
  readProvider,
  readQuery,
  searchItems,
} from './filter'
import type { Item, Pack } from './types'

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

const testPacks: Pack[] = [
  { slug: 'go-backend', name: 'Go Backend', description: '', items: ['a', 'b'] },
  { slug: 'fonts-only', name: 'Fonts', description: '', items: ['f'] },
]

describe('readPack', () => {
  it('returns null for null', () => {
    expect(readPack(null, testPacks)).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(readPack('', testPacks)).toBeNull()
  })

  it('returns a slug that names a real pack', () => {
    expect(readPack('go-backend', testPacks)).toBe('go-backend')
  })

  it('drops a slug no pack answers to, so a stale link renders the catalog', () => {
    expect(readPack('go-frontend', testPacks)).toBeNull()
  })

  it('is case sensitive, since slugs are lower case by construction', () => {
    expect(readPack('Go-Backend', testPacks)).toBeNull()
  })
})

describe('packApplied', () => {
  it('is false when nothing is selected', () => {
    expect(packApplied(['a', 'b'], new Set())).toBe(false)
  })

  it('is false when only some ids are selected', () => {
    expect(packApplied(['a', 'b'], new Set(['a']))).toBe(false)
  })

  it('is true when every id is selected', () => {
    expect(packApplied(['a', 'b'], new Set(['a', 'b']))).toBe(true)
  })

  it('ignores selections the pack does not contain', () => {
    expect(packApplied(['a'], new Set(['a', 'z']))).toBe(true)
  })
})

describe('readQuery', () => {
  it('passes text through', () => {
    expect(readQuery('rip grep')).toBe('rip grep')
  })

  it('is empty for an absent parameter', () => {
    expect(readQuery(null)).toBe('')
  })

  it('caps a hostile payload at 100 characters', () => {
    expect(readQuery('x'.repeat(5000))).toHaveLength(100)
  })
})

describe('searchItems', () => {
  const searchable: Item[] = [
    { ...base, id: 'ripgrep', name: 'ripgrep', description: 'Recursive regex search.', category: 'tools' },
    { ...base, id: 'q14', name: 'Qwen2.5 14B', description: 'Coding model.', category: 'ai-models', provider: 'Alibaba' },
  ]

  it('filters nothing on an empty or whitespace query', () => {
    expect(searchItems(searchable, '')).toEqual(searchable)
    expect(searchItems(searchable, '   ')).toEqual(searchable)
  })

  it('matches the name case-insensitively', () => {
    expect(searchItems(searchable, 'RIPGREP').map((i) => i.id)).toEqual(['ripgrep'])
  })

  it('matches description and provider text', () => {
    expect(searchItems(searchable, 'regex').map((i) => i.id)).toEqual(['ripgrep'])
    expect(searchItems(searchable, 'alibaba').map((i) => i.id)).toEqual(['q14'])
  })

  it('returns nothing when nothing matches', () => {
    expect(searchItems(searchable, 'zzz-no-match')).toEqual([])
  })
})
