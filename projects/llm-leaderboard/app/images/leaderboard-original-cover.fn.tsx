import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import {
  jetBrainsMonoRegular,
  jetBrainsMonoMedium,
  jetBrainsMonoBold,
  jetBrainsMonoExtraBold,
  loadFonts,
} from "~/fonts";
import { OriginalLeaderboard } from "~/components/original-leaderboard";
import { BEST_SLIDE, TITLE } from "~/frontierswe-data";

/**
 * Still cover for the leaderboard video — the climactic `best@5` board, frozen
 * mid-hold. Renders through the same component as the annie so the thumbnail is
 * pixel-consistent with the video.
 */

export const propsSchema = z.object({
  /** Wordmark shown at the top, e.g. "FrontierSWE OriginalLeaderboard". */
  title: z.string(),
});
export type LeaderboardOriginalCoverProps = z.infer<typeof propsSchema>;

export const previewProps: LeaderboardOriginalCoverProps = {
  title: TITLE,
};

export async function runner({
  props: { title },
  bounds: { width, height },
}: RunnerArgs<LeaderboardOriginalCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([
    jetBrainsMonoRegular,
    jetBrainsMonoMedium,
    jetBrainsMonoBold,
    jetBrainsMonoExtraBold,
  ]);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // A settled frame inside the hold window (built in, before the fade-out).
  await renderReactElement(
    ctx,
    <OriginalLeaderboard
      width={width}
      height={height}
      title={title}
      metric={BEST_SLIDE.metric}
      valueLabel={BEST_SLIDE.valueLabel}
      rows={BEST_SLIDE.rows}
      frame={90}
      frameCount={150}
    />,
    { fonts },
  );

  return canvas.encode("png");
}
