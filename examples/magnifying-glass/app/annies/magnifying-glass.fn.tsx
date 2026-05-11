import { z } from "zod";
import { tween, easeInOutQuad } from "@effing/tween";
import {
  createCanvas,
  renderReactElement,
  type Canvas,
  type SKRSContext2D,
} from "@effing/canvas";
import { interBold, loadFonts } from "~/fonts";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";

export const propsSchema = z.object({
  text: z.string(),
  fontSize: z.number().int().min(1).optional(),
  fontColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  zoom: z.number().min(1).max(8).optional(),
  lensRadius: z.number().int().min(20).optional(),
  frameCount: z.number().int().min(1).optional(),
});

export type MagnifyingGlassProps = z.infer<typeof propsSchema>;

export const previewProps: MagnifyingGlassProps = {
  text: "read the fine print",
  fontColor: "#0a0a0a",
  backgroundColor: "#fafafa",
  zoom: 2.4,
  frameCount: 120,
};

export async function* runner({
  props: {
    text,
    fontSize,
    fontColor = "#0a0a0a",
    backgroundColor = "#fafafa",
    zoom = 2.4,
    lensRadius,
    frameCount = 120,
  },
  bounds: { width, height },
}: RunnerArgs<MagnifyingGlassProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interBold]);
  const radius = lensRadius ?? Math.round(Math.min(width, height) * 0.18);
  const resolvedFontSize =
    fontSize ?? Math.round(Math.min(width, height) * 0.085);
  const ringWidth = Math.max(6, radius * 0.04);

  const baseCanvas = createCanvas(width, height);
  const baseCtx = baseCanvas.getContext("2d");
  await renderReactElement(
    baseCtx,
    <Background
      width={width}
      height={height}
      text={text}
      fontSize={resolvedFontSize}
      fontColor={fontColor}
      backgroundColor={backgroundColor}
    />,
    { fonts },
  );
  const baseImageData = baseCtx.getImageData(0, 0, width, height);
  const baseData = baseImageData.data;

  // Lens travels from just off-screen left to just off-screen right.
  const startX = -radius * 0.4;
  const endX = width + radius * 0.4;
  const cy = height / 2;

  yield* tween(frameCount, async ({ lower: p }) => {
    const cx = startX + (endX - startX) * easeInOutQuad(p);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseCanvas, 0, 0);

    const lens = refractLens(baseData, width, height, cx, cy, radius, zoom);
    if (lens) {
      const halftone = halftoneCanvas(lens.data, lens.w, lens.h, backgroundColor);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(halftone, lens.x0, lens.y0);
      drawInnerRimShadow(ctx, cx, cy, radius);
      drawLightSpeck(ctx, cx, cy, radius);
      ctx.restore();
    }

    drawRim(ctx, cx, cy, radius, ringWidth);

    return canvas.encode("jpeg");
  });
}

function Background({
  width,
  height,
  text,
  fontSize,
  fontColor,
  backgroundColor,
}: {
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        fontFamily: "Inter",
        fontWeight: 700,
        fontSize,
        color: fontColor,
        letterSpacing: -1,
      }}
    >
      {text}
    </div>
  );
}

// Per-pixel barrel mapping: zoom is full at the lens center and tapers to 1 at
// the rim, so the magnified content blends seamlessly into the surrounding
// page — the "slight glass refraction" feel.
function refractLens(
  baseData: Uint8ClampedArray,
  W: number,
  H: number,
  cx: number,
  cy: number,
  R: number,
  zoom: number,
): { data: Uint8ClampedArray; w: number; h: number; x0: number; y0: number } | null {
  const x0 = Math.max(0, Math.floor(cx - R));
  const y0 = Math.max(0, Math.floor(cy - R));
  const x1 = Math.min(W, Math.ceil(cx + R));
  const y1 = Math.min(H, Math.ceil(cy + R));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return null;

  const data = new Uint8ClampedArray(w * h * 4);
  const R2 = R * R;

  for (let py = 0; py < h; py++) {
    const dy = y0 + py - cy;
    for (let px = 0; px < w; px++) {
      const dx = x0 + px - cx;
      const d2 = dx * dx + dy * dy;
      const i = (py * w + px) * 4;
      if (d2 > R2) {
        // Outside the disk — fill with white so halftone sampling here yields
        // empty cells. The pixels are clipped away when compositing anyway.
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
        continue;
      }
      const t = Math.sqrt(d2) / R;
      const ts = t * t * (3 - 2 * t); // smoothstep
      const localZoom = zoom - (zoom - 1) * ts;
      const sx = cx + dx / localZoom;
      const sy = cy + dy / localZoom;

      const ix = Math.floor(sx);
      const iy = Math.floor(sy);
      const fx = sx - ix;
      const fy = sy - iy;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const i00 = pixelIndex(ix, iy, W, H);
      const i10 = pixelIndex(ix + 1, iy, W, H);
      const i01 = pixelIndex(ix, iy + 1, W, H);
      const i11 = pixelIndex(ix + 1, iy + 1, W, H);

      data[i] =
        baseData[i00] * w00 +
        baseData[i10] * w10 +
        baseData[i01] * w01 +
        baseData[i11] * w11;
      data[i + 1] =
        baseData[i00 + 1] * w00 +
        baseData[i10 + 1] * w10 +
        baseData[i01 + 1] * w01 +
        baseData[i11 + 1] * w11;
      data[i + 2] =
        baseData[i00 + 2] * w00 +
        baseData[i10 + 2] * w10 +
        baseData[i01 + 2] * w01 +
        baseData[i11 + 2] * w11;
      data[i + 3] = 255;
    }
  }
  return { data, w, h, x0, y0 };
}

function pixelIndex(x: number, y: number, W: number, H: number) {
  const cx = x < 0 ? 0 : x >= W ? W - 1 : x;
  const cy = y < 0 ? 0 : y >= H ? H - 1 : y;
  return (cy * W + cx) * 4;
}

// CMYK halftone — newspaper-style print rosette. Each ink channel uses its
// classic screen angle so dot edges fringe with cyan/magenta/yellow when
// magnified.
function halftoneCanvas(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  paperColor: string,
): Canvas {
  const off = createCanvas(w, h);
  const ctx = off.getContext("2d");
  ctx.fillStyle = paperColor;
  ctx.fillRect(0, 0, w, h);

  const cell = Math.max(5, Math.round(Math.min(w, h) / 50));
  const half = cell * 0.62;
  const channels: ReadonlyArray<{
    angle: number;
    color: string;
    component: 0 | 1 | 2 | 3;
  }> = [
    // Standard print screen angles.
    { angle: 0, color: "#fff200", component: 2 }, // Y
    { angle: deg(15), color: "#00aeef", component: 0 }, // C
    { angle: deg(75), color: "#ec008c", component: 1 }, // M
    { angle: deg(45), color: "#1a1a1a", component: 3 }, // K
  ];

  const diag = Math.ceil(Math.hypot(w, h));
  const cxOff = w / 2;
  const cyOff = h / 2;

  for (const ch of channels) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = ch.color;
    const cos = Math.cos(ch.angle);
    const sin = Math.sin(ch.angle);

    for (let v = -diag; v < diag; v += cell) {
      for (let u = -diag; u < diag; u += cell) {
        const x = cos * u - sin * v + cxOff;
        const y = sin * u + cos * v + cyOff;
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const i = (iy * w + ix) * 4;
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const value = channelValue(ch.component, r, g, b);
        if (value <= 0.04) continue;
        const rad = half * Math.sqrt(value);
        if (rad < 0.4) continue;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  return off;
}

function channelValue(component: 0 | 1 | 2 | 3, r: number, g: number, b: number) {
  // Classic CMYK separation. For grayscale input (black text on white), C=M=Y
  // all equal the darkness of the pixel and K matches — that's what creates
  // the colorful rosette at letter edges.
  const c = 1 - r / 255;
  const m = 1 - g / 255;
  const y = 1 - b / 255;
  if (component === 0) return c;
  if (component === 1) return m;
  if (component === 2) return y;
  return Math.min(c, m, y); // K
}

function deg(d: number) {
  return (d * Math.PI) / 180;
}

function drawInnerRimShadow(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  const grad = ctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r);
  grad.addColorStop(0, "rgba(0, 0, 0, 0)");
  grad.addColorStop(0.85, "rgba(40, 40, 45, 0.15)");
  grad.addColorStop(1, "rgba(40, 40, 45, 0.32)");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

function drawLightSpeck(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  const sx = cx - r * 0.42;
  const sy = cy - r * 0.42;
  const sr = r * 0.16;
  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  grad.addColorStop(0.45, "rgba(255, 255, 255, 0.55)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

function drawRim(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
  ringWidth: number,
) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.shadowBlur = r * 0.13;
  ctx.shadowOffsetX = r * 0.02;
  ctx.shadowOffsetY = r * 0.06;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = ringWidth;
  ctx.strokeStyle = "#2c2e33";
  ctx.stroke();
  ctx.restore();
}
