import { describe, it, expect } from 'vitest'
import { CATEGORY_ORDER } from './types'
import { CATEGORY_HUES, categoryHue } from './hues'

describe('category hues', () => {
  it('gives every category a hue', () => {
    for (const category of CATEGORY_ORDER) {
      expect(
        CATEGORY_HUES[category],
        `${category} has no hue`,
      ).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('gives every category a distinct hue', () => {
    const hues = Object.values(CATEGORY_HUES)
    expect(new Set(hues).size).toBe(hues.length)
  })

  it('falls back to the brand accent for unknown ids', () => {
    expect(categoryHue('all')).toBe(CATEGORY_HUES.languages)
    expect(categoryHue('nonsense')).toBe(CATEGORY_HUES.languages)
  })
})
