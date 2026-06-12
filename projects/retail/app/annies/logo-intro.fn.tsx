import { z } from "zod";
import { tween, easeOutQuad } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { interBold, loadFonts } from "~/fonts";
import {
  CLOUD_GRADIENT,
  MARK_VIEWBOX,
  cloudPath,
  shoePath,
} from "~/cloudstep-mark";

// The fictional shoe shop's animated logo (see ~/cloudstep-mark): a line-art
// sneaker mid-stride with an outlined cloud at its heel, a ground line
// flowing from the cloud, and the type lockup beneath. Fully on screen and
// full-size from the very first frame (it doubles as the video's opening
// image), kept alive by a breathing glow and a flare comet tracing the
// cloud's line once. The chat-promo intro plays it as the backdrop the first
// message's notification drops onto, dimming it once the banner lands.

export const propsSchema = z.object({
  accentColor: z.string().optional(),
  frameCount: z.number().int().min(1),
  // Dim the logo from this frame on, handing focus to whatever the effie
  // overlays (the notification banner).
  dimFrame: z.number().int().optional(),
});

export type LogoIntroProps = z.infer<typeof propsSchema>;

export const previewProps: LogoIntroProps = {
  frameCount: 84,
  dimFrame: 26,
};

const DIM_FRAMES = 10;

// The mark: the line-art sneaker in white, and the cloud whose line flows
// into the shoe as a seam, filled with a gradient that dissolves from
// lavender into the shoe line's white. Mark coordinates are the SVG's own
// 940x534 box.
const MARK_W = MARK_VIEWBOX.width;
const MARK_H = MARK_VIEWBOX.height;
// The flare: a glowing comet head that draws the cloud's line once, in one
// direction — from the pointy tip of its base line at the far bottom-left,
// up over the puffs, down the right shoulder, and along the seam to its
// tail behind the shoe — fading out from the moment it reaches the shoe.
// The SVG outline is the boundary of a stroked line (out along one side,
// back along the other), so the comet walks one side, from the start cap to
// the first close approach of the tail.
const TRACE_START = 4;
const TRACE_FRAMES = 52;
const TRACE_SAMPLES = 320;
const TAIL = 22;
// Route anchors in mark units, measured from the SVG: the base line's
// pointy tip, the seam's tail tip, and the cloud/shoe junction where the
// fade-out begins.
const CLOUD_START = { x: 28, y: 496 };
const SEAM_END = { x: 843, y: 506 };
const JUNCTION = { x: 520, y: 430 };

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

type Point = { x: number; y: number };

/**
 * Sample evenly spaced points along the outer boundary of an SVG path
 * (M/L/m/l/c/C commands, first subpath only), in the path's own units.
 */
function samplePerimeter(d: string, count: number): Point[] {
  const tokens = d.match(/[a-zA-Z]|-?\d+(?:\.\d+)?/g) ?? [];
  const raw: Point[] = [];
  let i = 0;
  let cmd = "";
  let cx = 0;
  let cy = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      cmd = tokens[i++];
      if (cmd === "z" || cmd === "Z") break; // outer boundary done
      continue;
    }
    if (cmd === "M" || cmd === "L") {
      cx = num();
      cy = num();
      raw.push({ x: cx, y: cy });
      if (cmd === "M") cmd = "L";
    } else if (cmd === "m" || cmd === "l") {
      cx += num();
      cy += num();
      raw.push({ x: cx, y: cy });
      if (cmd === "m") cmd = "l";
    } else if (cmd === "c" || cmd === "C") {
      const rel = cmd === "c";
      const x1 = (rel ? cx : 0) + num();
      const y1 = (rel ? cy : 0) + num();
      const x2 = (rel ? cx : 0) + num();
      const y2 = (rel ? cy : 0) + num();
      const x3 = (rel ? cx : 0) + num();
      const y3 = (rel ? cy : 0) + num();
      for (let k = 1; k <= 10; k++) {
        const t = k / 10;
        const u = 1 - t;
        raw.push({
          x: u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          y: u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        });
      }
      cx = x3;
      cy = y3;
    } else {
      i++; // unsupported command payload — skip token defensively
    }
  }

  // Resample to evenly spaced points by cumulative arc length.
  const cum = [0];
  for (let k = 1; k < raw.length; k++) {
    cum.push(cum[k - 1] + Math.hypot(raw[k].x - raw[k - 1].x, raw[k].y - raw[k - 1].y));
  }
  const total = cum[cum.length - 1];
  const points: Point[] = [];
  let seg = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / (count - 1)) * total;
    while (seg < cum.length - 2 && cum[seg + 1] < target) seg++;
    const span = cum[seg + 1] - cum[seg] || 1;
    const t = (target - cum[seg]) / span;
    points.push({
      x: raw[seg].x + (raw[seg + 1].x - raw[seg].x) * t,
      y: raw[seg].y + (raw[seg + 1].y - raw[seg].y) * t,
    });
  }
  return points;
}

function accentRgb(color: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(color);
  if (!match) return [124, 92, 214]; // the default accent
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export async function* runner({
  props: { accentColor = "#7c5cd6", frameCount, dimFrame },
  bounds: { width, height },
}: RunnerArgs<LogoIntroProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interBold]);
  const min = Math.min(width, height);
  const [ar, ag, ab] = accentRgb(accentColor);

  const markW = Math.round(min * 0.46);
  const markH = Math.round((markW * MARK_H) / MARK_W);
  const markCenterY = Math.round(height * 0.38);
  // Lockup proportions follow the source image: wordmark font size and
  // mark-to-text gap relative to the mark's width.
  const wordSize = Math.round(markW * 0.31);
  const wordTop = markCenterY + Math.round(markH / 2 + markW * 0.075);

  // Mark units → canvas pixels.
  const s = markW / MARK_W;
  const mx = (x: number) => (width - markW) / 2 + x * s;
  const my = (y: number) => markCenterY - markH / 2 + y * s;

  // The flare's route, in mark units (= the SVG's own coordinates).
  const nearestIn = (loop: Point[], target: Point) => {
    let best = 0;
    let bestD = Infinity;
    loop.forEach((p, i) => {
      const d = (p.x - target.x) ** 2 + (p.y - target.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };
  const walkTo = (
    loop: Point[],
    from: Point,
    to: Point,
    // Picks the walk direction from the two candidate next points.
    prefer: (forward: Point, backward: Point) => boolean,
  ): Point[] => {
    const capA = nearestIn(loop, from);
    const n = loop.length;
    const step = prefer(loop[(capA + 6) % n], loop[(capA - 6 + n) % n])
      ? 1
      : -1;
    const out: Point[] = [];
    for (let i = capA, k = 0; k < n; k++) {
      out.push(loop[i]);
      i = (i + step + n) % n;
    }
    const lo = Math.round(n * 0.15);
    const dist = out.map((p) => Math.hypot(p.x - to.x, p.y - to.y));
    const bestD = Math.min(...dist.slice(lo));
    const stop = dist.findIndex((d, k) => k >= lo && d <= bestD + 6);
    return out.slice(0, stop + 1);
  };

  // The cloud path includes the seam flowing behind the shoe, so the whole
  // route lives on one outline: up over the puffs (not along the base
  // line), down the right shoulder, and along the seam to its tail.
  const cloudLoop = samplePerimeter(cloudPath, TRACE_SAMPLES);
  const trail = walkTo(cloudLoop, CLOUD_START, SEAM_END, (f, b) => f.y < b.y);
  // Fading starts where the comet reaches the shoe.
  const fadeStart = nearestIn(trail, JUNCTION) / (trail.length - 1);

  // The whole mark — shoe, cloud with its seam — is rendered once on a
  // mark-sized canvas and composited per frame. The cloud carries the
  // touched-up SVG's gradient: lavender dissolving into the shoe line's
  // white where its seam flows behind the shoe. The SVG renderer doesn't
  // support url(#gradient) fills, so the cloud is rendered as a mask and
  // the gradient is composited through it with source-in.
  const cloudSprite = createCanvas(markW, markH);
  await renderReactElement(
    cloudSprite.getContext("2d"),
    <svg width={markW} height={markH} viewBox={`0 0 ${MARK_W} ${MARK_H}`}>
      <path d={cloudPath} fill="#ffffff" stroke="none" />
    </svg>,
    { fonts: [] },
  );
  const cloudCtx = cloudSprite.getContext("2d");
  cloudCtx.globalCompositeOperation = "source-in";
  const cloudGrad = cloudCtx.createLinearGradient(
    CLOUD_GRADIENT.x1 * s,
    CLOUD_GRADIENT.y1 * s,
    CLOUD_GRADIENT.x2 * s,
    CLOUD_GRADIENT.y2 * s,
  );
  cloudGrad.addColorStop(0, CLOUD_GRADIENT.from);
  cloudGrad.addColorStop(1, CLOUD_GRADIENT.to);
  cloudCtx.fillStyle = cloudGrad;
  cloudCtx.fillRect(0, 0, markW, markH);
  cloudCtx.globalCompositeOperation = "source-over";

  const markSprite = createCanvas(markW, markH);
  const markCtx = markSprite.getContext("2d");
  markCtx.drawImage(cloudSprite, 0, 0);
  await renderReactElement(
    markCtx,
    <svg width={markW} height={markH} viewBox={`0 0 ${MARK_W} ${MARK_H}`}>
      <path d={shoePath} fill="#f4f1fb" stroke="none" />
    </svg>,
    { fonts: [] },
  );

  // Sized so the tagline spans from the C's right edge to the p — about
  // 70% of the wordmark's width, as in the source image.
  const tagSize = Math.round(wordSize * 0.17);
  const wordSprite = createCanvas(width, Math.round(wordSize * 2.5));
  await renderReactElement(
    wordSprite.getContext("2d"),
    <div
      style={{
        width,
        height: Math.round(wordSize * 2.5),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: wordSize,
          letterSpacing: Math.round(-wordSize * 0.02),
          color: "#f4f1fb",
        }}
      >
        Cloudstep
      </div>
      <div
        style={{
          marginTop: Math.round(wordSize * 0.12),
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: tagSize,
          letterSpacing: Math.round(tagSize * 0.45),
          color: "#8d82b5",
        }}
      >
        RUNNING SHOE STORE
      </div>
    </div>,
    { fonts },
  );

  yield* tween(frameCount, async (_interval, frame) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#1d1530");
    bg.addColorStop(1, "#0e0a18");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const dimP =
      dimFrame !== undefined
        ? easeOutQuad(clamp01((frame - dimFrame) / DIM_FRAMES))
        : 0;

    // Breathing glow behind the mark.
    const glowAlpha = (0.3 + 0.07 * Math.sin(frame * 0.09)) * (1 - 0.55 * dimP);
    const glowRadius = min * (0.52 + 0.025 * Math.sin(frame * 0.07));
    const glow = ctx.createRadialGradient(
      width / 2,
      markCenterY,
      0,
      width / 2,
      markCenterY,
      glowRadius,
    );
    glow.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, ${glowAlpha})`);
    glow.addColorStop(1, `rgba(${ar}, ${ag}, ${ab}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // The logo is complete, full-size, and still from frame 0; the life is
    // the breathing glow and a flare comet tracing the cloud's line once.
    // The notification only dims it — no size change.
    const groupAlpha = 1 - 0.4 * dimP;

    ctx.save();
    ctx.globalAlpha = groupAlpha;
    ctx.drawImage(markSprite, mx(0), my(0));
    ctx.drawImage(wordSprite, 0, wordTop);

    const traceP = clamp01((frame - TRACE_START) / TRACE_FRAMES);
    if (traceP > 0 && traceP < 1) {
      // Ease into existence, then fade out along the seam toward the toe.
      const env = Math.min(1, traceP / 0.06);
      const head = Math.round(traceP * (trail.length - 1));
      for (let k = 0; k < TAIL; k++) {
        const idx = head - k;
        if (idx < 0) break;
        const pos = idx / (trail.length - 1);
        const posFade =
          pos < fadeStart ? 1 : 1 - (pos - fadeStart) / (1 - fadeStart);
        const fade = (1 - k / TAIL) * posFade;
        const p = trail[idx];
        const px = mx(p.x);
        const py = my(p.y);
        const r = (8 + 28 * fade) * s;
        const cometGlow = ctx.createRadialGradient(px, py, 0, px, py, r);
        cometGlow.addColorStop(
          0,
          `rgba(255, 255, 255, ${0.75 * fade * fade * env * groupAlpha})`,
        );
        cometGlow.addColorStop(
          0.45,
          `rgba(${ar}, ${ag}, ${ab}, ${0.4 * fade * fade * env * groupAlpha})`,
        );
        cometGlow.addColorStop(1, `rgba(${ar}, ${ag}, ${ab}, 0)`);
        ctx.fillStyle = cometGlow;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    ctx.restore();
    return canvas.encode("jpeg");
  });
}
