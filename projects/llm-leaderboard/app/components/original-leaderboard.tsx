import type { ReactElement } from "react";
import { easeOutCubic, easeInOutCubic } from "@effing/tween";

/**
 * The leaderboard, as a component. Given a frame within a slide's timeline it
 * renders the whole board — everything is authored in a fixed 1080×900 design
 * space and scaled uniformly to the requested bounds.
 *
 * Both the animated annie and the still cover render `<OriginalLeaderboard />`, so the
 * two always match: the annie sweeps `frame` across the timeline, the cover
 * pins it to a settled, held frame.
 *
 * The board is metric-agnostic: a row carries a primary `value` (whose column
 * is titled by `valueLabel`) and a `share` percentage (drawn as a bar, titled by
 * `shareLabel`). Nothing here is hard-wired to "avg rank" or "dominance".
 */

export type LeaderboardRow = {
  /** Display name, e.g. "GLM-5.2". */
  model: string;
  /** Sub-label under the model, e.g. "Claude Code". */
  harness: string;
  /** Primary figure for the `valueLabel` column (e.g. an avg rank). Two decimals. */
  value: number;
  /** Secondary stat as a percentage (0–100), drawn as a bar + label. */
  share: number;
  /** When set, the row is highlighted and shows a "▲ from #N" climber badge. */
  fromRank?: number;
};

export type OriginalLeaderboardProps = {
  width: number;
  height: number;
  /** Wordmark shown at the top, e.g. "FrontierSWE OriginalLeaderboard". */
  title: string;
  /** Benchmark label after the wordmark, e.g. "best@5". */
  metric: string;
  /** Name of the primary figure; titles its column and trails the subtitle. */
  valueLabel: string;
  /** Title for the share/bar column. Defaults to "Dominance". */
  shareLabel?: string;
  rows: LeaderboardRow[];
  /** Current frame within the slide. */
  frame: number;
  /** Total frames in the slide. */
  frameCount: number;
};

// Fonts this board expects to be passed to renderReactElement.
export const BOARD_FONT = "JetBrains Mono";

// ---------------------------------------------------------------------------
// Design space (the reference 6:5 frame).
// ---------------------------------------------------------------------------
const DW = 1080;
const DH = 900;

const C = {
  panel: "#0b0b0d",
  grid: "rgba(255,255,255,0.045)",
  divider: "rgba(255,255,255,0.13)",
  white: "#f4f4f5",
  dim: "#71717a",
  share: "#9aa1aa",
  rankDim: "#56565f",
  barTrack: "rgba(255,255,255,0.12)",
  barFill: "#d6d6da",
  green: "#54e39a",
  greenDim: "rgba(84,227,154,0.7)",
  cardBg: "rgba(84,227,154,0.07)",
  cardBorder: "rgba(84,227,154,0.42)",
};

const TABLE_TOP = 250;
const ROW_H = 118;
const ROW_PAD_L = 18;
const ROW_PAD_R = 60;
const COL_RANK_W = 120;
const COL_VALUE_W = 168;
const COL_BAR_W = 150;
const COL_SHARE_W = 120;
const RANK_PAD_L = 38;
const VALUE_PAD_L = 60;
// Width of a value figure ("D.DD": 4 monospace chars at the figure size).
const VALUE_FIGURE_W = 82;
const BAR_TRACK_W = 132;
// Highlighted row "breathes": its fill + glow pulse on this period (~1.8s @ 30fps).
const PULSE_PERIOD = 54;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Slide timeline (frames). Build in row-by-row, hold, then lift + fade out.
function timeline(frameCount: number) {
  const fadeOutDur = Math.max(18, Math.round(frameCount * 0.18));
  return {
    titleInDur: 12,
    headerStart: 6,
    headerDur: 14,
    rowsStart: 14,
    rowStagger: 6,
    rowReveal: 16,
    fadeOutDur,
    fadeOutStart: frameCount - fadeOutDur,
  };
}

export function OriginalLeaderboard({
  width,
  height,
  title,
  metric,
  valueLabel,
  shareLabel = "Dominance",
  rows,
  frame,
  frameCount,
}: OriginalLeaderboardProps): ReactElement {
  const k = Math.min(width / DW, height / DH);
  const cell = 118 * k;
  const t = timeline(frameCount);
  const prog = (start: number, dur: number) => clamp01((frame - start) / dur);

  const fadeIn = prog(0, t.titleInDur);
  const fadeOut = 1 - prog(t.fadeOutStart, t.fadeOutDur);
  const boardOpacity = fadeIn * fadeOut;
  const lift = easeInOutCubic(prog(t.fadeOutStart, t.fadeOutDur));
  const stageScale = 1 + 0.05 * lift;
  const headerOpacity = prog(t.headerStart, t.headerDur);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        display: "flex",
        backgroundColor: "#000000",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "flex",
          opacity: boardOpacity,
          transform: `scale(${stageScale})`,
          transformOrigin: "50% 50%",
        }}
      >
        {/* Base panel + blueprint grid */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            backgroundColor: C.panel,
            backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
            backgroundSize: `${cell}px ${cell}px`,
          }}
        />
        {/* Edge vignette */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            backgroundImage:
              "radial-gradient(ellipse 72% 64% at 50% 46%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.62) 100%)",
          }}
        />

        {/* Scaled 1080×900 design surface, centered in the bounds */}
        <div
          style={{
            position: "absolute",
            left: (width - DW) / 2,
            top: (height - DH) / 2,
            width: DW,
            height: DH,
            display: "flex",
            transform: `scale(${k})`,
            transformOrigin: "50% 50%",
          }}
        >
          <Title title={title} metric={metric} valueLabel={valueLabel} />
          <Header
            opacity={headerOpacity}
            valueLabel={valueLabel}
            shareLabel={shareLabel}
          />
          {rows.map((row, i) => (
            <Row
              key={`row-${i}`}
              row={row}
              index={i}
              reveal={clamp01(
                (frame - (t.rowsStart + i * t.rowStagger)) / t.rowReveal,
              )}
              frame={frame}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Title({
  title,
  metric,
  valueLabel,
}: {
  title: string;
  metric: string;
  valueLabel: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 42,
        left: 0,
        width: DW,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: BOARD_FONT,
          fontWeight: 800,
          fontSize: 45,
          letterSpacing: -1,
          color: C.white,
          display: "flex",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: BOARD_FONT,
          fontWeight: 400,
          fontSize: 22,
          letterSpacing: 0.5,
          color: C.dim,
          marginLeft: 46,
          paddingBottom: 6,
          display: "flex",
        }}
      >
        {`${metric} · ${valueLabel}`}
      </div>
    </div>
  );
}

function Header({
  opacity,
  valueLabel,
  shareLabel,
}: {
  opacity: number;
  valueLabel: string;
  shareLabel: string;
}) {
  const label = (
    text: string,
    align: "flex-start" | "center" | "flex-end",
    width?: number,
  ) => (
    <div
      style={{
        fontFamily: BOARD_FONT,
        fontWeight: 400,
        fontSize: 17,
        letterSpacing: 1.6,
        color: C.dim,
        textTransform: "uppercase",
        display: "flex",
        ...(width ? { width } : {}),
        justifyContent: align,
        textAlign:
          align === "flex-end" ? "right" : align === "center" ? "center" : "left",
        // Multi-word labels (e.g. "avg rank") wrap within their column.
        whiteSpace: "normal",
      }}
    >
      {text}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 176,
        left: 0,
        width: DW,
        height: 74,
        display: "flex",
        flexDirection: "column",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          flexGrow: 1,
          paddingLeft: ROW_PAD_L,
          paddingRight: ROW_PAD_R,
          paddingBottom: 16,
        }}
      >
        <div style={{ width: COL_RANK_W, paddingLeft: RANK_PAD_L, display: "flex" }}>
          {label("#", "flex-start")}
        </div>
        <div style={{ display: "flex", flexGrow: 1 }}>
          {label("Model · Harness", "flex-start")}
        </div>
        <div
          style={{
            width: COL_VALUE_W,
            paddingLeft: VALUE_PAD_L,
            // Pull the right-aligned header off the column's right edge so it
            // lines up with the right edge of the figures below, not the bar.
            paddingRight: COL_VALUE_W - VALUE_PAD_L - VALUE_FIGURE_W,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          {label(valueLabel, "flex-end", VALUE_FIGURE_W)}
        </div>
        <div style={{ width: COL_BAR_W, display: "flex" }} />
        <div
          style={{ width: COL_SHARE_W, display: "flex", justifyContent: "flex-end" }}
        >
          {label(shareLabel, "flex-end")}
        </div>
      </div>
      <div
        style={{
          marginLeft: ROW_PAD_L,
          marginRight: ROW_PAD_R,
          height: 1,
          backgroundColor: C.divider,
          display: "flex",
        }}
      />
    </div>
  );
}

function Row({
  row,
  index,
  reveal,
  frame,
}: {
  row: LeaderboardRow;
  index: number;
  reveal: number;
  frame: number;
}) {
  const highlighted = row.fromRank !== undefined;
  const eased = easeOutCubic(reveal);
  const rank = index + 1;
  // A smaller rank number is better, so a previous rank below the current one
  // (fromRank > rank) means the model climbed; above it means it slipped.
  const droppedDown = row.fromRank !== undefined && rank > row.fromRank;

  // Rolling figures: the share counts up; the value settles down with a little
  // odometer jitter that decays as the row locks in.
  const shareDisplay = Math.round(row.share * eased);
  const jitter = (1 - eased) * (2.0 + 1.6 * Math.sin(frame * 0.9 + index * 2.1));
  const valueDisplay = Math.max(0, row.value + jitter);

  const figureColor = highlighted ? C.green : C.white;
  const rankColor = highlighted || rank === 1 ? C.green : C.rankDim;
  const modelColor = highlighted ? C.green : C.white;
  const harnessColor = highlighted ? C.greenDim : C.dim;
  const shareColor = highlighted ? C.green : C.share;

  // Pulse for the highlighted card: a slow, gentle breathe kept *inside* the
  // border (fill + inset glow). The outer drop-glow stays constant.
  const pulse = 0.5 + 0.5 * Math.sin((frame / PULSE_PERIOD) * Math.PI * 2);
  const cardBgAlpha = 0.06 + 0.06 * pulse;
  const innerGlowBlur = 16 + 18 * pulse;
  const innerGlowAlpha = 0.08 + 0.12 * pulse;

  const top = TABLE_TOP + ROW_H * index;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        width: DW,
        height: ROW_H,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: ROW_PAD_L,
        paddingRight: ROW_PAD_R,
        opacity: eased,
        transform: `translateY(${(1 - eased) * 16}px)`,
      }}
    >
      {highlighted && (
        <div
          style={{
            position: "absolute",
            left: 22,
            top: (ROW_H - 96) / 2,
            width: DW - 22 - 26,
            height: 96,
            borderRadius: 16,
            backgroundColor: `rgba(84,227,154,${cardBgAlpha})`,
            border: `1px solid ${C.cardBorder}`,
            boxShadow: `0 0 48px rgba(84,227,154,0.18), inset 0 0 ${innerGlowBlur}px rgba(84,227,154,${innerGlowAlpha})`,
            display: "flex",
          }}
        />
      )}

      {/* Rank */}
      <div
        style={{
          width: COL_RANK_W,
          paddingLeft: RANK_PAD_L,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: BOARD_FONT,
            fontWeight: 700,
            fontSize: 30,
            color: rankColor,
            display: "flex",
          }}
        >
          {String(rank)}
        </div>
      </div>

      {/* Model + harness, with optional climber badge */}
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: BOARD_FONT,
              fontWeight: 700,
              fontSize: 28,
              color: modelColor,
              display: "flex",
            }}
          >
            {row.model}
          </div>
          <div
            style={{
              fontFamily: BOARD_FONT,
              fontWeight: 400,
              fontSize: 19,
              color: harnessColor,
              marginTop: 6,
              display: "flex",
            }}
          >
            {row.harness}
          </div>
        </div>
        {highlighted && (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 14,
              paddingRight: 16,
              borderRadius: 9,
              border: `1px solid ${C.cardBorder}`,
              backgroundColor: "rgba(84,227,154,0.06)",
            }}
          >
            <svg
              width={11}
              height={9}
              viewBox="0 0 11 9"
              fill={C.green}
              style={{ marginRight: 9 }}
            >
              {/* up = climbed, down = slipped */}
              <polygon
                points={droppedDown ? "0,0 11,0 5.5,9" : "5.5,0 11,9 0,9"}
              />
            </svg>
            <div
              style={{
                fontFamily: BOARD_FONT,
                fontWeight: 500,
                fontSize: 18,
                letterSpacing: 0.5,
                color: C.green,
                display: "flex",
              }}
            >
              {`from #${row.fromRank}`}
            </div>
          </div>
        )}
      </div>

      {/* Value */}
      <div
        style={{
          width: COL_VALUE_W,
          paddingLeft: VALUE_PAD_L,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: BOARD_FONT,
            fontWeight: 700,
            fontSize: 34,
            color: figureColor,
            display: "flex",
          }}
        >
          {valueDisplay.toFixed(2)}
        </div>
      </div>

      {/* Share bar */}
      <div
        style={{
          width: COL_BAR_W,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: BAR_TRACK_W,
            height: 4,
            borderRadius: 2,
            backgroundColor: C.barTrack,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: (BAR_TRACK_W * shareDisplay) / 100,
              height: highlighted ? 4 : 3,
              borderRadius: 2,
              backgroundColor: highlighted ? C.green : C.barFill,
              boxShadow: highlighted ? "0 0 10px rgba(84,227,154,0.7)" : "none",
              display: "flex",
            }}
          />
        </div>
      </div>

      {/* Share % */}
      <div
        style={{
          width: COL_SHARE_W,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: BOARD_FONT,
            fontWeight: 500,
            fontSize: 29,
            color: shareColor,
            display: "flex",
          }}
        >
          {`${shareDisplay}%`}
        </div>
      </div>
    </div>
  );
}
