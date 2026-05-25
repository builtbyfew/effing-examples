import { z } from "zod";
import {
  tween,
  linear,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInQuint,
  easeOutQuint,
} from "@effing/tween";
import { createCanvas, loadImage } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { computePanCrop } from "~/photo-pan";

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  frameCount: z.number().int().min(1),
  direction: z.enum(["left", "right", "up", "down"]).optional(),
  distance: z.number().optional(),
  oversize: z.number().min(1).optional(),
  easing: z
    .enum(["linear", "easeIn", "easeOut", "easeInOut", "easeOutIn"])
    .optional(),
  holdFractionStart: z.number().min(0).max(1).optional(),
  holdFractionEnd: z.number().min(0).max(1).optional(),
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

// Quintic halves give a flattened mid-plateau; blending in linear keeps the
// photo creeping rather than fully stalling at the midpoint.
const easeOutIn = (y: number) => {
  const shaped =
    y < 0.5 ? easeOutQuint(2 * y) / 2 : 0.5 + easeInQuint(2 * y - 1) / 2;
  return (shaped + y) / 2;
};

const EASING_FNS = {
  linear,
  easeIn: easeInSine,
  easeOut: easeOutSine,
  easeInOut: easeInOutSine,
  easeOutIn,
};

export async function* runner({
  props: {
    imageUrl,
    frameCount,
    direction = "left",
    distance = 0.15,
    oversize = 1.2,
    easing = "linear",
    holdFractionStart = 0,
    holdFractionEnd = 0,
  },
  bounds: { width, height },
}: RunnerArgs<PanningPhotoProps>): AnnieRunnerReturn {
  const response = await fetch(imageUrl);
  const image = await loadImage(Buffer.from(await response.arrayBuffer()));
  const ease = EASING_FNS[easing];
  const activeSpan = 1 - holdFractionStart - holdFractionEnd;

  yield* tween(frameCount, async ({ lower: progress }) => {
    const easedProgress =
      progress < holdFractionStart
        ? 0
        : progress > 1 - holdFractionEnd
          ? 1
          : ease((progress - holdFractionStart) / activeSpan);
    const { sx, sy, sw, sh } = computePanCrop({
      imageWidth: image.width,
      imageHeight: image.height,
      width,
      height,
      direction,
      distance,
      oversize,
      progress: easedProgress,
    });
    const canvas = createCanvas(width, height);
    canvas.getContext("2d").drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
    return canvas.encode("jpeg");
  });
}
