import { z } from "zod";
import { tween } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { spaceMono400, spaceMono700, loadFonts } from "~/fonts";
import {
  FlapLeaderboard,
  flapTotalFrames,
  type FlapState,
} from "~/components/flap-leaderboard";
import { MEAN_SLIDE, BEST_SLIDE, TITLE } from "~/frontierswe-data";

/**
 * The whole "Flap" cut in a single continuous animation.
 *
 * Unlike the other cuts (one annie per metric), the split-flap board tells the
 * whole story on one board without a cut: the tiles clatter in to `mean@5`,
 * hold, then re-flip *in place* to `best@5` — GLM-5.2's row rolling up into
 * 2nd. Because it's one board updating itself, it's one annie.
 */

const rowSchema = z.object({
  model: z.string(),
  harness: z.string(),
  value: z.number(),
  share: z.number().min(0).max(100),
  fromRank: z.number().int().positive().optional(),
});

const stateSchema = z.object({
  /** Benchmark label shown on the metric flaps, e.g. "mean@5". */
  metric: z.string(),
  /** Rows in ranked order (top = best) for this state. */
  rows: z.array(rowSchema).min(1).max(5),
});

export const propsSchema = z.object({
  /** Board header plaque, e.g. "FrontierSWE Leaderboard". */
  title: z.string(),
  /** Name of the primary figure; titles its column, e.g. "avg rank". */
  valueLabel: z.string().optional(),
  /** Title for the share column. Defaults to "Dominance". */
  shareLabel: z.string().optional(),
  /** The board states, played in order — typically [mean@5, best@5]. */
  states: z.array(stateSchema).min(1).max(2),
  /**
   * Total frames. Defaults to exactly what the fill → hold → update → hold
   * sequence needs for the given states.
   */
  frameCount: z.number().int().min(1).optional(),
});

export type LeaderboardFlapSlideProps = z.infer<typeof propsSchema>;

const PREVIEW_STATES: FlapState[] = [
  { metric: MEAN_SLIDE.metric, rows: MEAN_SLIDE.rows },
  { metric: BEST_SLIDE.metric, rows: BEST_SLIDE.rows },
];

export const previewProps: LeaderboardFlapSlideProps = {
  title: TITLE,
  valueLabel: MEAN_SLIDE.valueLabel,
  states: PREVIEW_STATES,
  frameCount: flapTotalFrames(PREVIEW_STATES),
};

export async function* runner({
  props: {
    title,
    valueLabel = "avg rank",
    shareLabel,
    states,
    frameCount,
  },
  bounds: { width, height },
}: RunnerArgs<LeaderboardFlapSlideProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([spaceMono400, spaceMono700]);
  const total = frameCount ?? flapTotalFrames(states);

  yield* tween(total, async ({ lower: p }) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    await renderReactElement(
      ctx,
      <FlapLeaderboard
        width={width}
        height={height}
        title={title}
        valueLabel={valueLabel}
        shareLabel={shareLabel}
        states={states}
        frame={p * total}
      />,
      { fonts },
    );
    return canvas.encode("png");
  });
}
