export const BRAND = 'Loadout'
export const TAGLINE = 'Pick your stack. Get the recipe.'

/**
 * Layered: an explicit NEXT_PUBLIC_SITE_URL wins; otherwise Vercel's injected
 * production domain (server-side only — the metadata and OG URLs are built on
 * the server, which is exactly where being right matters: crawlers fetch the
 * absolute og:image URL, and the hardcoded fallback is NOT this deployment's
 * domain). In the client bundle the env vars are absent and the fallback
 * serves only as the pre-hydration snapshot that window.location immediately
 * replaces.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://loadout.vercel.app')
