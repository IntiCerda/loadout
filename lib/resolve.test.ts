import { describe, it, expect } from 'vitest'
import { resolve, totalSizeMb, formatSize } from './resolve'
import type { Item } from './types'

const base = { description: '', category: 'tools', installer: 'winget' } as const

const items: Item[] = [
  { ...base, id: 'a', name: 'A', ref: 'A', sizeMb: 100 },
  { ...base, id: 'b', name: 'B', ref: 'B', requires: ['a'], sizeMb: 200 },
  { ...base, id: 'c', name: 'C', ref: 'C', requires: ['b'], sizeMb: 300 },
  { ...base, id: 'd', name: 'D', ref: 'D' },
  { ...base, id: 'x', name: 'X', ref: 'X', requires: ['y'] },
  { ...base, id: 'y', name: 'Y', ref: 'Y', requires: ['x'] },
]

describe('resolve', () => {
  it('returns an empty array for no ids', () => {
    expect(resolve([], items)).toEqual([])
  })

  it('drops ids that are not in the catalog', () => {
    expect(resolve(['a', 'nope'], items).map((i) => i.id)).toEqual(['a'])
  })

  it('pulls in a direct requirement', () => {
    expect(resolve(['b'], items).map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('pulls in requirements transitively', () => {
    expect(resolve(['c'], items).map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('deduplicates when two selections share a requirement', () => {
    expect(resolve(['b', 'c'], items).map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns items in catalog order regardless of selection order', () => {
    expect(resolve(['d', 'a'], items).map((i) => i.id)).toEqual(['a', 'd'])
  })

  it('terminates on a requires cycle', () => {
    expect(resolve(['x'], items).map((i) => i.id)).toEqual(['x', 'y'])
  })
})

describe('totalSizeMb', () => {
  it('sums known sizes and ignores missing ones', () => {
    expect(totalSizeMb(resolve(['c', 'd'], items))).toBe(600)
  })

  it('is zero for an empty selection', () => {
    expect(totalSizeMb([])).toBe(0)
  })
})

describe('formatSize', () => {
  it('renders a dash for zero', () => {
    expect(formatSize(0)).toBe('--')
  })

  it('renders megabytes below 1024', () => {
    expect(formatSize(820)).toBe('820 MB')
  })

  it('renders gigabytes with one decimal at or above 1024', () => {
    expect(formatSize(18841)).toBe('18.4 GB')
  })
})
