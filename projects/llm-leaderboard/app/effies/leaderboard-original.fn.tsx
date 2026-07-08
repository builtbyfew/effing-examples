import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { LeaderboardOriginalSlideProps } from "~/annies/leaderboard-original-slide.fn";
import type { LeaderboardOriginalCoverProps } from "~/images/leaderboard-original-cover.fn";
import { MEAN_SLIDE, BEST_SLIDE, TITLE } from "~/frontierswe-data";

/**
 * The full animated LLM leaderboard video.
 *
 * Each slide is a self-contained `leaderboard-original-slide` annie, so they cache and render
 * independently; the black background shows through the brief dip between them.
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
  /** Seconds on screen (build-in + hold + fade-out). */
  duration: z.number().positive(),
});

export const propsSchema = z.object({
  /** Wordmark shown at the top of every slide. */
  title: z.string(),
  slides: z.array(slideSchema).min(1),
});

type LeaderboardVideoProps = z.infer<typeof propsSchema>;

export const previewProps: LeaderboardVideoProps = {
  title: TITLE,
  slides: [
    { ...MEAN_SLIDE, duration: 5 },
    { ...BEST_SLIDE, duration: 5 },
  ],
};

const FPS = 30;

export async function runner({
  props: { title, slides },
  bounds: { width, height },
}: RunnerArgs<LeaderboardVideoProps>): EffieRunnerReturn {
  const cover = await fnUrl(
    "image",
    "leaderboard-original-cover",
    { title } satisfies LeaderboardOriginalCoverProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "color", color: "black" },
    segments: await Promise.all(
      slides.map(async (slide) =>
        effieSegment({
          duration: slide.duration,
          layers: [
            {
              type: "animation",
              source: await fnUrl(
                "annie",
                "leaderboard-original-slide",
                {
                  title,
                  metric: slide.metric,
                  valueLabel: slide.valueLabel,
                  shareLabel: slide.shareLabel,
                  rows: slide.rows,
                  frameCount: Math.round(slide.duration * FPS),
                } satisfies LeaderboardOriginalSlideProps,
                { width, height },
              ),
            },
          ],
        }),
      ),
    ),
  });
}
