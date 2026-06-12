import { z } from "zod";
import { effieSegment, effieWebUrl } from "@effing/effie";
import type {
  EffieBackground,
  EffieSources,
  EffieTransition,
} from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { TextTypewriterProps } from "~/annies/text-typewriter.fn";
import type { PriceTagProps } from "~/images/price-tag.fn";
import { ctaSoundEffectsDataUrl } from "~/sound-effects";

// The closing segment both promo effies share: the price tag drops in with a
// bounce while a typewriter spells out the call to action, with matching
// sound effects. Held on screen at full opacity so the video ends on the offer.

export const ctaOutroPropsSchema = z.object({
  saleLabel: z.string(),
  price: z.string(),
  oldPrice: z.string().optional(),
  ctaText: z.string(),
});

export type CtaOutroProps = z.infer<typeof ctaOutroPropsSchema>;

const DURATION = 4;
const BOUNCE_START = 0.3;
const BOUNCE_DURATION = 1.2;
const TEXT_DELAY = 0.9;

export async function ctaOutroSegment(opts: {
  props: CtaOutroProps;
  accentColor: string;
  soundEffects: boolean;
  transition: EffieTransition;
  // Override the effie's global background for this segment.
  background?: EffieBackground<EffieSources>;
  width: number;
  height: number;
  fps: number;
}) {
  const {
    props,
    accentColor,
    soundEffects,
    transition,
    background,
    width,
    height,
    fps,
  } = opts;
  const typingFrameCount = Math.min(props.ctaText.length * 3, 60);
  const blinkingFrameCount = Math.max(
    Math.round((DURATION - TEXT_DELAY) * fps) - typingFrameCount,
    0,
  );

  return effieSegment({
    duration: DURATION,
    transition,
    background,
    audio: soundEffects
      ? {
          source: effieWebUrl(
            ctaSoundEffectsDataUrl({
              durationSec: DURATION,
              bounceStartSec: BOUNCE_START,
              bounceDurationSec: BOUNCE_DURATION,
              typingStartSec: TEXT_DELAY,
              typingFrameCount,
              fps,
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
            label: props.saleLabel,
            price: props.price,
            oldPrice: props.oldPrice,
            accentColor,
          } satisfies PriceTagProps,
          { width, height },
        ),
        motion: {
          type: "bounce",
          start: BOUNCE_START,
          duration: BOUNCE_DURATION,
        },
      },
      {
        type: "animation",
        source: await fnUrl(
          "annie",
          "text-typewriter",
          {
            text: props.ctaText,
            fontSize: Math.round(width * 0.045),
            fontColor: "#ffffff",
            typingFrameCount,
            blinkingFrameCount,
            horizontalAlignment: "center",
            verticalAlignment: "bottom",
          } satisfies TextTypewriterProps,
          { width, height },
        ),
        delay: TEXT_DELAY,
      },
    ],
  });
}
