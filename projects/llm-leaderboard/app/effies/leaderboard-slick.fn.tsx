import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { LeaderboardSlickSlideProps } from "~/annies/leaderboard-slick-slide.fn";
import type { LeaderboardSlickCoverProps } from "~/images/leaderboard-slick-cover.fn";
import { MEAN_SLIDE, BEST_SLIDE, TITLE } from "~/frontierswe-data";

/**
 * The fancy "Slick" cut of the LLM leaderboard video.
 *
 * Staged like a broadcast graphic: obsidian glass, a living gold/aqua aurora, 
 * podium medallions, sheen sweeps and a rack-focus outro.
 *
 * Each slide is a self-contained `leaderboard-slick-slide` annie, so they
 * cache and render independently; the obsidian background shows through the
 * brief dip between them.
 */

const rowSchema = z.object({
  model: z.string(),
  harness: z.string(),
  /** Primary figure for the `valueLabel` column. */
  value: z.number(),
  /** Secondary stat as a percentage (0–100), drawn as a bar. */
  share: z.number().min(0).max(100),
  fromRank: z.number().int().positive().optional(),
});

const slideSchema = z.object({
  metric: z.string(),
  valueLabel: z.string().optional(),
  /** Title for the share/bar column. Defaults to "Dominance". */
  shareLabel: z.string().optional(),
  rows: z.array(rowSchema).min(1).max(6),
  /** Seconds on screen (build-in + hold + rack-focus). */
  duration: z.number().positive(),
});

export const propsSchema = z.object({
  /** Big serif headline shown on every slide. */
  title: z.string(),
  slides: z.array(slideSchema).min(1),
});

type LeaderboardSlickVideoProps = z.infer<typeof propsSchema>;

export const previewProps: LeaderboardSlickVideoProps = {
  title: TITLE,
  slides: [
    { ...MEAN_SLIDE, duration: 5.5 },
    { ...BEST_SLIDE, duration: 5.5 },
  ],
};

const FPS = 30;

export async function runner({
  props: { title, slides },
  bounds: { width, height },
}: RunnerArgs<LeaderboardSlickVideoProps>): EffieRunnerReturn {
  const cover = await fnUrl(
    "image",
    "leaderboard-slick-cover",
    { title } satisfies LeaderboardSlickCoverProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "color", color: "black" },
    segments: await Promise.all(
      slides.map(async (slide, i) =>
        effieSegment({
          duration: slide.duration,
          layers: [
            {
              type: "animation",
              source: await fnUrl(
                "annie",
                "leaderboard-slick-slide",
                {
                  title,
                  metric: slide.metric,
                  valueLabel: slide.valueLabel,
                  shareLabel: slide.shareLabel,
                  rows: slide.rows,
                  // The headline blurs in on the first slide and rack-focuses
                  // out on the last, but stays anchored across the cut between.
                  titleIntro: i === 0,
                  titleOutro: i === slides.length - 1,
                  frameCount: Math.round(slide.duration * FPS),
                } satisfies LeaderboardSlickSlideProps,
                { width, height },
              ),
            },
          ],
        }),
      ),
    ),
  });
}
