import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { PhotoZoomProps } from "~/annies/photo-zoom.fn";
import type { FeatureListProps } from "~/annies/feature-list.fn";
import type { PromoHeadlineProps } from "~/images/promo-headline.fn";
import { ctaOutroPropsSchema, ctaOutroSegment } from "~/effies/cta-outro";
import { listRevealSoundEffectsDataUrl } from "~/sound-effects";

// A three-act product promo: hero zoom with the headline, feature pills over
// a drifting photo, and a CTA outro that lands the offer.

export const propsSchema = z.object({
  kicker: z.string(),
  productName: z.string(),
  tagline: z.string(),
  features: z.array(z.string()).min(1),
  imageUrl: z.string().url(),
  ...ctaOutroPropsSchema.shape,
  accentColor: z.string().optional(),
  soundEffects: z.boolean().optional(),
  musicUrl: z.string().url().optional(),
});

type ProductPromoProps = z.infer<typeof propsSchema>;

export const previewProps: ProductPromoProps = {
  kicker: "New drop",
  productName: "Cloudstep 574",
  tagline: "Running shoes that float",
  features: [
    "Featherlight bubble sole",
    "Breathable knit upper",
    "Zero break-in comfort",
  ],
  imageUrl:
    "https://static.effing.dev/unsplash/sneakers/max-petrunin-A4fETzh_wlo-unsplash.jpg",
  saleLabel: "Summer sale",
  price: "$129",
  oldPrice: "$159",
  ctaText: "Shop now at cloudstep.run",
};

const FPS = 30;

export async function runner({
  props: {
    kicker,
    productName,
    tagline,
    features,
    imageUrl,
    saleLabel,
    price,
    oldPrice,
    ctaText,
    accentColor = "#7c5cd6",
    soundEffects = true,
    musicUrl,
  },
  bounds: { width, height },
}: RunnerArgs<ProductPromoProps>): EffieRunnerReturn {
  const heroDuration = 4.5;
  const featuresDuration = 2.8 + features.length * 0.9;

  // Feature pills start revealing after a short beat on top of the photo.
  const featureListDelay = 0.6;
  const revealFrames = 15;
  const staggerFrames = 24;
  const featureHoldFrames =
    Math.round((featuresDuration - featureListDelay) * FPS) -
    ((features.length - 1) * staggerFrames + revealFrames);

  const cover = await fnUrl(
    "image",
    "promo-headline",
    {
      kicker,
      productName,
      tagline,
      accentColor,
      backgroundImageUrl: imageUrl,
    } satisfies PromoHeadlineProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "color", color: "#1a1230" },
    audio: musicUrl
      ? { source: effieWebUrl(musicUrl), volume: 0.6, fadeOut: 1.5 }
      : undefined,
    segments: [
      // Hero: slow zoom on the product photo while the headline fades in.
      effieSegment({
        duration: heroDuration,
        layers: [
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "photo-zoom",
              {
                imageUrl,
                frameCount: heroDuration * FPS,
                zoomLevel: 0.16,
              } satisfies PhotoZoomProps,
              { width, height },
            ),
          },
          {
            type: "image",
            source: await fnUrl(
              "image",
              "promo-headline",
              {
                kicker,
                productName,
                tagline,
                accentColor,
              } satisfies PromoHeadlineProps,
              { width, height },
            ),
            effects: [{ type: "fade-in", start: 0.5, duration: 0.8 }],
          },
        ],
      }),
      // Features: the photo drifts sideways while feature pills pop in.
      effieSegment({
        duration: featuresDuration,
        transition: { type: "smooth", direction: "left", duration: 0.8 },
        audio: soundEffects
          ? {
              source: effieWebUrl(
                listRevealSoundEffectsDataUrl({
                  durationSec: featuresDuration,
                  delaySec: featureListDelay,
                  count: features.length,
                  staggerFrames,
                  revealFrames,
                  fps: FPS,
                }),
              ),
              volume: 0.8,
            }
          : undefined,
        layers: [
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "photo-zoom",
              {
                imageUrl,
                frameCount: Math.round(featuresDuration * FPS),
                zoomLevel: 0.12,
              } satisfies PhotoZoomProps,
              { width: Math.round(width * 1.25), height },
            ),
            effects: [
              {
                type: "scroll",
                direction: "left",
                distance: 0.25,
                duration: featuresDuration,
              },
            ],
          },
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "feature-list",
              {
                features,
                accentColor,
                revealFrames,
                staggerFrames,
                holdFrames: featureHoldFrames,
              } satisfies FeatureListProps,
              { width, height },
            ),
            delay: featureListDelay,
          },
        ],
      }),
      await ctaOutroSegment({
        props: { saleLabel, price, oldPrice, ctaText },
        accentColor,
        soundEffects,
        transition: { type: "circle", mode: "open", duration: 0.7 },
        width,
        height,
        fps: FPS,
      }),
    ],
  });
}
