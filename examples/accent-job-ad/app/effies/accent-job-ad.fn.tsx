import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { AccentJobAdAwesomeProps } from "~/annies/accent-job-ad-awesome.fn";
import type { AccentJobAdWordsProps } from "~/annies/accent-job-ad-words.fn";
import type { AccentJobAdKickassProps } from "~/annies/accent-job-ad-kickass.fn";
import type { AccentJobAdFlashProps } from "~/annies/accent-job-ad-flash.fn";
import type { AccentJobAdDpmProps } from "~/annies/accent-job-ad-dpm.fn";
import type { AccentJobAdPhotosProps } from "~/annies/accent-job-ad-photos.fn";
import type { AccentJobAdCoverProps } from "~/images/accent-job-ad-cover.fn";

const ORANGE = "#E84610";
const WHITE = "#FFFFFF";

export const propsSchema = z.object({
  colorA: z.string().optional(),
  colorB: z.string().optional(),
  awesomeDuration: z.number().positive().optional(),
  wordsDuration: z.number().positive().optional(),
  kickassDuration: z.number().positive().optional(),
  flashDuration: z.number().positive().optional(),
  dpmDuration: z.number().positive().optional(),
  photosDuration: z.number().positive().optional(),
  audioUrl: z.string().optional(),
  audioVolume: z.number().min(0).max(1).optional(),
});

type AccentJobAdEffieProps = z.infer<typeof propsSchema>;

export const previewProps: AccentJobAdEffieProps = {
  colorA: ORANGE,
  colorB: WHITE,
  awesomeDuration: 2.4,
  wordsDuration: 2.5333,
  kickassDuration: 0.3333,
  flashDuration: 4.1,
  dpmDuration: 2.3333,
  photosDuration: 3.3333,
  audioUrl: "/audio.aac",
  audioVolume: 1,
};

export async function runner({
  props: {
    colorA = ORANGE,
    colorB = WHITE,
    awesomeDuration = 2.4,
    wordsDuration = 2.5333,
    kickassDuration = 0.3333,
    flashDuration = 4.1,
    dpmDuration = 2.3333,
    photosDuration = 3.3333,
    audioUrl = "/audio.aac",
    audioVolume = 1,
  },
  bounds: { width, height },
}: RunnerArgs<AccentJobAdEffieProps>): EffieRunnerReturn {
  const fps = 30;
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3839";
  const resolvedAudio = audioUrl
    ? audioUrl.startsWith("http")
      ? audioUrl
      : `${baseUrl}${audioUrl}`
    : undefined;

  const cover = await fnUrl(
    "image",
    "accent-job-ad-cover",
    {} satisfies AccentJobAdCoverProps,
    { width, height },
  );

  const awesome = await fnUrl(
    "annie",
    "accent-job-ad-awesome",
    {
      duration: awesomeDuration,
      fps,
      colorA,
      colorB,
    } satisfies AccentJobAdAwesomeProps,
    { width, height },
  );

  const words = await fnUrl(
    "annie",
    "accent-job-ad-words",
    {
      duration: wordsDuration,
      fps,
      colorA,
      colorB,
    } satisfies AccentJobAdWordsProps,
    { width, height },
  );

  const kickass = await fnUrl(
    "annie",
    "accent-job-ad-kickass",
    {
      duration: kickassDuration,
      fps,
      colorA,
      colorB,
    } satisfies AccentJobAdKickassProps,
    { width, height },
  );

  const flash = await fnUrl(
    "annie",
    "accent-job-ad-flash",
    {
      duration: flashDuration,
      fps,
      colorA,
      colorB,
    } satisfies AccentJobAdFlashProps,
    { width, height },
  );

  const dpm = await fnUrl(
    "annie",
    "accent-job-ad-dpm",
    {
      duration: dpmDuration,
      fps,
      colorA,
      colorB,
    } satisfies AccentJobAdDpmProps,
    { width, height },
  );

  // The photos segment opens with a 2-frame solid-orange gap and then the
  // photos slide up from below — both produced at the effie level via layer
  // `delay` + `motion: slide-up`. The annie itself only renders the static
  // photo content for the post-slide-in window.
  const PHOTOS_DELAY = 0.067; // 2 frames at 30fps
  const photosAnnieDuration = photosDuration - PHOTOS_DELAY;
  const photos = await fnUrl(
    "annie",
    "accent-job-ad-photos",
    {
      duration: photosAnnieDuration,
      fps,
      colorA,
      photoUrl: "/team-photo-1.jpg",
    } satisfies AccentJobAdPhotosProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps,
    cover,
    background: { type: "color", color: colorA },
    audio: resolvedAudio
      ? { source: resolvedAudio as `http${string}`, volume: audioVolume }
      : undefined,
    segments: [
      effieSegment({
        duration: awesomeDuration,
        layers: [{ type: "animation", source: awesome }],
      }),
      effieSegment({
        duration: wordsDuration,
        layers: [{ type: "animation", source: words }],
      }),
      effieSegment({
        duration: kickassDuration,
        layers: [{ type: "animation", source: kickass }],
      }),
      effieSegment({
        duration: flashDuration,
        layers: [{ type: "animation", source: flash }],
      }),
      effieSegment({
        duration: dpmDuration,
        layers: [{ type: "animation", source: dpm }],
      }),
      effieSegment({
        duration: photosDuration,
        layers: [
          {
            type: "animation",
            source: photos,
            delay: PHOTOS_DELAY,
            motion: {
              type: "slide",
              direction: "up",
              distance: 1,
              start: 0,
              duration: 0.3,
            },
          },
        ],
      }),
    ],
  });
}
