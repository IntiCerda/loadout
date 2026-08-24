"use client";

import {
  type CSSProperties,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
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
  readKitOnly,
  readPack,
  readProvider,
  readQuery,
  searchItems,
} from "@/lib/filter";
import { SITE_URL } from "@/lib/brand";
import { categoryHue } from "@/lib/hues";
import type { Os } from "@/lib/types";
import { Hero } from "@/components/hero";
import { CatalogGrid } from "@/components/catalog-grid";
import { CategoryRail } from "@/components/category-rail";
import { ProviderChips } from "@/components/provider-chips";
import { PackChips } from "@/components/pack-chips";
import { PackPreviewBar } from "@/components/pack-preview-bar";
import { KitSidebar } from "@/components/kit-sidebar";
import { MobileKitBar } from "@/components/mobile-kit-bar";
import { ScriptPreview } from "@/components/script-preview";
import { SearchBox } from "@/components/search-box";

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
 * Which slice of the catalog is on screen. Deliberately NOT part of `?p=`:
 * that parameter is the kit, it is what the generated script is built from and
 * what a shared link promises, and browsing must never change it.
 *
 * `pack` is the pack being previewed. It lives here rather than in React state
 * for the same reason the rest of this does — one source of truth, readable
 * from the live URL inside every writer — and it is a view, not a selection:
 * entering and leaving a preview never touches `?p=`.
 */
type View = {
  category: string;
  provider: string;
  pack: string | null;
  q: string;
  /** `?view=kit` — the grid shows the resolved kit instead of the catalog. */
  kitOnly: boolean;
};

function readView(params: URLSearchParams): View {
  const category = readCategory(params.get("cat"));
  return {
    category,
    provider: readProvider(
      params.get("prov"),
      filterItems(catalog, category, ALL),
    ),
    pack: readPack(params.get("pack"), packs),
    q: readQuery(params.get("q")),
    kitOnly: readKitOnly(params.get("view")),
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
    view.q.trim() ? `q=${encodeURIComponent(view.q)}` : "",
    view.kitOnly ? "view=kit" : "",
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
        // The search survives a category change: the box visibly holds its
        // text, so silently discarding it would contradict the screen.
        q: readQuery(live.get("q")),
        // Picking a slice of the catalog is a request to browse it, so it
        // leaves the kit-only view the same way it leaves a preview.
        kitOnly: false,
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
        q: readQuery(live.get("q")),
        kitOnly: false,
      });
    },
    [commit],
  );

  const setQuery = useCallback(
    (q: string) => {
      const live = new URLSearchParams(window.location.search);
      commit(parseIds(live.get("p")), readOs(live), {
        ...readView(live),
        // Typing is a request to search the catalog, so it closes a preview
        // — and the kit-only view — the same way the rail does.
        pack: null,
        kitOnly: false,
        q,
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

  const clearKit = useCallback(() => {
    update(() => []);
  }, [update]);

  // Opening and closing a preview writes only `pack`; the selection goes back
  // into the URL exactly as it came out.
  const setPreview = useCallback(
    (slug: string | null) => {
      const live = new URLSearchParams(window.location.search);
      const view = readView(live);
      commit(parseIds(live.get("p")), readOs(live), {
        ...view,
        pack: slug,
        // Opening a preview clears the search: the grid is about to show the
        // pack, and a search box still holding text would claim otherwise.
        q: slug ? "" : view.q,
        // A preview and the kit-only view both claim the whole grid, so
        // opening one closes the other.
        kitOnly: slug ? false : view.kitOnly,
      });
    },
    [commit],
  );

  // The one writer for `?view=kit`. Entering leaves the pack preview for the
  // same reason opening a preview leaves kit view: the grid can only show one
  // of them.
  const toggleKitOnly = useCallback(() => {
    const live = new URLSearchParams(window.location.search);
    const view = readView(live);
    commit(parseIds(live.get("p")), readOs(live), {
      ...view,
      pack: null,
      kitOnly: !view.kitOnly,
    });
  }, [commit]);

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
  const {
    category,
    provider,
    pack: packSlug,
    q,
    kitOnly: kitOnlyParam,
  } = readView(params);

  // `?view=kit` over an empty kit would render an empty grid under the empty-
  // state copy for a filtered catalog — a lie twice over — so the parameter
  // only takes effect while there is a kit to show. The chip stays visible
  // but inert for the same reason.
  const kitOnly = kitOnlyParam && installable.length > 0;

  // Everything the rail advertises derives from what the chosen target can
  // actually install. Counting the full catalog put a "3" next to a Linux
  // category that filtered to zero on the Linux target — the category is the
  // WSL distros, which are a Windows feature. `categoryEntries` already drops
  // empty categories, so on Linux that entry simply does not exist.
  const targetCatalog = useMemo(
    () => (linux ? catalog.filter(linuxSupported) : catalog),
    [linux],
  );
  const entries = useMemo(
    () => categoryEntries(targetCatalog),
    [targetCatalog],
  );

  // The URL may still name a category this target does not offer (switching
  // to Linux while on the WSL category). Falling back to ALL keeps the rail
  // highlight, the counts and the grid all describing the same thing.
  const activeCategory = entries.some((entry) => entry.id === category)
    ? category
    : ALL;

  const inCategory = useMemo(
    () => filterItems(targetCatalog, activeCategory, ALL),
    [targetCatalog, activeCategory],
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

  // On the Linux target, items with no Linux install are dropped from the
  // grid instead of shown greyed out: a card that can only say "not available"
  // is noise, and the kit already reports how many selected items the target
  // drops. Selections are untouched — hiding is a view. The browse path gets
  // this for free from `targetCatalog`; a preview's items still need it.
  const visible = useMemo(() => {
    // The kit-only view ignores category, provider and search: it answers
    // "what exactly am I about to install", and a silently narrowed answer
    // to that question is worse than none. Touching any of those controls
    // exits the view instead.
    if (kitOnly) return installable;
    if (preview) {
      return linux ? preview.items.filter(linuxSupported) : preview.items;
    }
    return searchItems(filterItems(inCategory, ALL, provider), q);
  }, [kitOnly, installable, preview, linux, inCategory, provider, q]);

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

      {/* The app shell. At `lg` this section is exactly `100dvh` and the grid
          column scrolls internally, so the document's total height is the hero
          plus one viewport — constant for every filter, category and pack
          state — and the document scroll is just the hero handing over to the
          app. No scroll snapping: with a scroll range this short, `proximity`
          undoes single wheel ticks (see globals.css). `.app-zone` layers glows
          and a dot grid so the section is not a flat slab.

          Below `lg` none of the `lg:` classes apply and the page is today's
          one normal document — three nested scrollers on a 375px screen would
          leave nothing to scroll. */}
      <div className="app-zone lg:h-dvh">
        <main
          // `pb-24` clears the mobile kit bar's measured height (~68px plus
          // safe area) while it renders; `lg:pb-0` keeps the fixed shell
          // unchanged either way.
          className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:flex lg:h-full lg:flex-col lg:px-8 lg:pb-0 ${
            installable.length > 0 ? "pb-24" : "pb-12"
          }`}
        >
          {/* The band: presets, script disclosure, pack preview. Static at the
              top of the shell — the shell itself never scrolls at `lg`, so the
              sticky machinery (and the measured `--band-h` it needed) is gone.
              The script panel caps itself at `38vh` on `lg` and scrolls
              internally, so opening it shrinks the grid row without pushing it
              off-screen. */}
          {/* `relative` for the same reason as on the kit column: the
              `sr-only` live region below is absolutely positioned and needs a
              containing block inside the shell. */}
          <div className="relative shrink-0 pt-4 pb-6">
          <div className="mb-5">
            <div className="mb-2.5 flex items-center gap-3">
              <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
                Presets
              </h2>
              <span aria-hidden className="bg-primary h-px grow" />
              <a
                href="https://github.com/IntiCerda/loadout"
                target="_blank"
                rel="noreferrer"
                className="text-foreground/60 hover:text-foreground flex min-h-[44px] items-center gap-1.5
                  font-mono text-xs transition-colors duration-200
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {/* Inline mark: lucide dropped its brand icons, and one 15-line
                    path is not worth a dependency. */}
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="size-4"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
                GitHub
              </a>
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
              items={preview.items}
              sizeMb={preview.sizeMb}
              applied={packApplied(preview.pack.items, selectedSet)}
              onConfirm={() => applyPack(preview.pack.items)}
              onExit={() => setPreview(null)}
            />
          ) : null}
        </div>

        {/* `minmax(0,1fr)` on the single row is what caps the columns at the
            shell's remaining height instead of letting the tallest column set
            it; each column then scrolls itself.

            No `overscroll-behavior` anywhere, deliberately: `contain` blocks
            chaining even at scrollTop 0 (measured, not guessed), which would
            strand the user in the app with no scroll path back to the hero.
            Wheel latching already stops a mid-gesture overshoot from chaining;
            a fresh gesture at the top boundary chains to the document, which
            is exactly the way back up. */}
        <div className="grid grid-cols-1 items-start gap-6 lg:min-h-0 lg:grow lg:grid-cols-[216px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch lg:pb-4">
          <CategoryRail
            entries={entries}
            selected={activeCategory}
            onSelect={setCategory}
          />

          {/* `--cat` is the current category's hue; the provider chips inside
              read it for their active state. Cards set their own per item.

              Search and chips sit OUTSIDE the scrolling box: they are the
              controls over the grid, and controls that scroll away with their
              own results are controls the user has to go find again. */}
          <div
            className="relative flex min-w-0 flex-col lg:min-h-0"
            style={{ "--cat": categoryHue(activeCategory) } as CSSProperties}
          >
            <div className="shrink-0">
              <div className="flex items-start gap-2">
                <div className="min-w-0 grow">
                  <SearchBox value={q} onChange={setQuery} />
                </div>
                {/* Kit-only toggle. Inert rather than hidden when the kit is
                    empty: a control that vanishes and reappears teaches the
                    user nothing about where it lives. `aria-disabled`, not
                    `disabled`, so it stays focusable and announces why it
                    does nothing. */}
                <button
                  type="button"
                  aria-pressed={kitOnly}
                  aria-disabled={installable.length === 0}
                  onClick={installable.length === 0 ? undefined : toggleKitOnly}
                  className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border px-3 text-sm
                    transition-colors duration-[180ms]
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
                    ${
                      installable.length === 0
                        ? "border-border text-foreground/60 cursor-not-allowed opacity-60"
                        : kitOnly
                          ? "border-accent bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-foreground cursor-pointer"
                          : "border-border text-foreground/80 hover:border-muted-foreground/60 hover:bg-primary cursor-pointer"
                    }`}
                >
                  In kit
                  <span
                    className={`flex min-w-5 items-center justify-center rounded px-1 font-mono text-[10px] font-bold ${
                      kitOnly
                        ? "bg-[color-mix(in_srgb,var(--accent)_30%,var(--secondary))] text-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {installable.length}
                  </span>
                </button>
              </div>
              <ProviderChips
                providers={providers}
                selected={provider}
                onSelect={setProvider}
              />
            </div>

            {/* `scrollbar-gutter: stable` keeps the grid's width constant
                whether or not the current slice is tall enough to scroll —
                without it, switching filters makes every card snap 8px wider
                and back as the scrollbar appears and disappears. */}
            <div className="min-w-0 lg:min-h-0 lg:grow lg:overflow-y-auto lg:pr-1 lg:[scrollbar-gutter:stable]">
              {visible.length === 0 ? (
                <p className="text-foreground/60 py-10 text-center text-sm">
                  {q.trim()
                    ? `Nothing matches “${q.trim()}” here.`
                    : "Nothing in this slice is available on Linux."}
                </p>
              ) : (
                /* Remounts the grid whenever the filter changes, which is what
                   replays the staggered entrance — except for the search text,
                   which changes per keystroke and would strobe the grid.
                   Toggling an item does not change the key either, so the
                   cards stay put while you build a kit. */
                <CatalogGrid
                  key={`${kitOnly}:${packSlug ?? ""}:${category}:${provider}`}
                  items={visible}
                  selectedIds={selectedSet}
                  requiredIds={markedRequired}
                  os={os}
                  onToggle={toggle}
                />
              )}
            </div>
          </div>

          <KitSidebar
            items={installable}
            requiredIds={requiredSet}
            droppedCount={resolved.length - installable.length}
            sizeMb={sizeMb}
            query={query}
            origin={origin}
            shareUrl={shareUrl}
            os={os}
            onOsChange={setOs}
            onRemove={toggle}
            onClear={clearKit}
          />
          </div>
        </main>
      </div>

      {installable.length > 0 ? (
        <MobileKitBar
          count={installable.length}
          sizeMb={sizeMb}
          query={query}
          os={os}
        />
      ) : null}
    </>
  );
}
