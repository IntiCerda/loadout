import { catalog } from '@/data/catalog'
import { BRAND, SITE_URL } from '@/lib/brand'
import { generateScript } from '@/lib/generate'
import { generateBash } from '@/lib/generate-linux'
import { resolve } from '@/lib/resolve'
import { parseIds, serializeIds } from '@/lib/url'

const FILENAME = `${BRAND.toLowerCase()}-setup`

export function GET(req: Request): Response {
  const url = new URL(req.url)

  // Merge repeated `p` parameters rather than letting the first one win.
  // `?p=&p=git` would otherwise serve an empty script because the empty first
  // value shadows the real one.
  const ids = parseIds(url.searchParams.getAll('p').join(','))
  const items = resolve(ids, catalog)

  // Two independent reasons this is derived from the request rather than from
  // SITE_URL. First, NEXT_PUBLIC_SITE_URL is inlined into the client bundle at
  // BUILD time but read here at RUNTIME, so setting it after a deploy makes the
  // server emit one host and the live preview emit another — the previewed and
  // delivered scripts stop being byte-identical, and every local check still
  // passes. Second, on a Vercel preview deployment SITE_URL points at
  // production, so a one-liner copied from a preview would install from prod.
  const origin = url.origin || SITE_URL

  // Built from resolved ids, not from the raw query — the script always links
  // back to a selection that actually exists in the catalog. This is what keeps
  // query-string input out of the generated script entirely.
  // Anything other than the exact string `linux` is Windows. Every link shared
  // before this parameter existed carries no `os` at all and must keep serving
  // PowerShell, so Windows is the default rather than a detected value.
  const linux = url.searchParams.get('os') === 'linux'

  const shareUrl =
    `${origin}/?p=${serializeIds(items.map((item) => item.id))}` +
    (linux ? '&os=linux' : '')
  const script = linux
    ? generateBash(items, shareUrl)
    : generateScript(items, shareUrl)

  const headers = new Headers({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  })

  if (url.searchParams.get('download') === '1') {
    headers.set(
      'Content-Disposition',
      `attachment; filename="${FILENAME}.${linux ? 'sh' : 'ps1'}"`,
    )
  }

  return new Response(script, { headers })
}
