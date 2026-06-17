import { z } from "zod";
import { tween } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import {
  frauncesDisplay700,
  bricolage400,
  bricolage600,
  bricolage700,
  jetBrainsMonoMedium,
  jetBrainsMonoBold,
  loadFonts,
} from "~/fonts";
import { SlickLeaderboard } from "~/components/slick-leaderboard";
import { MEAN_SLIDE, TITLE } from "~/frontierswe-data";

/**
 * One animated "Slick" slide — the fancy cut of `leaderboard-slide`.
 *
 * An obsidian stage lit by a drifting gold/aqua aurora; the headline blurs in,
 * frosted-glass rows land with a specular sheen sweep, podium medallions and a
 * gold throne for #1, an aqua spotlight for the climber; the whole board pulls
 * a rack-focus (blur + lift + fade) on the way out. Compose two back-to-back
 * (one metric each) for the full reveal — see `effies/leaderboard-slick.fn.tsx`.
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
  /** Big serif headline shown at the top, e.g. "FrontierSWE Leaderboard". */
  title: z.string(),
  /** Benchmark label shown in the subtitle, e.g. "mean@5". */
  metric: z.string(),
  /** Name of the primary figure; titles its column, e.g. "avg rank". */
  valueLabel: z.string().optional(),
  /** Title for the share/bar column. Defaults to "Dominance". */
  shareLabel: z.string().optional(),
  /** Rows in final ranked order (top = best). */
  rows: z.array(rowSchema).min(1).max(6),
  /** Blur the headline in (set false past the first slide). Defaults to true. */
  titleIntro: z.boolean().optional(),
  /** Rack-focus the headline out (set false before the last slide). Defaults to true. */
  titleOutro: z.boolean().optional(),
  /** Total frames for the slide (default 165 = 5.5s @ 30fps). */
  frameCount: z.number().int().min(1).optional(),
});

export type LeaderboardSlickSlideProps = z.infer<typeof propsSchema>;

export const previewProps: LeaderboardSlickSlideProps = {
  title: TITLE,
  metric: MEAN_SLIDE.metric,
  valueLabel: MEAN_SLIDE.valueLabel,
  rows: MEAN_SLIDE.rows,
  frameCount: 165,
};

export async function* runner({
  props: {
    title,
    metric,
    valueLabel = "avg rank",
    shareLabel,
    rows,
    titleIntro,
    titleOutro,
    frameCount = 165,
  },
  bounds: { width, height },
}: RunnerArgs<LeaderboardSlickSlideProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([
    frauncesDisplay700,
    bricolage400,
    bricolage600,
    bricolage700,
    jetBrainsMonoMedium,
    jetBrainsMonoBold,
  ]);

  yield* tween(frameCount, async ({ lower: p }) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    await renderReactElement(
      ctx,
      <SlickLeaderboard
        width={width}
        height={height}
        title={title}
        metric={metric}
        valueLabel={valueLabel}
        shareLabel={shareLabel}
        rows={rows}
        titleIntro={titleIntro}
        titleOutro={titleOutro}
        frame={p * frameCount}
        frameCount={frameCount}
      />,
      { fonts },
    );
    return canvas.encode("png");
  });
}
