import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { EffieRunnerReturn, RunnerArgs } from "@effing/fn";
import type { CoverPhotoProps } from "~/images/cover-photo.fn";

export const propsSchema = z.object({
  imageUrls: z.tuple([z.string().url(), z.string().url()]),
});

type PropertyCarouselProps = z.infer<typeof propsSchema>;

export const previewProps: PropertyCarouselProps = {
  imageUrls: [
    "https://static.effing.dev/unsplash/white-villa/wide.jpg",
    "https://static.effing.dev/unsplash/white-villa/bedroom.jpg",
  ],
};

const SLIDE_DURATION = 3;
const TRANSITION_DURATION = 0.6;

export async function runner({
  props: { imageUrls },
  bounds: { width, height },
}: RunnerArgs<PropertyCarouselProps>): EffieRunnerReturn {
  const [a, b] = imageUrls;
  const slides = [a, b, a];
  const directions = ["left", "right"] as const;

  const photoSources = await Promise.all(
    [a, b].map((imageUrl) =>
      fnUrl(
        "image",
        "cover-photo",
        { imageUrl } satisfies CoverPhotoProps,
        { width, height },
      ),
    ),
  );
  const sourceFor = (imageUrl: string) =>
    photoSources[imageUrl === a ? 0 : 1];

  return effieData({
    width,
    height,
    fps: 30,
    cover: photoSources[0],
    background: { type: "color", color: "black" },
    segments: slides.map((imageUrl, i) =>
      effieSegment({
        duration: SLIDE_DURATION,
        ...(i === 0
          ? {}
          : {
              transition: {
                type: "slide",
                direction: directions[i - 1],
                duration: TRANSITION_DURATION,
              },
            }),
        layers: [{ type: "image", source: sourceFor(imageUrl) }],
      }),
    ),
  });
}
