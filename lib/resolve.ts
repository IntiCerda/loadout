import type { Item } from './types'

/**
 * Expand a selection into the full set of items that must be installed,
 * following `requires` transitively. Unknown ids are dropped — the catalog is
 * the allowlist, which is what keeps query-string input out of the generated
 * script. The result is returned in catalog order so the emitted script is
 * deterministic for a given selection regardless of click order.
 */
export function resolve(ids: string[], items: Item[]): Item[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  const selected = new Set<string>()

  // `selected.add` MUST run before the recursive loop. It is what makes the
  // guard on the first line load-bearing: an id can pass the guard at most
  // once, so a `requires` cycle unwinds instead of blowing the stack. Moving
  // the add after the loop turns x->y->x into infinite recursion.
  //
  // This collapses DFS's "in progress" and "finished" marks into one Set,
  // which is only safe because the output order comes from `items.filter`
  // (catalog order), never from DFS finish order. If output ever needs to be
  // dependency-ordered, this shortcut stops being valid and a separate
  // in-progress set is required to tell a cycle from a diamond.
  const visit = (id: string): void => {
    if (selected.has(id)) return
    const item = byId.get(id)
    if (!item) return
    selected.add(id)
    for (const dep of item.requires ?? []) visit(dep)
  }

  for (const id of ids) visit(id)

  return items.filter((item) => selected.has(item.id))
}

export function totalSizeMb(items: Item[]): number {
  return items.reduce((sum, item) => sum + (item.sizeMb ?? 0), 0)
}

export function formatSize(mb: number): string {
  if (mb <= 0) return '--'
  const rounded = Math.round(mb)
  if (rounded < 1024) return `${rounded} MB`
  return `${(rounded / 1024).toFixed(1)} GB`
}
