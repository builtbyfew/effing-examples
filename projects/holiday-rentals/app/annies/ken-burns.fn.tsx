import { z } from "zod";
import { createCanvas, loadImage } from "@effing/canvas";
import type { AnnieRunnerReturn, RunnerArgs } from "@effing/fn";
import { tween } from "@effing/tween";
import { PHOTOS } from "~/sample-listing";

// Classic rect-to-rect Ken Burns: the move is defined by a start and an end
// FOCAL — a normalized point of interest in the source photo plus a crop
// scale — and the visible crop glides between them. That allows diagonal
// drifts and moves with intent (push in on the pool, pull back from the
// window), not just cardinal pans around the centre.
//
// The drift runs at constant velocity straight through both ends of the clip,
// so scene cuts land mid-motion — the documentary look — rather than on a
// slowing or frozen frame.

const focalSchema = z.object({
  // Point of interest in the source image, normalized 0..1 on each axis.
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  // Crop tightness: 1 = the largest viewport-shaped crop, 1.2 = 20% tighter.
  scale: z.number().min(1),
});

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  frameCount: z.number().int().min(1),
  from: focalSchema.optional(),
  to: focalSchema.optional(),
  // Hold the `from` framing for this fraction of the clip before drifting —
  // for scenes that crossfade in from a still showing the SAME photo, so the
  // fade overlays identical frames instead of ghosting against the move.
  holdStart: z.number().min(0).max(1).optional(),
});

export type KenBurnsProps = z.infer<typeof propsSchema>;
export type KenBurnsFocal = z.infer<typeof focalSchema>;

export const previewProps: KenBurnsProps = {
  imageUrl: PHOTOS.pool,
  frameCount: 90,
  from: { x: 0.55, y: 0.35, scale: 1.16 },
  to: { x: 0.5, y: 0.5, scale: 1.0 },
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Constant-velocity drift — deliberately NO easing at the clip edges. Scene
// transitions overlap the ends of the clips, so any deceleration/acceleration
// there lands inside the dissolve and reads as the motion stalling mid-cut.
// Only a clip that opens on a hold gets a short ease-in ramp afterwards
// (jumping from standstill to full drift would jolt).
const RAMP = 0.1;
function drift(t: number, rampIn: boolean): number {
  if (!rampIn) return t;
  const d = t < RAMP ? (t * t) / (2 * RAMP) : RAMP / 2 + (t - RAMP);
  return d / (1 - RAMP / 2);
}

export async function* runner({
  props: {
    imageUrl,
    frameCount,
    from = { x: 0.5, y: 0.5, scale: 1.0 },
    to = { x: 0.5, y: 0.5, scale: 1.12 },
    holdStart = 0,
  },
  bounds: { width, height },
}: RunnerArgs<KenBurnsProps>): AnnieRunnerReturn {
  const response = await fetch(imageUrl);
  const image = await loadImage(Buffer.from(await response.arrayBuffer()));

  // The largest viewport-shaped crop that fits the source — scale 1.
  const baseW = Math.min(image.width, (image.height * width) / height);
  const baseH = (baseW * height) / width;

  // A focal resolves to a crop rect centred on the point of interest, clamped
  // so the crop never leaves the source.
  const rectFor = (f: { x: number; y: number; scale: number }) => {
    const w = baseW / f.scale;
    const h = baseH / f.scale;
    return {
      cx: clamp(f.x * image.width, w / 2, image.width - w / 2),
      cy: clamp(f.y * image.height, h / 2, image.height - h / 2),
      w,
      h,
    };
  };
  const a = rectFor(from);
  const b = rectFor(to);

  yield* tween(frameCount, async ({ lower: progress }) => {
    const d =
      progress <= holdStart
        ? 0
        : drift((progress - holdStart) / (1 - holdStart), holdStart > 0);
    const w = lerp(a.w, b.w, d);
    const h = lerp(a.h, b.h, d);
    const cx = lerp(a.cx, b.cx, d);
    const cy = lerp(a.cy, b.cy, d);

    const canvas = createCanvas(width, height);
    canvas
      .getContext("2d")
      .drawImage(image, cx - w / 2, cy - h / 2, w, h, 0, 0, width, height);
    return canvas.encode("jpeg");
  });
}
