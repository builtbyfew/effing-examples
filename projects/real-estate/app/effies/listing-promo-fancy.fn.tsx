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
// One swipe's worth of overlap: the slide duration, and the lead-in/tail each
// scene shares with its neighbour. Also the realtor crossfade length.
const TRANSITION_DURATION = 1.5;
// Default on-screen seconds per photo when a scene sets no explicit duration.
const PHOTO_DURATION = 5;
// Pan travel (fraction of frame width) and the crop zoom that makes room for
// it, tuned together so a photo's pan accelerates up to the swipe's speed by
// the hand-off (see panParams) with enough slack to pan that far.
const PAN_DISTANCE = 0.62;
const PAN_OVERSIZE = 1.25;
const REALTOR_DURATION = 5;
// Quiet hold on the finished card before the video ends; the annie keeps
// breathing (ken burns, drift) through it, so it spans these frames too.
const REALTOR_HOLD = 2;

// Pan timing for one photo. Every photo pans at the same apparent SPEED:
// `distance` scales linearly with active (un-held) pan time, so distance/time
// stays constant however long the photo is on screen — a longer pan travels
// proportionally further, not slower. That even speed is what lets each pan
// accelerate up to the swipe's (constant) speed at the hand-off.
//
// The pan also holds — stays put — at the start while the photo slides into
// view, and for `endsHeld` photos at the end too: scene-last photos before a
// cut (their held tail is replayed by the next segment's slide-out copy) and
// the very last photo (held under the realtor fade, whose backdrop continues
// the same crop). The start hold runs one frame past the slide-in so the pan's
// first step doesn't share a frame with the slide's last step and spike.
function panParams(
  photoDuration: number,
  hasEntrySwipe: boolean,
  endsHeld: boolean,
) {
  const holdFractionStart = hasEntrySwipe
    ? (TRANSITION_DURATION + 1 / FPS) / photoDuration
    : 0;
  const holdFractionEnd = endsHeld ? TRANSITION_DURATION / photoDuration : 0;
  const activeDuration =
    photoDuration * (1 - holdFractionStart - holdFractionEnd);
  const referenceDuration = PHOTO_DURATION - TRANSITION_DURATION;
  return {
    holdFractionStart,
    holdFractionEnd,
    distance: PAN_DISTANCE * (activeDuration / referenceDuration),
  };
}

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

  // One segment per scene (so each can carry its own voice-over), but every
  // photo swipe — within a scene and across scenes alike — is mimicked with
  // layer motion rather than an effie segment transition: the built-in slide
  // ends at full speed and lurches into the gentle photo pan, whereas a layer
  // slide hands off to the pan smoothly. Scenes butt-join with a hard cut, and
  // the incoming segment opens by sliding its first photo in over a static
  // copy of the previous scene's last photo, so the cut frame matches and is
  // invisible. Pills fade out before each cut and the next set enters only
  // after the swipe settles, so nothing else straddles the boundary.
  //
  // Timing is computed up front because each segment's opening swipe replays
  // its predecessor's last photo and so needs that photo's timing. A non-last
  // scene's content clock runs one swipe past its segment — the last photo
  // finishes panning a swipe early and that held tail is replayed by the next
  // segment — which keeps cuts, voice-overs and total runtime on the same
  // timestamps a transition-based timeline would give, so the music stays
  // aligned. The clock is split so every photo gets the same ACTIVE pan time,
  // not the same total time: a photo pinned under more holds gets more clock,
  // keeping the pan pace even. Boundaries snap to whole frames so each annie
  // lines up with its layer window.
  const sceneTimings = scenes.map((scene, sceneIdx) => {
    const isLastScene = sceneIdx === scenes.length - 1;
    const segmentDuration =
      scene.duration ??
      scene.imageUrls.length * PHOTO_DURATION -
        (isLastScene ? 0 : TRANSITION_DURATION);
    const contentDuration =
      segmentDuration + (isLastScene ? 0 : TRANSITION_DURATION);
    const photoMeta = scene.imageUrls.map((_, photoIdx) => {
      const hasEntrySwipe = !(sceneIdx === 0 && photoIdx === 0);
      const endsHeld = photoIdx === scene.imageUrls.length - 1;
      const holds =
        (hasEntrySwipe ? TRANSITION_DURATION : 0) +
        (endsHeld ? TRANSITION_DURATION : 0);
      return { hasEntrySwipe, endsHeld, holds };
    });
    const totalHolds = photoMeta.reduce((sum, m) => sum + m.holds, 0);
    const activeShare =
      (contentDuration - totalHolds) / scene.imageUrls.length;
    let boundary = 0;
    let prevBoundaryFrame = 0;
    const photos = photoMeta.map(({ hasEntrySwipe, endsHeld, holds }) => {
      boundary += activeShare + holds;
      const boundaryFrame = Math.round(boundary * FPS);
      const frameCount = Math.max(1, boundaryFrame - prevBoundaryFrame);
      const entry = prevBoundaryFrame / FPS;
      const duration = frameCount / FPS;
      prevBoundaryFrame = boundaryFrame;
      // Pan params live with the timing so the slide-out copies and the
      // realtor backdrop can read a photo's pan distance without recomputing.
      return {
        entry,
        frameCount,
        duration,
        ...panParams(duration, hasEntrySwipe, endsHeld),
      };
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
            const isLastPhoto = photoIdx === scene.imageUrls.length - 1;
            const isVeryFirstPhoto = isFirstScene && photoIdx === 0;
            const {
              entry,
              frameCount,
              duration,
              distance,
              holdFractionStart,
              holdFractionEnd,
            } = photoTimings[photoIdx];

            const restLayer = {
              type: "animation" as const,
              source: await fnUrl(
                "annie",
                "panning-photo",
                {
                  imageUrl,
                  frameCount,
                  distance,
                  oversize: PAN_OVERSIZE,
                  // easeOutIn: the photo arrives still moving from the swipe,
                  // eases to a slow mid-pan, then speeds back up to match the
                  // swipe's speed at the next hand-off — one continuous
                  // velocity through pan → swipe → pan. The very last photo
                  // instead uses easeOutCubic: it still starts at the swipe's
                  // speed (so its arrival matches, like the rest) but then
                  // decelerates all the way to a standstill, since it hands off
                  // to the realtor fade — which continues its crop from rest —
                  // rather than to another swipe.
                  easing:
                    isLastScene && isLastPhoto ? "easeOutCubic" : "easeOutIn",
                  // Holds (from panParams) keep the photo still while it slides
                  // in and out; in between it pans right up to the hand-off,
                  // where the static slide-out copy picks up at progress=1 and
                  // carries the motion on.
                  holdFractionStart,
                  holdFractionEnd,
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
                      // Linear, so the swipe holds the constant speed the pan
                      // accelerates up to and then carries on from.
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
                  // The photo's own pan distance, so this frozen copy sits
                  // exactly where the pan left off.
                  distance,
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

      // A non-first segment opens by replaying the previous scene's exit: a
      // static copy of its last photo, frozen at that photo's final pan
      // position, slides out while this scene's first photo slides in on top.
      // Reusing the stored pan distance keeps the cut frame matching the
      // previous segment's last frame exactly.
      const prevSceneSlideOutLayers = prevScene
        ? [
            {
              type: "image" as const,
              source: await fnUrl(
                "image",
                "panned-photo",
                {
                  imageUrl: prevScene.imageUrls[prevScene.imageUrls.length - 1],
                  distance:
                    sceneTimings[sceneIdx - 1].photos[
                      prevScene.imageUrls.length - 1
                    ].distance,
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
                  distance:
                    sceneTimings[sceneTimings.length - 1].photos[
                      lastScene.imageUrls.length - 1
                    ].distance,
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
