import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { AnnieRunnerReturn, RunnerArgs } from "@effing/fn";
import { tween, easeOutQuad, easeOutCubic, easeInOutCubic } from "@effing/tween";
import { loadFonts, poppinsBold, dmSansMedium } from "~/fonts";
import { fontFamily } from "~/theme";
import { designUnit } from "~/components/design-unit";

// Opening brand sting for the fictional holiday-rental brand "Aquabnb" —
// styled after the classic single-continuous-line logo-draw reveals. A bold
// pink field; the mark is a water droplet rendered as ONE white neon line,
// with a white "aquabnb" wordmark beneath.
//
// The lockup is FULLY PRESENT on frame 0 with the real droplet emblem. It
// pulses on the first music beat, then flares pointwise into a SUN (water →
// sunshine) that spins up lazily as it forms and lands with a little liquid
// wobble. On each remaining beat the sun pumps a surge of white water — the
// fill carries the rhythm — until it brims, then it gathers and BLOOMS outward
// to swallow the whole viewport, handing the video to the flight map on a
// frame of pure white. The emblem is drawn in a full-frame SVG so the bloom
// can escape the lockup's box.

export const propsSchema = z.object({
  frameCount: z.number().int().min(1),
  // Music beat positions as fractions of the clip [0,1], for on-beat accents.
  beats: z.array(z.number().min(0).max(1)).optional(),
});

export type LogoIntroProps = z.infer<typeof propsSchema>;

export const previewProps: LogoIntroProps = {
  frameCount: 59,
  beats: [0.0359, 0.3573, 0.6787],
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const bell = (t: number, centre: number, width: number) =>
  Math.exp(-Math.pow((t - centre) / width, 2));

// Droplet geometry, authored in a 200×232 box (apex up, round belly).
const DROP_W = 200;
const DROP_H = 232;
const APEX = { x: 100, y: 16 };
const R_TAN = { x: 161, y: 113 };
const L_TAN = { x: 39, y: 113 };
const BELLY = { x: 100, y: 151, r: 72 };

type Pt = { x: number; y: number };
const qbez = (a: Pt, c: Pt, b: Pt, u: number): Pt => {
  const m = 1 - u;
  return {
    x: m * m * a.x + 2 * m * u * c.x + u * u * b.x,
    y: m * m * a.y + 2 * m * u * c.y + u * u * b.y,
  };
};

// Sample the closed droplet outline as an ordered point list (apex → right side
// → belly → left side → apex). Controls sit on the belly's tangent line so the
// sides flow into the arc without a kink and meet at a clean apex point.
function dropOutline(): Pt[] {
  const sideN = 24;
  const bellyN = 130;
  const pts: Pt[] = [];
  const rCtrl = { x: 124, y: 54 };
  const lCtrl = { x: 76, y: 54 };
  for (let i = 0; i < sideN; i++) pts.push(qbez(APEX, rCtrl, R_TAN, i / sideN));
  let a0 = Math.atan2(R_TAN.y - BELLY.y, R_TAN.x - BELLY.x);
  let a1 = Math.atan2(L_TAN.y - BELLY.y, L_TAN.x - BELLY.x);
  while (a1 <= a0) a1 += Math.PI * 2;
  for (let i = 0; i <= bellyN; i++) {
    const a = a0 + (a1 - a0) * (i / bellyN);
    pts.push({ x: BELLY.x + BELLY.r * Math.cos(a), y: BELLY.y + BELLY.r * Math.sin(a) });
  }
  for (let i = 1; i <= sideN; i++) pts.push(qbez(L_TAN, lCtrl, APEX, i / sideN));
  return pts;
}

const fullPath = (pts: Pt[]): string => {
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  return `${d} Z`;
};

// The sun's disc — a plain circle sampled with the same point count and the
// same start/direction (top centre, clockwise) as the droplet, so the two
// outlines morph pointwise. The rays are separate, detached strokes that
// ignite around the disc once it has formed (see the runner).
function sunOutline(n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / (n - 1);
    pts.push({
      x: SUN_C.x + DISC_R * Math.cos(a),
      y: SUN_C.y + DISC_R * Math.sin(a),
    });
  }
  return pts;
}

// Centre of the sun (viewbox units) — pivot for the spin and the bloom — and
// its disc radius, which is what must clear the viewport corners on the bloom.
const SUN_C = { x: 100, y: 124 };
const DISC_R = 58;
// Detached rays: count, radial extent, and ignition timing (clip fractions).
// They light up one after another around the disc as the morph wraps up, each
// growing outward, then the whole ray ring keeps turning lazily.
const RAY_COUNT = 8;
const RAY_INNER = 84;
const RAY_OUTER = 108;
const RAY_START = 0.26;
const RAY_STAGGER = 0.025;
const RAY_GROW = 0.06;
// How far the ray ring turns (radians over the clip).
const SUN_SPIN = 0.5;

// Droplet → sun morph window, between the first and second music beats.
const MORPH_START = 0.12;
const MORPH_END = 0.3;
// The sun pumps a surge of white liquid on every remaining beat — the water
// carries the rhythm; the shape itself only turns, slowly. Then it gathers
// itself — contracting before the burst — and releases, blooming out to cover
// the whole viewport.
const CONTRACT_START = 0.72;
const CONTRACT_MIN = 0.8; // how small the sun squeezes before the bloom
const EXPAND_START = 0.79;
const EXPAND_END = 0.96;

// The ambient float (bob/sway) calms to a stop as the handoff approaches.
const HANDOFF_START = 0.6;
const LAPS = 2.5;
const TAIL = 0.22; // light streak length, fraction of the perimeter
const TRAIL_SEGS = 28; // many small segments → a smooth, tapered streak

export async function* runner({
  props: { frameCount, beats = [] },
  bounds: { width, height },
}: RunnerArgs<LogoIntroProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([poppinsBold, dmSansMedium]);
  const u = designUnit(width, height);
  const dropPts = dropOutline();
  const sunPts = sunOutline(dropPts.length);
  // Linearly-interpolated point at a fractional position around a closed path.
  const pointAt = (pts: Pt[], frac: number): Pt => {
    const n = pts.length;
    const f = ((frac % 1) + 1) % 1;
    const x = f * (n - 1);
    const i = Math.floor(x);
    const blend = x - i;
    const a = pts[i];
    const b = pts[Math.min(n - 1, i + 1)];
    return { x: a.x + (b.x - a.x) * blend, y: a.y + (b.y - a.y) * blend };
  };

  // Classic logo-lockup proportions: the mark is visually dominant (wider
  // than tall relative to the wordmark) and its line is slightly HEAVIER than
  // the wordmark's stems — a thin line under bold text reads spindly and off
  // balance.
  const markW = Math.round(u * 0.38);
  const markH = Math.round((markW * DROP_H) / DROP_W);
  const wordFont = Math.round(u * 0.125);
  const taglineFont = Math.round(u * 0.032);
  const markGap = Math.round(u * 0.05);
  const tagGap = Math.round(u * 0.03);

  // The lockup is laid out analytically (not flex-centred) so the emblem can be
  // drawn in a full-frame SVG: viewbox coordinates map to viewport pixels.
  const pxPerUnit = markW / DROP_W;
  const strokePx = markW * 0.08;
  const wordH = wordFont; // lineHeight 1
  const tagH = Math.round(taglineFont * 1.2);
  const lockupH = markH + markGap + wordH + tagGap + tagH;
  const markTop = Math.round((height - lockupH) / 2);
  const ox = width / 2 - 100 * pxPerUnit;
  const toPx = (p: Pt): Pt => ({ x: ox + p.x * pxPerUnit, y: markTop + p.y * pxPerUnit });
  const sunC = toPx(SUN_C);
  // Bloom scale at which the disc's edge clears the farthest corner (the
  // bloom launches from the contracted size, hence the CONTRACT_MIN factor).
  const corner = Math.hypot(width / 2, Math.max(sunC.y, height - sunC.y));
  const EXPAND_MAX = corner / (DISC_R * pxPerUnit * CONTRACT_MIN) + 1;

  yield* tween(frameCount, async ({ lower: t }) => {
    const handoffT = clamp01((t - HANDOFF_START) / (1 - HANDOFF_START));
    const calm = 1 - easeOutQuad(handoffT);

    // On-beat accent — only while the emblem is still the droplet. Once it is
    // a sun, the beat lives in the water surges; pulsing the shape on top of
    // that reads as too much at once.
    let beatP = 0;
    for (const b of beats) {
      if (b > MORPH_END) continue;
      beatP = Math.max(beatP, bell(t, b, 0.05));
    }

    // Droplet → disc morph: pointwise blend of the two outlines, finishing
    // with a quick damped wobble so the disc lands like liquid.
    const morphT = easeInOutCubic(
      clamp01((t - MORPH_START) / (MORPH_END - MORPH_START)),
    );
    const pts = dropPts.map((dp, i) =>
      toPx({
        x: dp.x + (sunPts[i].x - dp.x) * morphT,
        y: dp.y + (sunPts[i].y - dp.y) * morphT,
      }),
    );
    const lineD = fullPath(pts);

    // The rays ignite one after another around the disc, each growing outward
    // from the gap; once lit, the whole ring keeps turning lazily.
    const spin = Math.max(0, t - MORPH_START) * SUN_SPIN;
    const rays: { x1: number; y1: number; x2: number; y2: number; op: number }[] = [];
    for (let i = 0; i < RAY_COUNT; i++) {
      const grow = easeOutCubic(
        clamp01((t - (RAY_START + i * RAY_STAGGER)) / RAY_GROW),
      );
      if (grow <= 0) continue;
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / RAY_COUNT + spin;
      const outerR = RAY_INNER + (RAY_OUTER - RAY_INNER) * grow;
      const p1 = toPx({
        x: SUN_C.x + RAY_INNER * Math.cos(a),
        y: SUN_C.y + RAY_INNER * Math.sin(a),
      });
      const p2 = toPx({
        x: SUN_C.x + outerR * Math.cos(a),
        y: SUN_C.y + outerR * Math.sin(a),
      });
      rays.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, op: grow });
    }
    const settle = Math.max(0, t - MORPH_END);
    const wobble =
      settle > 0 ? Math.sin(settle * 124) * Math.exp(-settle * 32) * 0.04 : 0;

    // The sun pumps white liquid with a surge on each remaining beat, and
    // keeps steadily topping up in between — so the level always creeps upward
    // rather than stalling at half and jumping to full.
    const surgeBeats = beats.filter((b) => b > MORPH_END);
    if (surgeBeats.length === 0) surgeBeats.push(0.53);
    const firstSurge = surgeBeats[0];
    const lastSurge = surgeBeats[surgeBeats.length - 1];
    const climbSpan = Math.max(0.1, lastSurge - firstSurge);
    const level = Math.min(
      1,
      0.4 * easeOutCubic(clamp01((t - firstSurge) / 0.1)) +
        0.3 * clamp01((t - firstSurge) / climbSpan) +
        0.3 * easeOutCubic(clamp01((t - lastSurge) / 0.1)),
    );
    let liquidD = "";
    if (level > 0) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      const pad = strokePx;
      const amp = 5 * pxPerUnit * (1 - 0.7 * level);
      const surface = maxY + pad - level * (maxY - minY + amp + pad * 2);
      const cycles = 2.2;
      const surfaceAt = (x: number) =>
        surface +
        amp *
          Math.sin(
            Math.PI * 2 * ((cycles * (x - minX)) / (maxX - minX) - t * 3),
          );
      // Clip the sun polygon against the region below the wavy surface —
      // computed in plain geometry (the canvas renderer has no reliable SVG
      // clipping). Crossing chords are re-sampled along the wave so the
      // liquid's surface actually undulates.
      const depth = (p: Pt) => p.y - surfaceAt(p.x);
      const ring: { p: Pt; cross: "exit" | "entry" | null }[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const fa = depth(a);
        const fb = depth(b);
        if (fa >= 0) ring.push({ p: a, cross: null });
        if (fa >= 0 !== fb >= 0) {
          const frac = fa / (fa - fb);
          const x = a.x + (b.x - a.x) * frac;
          ring.push({
            p: { x, y: surfaceAt(x) },
            cross: fa >= 0 ? "exit" : "entry",
          });
        }
      }
      const liquid: Pt[] = [];
      for (let i = 0; i < ring.length; i++) {
        const cur = ring[i];
        liquid.push(cur.p);
        const nxt = ring[(i + 1) % ring.length];
        if (cur.cross === "exit" && nxt.cross === "entry") {
          const step = cur.p.x < nxt.p.x ? 6 : -6;
          for (
            let x = cur.p.x + step;
            step > 0 ? x < nxt.p.x : x > nxt.p.x;
            x += step
          ) {
            liquid.push({ x, y: surfaceAt(x) });
          }
        }
      }
      if (liquid.length > 2) liquidD = fullPath(liquid);
    }
    // Gather… then release.
    const contractT = easeInOutCubic(
      clamp01((t - CONTRACT_START) / (EXPAND_START - CONTRACT_START)),
    );
    const contract = 1 - (1 - CONTRACT_MIN) * contractT;
    const expandT = clamp01((t - EXPAND_START) / (EXPAND_END - EXPAND_START));
    const expandS = 1 + (EXPAND_MAX - 1) * expandT * expandT * expandT;
    // The wordmark slips away as the bloom rolls over it.
    const textAlpha = 1 - clamp01(expandT * 1.8);

    // The light's head racing around the loop. Frame 0 is the REAL logo —
    // no tracing light — so the light fades in just after the open, then
    // fades back out with the morph, gone once the emblem is a heart.
    const lightIn = clamp01((t - 0.04) / 0.08);
    const lightAlpha = lightIn * (1 - morphT);
    const headFrac = t * LAPS;
    const trail = Array.from({ length: TRAIL_SEGS }, (_, i) => {
      const f0 = headFrac - TAIL * (1 - i / TRAIL_SEGS);
      const f1 = headFrac - TAIL * (1 - (i + 1) / TRAIL_SEGS);
      const a = pointAt(pts, f0);
      const b = pointAt(pts, f1);
      const frac = (i + 1) / TRAIL_SEGS;
      const op = Math.pow(frac, 2.3); // bright at the head, quick clean fade
      const w = strokePx * (0.45 + 0.95 * frac); // tapers thin → thick at head
      return { a, b, op, w };
    });
    const pen = pointAt(pts, headFrac);

    // Subtle liquid float on the whole mark.
    const bobPhase = t * Math.PI * 2 * 1.1;
    const bob = Math.sin(bobPhase) * u * 0.008 * calm;
    const sway = Math.sin(bobPhase - 0.6) * 0.7 * calm;

    const markScale = (1 + 0.04 * beatP + wobble) * contract * expandS;

    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <div
        style={{
          position: "relative",
          width,
          height,
          display: "flex",
        }}
      >
        {/* Bold pink field. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            display: "flex",
            backgroundImage:
              "linear-gradient(158deg, #ff5c86 0%, #ff385c 52%, #e61e4d 100%)",
          }}
        />

        {/* Wordmark + tagline, positioned below the emblem's box. */}
        <div
          style={{
            position: "absolute",
            top: markTop + markH + markGap,
            left: 0,
            width,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: fontFamily.display,
              fontWeight: 700,
              fontSize: wordFont,
              lineHeight: 1,
              letterSpacing: -wordFont * 0.02,
              color: `rgba(255,255,255,${textAlpha})`,
            }}
          >
            aquabnb
          </div>
          <div
            style={{
              display: "flex",
              marginTop: tagGap,
              fontFamily: fontFamily.body,
              fontWeight: 500,
              fontSize: taglineFont,
              letterSpacing: taglineFont * 0.34,
              textTransform: "uppercase",
              color: `rgba(255,255,255,${0.84 * textAlpha})`,
            }}
          >
            holiday rentals
          </div>
        </div>

        {/* Emblem — full-frame SVG so the sun's bloom can cover everything. */}
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <g
            transform={`rotate(${sway.toFixed(3)} ${sunC.x.toFixed(1)} ${sunC.y.toFixed(1)}) translate(0 ${bob.toFixed(2)})`}
          >
            <g
              transform={`translate(${sunC.x.toFixed(1)} ${sunC.y.toFixed(1)}) scale(${markScale.toFixed(4)}) translate(${(-sunC.x).toFixed(1)} ${(-sunC.y).toFixed(1)})`}
            >
              {/* Tight constant glow. */}
              <path
                d={lineD}
                strokeOpacity={0.13}
                strokeWidth={strokePx * 1.6}
              />
              {/* The white line itself. */}
              <path d={lineD} strokeWidth={strokePx} />
              {/* The liquid the sun pumps full of on the beat — its polygon
                  pre-clipped to the disc, topped with a travelling wave. */}
              {liquidD !== "" && (
                <path d={liquidD} fill="#ffffff" stroke="none" />
              )}
              {/* Detached rays — igniting around the disc, turning lazily. */}
              {rays.map((ray, i) => (
                <line
                  key={i}
                  x1={ray.x1}
                  y1={ray.y1}
                  x2={ray.x2}
                  y2={ray.y2}
                  strokeWidth={strokePx}
                  strokeOpacity={ray.op}
                />
              ))}
            </g>
            {/* Travelling light: a smooth tapered streak hugging the line. */}
            {trail.map((s, i) => (
              <line
                key={i}
                x1={s.a.x}
                y1={s.a.y}
                x2={s.b.x}
                y2={s.b.y}
                strokeOpacity={s.op * 0.5 * lightAlpha}
                strokeWidth={s.w}
              />
            ))}
            {/* Crisp pen head — flares gently on the beat. */}
            <circle
              cx={pen.x}
              cy={pen.y}
              r={strokePx * (1.1 + 0.5 * beatP)}
              fill="#ffffff"
              fillOpacity={0.26 * lightAlpha}
              stroke="none"
            />
            <circle
              cx={pen.x}
              cy={pen.y}
              r={strokePx * (0.62 + 0.2 * beatP)}
              fill="#ffffff"
              fillOpacity={lightAlpha}
              stroke="none"
            />
          </g>
        </svg>
      </div>,
      { fonts },
    );
    // Flat vector graphics + text: PNG avoids JPEG fringing on the white line.
    return canvas.encode("png");
  });
}
