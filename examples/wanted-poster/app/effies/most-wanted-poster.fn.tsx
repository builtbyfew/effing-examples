import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { EffieRunnerReturn, RunnerArgs } from "@effing/fn";
import type { WantedPosterProps } from "~/images/wanted-poster.fn";

export const propsSchema = z.object({
  videoUrl: z.string().url(),
  topText: z.string().optional(),
  bottomText: z.string().optional(),
  footerText: z.string().optional(),
  duration: z.number().positive().optional(),
});

type MostWantedPosterProps = z.infer<typeof propsSchema>;

export const previewProps: MostWantedPosterProps = {
  videoUrl: "https://static.effing.dev/examples/wanted-poster/most-wanted.mp4",
  topText: "WANTED",
  bottomText: "DEAD OR ALIVE",
  footerText: "BY ORDER OF THE SHERIFF",
  duration: 8,
};

const FPS = 30;

export async function runner({
  props: {
    videoUrl,
    topText = "WANTED",
    bottomText = "DEAD OR ALIVE",
    footerText = "BY ORDER OF THE SHERIFF",
    duration = 8,
  },
  bounds: { width, height },
}: RunnerArgs<MostWantedPosterProps>): EffieRunnerReturn {
  const posterSource = await fnUrl(
    "image",
    "wanted-poster",
    { topText, bottomText, footerText } satisfies WantedPosterProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover: posterSource,
    background: { type: "video", source: effieWebUrl(videoUrl) },
    segments: [
      effieSegment({
        duration,
        layers: [{ type: "image", source: posterSource }],
      }),
    ],
  });
}
