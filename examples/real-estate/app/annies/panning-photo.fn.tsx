import { z } from "zod";
import { tween } from "@effing/tween";
import { createCanvas, loadImage } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { computePanCrop } from "~/photo-pan";

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  frameCount: z.number().int().min(1),
  direction: z.enum(["left", "right", "up", "down"]).optional(),
  distance: z.number().optional(),
  oversize: z.number().min(1).optional(),
});

export type PanningPhotoProps = z.infer<typeof propsSchema>;

export const previewProps: PanningPhotoProps = {
  imageUrl:
    "https://static.effing.dev/fake-white-house/fake-white-house-garden.jpg",
  frameCount: 90,
  direction: "left",
  distance: 0.15,
  oversize: 1.0,
};

export async function* runner({
  props: {
    imageUrl,
    frameCount,
    direction = "left",
    distance = 0.15,
    oversize = 1.2,
  },
  bounds: { width, height },
}: RunnerArgs<PanningPhotoProps>): AnnieRunnerReturn {
  const response = await fetch(imageUrl);
  const image = await loadImage(Buffer.from(await response.arrayBuffer()));

  yield* tween(frameCount, async ({ lower: progress }) => {
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
  });
}
