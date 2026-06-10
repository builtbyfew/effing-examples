import type { ReactNode } from "react";
import type { GlyphName } from "./icons";

// Custom amenity icons designed around motion: instead of animating a static
// glyph from the outside, each icon here is drawn as PARTS that move — water
// lines travel, signal arcs ripple outward, steam curls rise, palm fronds sway,
// bubbles float up. Every part is driven by a loop phase `p` in [0,1) and is
// strictly periodic in it, so the idle loop is seamless however long it runs.
//
// Same visual language as the static set in icons.tsx: 24-box line icons with
// round caps, solid fills only where the static set fills (heart, paw, star).

// `p` is the wrapped loop phase [0,1); `raw` is the unwrapped time in loop
// units, for one-shot animations that should settle rather than repeat.
type IconArgs = { p: number; raw: number; c: string };

const TAU = Math.PI * 2;
const wrap = (x: number) => ((x % 1) + 1) % 1;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const bell = (t: number, centre: number, width: number) =>
  Math.exp(-Math.pow((t - centre) / width, 2));

// A travelling sine wave sampled as polyline points. Integer `cycles` keeps the
// wave identical at p=0 and p=1, so loops never jump.
function wavePoints(
  x0: number,
  x1: number,
  y: number,
  amp: number,
  cycles: number,
  p: number,
): string {
  const pts: string[] = [];
  for (let x = x0; x <= x1 + 1e-6; x += 0.75) {
    const yy = y + amp * Math.sin(TAU * ((cycles * (x - x0)) / (x1 - x0) - p));
    pts.push(`${x.toFixed(2)},${yy.toFixed(2)}`);
  }
  return pts.join(" ");
}

const HEART_D =
  "M12 20.5s-7.2-4.6-9.2-9.1C1.4 8.1 3.1 5 6.2 5c1.9 0 3.2 1 3.8 2.1h4c.6-1.1 1.9-2.1 3.8-2.1 3.1 0 4.8 3.1 3.4 6.4-2 4.5-9.2 9.1-9.2 9.1z";

// Heart: a double thump, each thump shedding an expanding outline echo.
function heart({ p, c }: IconArgs): ReactNode {
  const thump = bell(p, 0.12, 0.06) + 0.6 * bell(p, 0.3, 0.06);
  const s = 1 + 0.12 * thump;
  const echo = clamp01((p - 0.3) / 0.55);
  return (
    <g>
      <g transform={`translate(12 12.5) scale(${s.toFixed(3)}) translate(-12 -12.5)`}>
        <path d={HEART_D} fill={c} stroke="none" />
      </g>
      <g
        transform={`translate(12 12.5) scale(${(1 + 0.5 * echo).toFixed(3)}) translate(-12 -12.5)`}
        opacity={(1 - echo) * 0.4 * clamp01((p - 0.3) / 0.05)}
      >
        <path d={HEART_D} fill="none" strokeWidth={1.4} />
      </g>
    </g>
  );
}

// Wi-Fi: the signal connects ONCE — the three arcs light up cumulatively
// (first the near one, then also the second, then all three) — and stays
// connected. Quick, too: it is FAST Wi-Fi, after all.
function wifi({ raw, c }: IconArgs): ReactNode {
  const q = raw * 2;
  const on = (k: number) => clamp01((q - (0.1 + k * 0.2)) / 0.05);
  // The nearest band is a filled wedge — its ends cut along the rays toward
  // the signal origin, so it reads almost as a triangle, like the classic
  // glyph. The stroke pass rounds its corners.
  const wedgeOp = 0.3 + 0.7 * on(0);
  return (
    <g>
      <path
        d="M12 19.3 L9.82 16.96 A3.2 3.2 0 0 1 14.18 16.96 Z"
        fill={c}
        fillOpacity={wedgeOp}
        strokeWidth={1.4}
        strokeOpacity={wedgeOp}
      />
      <path d="M7.5 14a6.5 6.5 0 0 1 9 0" strokeOpacity={0.3 + 0.7 * on(1)} />
      <path d="M4.5 10.7a11 11 0 0 1 15 0" strokeOpacity={0.3 + 0.7 * on(2)} />
    </g>
  );
}

// Pool: a steady ladder over water that actually travels.
function pool({ p }: IconArgs): ReactNode {
  return (
    <g>
      <path d="M8 15.5V5M12 15.5V5" />
      <path d="M8 8h4M8 12h4" />
      <polyline points={wavePoints(3, 21, 19, 1.2, 2, p)} fill="none" />
    </g>
  );
}

// Ocean view: the sun bobs on rolling swell. Both waves travel the SAME way,
// slightly out of phase — opposite directions made their peaks meet in an
// awkward crossing.
function ocean({ p }: IconArgs): ReactNode {
  return (
    <g>
      <circle cx={12} cy={6.8 + 0.45 * Math.sin(TAU * p)} r={2.7} />
      <polyline points={wavePoints(3, 21, 14.6, 1.0, 2, p)} fill="none" />
      <polyline points={wavePoints(3, 21, 18.8, 1.2, 2, p - 0.15)} fill="none" />
    </g>
  );
}

// Kitchen: pot on the boil — steam curls rise and fade, lid handle steady.
function kitchen({ p }: IconArgs): ReactNode {
  const steam = [0, 0.5].map((off, i) => {
    const sp = wrap(p - off);
    return (
      <g key={i} transform={`translate(0 ${(-2.6 * sp).toFixed(2)})`} opacity={Math.sin(Math.PI * sp) * 0.9}>
        <path d={`M${10 + i * 4} 8.6q-0.7-0.9 0-1.8t0-1.8`} strokeWidth={1.7} />
      </g>
    );
  });
  return (
    <g>
      <path d="M5 11h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5v-3z" />
      <path d="M3.5 11h17" />
      <path d="M4 8v2M20 8v2" />
      {steam}
    </g>
  );
}

// Air-con: a snowflake that spins lazily (60° per loop — its own symmetry),
// with a softly pulsing core.
function ac({ p, c }: IconArgs): ReactNode {
  const spokes: ReactNode[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (TAU * (k * 60 + p * 60)) / 360;
    const tipX = 12 + 8.6 * Math.cos(a);
    const tipY = 12 + 8.6 * Math.sin(a);
    spokes.push(<line key={`s${k}`} x1={12} y1={12} x2={tipX} y2={tipY} />);
    // Two short branch ticks partway out, classic snowflake.
    const bx = 12 + 5.6 * Math.cos(a);
    const by = 12 + 5.6 * Math.sin(a);
    for (const da of [-0.55, 0.55]) {
      spokes.push(
        <line
          key={`s${k}t${da}`}
          x1={bx}
          y1={by}
          x2={bx + 2.4 * Math.cos(a + da)}
          y2={by + 2.4 * Math.sin(a + da)}
          strokeWidth={1.6}
        />,
      );
    }
  }
  return (
    <g>
      {spokes}
      <circle cx={12} cy={12} r={1.1 + 0.35 * Math.sin(TAU * p)} fill={c} stroke="none" />
    </g>
  );
}

// Parking: the P gives a confident pulse inside its steady sign.
function parking({ p }: IconArgs): ReactNode {
  const s = 1 + 0.08 * bell(p, 0.3, 0.12);
  return (
    <g>
      <rect x={4} y={3} width={16} height={18} rx={3.5} />
      <g transform={`translate(11.5 12) scale(${s.toFixed(3)}) translate(-11.5 -12)`}>
        <path d="M9.5 17V7.5H13a3 3 0 0 1 0 6H9.5" />
      </g>
    </g>
  );
}

// Beach: a palm whose canopy sways in the breeze over a steady shore line.
function beach({ p }: IconArgs): ReactNode {
  const sway = 5 * Math.sin(TAU * p);
  return (
    <g>
      <path d="M11.5 20c0-4 .4-7.2 1.6-10.5" />
      <path d="M6.5 20.5h11" />
      <g transform={`rotate(${sway.toFixed(2)} 13.1 9.5)`}>
        <path d="M13.1 9.5q-3.8-2.6-7-0.3" />
        <path d="M13.1 9.5q3.8-2.6 7-0.3" />
        <path d="M13.1 9.5q-2.4-3.8-5.8-4" />
        <path d="M13.1 9.5q2.4-3.8 5.8-4" />
      </g>
    </g>
  );
}

// Pet: the paw pats — toes press one after another, then the pad.
function pet({ p, c }: IconArgs): ReactNode {
  const toes = [
    { cx: 6.5, cy: 10 },
    { cx: 10.5, cy: 7.5 },
    { cx: 14.5, cy: 7.5 },
    { cx: 18, cy: 11 },
  ];
  return (
    <g>
      {toes.map((t, k) => {
        const s = 1 + 0.22 * bell(wrap(p - 0.08 - k * 0.11), 0.1, 0.07);
        return (
          <g key={k} transform={`translate(${t.cx} ${t.cy}) scale(${s.toFixed(3)}) translate(${-t.cx} ${-t.cy})`}>
            <ellipse cx={t.cx} cy={t.cy} rx={1.7} ry={2.3} fill={c} stroke="none" />
          </g>
        );
      })}
      <g
        transform={`translate(12 16.4) scale(${(1 + 0.12 * bell(wrap(p - 0.62), 0.1, 0.08)).toFixed(3)}) translate(-12 -16.4)`}
      >
        <path
          d="M12 12.5c2.6 0 4.6 1.7 4.6 3.9 0 1.9-1.7 2.9-4.6 2.9s-4.6-1-4.6-2.9c0-2.2 2-3.9 4.6-3.9z"
          fill={c}
          stroke="none"
        />
      </g>
    </g>
  );
}

// Guests: the classic two-person glyph, both there from the start — the only
// motion is a gentle counter-phase sway, leaning toward and away from each
// other like company in conversation.
function guests({ p }: IconArgs): ReactNode {
  const sway = 2.5 * Math.sin(TAU * p);
  return (
    <g>
      <g transform={`rotate(${(-sway).toFixed(2)} 17.6 20)`}>
        <circle cx={17.6} cy={10.8} r={2.4} />
        <path d="M13 20c0-2.7 2-4.3 4.6-4.3s4.6 1.6 4.6 4.3" />
      </g>
      <g transform={`rotate(${sway.toFixed(2)} 9.5 20)`}>
        <circle cx={9.5} cy={8.4} r={3.2} />
        <path d="M3.2 20c0-3.5 2.7-5.6 6.3-5.6s6.3 2.1 6.3 5.6" />
      </g>
    </g>
  );
}

// Bed: somebody is sound asleep — little z's float up and melt away.
function bed({ p }: IconArgs): ReactNode {
  const zs = [0, 0.5].map((off, i) => {
    const sp = wrap(p - off);
    const size = 1.6 - i * 0.4;
    const x = 16.5 + i * 1.6;
    const y = 6.6 - i * 1.2;
    return (
      <g key={i} transform={`translate(0 ${(-3 * sp).toFixed(2)})`} opacity={Math.sin(Math.PI * sp) * 0.9}>
        <polyline
          points={`${x - size},${y - size} ${x + size},${y - size} ${x - size},${y + size} ${x + size},${y + size}`}
          fill="none"
          strokeWidth={1.6}
        />
      </g>
    );
  });
  return (
    <g>
      <path d="M3 18V8" />
      <path d="M3 14h18v4" />
      <path d="M21 18v-3a2 2 0 0 0-2-2H7" />
      <path d="M7 14v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      {zs}
    </g>
  );
}

// Bath: bubbles drift up from the tub and pop, drifting a little as they rise.
function bath({ p }: IconArgs): ReactNode {
  const bubbles = [0, 0.33, 0.66].map((off, i) => {
    const sp = wrap(p - off);
    const cx = 13 + i * 2.4 + 0.6 * Math.sin(TAU * (2 * sp + i * 0.3));
    const cy = 11 - 5.5 * sp;
    return (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={0.7 + 0.25 * i}
        strokeWidth={1.4}
        strokeOpacity={Math.sin(Math.PI * sp) * 0.9}
      />
    );
  });
  return (
    <g>
      <path d="M4 13h16v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-2z" />
      <path d="M6 13V6a2 2 0 0 1 4 0" />
      <path d="M7 19l-1 2M18 19l1 2" />
      {bubbles}
    </g>
  );
}

// Pin: hops in place, landing with a little ground ripple.
function pin({ p }: IconArgs): ReactNode {
  const hop = -2 * bell(p, 0.22, 0.1);
  const rippleT = clamp01((p - 0.32) / 0.4);
  return (
    <g>
      <g transform={`translate(0 ${hop.toFixed(2)})`}>
        <path d="M12 20s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z" />
        <circle cx={12} cy={10} r={2.3} />
      </g>
      <ellipse
        cx={12}
        cy={21.4}
        rx={2 + 4 * rippleT}
        ry={0.8}
        strokeWidth={1.4}
        strokeOpacity={rippleT > 0 ? (1 - rippleT) * 0.5 : 0}
      />
    </g>
  );
}

// Star: twinkles — a wiggle and a swell, with tiny glints winking at its sides.
function star({ p, c }: IconArgs): ReactNode {
  const s = 1 + 0.08 * bell(p, 0.35, 0.12);
  const rot = 7 * Math.sin(TAU * p);
  const glints = [
    { x: 4.4, y: 5.2, off: 0 },
    { x: 19.8, y: 17.6, off: 0.5 },
  ].map((g, i) => {
    const op = bell(wrap(p - 0.3 - g.off), 0.12, 0.08);
    return (
      <g key={i} opacity={op}>
        <line x1={g.x - 1.4} y1={g.y} x2={g.x + 1.4} y2={g.y} strokeWidth={1.5} />
        <line x1={g.x} y1={g.y - 1.4} x2={g.x} y2={g.y + 1.4} strokeWidth={1.5} />
      </g>
    );
  });
  return (
    <g>
      <g
        transform={`rotate(${rot.toFixed(2)} 12 12) translate(12 12) scale(${s.toFixed(3)}) translate(-12 -12)`}
      >
        <path
          d="M12 2.5l2.85 6.06 6.4.93-4.63 4.66 1.1 6.65L12 17.9l-5.72 2.86 1.1-6.65L2.75 9.49l6.4-.93z"
          fill={c}
          stroke="none"
        />
      </g>
      {glints}
    </g>
  );
}

const ICONS: Record<GlyphName, (args: IconArgs) => ReactNode> = {
  heart,
  wifi,
  pool,
  ocean,
  kitchen,
  ac,
  parking,
  beach,
  pet,
  guests,
  bed,
  bath,
  pin,
  star,
};

export function AnimatedGlyph({
  icon,
  size,
  color,
  phase,
  strokeWidth = 2.1,
}: {
  icon: GlyphName;
  size: number;
  color: string;
  // Loop position in [0,1); every icon is periodic in it.
  phase: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color }}
    >
      {ICONS[icon]({
        p: wrap(phase),
        raw: Math.max(0, phase),
        c: color,
      })}
    </svg>
  );
}
