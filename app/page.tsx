import type { Metadata } from "next";
import { catalog } from "@/data/catalog";
import { BRAND } from "@/lib/brand";
import { formatSize, resolve, totalSizeMb } from "@/lib/resolve";
import { parseIds, serializeIds } from "@/lib/url";
import Home from "./home";

/**
 * A shared kit link unfurls with its own card. The ids go through the same
 * parseIds -> resolve pipeline as everywhere else, so only catalog strings
 * reach the metadata — the query string itself never does. An empty or
 * unresolvable `p` returns {} and the file-convention opengraph-image keeps
 * serving the generic card.
 */
export async function generateMetadata({
  searchParams,
}: PageProps<"/">): Promise<Metadata> {
  const params = await searchParams;
  const raw = params.p;
  // Repeated `p` parameters merge instead of the first (possibly empty) one
  // winning — same reasoning as app/api/script/route.ts.
  const ids = parseIds(Array.isArray(raw) ? raw.join(",") : (raw ?? null));
  const items = resolve(ids, catalog);
  if (items.length === 0) return {};

  const size = formatSize(totalSizeMb(items));
  const title = `${BRAND} kit — ${items.length} item${
    items.length === 1 ? "" : "s"
  }, ${size}`;
  const names = items.slice(0, 4).map((item) => item.name);
  const rest = items.length - names.length;
  const description = `${names.join(", ")}${
    rest > 0 ? ` and ${rest} more` : ""
  }. One script installs it all.`;
  // Resolved ids, not the raw query, for the same reason as the share URL:
  // the card always describes a selection that exists in the catalog.
  const image = `/api/og?p=${serializeIds(items.map((item) => item.id))}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function Page() {
  return <Home />;
}
