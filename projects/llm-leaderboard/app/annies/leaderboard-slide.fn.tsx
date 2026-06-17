import { z } from "zod";
import { tween } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import {
  jetBrainsMonoRegular,
  jetBrainsMonoMedium,
  jetBrainsMonoBold,
  jetBrainsMonoExtraBold,
  loadFonts,
} from "~/fonts";
import { Leaderboard } from "~/components/leaderboard";
import { MEAN_SLIDE, TITLE } from "~/frontierswe-data";

/**
 * One animated leaderboard slide: a dark, gridded panel that builds in
 * row-by-row — figures rolling up, bars growing — holds, then lifts and fades
 * away. One row can be highlighted (green glow + "from #N" badge) to call out a
 * climber. Compose two of these back-to-back (one metric each) for the full
 * reveal — see `effies/llm-leaderboard.fn.tsx`.
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

export const propsSchema = z.object({
  /** Wordmark shown at the top, e.g. "FrontierSWE Leaderboard". */
  title: z.string(),
  /** Benchmark label shown after the wordmark, e.g. "mean@5". */
  metric: z.string(),
  /** Name of the primary figure; titles its column, e.g. "avg rank". */
  valueLabel: z.string().optional(),
  /** Title for the share/bar column. Defaults to "Dominance". */
  shareLabel: z.string().optional(),
  /** Rows in final ranked order (top = best). */
  rows: z.array(rowSchema).min(1).max(6),
  /** Total frames for the slide (default 150 = 5s @ 30fps). */
  frameCount: z.number().int().min(1).optional(),
});

export type LeaderboardSlideProps = z.infer<typeof propsSchema>;

export const previewProps: LeaderboardSlideProps = {
  title: TITLE,
  metric: MEAN_SLIDE.metric,
  valueLabel: MEAN_SLIDE.valueLabel,
  rows: MEAN_SLIDE.rows,
  frameCount: 150,
};

export async function* runner({
  props: { title, metric, valueLabel = "avg rank", shareLabel, rows, frameCount = 150 },
  bounds: { width, height },
}: RunnerArgs<LeaderboardSlideProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([
    jetBrainsMonoRegular,
    jetBrainsMonoMedium,
    jetBrainsMonoBold,
    jetBrainsMonoExtraBold,
  ]);

  yield* tween(frameCount, async ({ lower: p }) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    await renderReactElement(
      ctx,
      <Leaderboard
        width={width}
        height={height}
        title={title}
        metric={metric}
        valueLabel={valueLabel}
        shareLabel={shareLabel}
        rows={rows}
        frame={p * frameCount}
        frameCount={frameCount}
      />,
      { fonts },
    );
    return canvas.encode("png");
  });
}
