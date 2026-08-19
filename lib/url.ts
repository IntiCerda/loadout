/**
 * Hard cap on ids accepted from a query string. Selecting the entire catalog
 * stays well under this; anything above it is a malformed or hostile URL.
 */
export const MAX_IDS = 300

/**
 * Hard cap on the raw query-string length considered at all. This bounds the
 * work `split(',')` does before `MAX_IDS` can break the loop, not the number
 * of ids accepted -- a hostile URL with megabytes of commas must not pay for
 * a full split just to be truncated afterwards.
 */
export const MAX_RAW_LENGTH = 8192

/**
 * Ids must start alphanumeric and may then contain dots, colons, dashes and
 * underscores — enough for Ollama model tags like `qwen2.5-coder:7b`.
 */
const ID_PATTERN = /^[a-z0-9][a-z0-9.\-:_]*$/

export function parseIds(raw: string | null): string[] {
  if (!raw) return []
  const bounded = raw.length > MAX_RAW_LENGTH ? raw.slice(0, MAX_RAW_LENGTH) : raw
  const seen = new Set<string>()
  const out: string[] = []
  for (const segment of bounded.split(',')) {
    const id = segment.trim().toLowerCase()
    if (!id || seen.has(id) || !ID_PATTERN.test(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length === MAX_IDS) break
  }
  return out
}

export function serializeIds(ids: string[]): string {
  return ids.join(',')
}
