import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import type {
  EffieEffect,
  EffieLayer,
  EffieMotion,
  EffieSources,
  EffieTransition,
} from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { Bounds, EffieRunnerReturn, RunnerArgs } from "@effing/fn";
import type { ListingPromoCoverProps } from "~/images/listing-promo-cover.fn";
import type { ListingPromoPillsProps } from "~/images/listing-promo-pills.fn";
import type { PannedPhotoProps } from "~/images/panned-photo.fn";
import type { PhotoGradientProps } from "~/images/photo-gradient.fn";
import type { RealtorCardImageProps } from "~/images/realtor-card.fn";

const pillSchema = z.object({
  text: z.string(),
  variant: z.enum(["dark", "light"]).optional(),
});

export const propsSchema = z.object({
  scenes: z
    .array(
      z.object({
        pills: z.array(pillSchema),
        imageUrls: z.array(z.string().url()).min(1),
      }),
    )
    .min(1),
  realtor: z.object({
    photoUrl: z.string().url(),
    name: z.string(),
    company: z.string(),
    phone: z.string(),
    email: z.string(),
  }),
});

type ListingPromoBasicProps = z.infer<typeof propsSchema>;
type Pill = z.infer<typeof pillSchema>;
type Slide = { imageUrl: string; pills: Pill[] };
type ImageLayer = EffieLayer<EffieSources>;
type RealtorPart = NonNullable<RealtorCardImageProps["part"]>;

export const previewProps: ListingPromoBasicProps = {
  scenes: [
    {
      pills: [
        { text: "JUST LISTED", variant: "dark" },
        { text: "Washington, DC", variant: "light" },
      ],
      imageUrls: [
        "https://static.effing.dev/fake-white-house/fake-white-house-facade.jpg",
      ],
    },
    {
      pills: [
        { text: "132 rooms", variant: "light" },
        { text: "35 bathrooms", variant: "light" },
        { text: "55,000 sqft", variant: "dark" },
      ],
      imageUrls: [
        "https://static.effing.dev/fake-white-house/fake-white-house-oval-office.jpg",
        "https://static.effing.dev/fake-white-house/fake-white-house-press-room.jpg",
      ],
    },
    {
      pills: [
        { text: "Built in 1800", variant: "light" },
        { text: "Bunker included", variant: "light" },
        { text: "$398,000,000", variant: "dark" },
      ],
      imageUrls: [
        "https://static.effing.dev/fake-white-house/fake-white-house-garden.jpg",
        "https://static.effing.dev/fake-white-house/fake-white-house-drone-shot.jpg",
      ],
    },
  ],
  realtor: {
    photoUrl: "https://i.pravatar.cc/600?img=44",
    name: "Margaret Beaumont",
    company: "Capitop Realty Group",
    phone: "+1 (202) 555-0100",
    email: "margaret@capitop.estate",
  },
};

const FPS = 30;
const PHOTO_DURATION = 3.5;
const REALTOR_DURATION = 3.5;
const TRANSITION_DURATION = 0.6;
const PHOTO_SCROLL_DISTANCE = 0.5;
const PILL_SLIDE_DURATION = 0.45;
const PILL_STAGGER = 0.1;
const PILL_FADE_OUT_DURATION = 0.28;
const PILL_FADE_OUT_LEAD = 0.28;
// Hold pill slide-ins until the incoming wipe is done so the transition
// doesn't visually swallow the entrance.
const PILL_SLIDE_IN_DELAY_AFTER_TRANSITION = TRANSITION_DURATION;
const WIPE_LEFT_TRANSITION: EffieTransition = {
  type: "wipe",
  direction: "left",
  duration: TRANSITION_DURATION,
};

function fadeIn(start: number, duration: number): EffieEffect {
  return { type: "fade-in", start, duration };
}

function fadeOut(start: number, duration: number): EffieEffect {
  return { type: "fade-out", start, duration };
}

function saturateIn(start: number, duration: number): EffieEffect {
  return { type: "saturate-in", start, duration };
}

function slideMotion({
  direction,
  distance,
  start,
  duration,
}: {
  direction: "left" | "up";
  distance: number;
  start: number;
  duration: number;
}): EffieMotion {
  return {
    type: "slide",
    direction,
    distance,
    start,
    duration,
    easing: "ease-out",
  };
}

function samePills(
  a: ListingPromoBasicProps["scenes"][number]["pills"],
  b: ListingPromoBasicProps["scenes"][number]["pills"],
) {
  if (a.length !== b.length) return false;
  return a.every(
    (pill, i) => pill.text === b[i].text && pill.variant === b[i].variant,
  );
}

function compensatedPhotoDuration(photoCount: number) {
  return (
    PHOTO_DURATION + ((photoCount - 1) * TRANSITION_DURATION) / photoCount
  );
}

function pillFadeOutStart(photoDuration: number) {
  return photoDuration - TRANSITION_DURATION - PILL_FADE_OUT_LEAD;
}

export async function runner({
  props: { scenes, realtor },
  bounds: { width, height },
}: RunnerArgs<ListingPromoBasicProps>): EffieRunnerReturn {
  const pillFontSize = Math.round(width * 0.05);
  const slides = scenes.flatMap((scene) =>
    scene.imageUrls.map((imageUrl) => ({
      imageUrl,
      pills: scene.pills,
    })),
  );

  // Each basic photo is its own segment, so inter-photo wipes overlap the
  // runtime. Add that overlap back to match listing-promo-fancy's total length.
  const photoDuration = compensatedPhotoDuration(slides.length);

  const cover = await fnUrl(
    "image",
    "listing-promo-cover",
    {
      imageUrl: slides[0].imageUrl,
      pills: slides[0].pills,
      fontSize: pillFontSize,
    } satisfies ListingPromoCoverProps,
    { width, height },
  );

  const photoSegments = await Promise.all(
    slides.map(async (slide, i) => {
      const hasIncomingTransition = i > 0;
      const pillsChangedFromPrevious =
        i === 0 || !samePills(slides[i - 1].pills, slide.pills);
      const pillsChangeAfterThis =
        i === slides.length - 1 || !samePills(slide.pills, slides[i + 1].pills);
      const photoBounds = {
        width: Math.round(width * (1 + PHOTO_SCROLL_DISTANCE)),
        height,
      };
      const photoLayer = await buildPhotoLayer({
        slide,
        photoDuration,
        bounds: photoBounds,
      });
      const gradientLayer = await buildGradientLayer({
        photoDuration,
        bounds: { width, height },
      });

      const slideInBase = hasIncomingTransition
        ? PILL_SLIDE_IN_DELAY_AFTER_TRANSITION
        : 0;
      const pillLayers = await Promise.all(
        slide.pills.map((_, pillIndex) =>
          buildPillLayer({
            slide,
            pillIndex,
            pillFontSize,
            bounds: { width, height },
            shouldSlideIn: pillsChangedFromPrevious,
            shouldFadeOut: pillsChangeAfterThis,
            slideInBase,
            fadeOutStart: pillFadeOutStart(photoDuration),
          }),
        ),
      );

      return effieSegment({
        duration: photoDuration,
        ...(hasIncomingTransition ? { transition: WIPE_LEFT_TRANSITION } : {}),
        layers: [photoLayer, gradientLayer, ...pillLayers],
      });
    }),
  );

  const realtorLayers = await Promise.all([
    buildRealtorLayer(realtor, "background", { width, height }, {
      effects: [fadeIn(0, 0.45), saturateIn(0, 0.45)],
    }),
    buildRealtorLayer(realtor, "photo", { width, height }, {
      motion: slideMotion({
        direction: "up",
        distance: 0.18,
        start: 0.12,
        duration: 0.75,
      }),
      effects: [fadeIn(0.12, 0.55), saturateIn(0.12, 0.55)],
    }),
    buildRealtorLayer(realtor, "identity", { width, height }, {
      motion: slideMotion({
        direction: "left",
        distance: 0.12,
        start: 0.32,
        duration: 0.55,
      }),
      effects: [fadeIn(0.32, 0.45)],
    }),
    buildRealtorLayer(realtor, "contact", { width, height }, {
      motion: slideMotion({
        direction: "up",
        distance: 0.1,
        start: 0.52,
        duration: 0.55,
      }),
      effects: [fadeIn(0.52, 0.45)],
    }),
  ]);

  const realtorSegment = effieSegment({
    duration: REALTOR_DURATION + 2,
    transition: {
      type: "fade",
      through: "black",
      duration: TRANSITION_DURATION,
    },
    layers: realtorLayers,
  });

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "color", color: "black" },
    audio: {
      source:
        "https://static.effing.dev/elevenlabs/music/Sol_Villa_2026-04-30T144342_var2.mp3",
    },
    segments: [...photoSegments, realtorSegment],
  });
}

async function buildPhotoLayer({
  slide,
  photoDuration,
  bounds,
}: {
  slide: Slide;
  photoDuration: number;
  bounds: Bounds;
}): Promise<ImageLayer> {
  return {
    type: "image",
    source: await fnUrl(
      "image",
      "panned-photo",
      {
        imageUrl: slide.imageUrl,
        distance: 0.08,
        oversize: 1.0,
        progress: 0.5,
      } satisfies PannedPhotoProps,
      bounds,
    ),
    effects: [
      {
        type: "scroll",
        direction: "left",
        distance: PHOTO_SCROLL_DISTANCE,
        duration: photoDuration,
      },
      fadeIn(0, TRANSITION_DURATION),
      saturateIn(0, TRANSITION_DURATION),
      fadeOut(photoDuration - TRANSITION_DURATION, TRANSITION_DURATION),
    ],
  };
}

async function buildGradientLayer({
  photoDuration,
  bounds,
}: {
  photoDuration: number;
  bounds: Bounds;
}): Promise<ImageLayer> {
  return {
    type: "image",
    source: await fnUrl(
      "image",
      "photo-gradient",
      {} satisfies PhotoGradientProps,
      bounds,
    ),
    effects: [
      fadeIn(0, TRANSITION_DURATION),
      fadeOut(photoDuration - TRANSITION_DURATION, TRANSITION_DURATION),
    ],
  };
}

async function buildPillLayer({
  slide,
  pillIndex,
  pillFontSize,
  bounds,
  shouldSlideIn,
  shouldFadeOut,
  slideInBase,
  fadeOutStart,
}: {
  slide: Slide;
  pillIndex: number;
  pillFontSize: number;
  bounds: Bounds;
  shouldSlideIn: boolean;
  shouldFadeOut: boolean;
  slideInBase: number;
  fadeOutStart: number;
}): Promise<ImageLayer> {
  const layer: ImageLayer = {
    type: "image",
    source: await fnUrl(
      "image",
      "listing-promo-pills",
      {
        pills: slide.pills,
        fontSize: pillFontSize,
        pillIndex,
      } satisfies ListingPromoPillsProps,
      bounds,
    ),
  };

  const effects: EffieEffect[] = [];
  const slideStart = slideInBase + pillIndex * PILL_STAGGER;

  if (shouldSlideIn) {
    layer.motion = slideMotion({
      direction: "left",
      distance: 0.35,
      start: slideStart,
      duration: PILL_SLIDE_DURATION,
    });
    effects.push(
      fadeIn(slideStart, PILL_SLIDE_DURATION),
      saturateIn(slideStart, PILL_SLIDE_DURATION),
    );
  }

  if (shouldFadeOut) {
    effects.push(fadeOut(fadeOutStart, PILL_FADE_OUT_DURATION));
  }

  if (effects.length > 0) layer.effects = effects;
  return layer;
}

async function buildRealtorLayer(
  realtor: ListingPromoBasicProps["realtor"],
  part: RealtorPart,
  bounds: Bounds,
  animation: Pick<ImageLayer, "effects" | "motion"> = {},
): Promise<ImageLayer> {
  return {
    type: "image",
    source: await fnUrl(
      "image",
      "realtor-card",
      {
        photoUrl: realtor.photoUrl,
        name: realtor.name,
        company: realtor.company,
        phone: realtor.phone,
        email: realtor.email,
        part,
      } satisfies RealtorCardImageProps,
      bounds,
    ),
    ...animation,
  };
}
