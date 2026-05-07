import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { CubeRotationProps } from "~/annies/cube-rotation.fn";

const FPS = 30;

export const propsSchema = z.object({
  imageUrls: z.array(z.string().url()).length(8),
  holdDuration: z.number().positive().optional(),
  transitionDuration: z.number().positive().optional(),
  zoomOutScale: z.number().positive().max(1).optional(),
  background: z.string().optional(),
});

type ThreeDImageCubeProps = z.infer<typeof propsSchema>;

export const previewProps: ThreeDImageCubeProps = {
  imageUrls: [
    "https://static.effing.dev/picsum/1080/1080/coffee.jpg",
    "https://static.effing.dev/unsplash/white-villa/wide.jpg",
    "https://static.effing.dev/unsplash/white-villa/elevated.jpg",
    "https://static.effing.dev/unsplash/white-villa/bedroom.jpg",
    "https://static.effing.dev/unsplash/white-villa/bathroom.jpg",
    "https://static.effing.dev/unsplash/white-villa/portrait.jpg",
    "https://static.effing.dev/picsum/1080/1920/road.jpg",
    "https://static.effing.dev/picsum/1080/1920/sky.jpg",
  ],
  holdDuration: 1.5,
  transitionDuration: 1,
  zoomOutScale: 0.6,
  background: "#0a0a0a",
};

export async function runner({
  props: {
    imageUrls,
    holdDuration = 1.5,
    transitionDuration = 1,
    zoomOutScale = 0.6,
    background = "#0a0a0a",
  },
  bounds: { width, height },
}: RunnerArgs<ThreeDImageCubeProps>): EffieRunnerReturn {
  const duration =
    imageUrls.length * holdDuration +
    (imageUrls.length - 1) * transitionDuration;

  const cubeSource = await fnUrl(
    "annie",
    "cube-rotation",
    {
      imageUrls,
      holdDuration,
      transitionDuration,
      zoomOutScale,
      fps: FPS,
      background,
    } satisfies CubeRotationProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover: effieWebUrl(imageUrls[0]),
    background: { type: "color", color: background },
    segments: [
      effieSegment({
        duration,
        layers: [{ type: "animation", source: cubeSource }],
      }),
    ],
  });
}
