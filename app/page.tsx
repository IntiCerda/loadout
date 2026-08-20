"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { catalog } from "@/data/catalog";
import { packs } from "@/data/packs";
import { generateScript } from "@/lib/generate";
import { generateBash, linuxSupported } from "@/lib/generate-linux";
import { resolve, totalSizeMb } from "@/lib/resolve";
import { parseIds, serializeIds } from "@/lib/url";
import { SITE_URL } from "@/lib/brand";
import type { Os } from "@/lib/types";
import { Hero } from "@/components/hero";
import { CatalogGrid } from "@/components/catalog-grid";
import { PackChips } from "@/components/pack-chips";
import { KitSidebar } from "@/components/kit-sidebar";
import { ScriptPreview } from "@/components/script-preview";

/**
 * `history.replaceState` fires no event, so selection changes announce
 * themselves. A custom name rather than a synthetic `popstate`, which the App
 * Router also listens for.
 */
const SELECTION_EVENT = "loadout:selection";

function subscribeToUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(SELECTION_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(SELECTION_EVENT, onChange);
  };
}

/** Anything but the exact string `linux` is Windows, matching the route. */
function readOs(params: URLSearchParams): Os {
  return params.get("os") === "linux" ? "linux" : "windows";
}

/**
 * Built by hand rather than with `URLSearchParams.toString`, which percent-
 * encodes the commas separating the ids. `parseIds` would still decode them,
 * but the address bar is the shareable artefact here and `?p=git%2Cvscode` is
 * not the link the header of the generated script quotes back.
 */
function hrefFor(ids: string[], os: Os): string {
  const query = serializeIds(ids);
  const parts = [
    query ? `p=${query}` : "",
    os === "linux" ? "os=linux" : "",
  ].filter(Boolean);
  return parts.length
    ? `${window.location.pathname}?${parts.join("&")}`
    : window.location.pathname;
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

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const selectedIds = useMemo(() => parseIds(params.get("p")), [params]);

  // The target OS lives in the URL alongside the selection rather than in
  // component state, so a shared link reproduces the whole kit — including
  // which script it was built for — and the URL the generated header quotes
  // back is the one that renders that same script.
  const os = readOs(params);
  const linux = os === "linux";

  // The single writer for the URL. Every mutation reads the live URL,
  // transforms it and mirrors the result back without a navigation, so the
  // address bar is always a shareable link. Reading `window.location` here
  // rather than closing over the render's values keeps these callbacks stable
  // and keeps the URL — not a captured render — as the source of truth.
  const commit = useCallback((ids: string[], target: Os) => {
    window.history.replaceState(null, "", hrefFor(ids, target));
    window.dispatchEvent(new Event(SELECTION_EVENT));
  }, []);

  const update = useCallback(
    (next: (current: string[]) => string[]) => {
      const live = new URLSearchParams(window.location.search);
      commit(next(parseIds(live.get("p"))), readOs(live));
    },
    [commit],
  );

  const setOs = useCallback(
    (target: Os) => {
      const live = new URLSearchParams(window.location.search);
      commit(parseIds(live.get("p")), target);
    },
    [commit],
  );

  const toggle = useCallback(
    (id: string) => {
      update((current) =>
        current.includes(id)
          ? current.filter((existing) => existing !== id)
          : [...current, id],
      );
    },
    [update],
  );

  // Applying a pack adds its items; clicking an already-applied pack removes
  // exactly the ids it contributed, so packs compose instead of overwriting
  // and anything selected by hand survives.
  const applyPack = useCallback(
    (ids: string[]) => {
      update((current) =>
        ids.every((id) => current.includes(id))
          ? current.filter((id) => !ids.includes(id))
          : [...current, ...ids.filter((id) => !current.includes(id))],
      );
    },
    [update],
  );

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
  const shareUrl = `${origin}/?p=${query}${linux ? "&os=linux" : ""}`;

  // What the chosen target can actually install. The Linux script names what
  // it dropped, but the count and the download total in the sidebar have to
  // describe the same thing the script does, or the two disagree in front of
  // the user.
  const installable = useMemo(
    () => (linux ? resolved.filter(linuxSupported) : resolved),
    [linux, resolved],
  );

  const script = useMemo(
    () =>
      linux
        ? generateBash(resolved, shareUrl)
        : generateScript(resolved, shareUrl),
    [linux, resolved, shareUrl],
  );
  const sizeMb = useMemo(() => totalSizeMb(installable), [installable]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Hero origin={origin} />

      <div className="mb-8">
        <PackChips packs={packs} selectedIds={selectedSet} onApply={applyPack} />
      </div>

      <div className="mb-8">
        <ScriptPreview script={script} os={os} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <CatalogGrid
          items={catalog}
          selectedIds={selectedSet}
          requiredIds={requiredSet}
          os={os}
          onToggle={toggle}
        />
        <KitSidebar
          items={installable}
          droppedCount={resolved.length - installable.length}
          sizeMb={sizeMb}
          query={query}
          origin={origin}
          os={os}
          onOsChange={setOs}
        />
      </div>
    </main>
  );
}
