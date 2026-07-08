import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { EffieRunnerReturn, RunnerArgs } from "@effing/fn";
import { palette } from "~/theme";
import {
  beatAt,
  MUSIC_BEAT,
  MUSIC_END,
  MUSIC_SWOOSH_PEAK,
  MUSIC_URL,
} from "~/music";
import type { LogoIntroProps } from "~/annies/logo-intro.fn";
import type { TeamLineProps } from "~/annies/team-line.fn";
import type { WordPunchProps } from "~/annies/word-punch.fn";
import type { TitleStrobeProps } from "~/annies/title-strobe.fn";
import type { TitleSlamProps } from "~/annies/title-slam.fn";
import type { CtaCardProps } from "~/annies/cta-card.fn";
import type { JobCoverProps } from "~/images/job-cover.fn";

// A square social job ad for the fictional recruitment agency "Talentspark":
// the brand sting pops in and sweeps itself away, a bouncy line introduces
// the team, single words punch in one per beat, the job title flashes on
// yellow and slams in left-aligned on red, and a handwritten CTA card
// signs off. Hard cuts throughout — the kinetic-typography genre cuts on
// the beat rather than dissolving.

export const propsSchema = z.object({
  // The bouncy opening line ("An ambitious product team").
  teamLine: z.string().min(1),
  // The rapid-fire connecting words ("is", "looking", …). The last one is
  // accented in the brand yellow. One beat per word, so the count sets the
  // section's length; 7 is the most the track can hold before the video
  // would outrun the music and end on a silent tail. Any count keeps every
  // cut on the beat grid, but exactly 5 words additionally lines the CTA
  // cut up with the track's second big accent (beat 26).
  punchWords: z.array(z.string().min(1)).min(1).max(7),
  // The job title, one entry per display line.
  titleLines: z.array(z.string().min(1)).min(1).max(4),
  ctaLine1: z.string().min(1),
  ctaLine2: z.string().min(1),
});

type JobListingProps = z.infer<typeof propsSchema>;

export const previewProps: JobListingProps = {
  teamLine: "An ambitious product team",
  punchWords: ["is", "looking", "for", "a", "stellar"],
  titleLines: ["Senior", "Frontend", "Developer"],
  ctaLine1: "Apply now",
  ctaLine2: "& tell us your story",
};

const FPS = 30;

// Every segment boundary sits on a beat of the track's measured grid (see
// ~/music), and the two loudest accents — beats 10 and 26 — land exactly
// on the word-punch start and the cut to the CTA card.
const frames = (seconds: number) => Math.round(seconds * FPS);

export async function runner({
  props: { teamLine, punchWords, titleLines, ctaLine1, ctaLine2 },
  bounds: { width, height },
}: RunnerArgs<JobListingProps>): EffieRunnerReturn {
  const bounds = { width, height };

  // All durations are whole numbers of beats (the punch section spends one
  // beat per word), except the CTA, which runs to the end of the track.
  const logoDuration = beatAt(5); // beat 5 is the first cut
  const lineDuration = 5 * MUSIC_BEAT;
  const punchDuration = punchWords.length * MUSIC_BEAT;
  const strobeDuration = 5 * MUSIC_BEAT;
  const slamDuration = 6 * MUSIC_BEAT;
  const ctaDuration = Math.max(
    2,
    MUSIC_END -
      (logoDuration + lineDuration + punchDuration + strobeDuration + slamDuration),
  );

  const coverSource = await fnUrl(
    "image",
    "job-cover",
    { titleLines } satisfies JobCoverProps,
    bounds,
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover: coverSource,
    background: { type: "color", color: palette.ember },
    audio: {
      source: effieWebUrl(MUSIC_URL),
      volume: 1,
      fadeOut: 1,
    },
    segments: [
      // Brand sting: the logo arrives, pulses on the beat, and sweeps
      // itself away so the collapse completes right on the first cut.
      effieSegment({
        duration: logoDuration,
        layers: [
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "logo-intro",
              {
                frameCount: frames(logoDuration),
                beats: Array.from({ length: 5 }, (_, k) =>
                  Number((beatAt(k) / logoDuration).toFixed(4)),
                ),
                exitStart: Number((beatAt(3) / logoDuration).toFixed(4)),
                swirl: Number((MUSIC_SWOOSH_PEAK / logoDuration).toFixed(4)),
              } satisfies LogoIntroProps,
              bounds,
            ),
          },
        ],
      }),

      // The bouncy team line — words pop on eighth notes and keep riding
      // the travelling wave. The segment starts on a beat, so a stagger of
      // half a beat keeps every pop on the eighth-note grid.
      effieSegment({
        duration: lineDuration,
        layers: [
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "team-line",
              {
                text: teamLine,
                frameCount: frames(lineDuration),
                wordStagger: Number(
                  (MUSIC_BEAT / 2 / lineDuration).toFixed(4),
                ),
              } satisfies TeamLineProps,
              bounds,
            ),
          },
        ],
      }),

      // Rapid-fire connecting words — exactly one punch per beat (the
      // segment is words.length beats long and starts on the track's
      // loudest accent).
      effieSegment({
        duration: punchDuration,
        layers: [
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "word-punch",
              {
                words: punchWords.map((text, i) => ({
                  text,
                  accent: i === punchWords.length - 1,
                })),
                frameCount: frames(punchDuration),
              } satisfies WordPunchProps,
              bounds,
            ),
          },
        ],
      }),

      // The title strobe: a 16th-note flicker collage with the last punch
      // word, then an 8th-note colour strobe, then an inverted flash on
      // every remaining beat. The annie paints its own background — the
      // strobe owns the whole frame.
      effieSegment({
        duration: strobeDuration,
        layers: [
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "title-strobe",
              {
                lines: titleLines,
                frameCount: frames(strobeDuration),
                strobeWord: punchWords[punchWords.length - 1],
                beat: Number((MUSIC_BEAT / strobeDuration).toFixed(4)),
              } satisfies TitleStrobeProps,
              bounds,
            ),
          },
        ],
      }),

      // The title again, slamming in left-aligned — one line per beat.
      effieSegment({
        duration: slamDuration,
        layers: [
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "title-slam",
              {
                lines: titleLines,
                frameCount: frames(slamDuration),
                beat: Number((MUSIC_BEAT / slamDuration).toFixed(4)),
              } satisfies TitleSlamProps,
              bounds,
            ),
          },
        ],
      }),

      // Handwritten CTA card with the brand sign-off — it opens on the
      // track's second big accent, and its reveals step in beat by beat.
      effieSegment({
        duration: ctaDuration,
        layers: [
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "cta-card",
              {
                line1: ctaLine1,
                line2: ctaLine2,
                frameCount: frames(ctaDuration),
                beat: Number((MUSIC_BEAT / ctaDuration).toFixed(4)),
              } satisfies CtaCardProps,
              bounds,
            ),
          },
        ],
      }),
    ],
  });
}
