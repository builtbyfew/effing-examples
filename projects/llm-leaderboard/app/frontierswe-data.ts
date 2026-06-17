import type { LeaderboardRow } from "~/components/original-leaderboard";

/**
 * The dataset behind the demo video: a coding-agent leaderboard scored two
 * ways. GLM-5.2 is the climber the animation calls out — it ranks #3 on
 * `mean@5` and jumps to #2 on `best@5`.
 *
 * Swap these arrays (or feed your own via the fn props) to retarget the video
 * at any leaderboard you like.
 */

/** Default board wordmark. */
export const TITLE = "FrontierSWE Leaderboard";

export type Slide = {
  metric: string;
  valueLabel: string;
  rows: LeaderboardRow[];
};

export const MEAN_SLIDE: Slide = {
  metric: "mean@5",
  valueLabel: "avg rank",
  rows: [
    { model: "Claude Fable 5", harness: "Claude Code", value: 2.35, share: 90 },
    { model: "Claude Opus 4.8", harness: "Claude Code", value: 4.24, share: 75 },
    { model: "GLM-5.2", harness: "Claude Code", value: 4.32, share: 74, fromRank: 9 },
    { model: "GPT-5.5", harness: "Codex", value: 4.56, share: 73 },
    { model: "Claude Opus 4.7", harness: "Claude Code", value: 5.76, share: 63 },
  ],
};

export const BEST_SLIDE: Slide = {
  metric: "best@5",
  valueLabel: "avg rank",
  rows: [
    { model: "Claude Fable 5", harness: "Claude Code", value: 1.88, share: 93 },
    { model: "GLM-5.2", harness: "Claude Code", value: 3.47, share: 81, fromRank: 8 },
    { model: "Claude Opus 4.8", harness: "Claude Code", value: 3.76, share: 79 },
    { model: "GPT-5.5", harness: "Codex", value: 5.12, share: 68 },
    { model: "Claude Opus 4.7", harness: "Claude Code", value: 5.41, share: 66 },
  ],
};
