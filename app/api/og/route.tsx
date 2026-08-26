import { ImageResponse } from "next/og";
import { catalog } from "@/data/catalog";
import { BRAND, TAGLINE } from "@/lib/brand";
import { formatSize, resolve, totalSizeMb } from "@/lib/resolve";
import { parseIds } from "@/lib/url";
import type { Item } from "@/lib/types";

const WIDTH = 1200;
const HEIGHT = 630;

/** How many item names fit as chips before the card gets noisy. */
const MAX_CHIPS = 8;

/**
 * Shared canvas: the app's dark ground with the same green/sky ambient light
 * the hero paints. Text only — no logo fetches, so the image has zero external
 * failure modes.
 */
function Canvas({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1120",
        backgroundImage:
          "radial-gradient(480px 360px at 25% 0%, rgba(34,197,94,0.16), transparent), " +
          "radial-gradient(420px 320px at 78% 8%, rgba(14,165,233,0.14), transparent)",
        color: "#f8fafc",
      }}
    >
      {children}
    </div>
  );
}

function Wordmark({ size }: { size: number }) {
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: 600,
        letterSpacing: -2,
        backgroundImage: "linear-gradient(90deg, #22c55e, #6ee7b7, #38bdf8)",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {BRAND}
    </div>
  );
}

function GenericCard() {
  return (
    <Canvas>
      <Wordmark size={96} />
      <div style={{ fontSize: 36, color: "#22c55e", marginTop: 20 }}>
        {TAGLINE}
      </div>
    </Canvas>
  );
}

function KitCard({ items }: { items: Item[] }) {
  const size = formatSize(totalSizeMb(items));
  const chips = items.slice(0, MAX_CHIPS);
  const rest = items.length - chips.length;

  return (
    <Canvas>
      <Wordmark size={72} />
      <div
        style={{
          fontSize: 34,
          color: "#cbd5e1",
          marginTop: 18,
          display: "flex",
        }}
      >
        {`${items.length} item${items.length === 1 ? "" : "s"} · ${size} to download`}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 14,
          marginTop: 44,
          maxWidth: 980,
        }}
      >
        {chips.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              padding: "12px 26px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(30,41,59,0.6)",
              fontSize: 28,
              color: "#e2e8f0",
            }}
          >
            {item.name}
          </div>
        ))}
        {rest > 0 ? (
          <div
            style={{
              display: "flex",
              padding: "12px 26px",
              borderRadius: 999,
              border: "1px dashed rgba(148,163,184,0.35)",
              fontSize: 28,
              color: "#94a3b8",
            }}
          >
            {`+${rest} more`}
          </div>
        ) : null}
      </div>
    </Canvas>
  );
}

export function GET(req: Request): ImageResponse {
  const url = new URL(req.url);
  // Same pipeline as the script route: parseIds bounds and validates, resolve
  // drops anything not in the catalog. Nothing from the query string reaches
  // the rendered image except resolved catalog names.
  const ids = parseIds(url.searchParams.getAll("p").join(","));
  const items = resolve(ids, catalog);

  return new ImageResponse(
    items.length === 0 ? <GenericCard /> : <KitCard items={items} />,
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=86400",
      },
    },
  );
}
