import { describe, it, expect } from 'vitest'
import { catalog } from '@/data/catalog'
import { packs } from '@/data/packs'

const catalogIds = new Set(catalog.map((item) => item.id))

describe('packs integrity', () => {
  it('references only real catalog ids', () => {
    for (const pack of packs) {
      for (const id of pack.items) {
        expect(catalogIds, `${pack.slug} references missing ${id}`).toContain(id)
      }
    }
  })

  it('has unique slugs', () => {
    expect(new Set(packs.map((pack) => pack.slug)).size).toBe(packs.length)
  })

  /**
   * A chip reads as applied when every one of its ids is in the selection, and
   * the selection is the union of everything applied. So pairwise subset
   * checking is the wrong test: React Frontend once lit up green, having never
   * been clicked, because Go Backend union AI Agents covered it — and clicking
   * it then stripped ids out from under the two packs the user had actually
   * applied.
   *
   * Every pack needs at least one id that no combination of the others
   * supplies. That is a content rule, not a code rule: a pack with no
   * distinguishing tool is a pack with no identity.
   */
  it('gives every pack an id no union of the other packs can supply', () => {
    const offenders: string[] = []

    for (const target of packs) {
      const others = packs.filter((pack) => pack.slug !== target.slug)

      for (let mask = 1; mask < 1 << others.length; mask++) {
        const union = new Set<string>()
        others.forEach((pack, index) => {
          if ((mask >> index) & 1) pack.items.forEach((id) => union.add(id))
        })

        if (target.items.every((id) => union.has(id))) {
          const covering = others
            .filter((_, index) => (mask >> index) & 1)
            .map((pack) => pack.slug)
            .join(' + ')
          offenders.push(`${target.slug} is fully covered by ${covering}`)
          break
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
