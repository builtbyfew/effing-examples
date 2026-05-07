import { z } from "zod";
import { createCanvas } from "@effing/canvas";
import type { AnnieRunnerReturn, RunnerArgs } from "@effing/fn";

export const propsSchema = z.object({
  duration: z.number().positive(),
  fps: z.number().positive().optional(),
  intensity: z.number().min(0).max(1).optional(),
});

export type GrainProps = z.infer<typeof propsSchema>;

export const previewProps: GrainProps = {
  duration: 4,
  fps: 30,
  intensity: 0.7,
};

type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

function drawSpeck(ctx: Ctx, w: number, h: number, s: number) {
  const cx = Math.floor(Math.random() * w);
  const cy = Math.floor(Math.random() * h);
  const isDark = Math.random() < 0.82;
  const alpha = 0.45 + Math.random() * 0.5;
  ctx.fillStyle = isDark
    ? `rgba(10,8,4,${alpha})`
    : `rgba(255,250,235,${alpha})`;
  const blobs = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < blobs; i++) {
    const dx = Math.floor((Math.random() - 0.5) * 5 * s);
    const dy = Math.floor((Math.random() - 0.5) * 5 * s);
    const size = Math.max(1, Math.round((1 + Math.random() * 2) * s));
    ctx.fillRect(cx + dx, cy + dy, size, size);
  }
}

function drawHair(ctx: Ctx, w: number, h: number, s: number) {
  const x = Math.floor(Math.random() * w);
  const startY = Math.floor(Math.random() * h * 0.4);
  const length = Math.floor(h * (0.35 + Math.random() * 0.6));
  const endY = Math.min(h, startY + length);
  ctx.fillStyle = `rgba(8,5,2,${0.55 + Math.random() * 0.35})`;
  const thickness = Math.max(1, Math.round((Math.random() < 0.7 ? 1 : 2) * s));
  const segments = 12 + Math.floor(Math.random() * 14);
  const segH = (endY - startY) / segments;
  let curX = x;
  for (let s2 = 0; s2 < segments; s2++) {
    curX += Math.floor((Math.random() - 0.5) * 2.4 * s);
    ctx.fillRect(curX, startY + s2 * segH, thickness, Math.ceil(segH) + 1);
  }
}

function drawSplotch(ctx: Ctx, w: number, h: number, s: number) {
  const cx = Math.floor(Math.random() * w);
  const cy = Math.floor(Math.random() * h);
  const r = Math.round((18 + Math.random() * 50) * s);
  const isDark = Math.random() < 0.65;
  const alpha = 0.07 + Math.random() * 0.13;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  if (isDark) {
    grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
    grad.addColorStop(0.6, `rgba(0,0,0,${alpha * 0.4})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
  } else {
    grad.addColorStop(0, `rgba(255,245,210,${alpha})`);
    grad.addColorStop(0.6, `rgba(255,245,210,${alpha * 0.4})`);
    grad.addColorStop(1, "rgba(255,245,210,0)");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

function drawFlicker(ctx: Ctx, w: number, h: number) {
  const isDark = Math.random() < 0.5;
  const alpha = 0.015 + Math.random() * 0.04;
  ctx.fillStyle = isDark ? `rgba(0,0,0,${alpha})` : `rgba(255,250,230,${alpha})`;
  ctx.fillRect(0, 0, w, h);
}

export async function* runner({
  props: { duration, fps = 30, intensity = 0.7 },
  bounds: { width, height },
}: RunnerArgs<GrainProps>): AnnieRunnerReturn {
  const frameCount = Math.max(1, Math.round(duration * fps));
  const scale = Math.min(width, height) / 540;

  const speckMean = 5 * intensity;
  const hairProb = 0.08 * intensity;
  const splotchProb = 0.18 * intensity;
  const flickerProb = 0.4 * intensity;

  for (let f = 0; f < frameCount; f++) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    if (Math.random() < flickerProb) drawFlicker(ctx, width, height);

    if (Math.random() < splotchProb) drawSplotch(ctx, width, height, scale);
    if (Math.random() < splotchProb * 0.4) drawSplotch(ctx, width, height, scale);

    const speckCount = Math.floor(speckMean + Math.random() * speckMean);
    for (let s = 0; s < speckCount; s++) drawSpeck(ctx, width, height, scale);

    if (Math.random() < hairProb) drawHair(ctx, width, height, scale);

    yield await canvas.encode("png");
  }
}
