import { ImageResponse } from "next/og";
import { BRAND, TAGLINE } from "@/lib/brand";

export const alt = `${BRAND} -- ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F172A",
          color: "#F8FAFC",
          fontSize: 84,
          fontWeight: 600,
        }}
      >
        <div>{BRAND}</div>
        <div style={{ fontSize: 34, color: "#22C55E", marginTop: 16 }}>
          {TAGLINE}
        </div>
      </div>
    ),
    size,
  );
}
