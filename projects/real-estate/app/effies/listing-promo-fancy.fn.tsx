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
        // Seconds of timeline this scene owns (its segment duration).
        // Defaults to PHOTO_DURATION per photo, minus the swipe overlap for
        // non-last scenes. Set it to fit a scene to its voice over and to
        // land scene changes on the background music's accents.
        duration: z.number().positive().optional(),
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
  // Scene durations are tuned to the voice overs and the background music:
  // the track accents roughly every 2.8s (5.8, 13.9, 22.1s, final swell at
  // 24.8s). Cuts at 4.0s and 12.5s make the swipes settle — and the next
  // pills pop — right on the 5.8s and 13.9s accents, each voice over gets
  // ~0.3-0.5s of air, the last one clears the realtor voice over (20.5s),
  // and the end card lands fully at 22s on an accent.
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
      duration: 4,
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
      duration: 8.5,
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
      duration: 9.5,
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

const FPS = 60;
const TRANSITION_DURATION = 1.5;
const PHOTO_DURATION = 5;

// Every photo pans at the same apparent speed: PAN_DISTANCE is the travel
// budget for a reference pan (a default-length photo with one swipe hold),
// and photos whose pan is squeezed between two holds travel proportionally
// less instead of hurrying — a fast scroll on one photo sticks out badly.
// Returns the hold fractions alongside since they determine the active span.
// `endsHeld` marks photos whose pan must complete TRANSITION_DURATION early:
// scene-last photos before a cut (the held tail is replayed by the next
// segment's slide-out copy) and the very last photo (held under the realtor
// fade, whose card backdrop continues from the same crop).
function panParams(
  photoDuration: number,
  hasEntrySwipe: boolean,
  endsHeld: boolean,
) {
  const holdFractionStart = hasEntrySwipe
    ? TRANSITION_DURATION / photoDuration
    : 0;
  const holdFractionEnd = endsHeld ? TRANSITION_DURATION / photoDuration : 0;
  const activeDuration =
    photoDuration * (1 - holdFractionStart - holdFractionEnd);
  const referenceDuration = PHOTO_DURATION - TRANSITION_DURATION;
  return {
    holdFractionStart,
    holdFractionEnd,
    distance: PAN_DISTANCE * Math.min(1, activeDuration / referenceDuration),
  };
}
const REALTOR_DURATION = 5;
// Quiet hold on the finished card before the video ends; the annie keeps
// breathing (ken burns, drift) through it, so it spans these frames too.
const REALTOR_HOLD = 2;
const PAN_DISTANCE = 0.5;
const PAN_OVERSIZE = 1.0;

export async function runner({
  props: { scenes, realtor },
  bounds: { width, height },
}: RunnerArgs<ListingPromoProps>): EffieRunnerReturn {
  const pillFontSize = Math.round(width * 0.05);
  const pillStaggerFrameCount = Math.round(FPS * 0.35);
  const pillEntryFrameCount = Math.round(FPS * 1.0);
  const realtorFrameCount = Math.max(
    1,
    Math.round((REALTOR_DURATION + REALTOR_HOLD) * FPS),
  );
  const realtorFadeInFrameCount = Math.round(FPS * 0.6);
  const lastScene = scenes[scenes.length - 1];
  const lastSceneImageUrl =
    lastScene.imageUrls[lastScene.imageUrls.length - 1];

  // One segment per scene so each can carry its own audio (e.g. a voice
  // over), but every photo swipe — within a scene and across scenes alike —
  // is mimicked with layer motion rather than an effie segment transition.
  // The built-in slide transition ends at full speed (its easing is fixed),
  // which reads as a small lurch when it hands off to the gentle photo pan;
  // layer-motion slides land softly. So scene segments butt-join with a hard
  // cut, and the incoming segment opens by sliding its first photo in over a
  // static copy of the previous scene's last photo — frames line up across
  // the cut, making it invisible. Pills are gone before each cut (fade-out)
  // and the new set enters only after the swipe settles, so nothing else
  // needs to straddle the boundary.
  //
  // Each non-last scene's segment is one swipe shorter than its content
  // clock: its last photo finishes panning TRANSITION_DURATION early (the
  // end-hold below) and that held tail is replayed by the next segment's
  // slide-out copy instead of being played out here. This reproduces the
  // overlap an effie transition would have given, so cuts, voice-over
  // starts, and total runtime land on the same timestamps as a
  // transition-based timeline (keeping e.g. music alignment unchanged).
  // A scene's photos share its content clock, which extends one swipe past
  // the segment for non-last scenes — that replayed tail lives in the next
  // segment's opening swipe. The clock is split so each photo gets the same
  // ACTIVE pan time, not the same total time: a photo pinned under more
  // swipe holds (a scene-last photo is held while sliding in AND while
  // being replayed sliding out) gets proportionally more clock, so panning
  // pace and travel stay even across the scene. Photo boundaries are
  // snapped to whole frames so the annies line up with their layer windows.
  // Computed up front because each segment also needs its predecessor's
  // photo timing for the replay.
  const sceneTimings = scenes.map((scene, sceneIdx) => {
    const isLastScene = sceneIdx === scenes.length - 1;
    const segmentDuration =
      scene.duration ??
      scene.imageUrls.length * PHOTO_DURATION -
        (isLastScene ? 0 : TRANSITION_DURATION);
    const contentDuration =
      segmentDuration + (isLastScene ? 0 : TRANSITION_DURATION);
    const photoHolds = scene.imageUrls.map((_, photoIdx) => {
      const hasEntrySwipe = !(sceneIdx === 0 && photoIdx === 0);
      const endsHeld = photoIdx === scene.imageUrls.length - 1;
      return (
        (hasEntrySwipe ? TRANSITION_DURATION : 0) +
        (endsHeld ? TRANSITION_DURATION : 0)
      );
    });
    const totalHolds = photoHolds.reduce((sum, holds) => sum + holds, 0);
    const activeShare =
      (contentDuration - totalHolds) / scene.imageUrls.length;
    let boundary = 0;
    let prevBoundaryFrame = 0;
    const photos = photoHolds.map((holds) => {
      boundary += activeShare + holds;
      const boundaryFrame = Math.round(boundary * FPS);
      const frameCount = Math.max(1, boundaryFrame - prevBoundaryFrame);
      const photo = {
        entry: prevBoundaryFrame / FPS,
        frameCount,
        duration: frameCount / FPS,
      };
      prevBoundaryFrame = boundaryFrame;
      return photo;
    });
    return { segmentDuration, photos };
  });

  const sceneSegments = await Promise.all(
    scenes.map(async (scene, sceneIdx) => {
      const isFirstScene = sceneIdx === 0;
      const isLastScene = sceneIdx === scenes.length - 1;
      const prevScene = isFirstScene ? null : scenes[sceneIdx - 1];
      const { segmentDuration, photos: photoTimings } = sceneTimings[sceneIdx];

      const photoLayers = (
        await Promise.all(
          scene.imageUrls.map(async (imageUrl, photoIdx) => {
            const isFirstPhoto = photoIdx === 0;
            const isLastPhoto = photoIdx === scene.imageUrls.length - 1;
            const isVeryFirstPhoto = isFirstScene && isFirstPhoto;
            const { entry, frameCount, duration } = photoTimings[photoIdx];
            const pan = panParams(duration, !isVeryFirstPhoto, isLastPhoto);

            const restLayer = {
              type: "animation" as const,
              source: await fnUrl(
                "annie",
                "panning-photo",
                {
                  imageUrl,
                  frameCount,
                  distance: pan.distance,
                  oversize: PAN_OVERSIZE,
                  // easeOutIn finishes hot, which is right for every pan
                  // that hands off to a swipe — but the very last photo's
                  // pan ends in rest under the realtor fade, so it
                  // decelerates to a standstill instead of slamming to one.
                  easing: isLastScene && isLastPhoto ? "easeOut" : "easeOutIn",
                  // The pan holds while the photo slides into view and only
                  // then starts moving; the very first photo of the video has
                  // no incoming swipe, so it pans from the start. Photos pan
                  // right up to their hand-off — the static slideOutLayer
                  // (or, across a scene cut, the next segment's copy of it)
                  // picks up at progress=1, one pan step ahead, so motion
                  // stays continuous. Last-of-scene photos finish early: the
                  // segment ends (and the layer is clipped) at the start of
                  // what would be their end-hold, whose held frames the next
                  // segment replays as its slide-out copy. The very last
                  // photo holds through the realtor fade instead, and the
                  // card's backdrop picks up its exact final crop.
                  holdFractionStart: pan.holdFractionStart,
                  holdFractionEnd: pan.holdFractionEnd,
                } satisfies PanningPhotoProps,
                { width, height },
              ),
              delay: entry,
              from: entry,
              until: Math.min(entry + duration, segmentDuration),
              ...(isVeryFirstPhoto
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
                  // Same scaled distance as the photo's own pan, so this
                  // frozen copy sits exactly where the pan left off.
                  distance: pan.distance,
                  oversize: PAN_OVERSIZE,
                  progress: 1,
                } satisfies PannedPhotoProps,
                { width, height },
              ),
              delay: entry + duration,
              from: entry + duration,
              until: Math.min(
                entry + duration + TRANSITION_DURATION,
                segmentDuration,
              ),
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

      // The first 1.5s of a non-first segment replay the previous scene's
      // exit: a static copy of its last photo (at its final pan position —
      // computed with that photo's own pan params, so the cut frame matches
      // the previous segment's last frame exactly) slides out while this
      // scene's first photo slides in on top.
      const prevSceneSlideOutLayers = prevScene
        ? [
            {
              type: "image" as const,
              source: await fnUrl(
                "image",
                "panned-photo",
                {
                  imageUrl: prevScene.imageUrls[prevScene.imageUrls.length - 1],
                  distance: panParams(
                    sceneTimings[sceneIdx - 1].photos[
                      prevScene.imageUrls.length - 1
                    ].duration,
                    !(sceneIdx - 1 === 0 && prevScene.imageUrls.length === 1),
                    true,
                  ).distance,
                  oversize: PAN_OVERSIZE,
                  progress: 1,
                } satisfies PannedPhotoProps,
                { width, height },
              ),
              delay: 0,
              from: 0,
              until: TRANSITION_DURATION,
              motion: {
                type: "slide" as const,
                direction: "right" as const,
                reverse: true,
                start: 0,
                duration: TRANSITION_DURATION,
              },
            },
          ]
        : [];

      // Pills slide in at segment start for the first scene, or after the
      // opening swipe has settled for subsequent scenes — so pills don't
      // move while the scene is sliding into view. They also fade out so
      // they're gone at the cut to the next scene (or, for the last scene,
      // before the realtor fade starts overlapping).
      const pillDelay = isFirstScene ? 0 : TRANSITION_DURATION;
      const pillVisibleDuration = segmentDuration - pillDelay;
      const pillFadeOutEnd = isLastScene
        ? segmentDuration - TRANSITION_DURATION
        : segmentDuration;
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
            entryFrameCount: pillEntryFrameCount,
          } satisfies PillListProps,
          { width, height },
        ),
        delay: pillDelay,
        from: pillDelay,
        effects: [
          {
            type: "fade-out" as const,
            start: pillFadeOutEnd - TRANSITION_DURATION - pillDelay,
            duration: TRANSITION_DURATION,
          },
        ],
      };

      return effieSegment({
        duration: segmentDuration,
        ...(scene.voiceOverUrl
          ? { audio: { source: effieWebUrl(scene.voiceOverUrl) } }
          : {}),
        layers: [
          ...prevSceneSlideOutLayers,
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
        duration: REALTOR_DURATION + REALTOR_HOLD,
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
                // The last photo the viewer just saw bleeds into the card's
                // dark backdrop, so the fade reads as the listing dimming
                // into the sign-off rather than a hard scene change. The
                // photo holds its final pan position under the fade, and
                // backdropPan makes the card draw that exact same crop —
                // the backdrop doesn't move or jump across the fade.
                backdropUrl: lastSceneImageUrl,
                backdropPan: {
                  distance: panParams(
                    sceneTimings[sceneTimings.length - 1].photos[
                      lastScene.imageUrls.length - 1
                    ].duration,
                    !(scenes.length === 1 && lastScene.imageUrls.length === 1),
                    true,
                  ).distance,
                  oversize: PAN_OVERSIZE,
                },
                totalFrameCount: realtorFrameCount,
                fadeInFrameCount: realtorFadeInFrameCount,
                fps: FPS,
              } satisfies RealtorCardProps,
              { width, height },
            ),
          },
        ],
      }),
    ],
  });
}
