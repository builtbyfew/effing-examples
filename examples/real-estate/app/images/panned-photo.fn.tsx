import { z } from "zod";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { createCanvas, loadImage } from "@effing/canvas";
import { computePanCrop } from "~/photo-pan";

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  direction: z.enum(["left", "right", "up", "down"]).optional(),
  distance: z.number().optional(),
  oversize: z.number().min(1).optional(),
  progress: z.number().min(0).max(1).optional(),
});

export type PannedPhotoProps = z.infer<typeof propsSchema>;

export const previewProps: PannedPhotoProps = {
  imageUrl:
    "https://static.effing.dev/fake-white-house/fake-white-house-drone-shot.jpg",
  direction: "left",
  distance: 0.15,
  oversize: 1.0,
  progress: 1,
};

export async function runner({
  props: {
    imageUrl,
    direction = "left",
    distance = 0.15,
    oversize = 1.2,
    progress = 1,
  },
  bounds: { width, height },
}: RunnerArgs<PannedPhotoProps>): ImageRunnerReturn {
  const response = await fetch(imageUrl);
  const image = await loadImage(Buffer.from(await response.arrayBuffer()));

  const { sx, sy, sw, sh } = computePanCrop({
    imageWidth: image.width,
    imageHeight: image.height,
    width,
    height,
    direction,
    distance,
    oversize,
    progress,
  });

  const canvas = createCanvas(width, height);
  canvas.getContext("2d").drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
  return canvas.encode("jpeg");
}
