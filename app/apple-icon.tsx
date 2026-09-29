import { ImageResponse } from "next/og";

// Ícone da tela inicial do iPhone (o iOS não usa SVG): mesmo desenho do app/icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BARS = [
  { x: 31, y: 96, h: 53, color: "#e11d2e" },
  { x: 73, y: 65, h: 84, color: "#ffffff" },
  { x: 115, y: 31, h: 118, color: "#1d4ed8" },
];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#081230" }}>
        {BARS.map((b) => (
          <div key={b.x} style={{ position: "absolute", left: b.x, top: b.y, width: 34, height: b.h, borderRadius: 8, background: b.color }} />
        ))}
      </div>
    ),
    size,
  );
}
