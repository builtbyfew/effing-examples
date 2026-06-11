import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import type { EffieLayer, EffieSources } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { EffieRunnerReturn, RunnerArgs } from "@effing/fn";
import { palette } from "~/theme";
import { PHOTOS, SAMPLE_LISTING } from "~/sample-listing";
import type { LogoIntroProps } from "~/annies/logo-intro.fn";
import type { FlightAnimationProps } from "~/annies/flight-animation.fn";
import type { KenBurnsFocal, KenBurnsProps } from "~/annies/ken-burns.fn";
import type { PhotoGradientProps } from "~/images/photo-gradient.fn";
import type { AmenityChipsProps } from "~/annies/amenity-chips.fn";
import type { RatingStarsProps } from "~/annies/rating-stars.fn";
import type { StayPromoCoverProps } from "~/images/stay-promo-cover.fn";

type Layer = EffieLayer<EffieSources>;

const chipSchema = z.object({
  label: z.string(),
  icon: z.enum([
    "wifi",
    "pool",
    "ocean",
    "kitchen",
    "ac",
    "parking",
    "beach",
    "pet",
    "guests",
    "bed",
    "bath",
    "pin",
    "heart",
    "star",
  ]),
  accent: z.enum(["lagoon", "coral", "sun"]).optional(),
});

const locationSchema = z.object({
  name: z.string(),
  country: z.string(),
  lon: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

const listingSchema = z.object({
  title: z.string(),
  location: z.string(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0),
  guests: z.number().int().min(1),
  bedrooms: z.number().int().min(0),
  baths: z.number().int().min(0),
  pricePerNight: z.number().min(0),
  currency: z.string(),
  badge: z.string(),
});

export const propsSchema = z.object({
  flight: z.object({
    origin: locationSchema,
    destination: locationSchema,
  }),
  scenes: z
    .array(
      z.object({
        imageUrl: z.string().url(),
        chips: z.array(chipSchema).min(1),
      }),
    )
    .min(1),
  listing: listingSchema,
});

type StayPromoProps = z.infer<typeof propsSchema>;

export const previewProps: StayPromoProps = {
  flight: {
    origin: { name: "Sydney", country: "Australia", lon: 151.21, lat: -33.87 },
    destination: { name: "Bali", country: "Indonesia", lon: 115.14, lat: -8.81 },
  },
  scenes: [
    {
      imageUrl: PHOTOS.villa,
      chips: [
        { label: "Guest favourite", icon: "heart", accent: "coral" },
        { label: "Private pool", icon: "pool" },
      ],
    },
    {
      imageUrl: PHOTOS.pool,
      chips: [
        { label: "Ocean view", icon: "ocean" },
        { label: "Air-con", icon: "ac" },
      ],
    },
    {
      imageUrl: PHOTOS.bedroom,
      chips: [
        { label: "Sleeps 8", icon: "guests" },
        { label: "Fast Wi-Fi", icon: "wifi" },
      ],
    },
  ],
  listing: {
    title: SAMPLE_LISTING.title,
    location: SAMPLE_LISTING.location,
    rating: SAMPLE_LISTING.rating,
    reviewCount: SAMPLE_LISTING.reviewCount,
    guests: SAMPLE_LISTING.guests,
    bedrooms: SAMPLE_LISTING.bedrooms,
    baths: SAMPLE_LISTING.baths,
    pricePerNight: SAMPLE_LISTING.pricePerNight,
    currency: SAMPLE_LISTING.currency,
    badge: SAMPLE_LISTING.badge,
  },
};

const FPS = 30;
// Beat grid of the backing track (offline analysis: ~95.7 BPM, first beat ≈0.07s).
const MUSIC_BPM = 95.7;
const MUSIC_BEAT = 60 / MUSIC_BPM;
const MUSIC_FIRST_BEAT = 0.07;
// The logo runs 3 beats: droplet pulse, morph, then a heartbeat per remaining
// beat — the third beat buys time to watch the heart fill with water. The time
// is recovered from the flight intro (the plane gets moving right away).
const LOGO_DURATION = MUSIC_FIRST_BEAT + 3 * MUSIC_BEAT;
const LOGO_FRAMES = Math.round(LOGO_DURATION * FPS);
// Interior beats (the final one is the handoff itself), as fractions of the clip.
const LOGO_BEATS: number[] = [];
for (let s = MUSIC_FIRST_BEAT; s < LOGO_DURATION - 1e-3; s += MUSIC_BEAT)
  LOGO_BEATS.push(Number((s / LOGO_DURATION).toFixed(4)));
// Trimmed from 22: the logo's heart bloom already sets the scene, so the
// plane taxis for only a moment before taking off.
const FLIGHT_INTRO_FRAMES = 4;
const FLIGHT_MAIN_FRAMES = 110;
const FLIGHT_RIPPLE_FRAMES = 60;
const FLIGHT_TOTAL_FRAMES =
  FLIGHT_INTRO_FRAMES + FLIGHT_MAIN_FRAMES + FLIGHT_RIPPLE_FRAMES;
const FLIGHT_DURATION = FLIGHT_TOTAL_FRAMES / FPS;
const SCENE_DURATION = 3.8;
const RATING_DURATION = 4.5;
const TRANSITION = 0.7;
// The logo sting ends on pure white (the heart bloom), so the map only needs a
// quick lift out of white — a long crossfade would dilute the bloom.
const FLIGHT_TRANSITION = 0.2;
const COVER_DURATION = 2;

const MUSIC_URL =
  "https://static.effing.dev/elevenlabs/music/Sol_Villa_2026-04-30T144342_var2.mp3";

// Ken Burns choreography, cycling per scene: push in toward a focal point,
// pull back to reveal, push in again — the classic alternating rhythm.
const KEN_BURNS_MOVES: { from: KenBurnsFocal; to: KenBurnsFocal }[] = [
  // Push in, drifting down toward the pool terrace. `from` is the centred
  // cover-crop — pixel-identical to the framing the flight's ripple reveals,
  // so the crossfade between the two overlays the same image.
  { from: { x: 0.5, y: 0.5, scale: 1.0 }, to: { x: 0.52, y: 0.6, scale: 1.14 } },
  // Pull back from the horizon — the wide reveal.
  { from: { x: 0.55, y: 0.35, scale: 1.16 }, to: { x: 0.5, y: 0.5, scale: 1.0 } },
  // Push in again, drifting toward the light.
  { from: { x: 0.45, y: 0.52, scale: 1.0 }, to: { x: 0.56, y: 0.44, scale: 1.15 } },
];

export async function runner({
  props: { flight, scenes, listing },
  bounds: { width, height },
}: RunnerArgs<StayPromoProps>): EffieRunnerReturn {
  const chipFontSize = Math.round(width * 0.036);
  const sceneFrameCount = Math.max(1, Math.round(SCENE_DURATION * FPS));
  const ratingFrameCount = Math.max(1, Math.round(RATING_DURATION * FPS));

  // --- Opening brand sting: the Aquabnb logo, present from the first frame,
  //     comes alive, becomes a sun, and blooms white over the whole frame. ----
  const logoSegment = effieSegment({
    duration: LOGO_DURATION,
    layers: [
      {
        type: "animation",
        source: await fnUrl(
          "annie",
          "logo-intro",
          { frameCount: LOGO_FRAMES, beats: LOGO_BEATS } satisfies LogoIntroProps,
          { width, height },
        ),
      },
    ],
  });

  // --- Opening flight: a plane arcs to the destination, then the hero photo
  //     floods in from the landing point and hands off to the tour. ----------
  const flightSegment = effieSegment({
    duration: FLIGHT_DURATION,
    // The heart bloom whites out the frame; the map lifts straight out of it.
    transition: { type: "fade", duration: FLIGHT_TRANSITION },
    layers: [
      {
        type: "animation",
        source: await fnUrl(
          "annie",
          "flight-animation",
          {
            origin: flight.origin,
            destination: flight.destination,
            totalFrameCount: FLIGHT_TOTAL_FRAMES,
            introFrameCount: FLIGHT_INTRO_FRAMES,
            flightFrameCount: FLIGHT_MAIN_FRAMES,
            landingRippleFrameCount: FLIGHT_RIPPLE_FRAMES,
            coverImageUrl: scenes[0].imageUrl,
          } satisfies FlightAnimationProps,
          { width, height },
        ),
      },
    ],
  });

  // --- Property tour: one Ken Burns scene per photo -----------------------
  const sceneSegments = await Promise.all(
    scenes.map(async (scene, i) => {
      const move = KEN_BURNS_MOVES[i % KEN_BURNS_MOVES.length];
      const photoLayer: Layer = {
        type: "animation",
        source: await fnUrl(
          "annie",
          "ken-burns",
          {
            imageUrl: scene.imageUrl,
            frameCount: sceneFrameCount,
            from: move.from,
            to: move.to,
            // The first scene crossfades in from the flight's still of the
            // same photo — hold the matching framing until the fade is over.
            holdStart: i === 0 ? TRANSITION / SCENE_DURATION : 0,
          } satisfies KenBurnsProps,
          { width, height },
        ),
      };

      const scrimLayer: Layer = {
        type: "image",
        source: await fnUrl(
          "image",
          "photo-gradient",
          { strength: 0.85 } satisfies PhotoGradientProps,
          { width, height },
        ),
      };

      // One animated overlay drives all chips: staggered pop-in entrances and
      // per-icon idle loops live inside the annie, on transparent frames.
      const chipsLayer: Layer = {
        type: "animation",
        source: await fnUrl(
          "annie",
          "amenity-chips",
          {
            chips: scene.chips,
            fontSize: chipFontSize,
            frameCount: sceneFrameCount,
            alignment: "left",
            enterStart: TRANSITION / SCENE_DURATION,
            enterStagger: 0.28 / SCENE_DURATION,
            exitStart: (SCENE_DURATION - TRANSITION - 0.3) / SCENE_DURATION,
          } satisfies AmenityChipsProps,
          { width, height },
        ),
      };

      return effieSegment({
        duration: SCENE_DURATION,
        // The Ken Burns drift runs through every cut (documentary style), so
        // the transition must complete cleanly mid-motion. A smooth wipe does:
        // its soft edge finishes geometrically at the boundary, where a fade's
        // alpha tail leaves a faint ghost that pops off, and a slice shreds
        // the moving photos into shimmering strips. The first scene still
        // crossfades — it enters from the flight's ripple showing the SAME
        // hero photo (held still through the fade), so no ghost can show.
        transition:
          i === 0
            ? { type: "fade", duration: TRANSITION }
            : { type: "smooth", direction: "left", duration: TRANSITION },
        layers: [photoLayer, scrimLayer, chipsLayer],
      });
    }),
  );

  // --- "Loved by guests" rating beat --------------------------------------
  const ratingSegment = effieSegment({
    duration: RATING_DURATION,
    transition: { type: "circle", mode: "open", duration: TRANSITION },
    background: { type: "color", color: palette.paper },
    layers: [
      {
        type: "animation",
        source: await fnUrl(
          "annie",
          "rating-stars",
          {
            rating: listing.rating,
            reviewCount: listing.reviewCount,
            eyebrow: "Loved by guests",
            frameCount: ratingFrameCount,
          } satisfies RatingStarsProps,
          { width, height },
        ),
      },
    ],
  });

  // --- Closing listing cover ----------------------------------------------
  //     End on the composed hero card (also the poster), crossfading in from
  //     the rating beat.
  const coverSource = await fnUrl(
    "image",
    "stay-promo-cover",
    {
      imageUrl: scenes[0].imageUrl,
      title: listing.title,
      location: listing.location,
      rating: listing.rating,
      reviewCount: listing.reviewCount,
      pricePerNight: listing.pricePerNight,
      currency: listing.currency,
      badge: listing.badge,
    } satisfies StayPromoCoverProps,
    { width, height },
  );
  const coverSegment = effieSegment({
    duration: COVER_DURATION,
    transition: { type: "fade", duration: TRANSITION },
    layers: [{ type: "image", source: coverSource }],
  });

  return effieData({
    width,
    height,
    fps: FPS,
    cover: coverSource,
    background: { type: "color", color: palette.cloud },
    audio: {
      source: effieWebUrl(MUSIC_URL),
      volume: 0.4,
      fadeOut: 1.5,
    },
    segments: [
      logoSegment,
      flightSegment,
      ...sceneSegments,
      ratingSegment,
      coverSegment,
    ],
  });
}


