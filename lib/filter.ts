import { CATEGORY_LABELS, CATEGORY_ORDER, type Item } from './types'

/**
 * Sentinel for "no filter". It is not a category id and no provider is named
 * this, so it can share the `cat` and `prov` query parameters with real values
 * without an escape rule.
 */
export const ALL = 'all'

export type CategoryEntry = {
  /** A `Category` id, or `ALL`. */
  id: string
  label: string
  count: number
}

/**
 * The rail. Empty categories are dropped rather than shown at zero: the rail
 * is a filter, and an entry that filters to nothing is a dead end.
 */
export function categoryEntries(items: Item[]): CategoryEntry[] {
  const counted = CATEGORY_ORDER.map((category) => ({
    id: category as string,
    label: CATEGORY_LABELS[category],
    count: items.filter((item) => item.category === category).length,
  })).filter((entry) => entry.count > 0)

  return [{ id: ALL, label: 'All', count: items.length }, ...counted]
}

/**
 * Category from the query string. Anything that is not a known category id
 * falls back to `ALL`, so a stale or hand-edited link renders the catalog
 * instead of an empty grid.
 */
export function readCategory(raw: string | null): string {
  return raw && (CATEGORY_ORDER as string[]).includes(raw) ? raw : ALL
}

/**
 * Distinct providers among `items`, first-seen (catalog) order.
 *
 * Returns nothing unless EVERY item carries a provider and at least two are
 * distinct. A single provider is not a choice, and a partial one is worse than
 * none: picking a chip would silently hide every untagged item, so the control
 * would lie about what the category contains.
 */
export function providersOf(items: Item[]): string[] {
  const seen = new Set<string>()
  for (const item of items) {
    if (!item.provider) return []
    seen.add(item.provider)
  }
  return seen.size > 1 ? [...seen] : []
}

/**
 * Provider from the query string, validated against the providers the current
 * category actually offers — otherwise switching category while a provider is
 * pinned leaves an empty grid and no visible control to clear it.
 */
export function readProvider(raw: string | null, inCategory: Item[]): string {
  return raw && providersOf(inCategory).includes(raw) ? raw : ALL
}

export function filterItems(
  items: Item[],
  category: string,
  provider: string,
): Item[] {
  return items.filter(
    (item) =>
      (category === ALL || item.category === category) &&
      (provider === ALL || item.provider === provider),
  )
}
