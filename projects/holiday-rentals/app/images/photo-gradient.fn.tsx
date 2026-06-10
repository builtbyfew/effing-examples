import { z } from "zod";
import { createCanvas } from "@effing/canvas";
import type { ImageRunnerReturn, RunnerArgs } from "@effing/fn";

// A reusable bottom-anchored scrim so chips and captions stay legible over the
// brighter parts of a photo. Drawn straight to the 2D context — no layout
// needed — and kept on its own layer so it can sit between the photo and the
// text in the promo.

export const propsSchema = z.object({
  strength: z.number().min(0).max(1).optional(),
});

export type PhotoGradientProps = z.infer<typeof propsSchema>;

export const previewProps: PhotoGradientProps = { strength: 0.7 };

export async function runner({
  props: { strength = 0.7 },
  bounds: { width, height },
}: RunnerArgs<PhotoGradientProps>): ImageRunnerReturn {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, height, 0, 0);
  grad.addColorStop(0, `rgba(18, 16, 14, ${0.72 * strength})`);
  grad.addColorStop(0.4, `rgba(18, 16, 14, ${0.28 * strength})`);
  grad.addColorStop(0.75, "rgba(18, 16, 14, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  return canvas.encode("png");
}
