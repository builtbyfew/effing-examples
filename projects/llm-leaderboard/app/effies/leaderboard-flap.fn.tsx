import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { LeaderboardFlapSlideProps } from "~/annies/leaderboard-flap-slide.fn";
import type { LeaderboardFlapCoverProps } from "~/images/leaderboard-flap-cover.fn";
import { flapTotalFrames } from "~/components/flap-leaderboard";
import { MEAN_SLIDE, BEST_SLIDE, TITLE } from "~/frontierswe-data";

/**
 * The split-flap "Flap" cut of the LLM leaderboard video.
 *
 * Staged as a Solari departure board: one physical board that clatters in to
 * mean@5, holds, then re-flips in place to best@5. Because it's a single board
 * updating itself, the whole thing is one continuous annie — no segment cut.
 */

const rowSchema = z.object({
  model: z.string(),
  harness: z.string(),
  value: z.number(),
  share: z.number().min(0).max(100),
  fromRank: z.number().int().positive().optional(),
});

const stateSchema = z.object({
  metric: z.string(),
  rows: z.array(rowSchema).min(1).max(5),
});

export const propsSchema = z.object({
  /** Board header plaque, shown on every state. */
  title: z.string(),
  /** Name of the primary figure; titles its column, e.g. "avg rank". */
  valueLabel: z.string().optional(),
  /** Title for the share column. Defaults to "Dominance". */
  shareLabel: z.string().optional(),
  /** The board states, played in order — typically [mean@5, best@5]. */
  states: z.array(stateSchema).min(1).max(2),
});

type LeaderboardFlapVideoProps = z.infer<typeof propsSchema>;

export const previewProps: LeaderboardFlapVideoProps = {
  title: TITLE,
  valueLabel: MEAN_SLIDE.valueLabel,
  states: [
    { metric: MEAN_SLIDE.metric, rows: MEAN_SLIDE.rows },
    { metric: BEST_SLIDE.metric, rows: BEST_SLIDE.rows },
  ],
};

const FPS = 30;

export async function runner({
  props: { title, valueLabel, shareLabel, states },
  bounds: { width, height },
}: RunnerArgs<LeaderboardFlapVideoProps>): EffieRunnerReturn {
  const cover = await fnUrl(
    "image",
    "leaderboard-flap-cover",
    { title } satisfies LeaderboardFlapCoverProps,
    { width, height },
  );

  // One continuous annie carries the whole story; the duration is whatever the
  // fill → hold → update → hold sequence needs for these states.
  const frameCount = flapTotalFrames(states);
  const duration = frameCount / FPS;

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "color", color: "black" },
    segments: [
      effieSegment({
        duration,
        layers: [
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "leaderboard-flap-slide",
              {
                title,
                valueLabel,
                shareLabel,
                states,
                frameCount,
              } satisfies LeaderboardFlapSlideProps,
              { width, height },
            ),
          },
        ],
      }),
    ],
  });
}
