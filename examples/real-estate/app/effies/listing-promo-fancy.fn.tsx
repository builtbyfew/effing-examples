import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
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
        voiceOverUrl: z.string().url().optional(),
      }),
    )
    .min(1),
  realtor: z.object({
    photoUrl: z.string().url(),
    name: z.string(),
    company: z.string(),
    phone: z.string(),
    email: z.string(),
    voiceOverUrl: z.string().url().optional(),
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
      voiceOverUrl:
        "https://static.effing.dev/fake-white-house/fast-female-white-house-voiceover-scene-1.mp3",
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
      voiceOverUrl:
        "https://static.effing.dev/fake-white-house/fast-female-white-house-voiceover-scene-2.mp3",
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
      voiceOverUrl:
        "https://static.effing.dev/fake-white-house/fast-female-white-house-voiceover-scene-3.mp3",
    },
  ],
  realtor: {
    photoUrl: "https://i.pravatar.cc/600?img=44",
    name: "Margaret Beaumont",
    company: "Capitop Realty Group",
    phone: "+1 (202) 555-0100",
    email: "margaret@capitop.estate",
    voiceOverUrl:
      "https://static.effing.dev/fake-white-house/fast-female-white-house-voiceover-scene-4.mp3",
  },
};

const FPS = 30;
const TRANSITION_DURATION = 0.6;
const PHOTO_DURATION = 4.5;
const REALTOR_DURATION = 5;
const PAN_DISTANCE = 0.5;
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

  // One segment per scene. Within a segment, photos slide between each other
  // via intra-segment motion so pills can stay glued on top. Between scenes,
  // Effing's slide transition does the cross-swipe — pills go with it, which
  // is the desired behavior at scene boundaries since the pill set changes.
  // This also means each segment can carry its own audio (e.g. a voice over).
  const sceneSegments = await Promise.all(
    scenes.map(async (scene, sceneIdx) => {
      const isFirstScene = sceneIdx === 0;
      const sceneDuration = scene.imageUrls.length * PHOTO_DURATION;

      const photoLayers = (
        await Promise.all(
          scene.imageUrls.map(async (imageUrl, photoIdx) => {
            const isFirstPhoto = photoIdx === 0;
            const isLastPhoto = photoIdx === scene.imageUrls.length - 1;
            const entry = photoIdx * PHOTO_DURATION;

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

      // Pills slide in at segment start for the first scene, or after the
      // inter-scene slide transition has settled for subsequent scenes — so
      // pills don't move while the segment itself is sliding into view.
      const pillDelay = isFirstScene ? 0 : TRANSITION_DURATION;
      const pillVisibleDuration = sceneDuration - pillDelay;
      const pillLayer = {
        type: "animation" as const,
        source: await fnUrl(
          "annie",
          "pill-list",
          {
            pills: scene.pills,
            fontSize: pillFontSize,
            totalFrameCount: Math.max(1, Math.round(pillVisibleDuration * FPS)),
            staggerFrameCount: pillStaggerFrameCount,
            slideFrameCount: pillSlideFrameCount,
          } satisfies PillListProps,
          { width, height },
        ),
        delay: pillDelay,
        from: pillDelay,
      };

      return effieSegment({
        duration: sceneDuration,
        ...(isFirstScene
          ? {}
          : {
              transition: {
                type: "slide" as const,
                direction: "left" as const,
                duration: TRANSITION_DURATION,
              },
            }),
        ...(scene.voiceOverUrl
          ? { audio: { source: effieWebUrl(scene.voiceOverUrl) } }
          : {}),
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
          pillLayer,
        ],
      });
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
      source: effieWebUrl(
        "https://static.effing.dev/elevenlabs/music/Aura_of_Elegance_2026-05-07T174428_var1.mp3",
      ),
      volume: 0.35,
    },
    segments: [
      ...sceneSegments,
      effieSegment({
        duration: REALTOR_DURATION + 2,
        transition: { type: "fade", duration: TRANSITION_DURATION },
        ...(realtor.voiceOverUrl
          ? { audio: { source: effieWebUrl(realtor.voiceOverUrl) } }
          : {}),
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
