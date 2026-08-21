"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { catalog } from "@/data/catalog";
import { packs } from "@/data/packs";
import { generateScript } from "@/lib/generate";
import { generateBash, linuxSupported } from "@/lib/generate-linux";
import {
  dependencyIds,
  formatSize,
  resolve,
  totalSizeMb,
} from "@/lib/resolve";
import { parseIds, serializeIds } from "@/lib/url";
import {
  ALL,
  categoryEntries,
  filterItems,
  packApplied,
  providersOf,
  readCategory,
  readPack,
  readProvider,
} from "@/lib/filter";
import { SITE_URL } from "@/lib/brand";
import type { Os } from "@/lib/types";
import { Hero } from "@/components/hero";
import { CatalogGrid } from "@/components/catalog-grid";
import { CategoryRail } from "@/components/category-rail";
import { ProviderChips } from "@/components/provider-chips";
import { PackChips } from "@/components/pack-chips";
import { PackPreviewBar } from "@/components/pack-preview-bar";
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

/**
 * Publishes the sticky band's own height as `--band-h`, which is what the rail
 * and the kit panel stick to. A constant would be a lie: the band grows when
 * the script panel opens and again when a pack preview bar appears, and a rail
 * pinned to a stale number would spend that time hidden behind it.
 *
 * A ref callback with a cleanup, not an effect — `react-hooks/set-state-in-
 * effect` is an error in this config, and there is no state here anyway: the
 * measurement goes straight into a custom property that CSS reads.
 */
function measureBand(node: HTMLDivElement | null) {
  if (!node) return;
  const observer = new ResizeObserver(() => {
    document.documentElement.style.setProperty(
      "--band-h",
      `${node.offsetHeight}px`,
    );
  });
  observer.observe(node);
  return () => observer.disconnect();
}

/** Anything but the exact string `linux` is Windows, matching the route. */
function readOs(params: URLSearchParams): Os {
  return params.get("os") === "linux" ? "linux" : "windows";
}

/**
 * Which slice of the catalog is on screen. Deliberately NOT part of `?p=`:
 * that parameter is the kit, it is what the generated script is built from and
 * what a shared link promises, and browsing must never change it.
 *
 * `pack` is the pack being previewed. It lives here rather than in React state
 * for the same reason the rest of this does — one source of truth, readable
 * from the live URL inside every writer — and it is a view, not a selection:
 * entering and leaving a preview never touches `?p=`.
 */
type View = { category: string; provider: string; pack: string | null };

function readView(params: URLSearchParams): View {
  const category = readCategory(params.get("cat"));
  return {
    category,
    provider: readProvider(
      params.get("prov"),
      filterItems(catalog, category, ALL),
    ),
    pack: readPack(params.get("pack"), packs),
  };
}

/**
 * Built by hand rather than with `URLSearchParams.toString`, which percent-
 * encodes the commas separating the ids. `parseIds` would still decode them,
 * but the address bar is the shareable artefact here and `?p=git%2Cvscode` is
 * not the link the header of the generated script quotes back.
 */
function hrefFor(ids: string[], os: Os, view: View): string {
  const query = serializeIds(ids);
  const parts = [
    query ? `p=${query}` : "",
    os === "linux" ? "os=linux" : "",
    view.category === ALL ? "" : `cat=${encodeURIComponent(view.category)}`,
    view.provider === ALL ? "" : `prov=${encodeURIComponent(view.provider)}`,
    view.pack ? `pack=${encodeURIComponent(view.pack)}` : "",
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
  const commit = useCallback((ids: string[], target: Os, view: View) => {
    window.history.replaceState(null, "", hrefFor(ids, target, view));
    window.dispatchEvent(new Event(SELECTION_EVENT));
  }, []);

  const update = useCallback(
    (next: (current: string[]) => string[], view?: View) => {
      const live = new URLSearchParams(window.location.search);
      commit(
        next(parseIds(live.get("p"))),
        readOs(live),
        view ?? readView(live),
      );
    },
    [commit],
  );

  const setOs = useCallback(
    (target: Os) => {
      const live = new URLSearchParams(window.location.search);
      commit(parseIds(live.get("p")), target, readView(live));
    },
    [commit],
  );

  // Both writers carry the selection through untouched, so filtering never
  // edits the kit. Changing category drops the provider: it belongs to the
  // category that offered it, and `readProvider` would discard it on the next
  // read anyway, leaving a dead parameter in a shared link.
  //
  // They also drop the pack preview. Clicking a category while previewing is
  // an unambiguous request to see that slice of the catalog, and the honest
  // answer is to give it: disabling the rail mid-preview would leave the user
  // holding a dead control with nothing on screen to say why. Leaving a
  // preview costs nothing, because a preview changes nothing.
  const setCategory = useCallback(
    (category: string) => {
      const live = new URLSearchParams(window.location.search);
      commit(parseIds(live.get("p")), readOs(live), {
        category,
        provider: ALL,
        pack: null,
      });
    },
    [commit],
  );

  const setProvider = useCallback(
    (provider: string) => {
      const live = new URLSearchParams(window.location.search);
      commit(parseIds(live.get("p")), readOs(live), {
        category: readCategory(live.get("cat")),
        provider,
        pack: null,
      });
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

  // Opening and closing a preview writes only `pack`; the selection goes back
  // into the URL exactly as it came out.
  const setPreview = useCallback(
    (slug: string | null) => {
      const live = new URLSearchParams(window.location.search);
      commit(parseIds(live.get("p")), readOs(live), {
        ...readView(live),
        pack: slug,
      });
    },
    [commit],
  );

  // Applying a pack adds its items; confirming an already-applied pack removes
  // exactly the ids it contributed, so packs compose instead of overwriting
  // and anything selected by hand survives. Closing the preview in the same
  // write keeps it to one history entry and one re-render.
  const applyPack = useCallback(
    (ids: string[]) => {
      update(
        (current) =>
          packApplied(ids, new Set(current))
            ? current.filter((id) => !ids.includes(id))
            : [...current, ...ids.filter((id) => !current.includes(id))],
        {
          ...readView(new URLSearchParams(window.location.search)),
          pack: null,
        },
      );
    },
    [update],
  );

  const resolved = useMemo(() => resolve(selectedIds, catalog), [selectedIds]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const requiredSet = useMemo(
    () => dependencyIds(resolved, selectedSet),
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

  // Which slice is on screen. Read from the same URL the selection lives in,
  // in its own parameters, so a link reproduces the view as well as the kit.
  const { category, provider, pack: packSlug } = readView(params);
  const entries = useMemo(() => categoryEntries(catalog), []);
  const inCategory = useMemo(
    () => filterItems(catalog, category, ALL),
    [category],
  );
  const providers = useMemo(() => providersOf(inCategory), [inCategory]);

  // The pack under preview, resolved the same way the kit is: dependencies
  // included, in catalog order, so what the grid shows is exactly what the
  // button will add.
  const preview = useMemo(() => {
    const pack = packs.find((entry) => entry.slug === packSlug);
    if (!pack) return null;
    const items = resolve(pack.items, catalog);
    return {
      pack,
      items,
      // Sized like the sidebar sizes the kit, so the two numbers mean the same
      // thing on the same target.
      sizeMb: totalSizeMb(linux ? items.filter(linuxSupported) : items),
      dependencies: dependencyIds(items, new Set(pack.items)),
    };
  }, [packSlug, linux]);

  const visible = useMemo(
    () => (preview ? preview.items : filterItems(inCategory, ALL, provider)),
    [preview, inCategory, provider],
  );

  // A dependency the preview pulled in is marked as one even when the kit has
  // not got it yet — that is the "and here is what comes with it" the preview
  // exists to show.
  const markedRequired = useMemo(
    () =>
      preview
        ? new Set([...requiredSet, ...preview.dependencies])
        : requiredSet,
    [preview, requiredSet],
  );

  return (
    <>
      {/* Full-bleed on purpose. Inside main's padded, max-width container the
          hero's own overflow-hidden clipped the ambient glow at the container
          edge, leaving a hard 48px band of flat background above the title and
          matching strips down both sides. */}
      <Hero origin={origin} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        {/* Everything that is not the grid stays put. `position: sticky` and
            not a nested scroll container: a fixed-height shell with its own
            `overflow-y-auto` middle column would buy the same effect and cost
            height arithmetic, a second scrollbar, page-level keyboard
            scrolling and the mobile viewport. The hero above scrolls away
            normally, because it is a hero.

            Off below `lg`. Three stacked sticky bands on a 375px screen would
            leave nothing to scroll into.

            `bg-background` is load-bearing: without it the grid shows through
            the band as it passes underneath. */}
        <div
          ref={measureBand}
          className="bg-background z-30 pt-4 pb-6 lg:sticky lg:top-0"
        >
          <div className="mb-5">
            <div className="mb-2.5 flex items-center gap-3">
              <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                Presets
              </h2>
              <span aria-hidden className="bg-primary h-px grow" />
            </div>
            <PackChips
              packs={packs}
              selectedIds={selectedSet}
              previewing={packSlug}
              onPreview={setPreview}
            />
          </div>

          <ScriptPreview script={script} os={os} />

          {/* Permanent, so it is in the accessibility tree before the preview
              opens. A live region created in the same paint as its own text
              is announced unreliably. */}
          <p aria-live="polite" className="sr-only">
            {preview
              ? `Previewing the ${preview.pack.name} pack: ${preview.items.length} items, ${formatSize(preview.sizeMb)}. The catalog below shows only these.`
              : ""}
          </p>

          {preview ? (
            <PackPreviewBar
              name={preview.pack.name}
              count={preview.items.length}
              sizeMb={preview.sizeMb}
              applied={packApplied(preview.pack.items, selectedSet)}
              onConfirm={() => applyPack(preview.pack.items)}
              onExit={() => setPreview(null)}
            />
          ) : null}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[216px_minmax(0,1fr)_300px]">
          <CategoryRail
            entries={entries}
            selected={category}
            onSelect={setCategory}
          />

          <div className="min-w-0">
            <ProviderChips
              providers={providers}
              selected={provider}
              onSelect={setProvider}
            />
            {/* Remounts the grid whenever the filter changes, which is what
                replays the staggered entrance. Toggling an item does not change
                the key, so the cards stay put while you build a kit. */}
            <CatalogGrid
              key={`${packSlug ?? ""}:${category}:${provider}`}
              items={visible}
              selectedIds={selectedSet}
              requiredIds={markedRequired}
              os={os}
              onToggle={toggle}
            />
          </div>

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
    </>
  );
}
