import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import type { EffieEffect, EffieMotion } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { ImageBandProps } from "~/annies/image-band.fn";
import type { ReviewBoxProps } from "~/images/review-box.fn";

const reviewSchema = z.object({
  handle: z.string(),
  text: z.string(),
  rating: z.number().int().min(1).max(5).optional(),
});

export const propsSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1),
  duration: z.number().positive().optional(),
  reviews: z.array(reviewSchema).length(2).optional(),
});

type HolidayHomesBandProps = z.infer<typeof propsSchema>;
type Review = z.infer<typeof reviewSchema>;

const DEFAULT_REVIEWS: [Review, Review] = [
  {
    handle: "@davidrainbowie72",
    text: "Stunning villa, breathtaking sea views, and the most attentive host. Every detail was thought through.",
    rating: 5,
  },
  {
    handle: "@elenasol_",
    text: "Tucked away in paradise. Spotless, calm, and the rooftop sunsets are absolutely unreal.",
    rating: 5,
  },
];

export const previewProps: HolidayHomesBandProps = {
  imageUrls: [
    "https://static.effing.dev/unsplash/white-villa/wide.jpg",
    "https://static.effing.dev/unsplash/white-villa/elevated.jpg",
    "https://static.effing.dev/unsplash/white-villa/bedroom.jpg",
    "https://static.effing.dev/unsplash/white-villa/bathroom.jpg",
    "https://static.effing.dev/unsplash/white-villa/portrait.jpg",
  ],
  duration: 12,
  reviews: DEFAULT_REVIEWS,
};

const FPS = 30;

const REVIEW_1_IN_START = 1.2;
const REVIEW_1_OUT_START = 5.6;
const REVIEW_2_IN_START = 6.2;
const REVIEW_2_OUT_LEAD = 0.6;
const POP_DURATION = 0.45;

const popInMotion: EffieMotion = {
  type: "slide",
  direction: "up",
  distance: 0.3,
  duration: POP_DURATION,
  easing: "ease-out",
};

export async function runner({
  props: { imageUrls, duration = 12, reviews = DEFAULT_REVIEWS },
  bounds: { width, height },
}: RunnerArgs<HolidayHomesBandProps>): EffieRunnerReturn {
  const [bandSource, review1Source, review2Source] = await Promise.all([
    fnUrl(
      "annie",
      "image-band",
      { imageUrls, duration, fps: FPS } satisfies ImageBandProps,
      { width, height },
    ),
    fnUrl(
      "image",
      "review-box",
      {
        handle: reviews[0].handle,
        text: reviews[0].text,
        rating: reviews[0].rating ?? 5,
      } satisfies ReviewBoxProps,
      { width, height },
    ),
    fnUrl(
      "image",
      "review-box",
      {
        handle: reviews[1].handle,
        text: reviews[1].text,
        rating: reviews[1].rating ?? 5,
      } satisfies ReviewBoxProps,
      { width, height },
    ),
  ]);

  const review1Effects: EffieEffect[] = [
    { type: "fade-in", start: REVIEW_1_IN_START, duration: POP_DURATION },
    { type: "fade-out", start: REVIEW_1_OUT_START, duration: POP_DURATION },
  ];

  const review2FadeOutStart = duration - REVIEW_2_OUT_LEAD - POP_DURATION;
  const review2Effects: EffieEffect[] = [
    { type: "fade-in", start: REVIEW_2_IN_START, duration: POP_DURATION },
    {
      type: "fade-out",
      start: review2FadeOutStart,
      duration: POP_DURATION,
    },
  ];

  return effieData({
    width,
    height,
    fps: FPS,
    cover: effieWebUrl(imageUrls[0]),
    background: { type: "color", color: "#000000" },
    segments: [
      effieSegment({
        duration,
        layers: [
          { type: "animation", source: bandSource },
          {
            type: "image",
            source: review1Source,
            until: REVIEW_1_OUT_START + POP_DURATION,
            motion: { ...popInMotion, start: REVIEW_1_IN_START },
            effects: review1Effects,
          },
          {
            type: "image",
            source: review2Source,
            from: REVIEW_2_IN_START,
            motion: { ...popInMotion, start: REVIEW_2_IN_START },
            effects: review2Effects,
          },
        ],
      }),
    ],
  });
}
