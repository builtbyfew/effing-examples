import { z } from "zod";
import { createCanvas } from "@effing/canvas";
import type { ImageRunnerReturn, RunnerArgs } from "@effing/fn";

export const propsSchema = z.object({});

export type PhotoGradientProps = z.infer<typeof propsSchema>;

export const previewProps: PhotoGradientProps = {};

export async function runner({
  bounds: { width, height },
}: RunnerArgs<PhotoGradientProps>): ImageRunnerReturn {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, height, 0, 0);
  grad.addColorStop(0, "rgba(244, 239, 230, 0.33)");
  grad.addColorStop(0.7, "rgba(244, 239, 230, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  return canvas.encode("png");
}
