import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
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
import { BEST_SLIDE, TITLE } from "~/frontierswe-data";

/**
 * Still cover for the "Slick" leaderboard video — the climactic `best@5`
 * board, frozen mid-hold. Renders through the same component as the annie so
 * the thumbnail is pixel-consistent with the video.
 */

export const propsSchema = z.object({
  /** Big serif headline, e.g. "FrontierSWE Leaderboard". */
  title: z.string(),
});
export type LeaderboardSlickCoverProps = z.infer<typeof propsSchema>;

export const previewProps: LeaderboardSlickCoverProps = {
  title: TITLE,
};

export async function runner({
  props: { title },
  bounds: { width, height },
}: RunnerArgs<LeaderboardSlickCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([
    frauncesDisplay700,
    bricolage400,
    bricolage600,
    bricolage700,
    jetBrainsMonoMedium,
    jetBrainsMonoBold,
  ]);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // A settled frame inside the hold window (built in, before the rack-focus).
  await renderReactElement(
    ctx,
    <SlickLeaderboard
      width={width}
      height={height}
      title={title}
      metric={BEST_SLIDE.metric}
      valueLabel={BEST_SLIDE.valueLabel}
      rows={BEST_SLIDE.rows}
      frame={100}
      frameCount={165}
    />,
    { fonts },
  );

  return canvas.encode("png");
}
