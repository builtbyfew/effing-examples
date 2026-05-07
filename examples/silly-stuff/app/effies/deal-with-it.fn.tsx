import { z } from "zod";
import {
  effieData,
  effieLayer,
  effieSegment,
  effieWebUrl,
} from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { EffieRunnerReturn, RunnerArgs } from "@effing/fn";
import type { PixelSunglassesProps } from "~/images/pixel-sunglasses.fn";

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  duration: z.number().positive().optional(),
  slideDuration: z.number().positive().optional(),
});
type DealWithItProps = z.infer<typeof propsSchema>;

export const previewProps: DealWithItProps = {
  imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1061&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  duration: 2.5,
  slideDuration: 0.6,
};

const FPS = 30;

export async function runner({
  props: { imageUrl, duration = 2.5, slideDuration = 0.6 },
  bounds: { width, height },
}: RunnerArgs<DealWithItProps>): EffieRunnerReturn {
  const photoSource = effieWebUrl(imageUrl);
  const sunglassesSource = await fnUrl(
    "image",
    "pixel-sunglasses",
    { imageUrl } satisfies PixelSunglassesProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover: photoSource,
    background: { type: "image", source: photoSource },
    segments: [
      effieSegment({
        duration,
        layers: [
          effieLayer({
            type: "image",
            source: sunglassesSource,
            motion: {
              type: "slide",
              direction: "down",
              duration: slideDuration,
              easing: "ease-out",
            },
          }),
        ],
      }),
    ],
  });
}
