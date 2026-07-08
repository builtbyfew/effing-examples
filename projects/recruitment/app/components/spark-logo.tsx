import { fontFamily, palette } from "~/theme";

// The Talentspark brand mark: a four-point sparkle. Authored as a closed path
// in a square box so it can be drawn at any size, plumpness, and rotation —
// the logo intro animates all three.

/**
 * A four-point sparkle path centred on (cx, cy) with tip radius `r`.
 * `plump` sets how far the concave waists bulge from the centre, as a
 * fraction of `r` — ~0.14 is a slender star, ~0.3 a fat one.
 */
export function sparklePath(
  cx: number,
  cy: number,
  r: number,
  plump: number,
): string {
  const w = r * plump;
  // Tips at N/E/S/W, with quadratic waists pulled toward the diagonals.
  const tips = [
    { x: cx, y: cy - r },
    { x: cx + r, y: cy },
    { x: cx, y: cy + r },
    { x: cx - r, y: cy },
  ];
  const waists = [
    { x: cx + w, y: cy - w },
    { x: cx + w, y: cy + w },
    { x: cx - w, y: cy + w },
    { x: cx - w, y: cy - w },
  ];
  let d = `M${tips[0].x.toFixed(1)} ${tips[0].y.toFixed(1)}`;
  for (let i = 0; i < 4; i++) {
    const next = tips[(i + 1) % 4];
    d += ` Q${waists[i].x.toFixed(1)} ${waists[i].y.toFixed(1)} ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }
  return `${d} Z`;
}

/**
 * The sparkle mark as a standalone SVG, with two companion twinkle dots.
 * `rotation` is in degrees; `twinkle` fades the dots (0 hides them).
 */
export function SparkMark({
  size,
  color = palette.spark,
  plump = 0.18,
  rotation = 0,
  twinkle = 1,
}: {
  size: number;
  color?: string;
  plump?: number;
  rotation?: number;
  twinkle?: number;
}) {
  const r = 42;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" stroke="none">
      <g transform={`rotate(${rotation.toFixed(2)} 50 50)`}>
        <path d={sparklePath(50, 50, r, plump)} fill={color} />
      </g>
      <circle cx={87} cy={16} r={7} fill={color} fillOpacity={twinkle} />
      <circle cx={13} cy={80} r={4.5} fill={color} fillOpacity={twinkle} />
    </svg>
  );
}

/**
 * The compact one-line lockup (mark + wordmark) used as a sign-off.
 * The wordmark sets "talent" in cream and "spark" in yellow.
 */
export function SparkLockup({ markSize }: { markSize: number }) {
  const wordSize = markSize * 0.82;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: markSize * 0.3 }}>
      <SparkMark size={markSize} twinkle={0} />
      <div
        style={{
          display: "flex",
          fontFamily: fontFamily.display,
          fontWeight: 700,
          fontSize: wordSize,
          lineHeight: 1,
          color: palette.cream,
        }}
      >
        talent
        <span style={{ color: palette.spark }}>spark</span>
      </div>
    </div>
  );
}
