import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { EffieRunnerReturn, RunnerArgs } from "@effing/fn";
import type { PanningPhotoProps } from "~/annies/panning-photo.fn";
import type { PillListProps } from "~/annies/pill-list.fn";
import type { RealtorCardProps } from "~/annies/realtor-card.fn";
import type { ListingPromoCoverProps } from "~/images/listing-promo-cover.fn";
import type { PannedPhotoProps } from "~/images/panned-photo.fn";
import type { PhotoGradientProps } from "~/images/photo-gradient.fn";

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

type ListingPromoProps = z.infer<typeof propsSchema>;

export const previewProps: ListingPromoProps = {
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
        { text: "132 Rooms", variant: "light" },
        { text: "35 Bathrooms", variant: "light" },
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
        { text: "Bunker Included", variant: "light" },
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
    phone: "+32 9 296 11 11",
    email: "margaret@capitop.estate",
  },
};

const FPS = 30;
const TRANSITION_DURATION = 0.6;
const PHOTO_DURATION = 3.5;
const REALTOR_DURATION = 3.5;
const PAN_DISTANCE = 0.15;
const PAN_OVERSIZE = 1.0;

export async function runner({
  props: { scenes, realtor },
  bounds: { width, height },
}: RunnerArgs<ListingPromoProps>): EffieRunnerReturn {
  const pillFontSize = Math.round(width * 0.05);
  const photoFrameCount = Math.max(1, Math.round(PHOTO_DURATION * FPS));
  const pillStaggerFrameCount = Math.round(FPS * 0.35);
  const pillSlideFrameCount = Math.round(FPS * 0.4);
  const realtorFrameCount = Math.max(1, Math.round(REALTOR_DURATION * FPS));
  const realtorFadeInFrameCount = Math.round(FPS * 0.6);

  const flatImageUrls = scenes.flatMap((s) => s.imageUrls);
  const photoSegmentDuration = flatImageUrls.length * PHOTO_DURATION;

  const sceneStarts: number[] = [];
  let cursor = 0;
  for (const scene of scenes) {
    sceneStarts.push(cursor);
    cursor += scene.imageUrls.length * PHOTO_DURATION;
  }

  // Each photo gets a panning-photo annie layer for its at-rest period (with a
  // slide-in motion for non-first photos so it pushes its predecessor away),
  // plus a still panned-photo image layer that handles the slide-out — frozen
  // at the panning's endpoint so the handoff between annie and image is
  // pixel-identical.
  const photoLayers = (
    await Promise.all(
      flatImageUrls.map(async (imageUrl, i) => {
        const isFirstPhoto = i === 0;
        const isLastPhoto = i === flatImageUrls.length - 1;
        const entry = i * PHOTO_DURATION;

        const restLayer = {
          type: "animation" as const,
          source: await fnUrl(
            "annie",
            "panning-photo",
            {
              imageUrl,
              frameCount: photoFrameCount,
              distance: PAN_DISTANCE,
              oversize: PAN_OVERSIZE,
            } satisfies PanningPhotoProps,
            { width, height },
          ),
          delay: entry,
          from: entry,
          until: entry + PHOTO_DURATION,
          ...(isFirstPhoto
            ? {}
            : {
                motion: {
                  type: "slide" as const,
                  direction: "left" as const,
                  start: 0,
                  duration: TRANSITION_DURATION,
                },
              }),
        };

        if (isLastPhoto) return [restLayer];

        const slideOutLayer = {
          type: "image" as const,
          source: await fnUrl(
            "image",
            "panned-photo",
            {
              imageUrl,
              distance: PAN_DISTANCE,
              oversize: PAN_OVERSIZE,
              progress: 1,
            } satisfies PannedPhotoProps,
            { width, height },
          ),
          delay: entry + PHOTO_DURATION,
          from: entry + PHOTO_DURATION,
          until: entry + PHOTO_DURATION + TRANSITION_DURATION,
          motion: {
            type: "slide" as const,
            direction: "right" as const,
            reverse: true,
            start: 0,
            duration: TRANSITION_DURATION,
          },
        };
        return [restLayer, slideOutLayer];
      }),
    )
  ).flat();

  // One pill-list annie per scene. Non-first scenes are delayed by
  // TRANSITION_DURATION so their slide-in animates against an already-settled
  // photo (pills never move while the photo is mid-swipe). Each non-last set
  // fades out during the outgoing cross-swipe so pills stay positionally still
  // through the photo change too.
  const pillLayers = await Promise.all(
    scenes.map(async (scene, i) => {
      const isFirstScene = i === 0;
      const isLastScene = i === scenes.length - 1;
      const sceneStart = sceneStarts[i];
      const sceneDuration = scene.imageUrls.length * PHOTO_DURATION;
      const delay = sceneStart + (isFirstScene ? 0 : TRANSITION_DURATION);
      const visibleEnd = isLastScene
        ? sceneStart + sceneDuration
        : sceneStarts[i + 1] + TRANSITION_DURATION;
      const visibleDuration = visibleEnd - delay;

      return {
        type: "animation" as const,
        source: await fnUrl(
          "annie",
          "pill-list",
          {
            pills: scene.pills,
            fontSize: pillFontSize,
            totalFrameCount: Math.max(1, Math.round(visibleDuration * FPS)),
            staggerFrameCount: pillStaggerFrameCount,
            slideFrameCount: pillSlideFrameCount,
          } satisfies PillListProps,
          { width, height },
        ),
        delay,
        from: delay,
        until: visibleEnd,
        ...(isLastScene
          ? {}
          : {
              effects: [
                {
                  type: "fade-out" as const,
                  start: visibleDuration - TRANSITION_DURATION,
                  duration: TRANSITION_DURATION,
                },
              ],
            }),
      };
    }),
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover: await fnUrl(
      "image",
      "listing-promo-cover",
      {
        imageUrl: scenes[0].imageUrls[0],
        pills: scenes[0].pills,
        fontSize: pillFontSize,
      } satisfies ListingPromoCoverProps,
      { width, height },
    ),
    background: { type: "color", color: "black" },
    audio: {
      source:
        "https://static.effing.dev/elevenlabs/music/Sol_Villa_2026-04-30T144342_var2.mp3",
    },
    segments: [
      effieSegment({
        duration: photoSegmentDuration,
        layers: [
          ...photoLayers,
          {
            type: "image",
            source: await fnUrl(
              "image",
              "photo-gradient",
              {} satisfies PhotoGradientProps,
              { width, height },
            ),
          },
          ...pillLayers,
        ],
      }),
      effieSegment({
        duration: REALTOR_DURATION + 2,
        transition: { type: "fade", duration: TRANSITION_DURATION },
        layers: [
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "realtor-card",
              {
                photoUrl: realtor.photoUrl,
                name: realtor.name,
                company: realtor.company,
                phone: realtor.phone,
                email: realtor.email,
                totalFrameCount: realtorFrameCount,
                fadeInFrameCount: realtorFadeInFrameCount,
              } satisfies RealtorCardProps,
              { width, height },
            ),
          },
        ],
      }),
    ],
  });
}
