"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { catalog } from "@/data/catalog";
import { generateScript } from "@/lib/generate";
import { resolve, totalSizeMb } from "@/lib/resolve";
import { parseIds, serializeIds } from "@/lib/url";
import { SITE_URL } from "@/lib/brand";
import { CatalogGrid } from "@/components/catalog-grid";
import { KitSidebar } from "@/components/kit-sidebar";
import { ScriptPreview } from "@/components/script-preview";

/**
 * `history.replaceState` fires no event, so selection changes announce
 * themselves. A custom name rather than a synthetic `popstate`, which the App
 * Router also listens for.
 */
const SELECTION_EVENT = "pila:selection";

function subscribeToUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(SELECTION_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(SELECTION_EVENT, onChange);
  };
}

export default function Page() {
  // The query string IS the selection state — there is no second copy to keep
  // in sync. `useSyncExternalStore` renders the server snapshot during
  // hydration and only then reads the real URL, so server and client HTML
  // match without an effect that writes state on mount.
  const search = useSyncExternalStore(
    subscribeToUrl,
    () => window.location.search,
    () => "",
  );

  const selectedIds = useMemo(
    () => parseIds(new URLSearchParams(search).get("p")),
    [search],
  );

  // Mirror the new selection into the URL without a navigation, so the address
  // bar is always a shareable link.
  const toggle = useCallback((id: string) => {
    const current = parseIds(
      new URLSearchParams(window.location.search).get("p"),
    );
    const next = current.includes(id)
      ? current.filter((existing) => existing !== id)
      : [...current, id];

    const query = serializeIds(next);
    window.history.replaceState(
      null,
      "",
      query
        ? `${window.location.pathname}?p=${query}`
        : window.location.pathname,
    );
    window.dispatchEvent(new Event(SELECTION_EVENT));
  }, []);

  const resolved = useMemo(() => resolve(selectedIds, catalog), [selectedIds]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const requiredSet = useMemo(
    () =>
      new Set(
        resolved.map((item) => item.id).filter((id) => !selectedSet.has(id)),
      ),
    [resolved, selectedSet],
  );

  // Must match how app/api/script/route.ts builds it, or the previewed script
  // stops being byte-identical to the delivered one. Both derive from the live
  // origin; SITE_URL is build-time-inlined here and would skew after an env
  // change or on a preview deployment, so it serves only as the server
  // snapshot that keeps hydration quiet.
  const origin = useSyncExternalStore(
    subscribeToUrl,
    () => window.location.origin,
    () => SITE_URL,
  );

  // Resolved rather than raw ids, so the share link, the one-liner and the
  // route all describe the same complete selection.
  const query = serializeIds(resolved.map((item) => item.id));
  const shareUrl = `${origin}/?p=${query}`;
  const script = useMemo(
    () => generateScript(resolved, shareUrl),
    [resolved, shareUrl],
  );
  const sizeMb = useMemo(() => totalSizeMb(resolved), [resolved]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <CatalogGrid
          items={catalog}
          selectedIds={selectedSet}
          requiredIds={requiredSet}
          onToggle={toggle}
        />
        <KitSidebar
          items={resolved}
          sizeMb={sizeMb}
          query={query}
          origin={origin}
        >
          <ScriptPreview script={script} />
        </KitSidebar>
      </div>
    </main>
  );
}
