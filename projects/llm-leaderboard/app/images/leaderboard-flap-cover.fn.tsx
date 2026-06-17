import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { spaceMono400, spaceMono700, loadFonts } from "~/fonts";
import {
  FlapLeaderboard,
  flapTotalFrames,
  type FlapState,
} from "~/components/flap-leaderboard";
import { MEAN_SLIDE, BEST_SLIDE, TITLE } from "~/frontierswe-data";

/**
 * Still cover for the "Flap" cut — the board settled on `best@5`, frozen in the
 * final hold. Renders through the same component as the annie, so the thumbnail
 * is pixel-consistent with the video.
 */

export const propsSchema = z.object({
  /** Board header plaque, e.g. "FrontierSWE Leaderboard". */
  title: z.string(),
});
export type LeaderboardFlapCoverProps = z.infer<typeof propsSchema>;

export const previewProps: LeaderboardFlapCoverProps = {
  title: TITLE,
};

const STATES: FlapState[] = [
  { metric: MEAN_SLIDE.metric, rows: MEAN_SLIDE.rows },
  { metric: BEST_SLIDE.metric, rows: BEST_SLIDE.rows },
];

export async function runner({
  props: { title },
  bounds: { width, height },
}: RunnerArgs<LeaderboardFlapCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([spaceMono400, spaceMono700]);
  const total = flapTotalFrames(STATES);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // A settled frame deep in the final best@5 hold.
  await renderReactElement(
    ctx,
    <FlapLeaderboard
      width={width}
      height={height}
      title={title}
      valueLabel={BEST_SLIDE.valueLabel}
      states={STATES}
      frame={total - 24}
    />,
    { fonts },
  );

  return canvas.encode("png");
}
