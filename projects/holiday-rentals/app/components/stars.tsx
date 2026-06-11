import { palette } from "~/theme";

// A row of five stars with fractional fill. `fill` is in star units (0..5), so
// 4.97 fills the first four stars and ~97% of the fifth. The static card passes
// the rating directly; the rating-stars annie sweeps `fill` from 0 to the
// rating to make the stars light up one after another.
//
// Each star clips a fully-filled copy behind an outline using the proven
// overflow:hidden width trick (no SVG clipPath ids to keep unique per frame).

export function starPath(size: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.48;
  const inner = outer * 0.42;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

function Star({
  size,
  fraction,
  filledColor,
  outlineColor,
}: {
  size: number;
  fraction: number;
  filledColor: string;
  outlineColor: string;
}) {
  const d = starPath(size);
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path
          d={d}
          fill="none"
          stroke={outlineColor}
          strokeWidth={Math.max(1, size * 0.07)}
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: clamped * size,
          height: size,
          overflow: "hidden",
          display: "flex",
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Stroke in the fill color too, so the filled star covers the full
              extent of the outline stroke underneath — otherwise the outline
              peeks out as a fuzzy halo around the fill. */}
          <path
            d={d}
            fill={filledColor}
            stroke={filledColor}
            strokeWidth={Math.max(1, size * 0.07)}
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export function RatingStars({
  size,
  fill,
  count = 5,
  gap,
  filledColor = palette.star,
  outlineColor = "rgba(0,0,0,0.16)",
}: {
  size: number;
  fill: number;
  count?: number;
  gap?: number;
  filledColor?: string;
  outlineColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: gap ?? Math.round(size * 0.18),
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Star
          key={i}
          size={size}
          fraction={fill - i}
          filledColor={filledColor}
          outlineColor={outlineColor}
        />
      ))}
    </div>
  );
}
