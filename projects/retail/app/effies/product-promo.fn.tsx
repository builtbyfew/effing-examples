import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import {
  ctaSoundEffectsDataUrl,
  listRevealSoundEffectsDataUrl,
} from "~/sfx";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { PhotoZoomProps } from "~/annies/photo-zoom.fn";
import type { TextTypewriterProps } from "~/annies/text-typewriter.fn";
import type { FeatureListProps } from "~/annies/feature-list.fn";
import type { PromoHeadlineProps } from "~/images/promo-headline.fn";
import type { PriceTagProps } from "~/images/price-tag.fn";

export const propsSchema = z.object({
  kicker: z.string(),
  productName: z.string(),
  tagline: z.string(),
  features: z.array(z.string()).min(1),
  saleLabel: z.string(),
  price: z.string(),
  oldPrice: z.string().optional(),
  ctaText: z.string(),
  imageUrl: z.string().url(),
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
  saleLabel: "Summer sale",
  price: "$129",
  oldPrice: "$159",
  ctaText: "Shop now at cloudstep.run",
  imageUrl:
    "https://static.effing.dev/unsplash/sneakers/max-petrunin-A4fETzh_wlo-unsplash.jpg",
};

const FPS = 30;

export async function runner({
  props: {
    kicker,
    productName,
    tagline,
    features,
    saleLabel,
    price,
    oldPrice,
    ctaText,
    imageUrl,
    accentColor = "#7c5cd6",
    soundEffects = true,
    musicUrl,
  },
  bounds: { width, height },
}: RunnerArgs<ProductPromoProps>): EffieRunnerReturn {
  const heroDuration = 4.5;
  const featuresDuration = 2.8 + features.length * 0.9;
  const ctaDuration = 4;

  // Feature pills start revealing after a short beat on top of the photo.
  const featureListDelay = 0.6;
  const revealFrames = 15;
  const staggerFrames = 24;
  const featureHoldFrames =
    Math.round((featuresDuration - featureListDelay) * FPS) -
    ((features.length - 1) * staggerFrames + revealFrames);

  const ctaTextDelay = 0.9;
  const typingFrameCount = Math.min(ctaText.length * 3, 60);
  const blinkingFrameCount = Math.max(
    Math.round((ctaDuration - ctaTextDelay) * FPS) - typingFrameCount,
    0,
  );

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
      // CTA: price tag bounces in on a dark card, typewriter spells the CTA.
      effieSegment({
        duration: ctaDuration,
        transition: { type: "circle", mode: "open", duration: 0.7 },
        audio: soundEffects
          ? {
              source: effieWebUrl(
                ctaSoundEffectsDataUrl({
                  durationSec: ctaDuration,
                  bounceStartSec: 0.3,
                  bounceDurationSec: 1.2,
                  typingStartSec: ctaTextDelay,
                  typingFrameCount,
                  fps: FPS,
                }),
              ),
              volume: 0.8,
            }
          : undefined,
        layers: [
          {
            type: "image",
            source: await fnUrl(
              "image",
              "price-tag",
              {
                label: saleLabel,
                price,
                oldPrice,
                accentColor,
              } satisfies PriceTagProps,
              { width, height },
            ),
            motion: { type: "bounce", start: 0.3, duration: 1.2 },
          },
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "text-typewriter",
              {
                text: ctaText,
                fontSize: Math.round(width * 0.045),
                fontColor: "#ffffff",
                typingFrameCount,
                blinkingFrameCount,
                horizontalAlignment: "center",
                verticalAlignment: "bottom",
              } satisfies TextTypewriterProps,
              { width, height },
            ),
            delay: ctaTextDelay,
          },
        ],
      }),
    ],
  });
}
