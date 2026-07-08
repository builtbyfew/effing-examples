import type { ReactElement, CSSProperties } from "react";
import { easeOutCubic, easeInOutCubic } from "@effing/tween";

/**
 * The "Slick" leaderboard — the fancy, cinematic cut.
 *
 * Same data shape as the plain `Leaderboard`, but staged like a broadcast
 * graphic: a clean, cool obsidian stage, rows rendered as frosted-glass cards
 * that land with a specular sheen sweep, real beveled metal medals on the top
 * three ranks, and a single aqua "spotlight" treatment that singles out the
 * climber. The headline blurs in; on the way out the whole board pulls a
 * rack-focus (blur + lift + fade).
 *
 * Two visual languages, kept separate so they don't fight: the medal colours
 * (gold / silver / bronze) live *only* on the rank coin and mean placement; the
 * aqua highlight lives on the row and means "this is the climber".
 *
 * Everything is authored in a fixed 1080×900 design space and scaled uniformly
 * to the requested bounds, so the same composition fills 6:5, 4:5 and 9:16.
 *
 * The annie sweeps `frame` across the timeline; the still cover pins it to a
 * settled, held frame — so the two always match.
 */

export type SlickRow = {
  /** Display name, e.g. "GLM-5.2". */
  model: string;
  /** Sub-label under the model, e.g. "Claude Code". */
  harness: string;
  /** Primary figure for the `valueLabel` column (e.g. an avg rank). Two decimals. */
  value: number;
  /** Secondary stat as a percentage (0–100), drawn as a bar + label. */
  share: number;
  /** When set, the row is the spotlit climber and shows a "▲ from #N" badge. */
  fromRank?: number;
};

export type SlickLeaderboardProps = {
  width: number;
  height: number;
  /** Big serif headline, e.g. "FrontierSWE Leaderboard". */
  title: string;
  /** Benchmark label shown in the subtitle, e.g. "best@5". */
  metric: string;
  /** Name of the primary figure; titles its column, e.g. "avg rank". */
  valueLabel: string;
  /** Title for the share/bar column. Defaults to "Dominance". */
  shareLabel?: string;
  rows: SlickRow[];
  /**
   * Blur the headline in at the start of this slide. Set false on every slide
   * but the first so the headline stays anchored across a multi-slide cut.
   * Defaults to true.
   */
  titleIntro?: boolean;
  /**
   * Rack-focus the headline out at the end of this slide. Set false on every
   * slide but the last so the headline persists into the next. Defaults to true.
   */
  titleOutro?: boolean;
  /** Current frame within the slide. */
  frame: number;
  /** Total frames in the slide. */
  frameCount: number;
};

// Fonts this board expects to be passed to renderReactElement.
export const SLICK_FONTS = {
  serif: "Fraunces",
  sans: "Bricolage Grotesque",
  mono: "JetBrains Mono",
} as const;

// ---------------------------------------------------------------------------
// Design space (the reference 6:5 frame) + palette.
// ---------------------------------------------------------------------------
const DW = 1080;
const DH = 900;

const C = {
  ink: "#070709",
  white: "#f4f4f7",
  text: "#dcdce2",
  dim: "#8f8f9b",
  faint: "#5f5f6b",
  glassBg: "rgba(255,255,255,0.035)",
  glassBorder: "rgba(255,255,255,0.10)",
};

// The climber's spotlight accent (the only row colour).
const AQUA = "78,231,212";

// Medal metals — confined to the rank coin.
type Medal = "gold" | "silver" | "bronze" | null;
const medalFor = (rank: number): Medal =>
  rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : null;

const MEDAL = {
  gold: {
    rim: "linear-gradient(145deg, #fbe9b0 0%, #e0a53c 52%, #a06d1c 100%)",
    face: "radial-gradient(ellipse 130% 130% at 34% 24%, #fff5d4 0%, #eac162 46%, #bd862c 100%)",
    edge: "rgba(120,86,24,0.9)",
    num: "#4a3406",
    glow: "232,183,94",
  },
  silver: {
    rim: "linear-gradient(145deg, #f6f9fd 0%, #b6bdca 52%, #828a99 100%)",
    face: "radial-gradient(ellipse 130% 130% at 34% 24%, #ffffff 0%, #d2d8e1 46%, #9098a6 100%)",
    edge: "rgba(120,126,138,0.9)",
    num: "#383d47",
    glow: "210,216,225",
  },
  bronze: {
    rim: "linear-gradient(145deg, #f3cda1 0%, #c27c43 52%, #844a21 100%)",
    face: "radial-gradient(ellipse 130% 130% at 34% 24%, #f8d8b3 0%, #cd8d52 46%, #944f25 100%)",
    edge: "rgba(120,72,36,0.9)",
    num: "#43260f",
    glow: "206,139,79",
  },
} as const;

const MARGIN_X = 44;
const CARD_W = DW - MARGIN_X * 2; // 992
const CARD_H = 104;
const CARD_GAP = 13;
const CARDS_TOP = 266;

// Card internal column geometry.
const CARD_PAD_L = 24;
const CARD_PAD_R = 30;
const COL_RANK_W = 92;
const COL_VALUE_W = 150;
const COL_BAR_W = 176;
const COL_PCT_W = 84;
const BAR_TRACK_W = 150;

// The climber row "breathes" on this period (~2s @ 30fps).
const PULSE_PERIOD = 60;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// easeOutBack — a gentle overshoot for things that "land".
const backOut = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};
// A 0→1→0 bell, for one-shot highlights like the sheen sweep.
const bell = (t: number) => Math.sin(clamp01(t) * Math.PI);

// Slide timeline (frames). Lights + headline ease in, rows build row-by-row,
// hold, then the whole board pulls a rack-focus on the way out.
function timeline(frameCount: number) {
  const fadeOutDur = Math.max(22, Math.round(frameCount * 0.2));
  return {
    titleInDur: 16,
    labelsStart: 14,
    labelsDur: 14,
    rowsStart: 20,
    rowStagger: 8,
    rowReveal: 20,
    // The stage lights come up *with* the rows, not during the title-only open.
    lightRiseDur: 46,
    fadeOutDur,
    fadeOutStart: frameCount - fadeOutDur,
  };
}

export function SlickLeaderboard({
  width,
  height,
  title,
  metric,
  valueLabel,
  shareLabel = "Dominance",
  rows,
  titleIntro = true,
  titleOutro = true,
  frame,
  frameCount,
}: SlickLeaderboardProps): ReactElement {
  const k = Math.min(width / DW, height / DH);
  const t = timeline(frameCount);
  const prog = (start: number, dur: number) => clamp01((frame - start) / dur);

  // Per-group intro/outro. The body (subtitle, labels, cards) builds in and
  // rack-focuses out on every slide. The headline can persist across a cut
  // (titleIntro/titleOutro) so it anchors the whole video — blurring in once at
  // the very start and rack-focusing out once at the very end.
  const introP = easeOutCubic(prog(0, t.titleInDur));
  const outroP = easeInOutCubic(prog(t.fadeOutStart, t.fadeOutDur));

  const groupStyle = (inP: number, outP: number): CSSProperties => {
    const blur = lerp(10, 0, inP) + lerp(0, 12, outP);
    const style: CSSProperties = {
      position: "absolute",
      top: 0,
      left: 0,
      width: DW,
      height: DH,
      display: "flex",
      opacity: inP * (1 - outP),
      transform: `translateY(${(-10 * outP).toFixed(2)}px) scale(${(lerp(0.99, 1, inP) + 0.05 * outP).toFixed(3)})`,
      transformOrigin: "50% 46%",
    };
    // The blur forces an offscreen layer + image-filter pass every frame, so
    // only pay for it during the intro/outro — skip it through the (majority)
    // hold frames where the radius is ~0.
    if (blur > 0.05) style.filter = `blur(${blur.toFixed(2)}px)`;
    return style;
  };

  const titleInP = titleIntro ? introP : 1;
  const titleOutP = titleOutro ? outroP : 0;

  // The stage lights come up as the rows build in on the first slide and dim
  // out on the last, but stay up across the cut between.
  const lightIn = titleIntro ? easeOutCubic(prog(t.rowsStart, t.lightRiseDur)) : 1;
  const lightOut = titleOutro ? easeInOutCubic(prog(t.fadeOutStart, t.fadeOutDur)) : 0;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        display: "flex",
        backgroundColor: C.ink,
      }}
    >
      <Stage
        width={width}
        height={height}
        frame={frame}
        lightIn={lightIn}
        lightOut={lightOut}
      />

      {/* Scaled 1080×900 design surface, centered in the bounds. */}
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
        {/* Headline group — anchors across a multi-slide cut. */}
        <div style={groupStyle(titleInP, titleOutP)}>
          <Headline title={title} intro={titleInP} />
        </div>

        {/* Body group — rebuilds every slide. */}
        <div style={groupStyle(introP, outroP)}>
          <Subtitle metric={metric} valueLabel={valueLabel} />
          <ColumnLabels
            valueLabel={valueLabel}
            shareLabel={shareLabel}
            opacity={prog(t.labelsStart, t.labelsDur)}
          />
          {rows.map((row, i) => (
            <Card
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

// ---------------------------------------------------------------------------
// The obsidian stage: a clean, cool dark with a restrained top light that eases
// up on entry, a faint grid for material, and an edge vignette. Stays sharp
// behind the content so the rack-focus reads against it.
//
//   lightIn  — 0→1 lights-up ease
//   lightOut — 0→1 lights-out dim at the very end
// ---------------------------------------------------------------------------
function Stage({
  width,
  height,
  frame,
  lightIn,
  lightOut,
}: {
  width: number;
  height: number;
  frame: number;
  lightIn: number;
  lightOut: number;
}) {
  const drift = Math.sin(frame * 0.016) * 3;
  const lit = lightIn * (1 - lightOut);
  const cell = Math.max(36, Math.round((height / DH) * 48));
  const keyA = 0.08 * lit;
  const baseA = 0.045 * lit;

  const fill = (image: string, extra: Record<string, unknown> = {}) => (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        backgroundImage: image,
        ...extra,
      }}
    />
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
      }}
    >
      {/* Deep cool obsidian base. */}
      {fill(
        `radial-gradient(ellipse 130% 100% at 50% -6%, #14141b 0%, #0a0a0f 48%, #050507 100%)`,
      )}
      {/* A broad, even cool wash that comes up with the rows — ambience, not a
          defined pool. */}
      {fill(
        `radial-gradient(ellipse 120% 95% at ${50 + drift}% 42%, rgba(214,222,255,${keyA.toFixed(3)}) 0%, rgba(214,222,255,${(keyA * 0.45).toFixed(3)}) 45%, rgba(214,222,255,0) 78%)`,
      )}
      {/* A whisper of cool fill from below, for depth. */}
      {fill(
        `radial-gradient(ellipse 80% 55% at 50% 114%, rgba(120,140,180,${baseA.toFixed(3)}) 0%, rgba(120,140,180,0) 64%)`,
      )}
      {/* Fine engineered grid — material, not blueprint. */}
      {fill(
        `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        { backgroundSize: `${cell}px ${cell}px` },
      )}
      {/* Edge vignette to seat everything in the dark — gentle, so it doesn't
          re-form a central pool against the wash. */}
      {fill(
        `radial-gradient(ellipse 92% 86% at 50% 48%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 64%, rgba(0,0,0,0.6) 100%)`,
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Headline: the big serif wordmark. Lives in the persistent group.
// ---------------------------------------------------------------------------
function Headline({ title, intro }: { title: string; intro: number }) {
  const titleLift = (1 - intro) * 14;
  return (
    <div
      style={{
        position: "absolute",
        top: 76,
        left: 0,
        width: DW,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: SLICK_FONTS.serif,
          fontWeight: 700,
          fontSize: 62,
          letterSpacing: -1.5,
          color: C.white,
          textShadow: "0 2px 30px rgba(0,0,0,0.5)",
          transform: `translateY(${titleLift.toFixed(2)}px)`,
          display: "flex",
        }}
      >
        {title}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subtitle: a single quiet line naming the benchmark + figure. Lives in the
// body group so it swaps with the data on each slide. No chrome.
// ---------------------------------------------------------------------------
function Subtitle({
  metric,
  valueLabel,
}: {
  metric: string;
  valueLabel: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 168,
        left: 0,
        width: DW,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: SLICK_FONTS.sans,
          fontWeight: 600,
          fontSize: 17,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: C.dim,
          display: "flex",
        }}
      >
        {`${metric}   ·   ${valueLabel}`}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column micro-labels over the value + share columns (the two that aren't
// self-evident), mirroring each card's internal columns.
// ---------------------------------------------------------------------------
function ColumnLabels({
  valueLabel,
  shareLabel,
  opacity,
}: {
  valueLabel: string;
  shareLabel: string;
  opacity: number;
}) {
  const label = (text: string, align: "flex-start" | "flex-end") => (
    <div
      style={{
        fontFamily: SLICK_FONTS.sans,
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: C.faint,
        display: "flex",
        justifyContent: align,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        top: CARDS_TOP - 24,
        left: MARGIN_X + CARD_PAD_L,
        width: CARD_W - CARD_PAD_L - CARD_PAD_R,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        opacity,
      }}
    >
      <div style={{ width: COL_RANK_W, display: "flex" }} />
      <div style={{ flexGrow: 1, display: "flex" }} />
      <div style={{ width: COL_VALUE_W, display: "flex", justifyContent: "flex-end" }}>
        {label(valueLabel, "flex-end")}
      </div>
      <div
        style={{
          width: COL_BAR_W + COL_PCT_W,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        {label(shareLabel, "flex-end")}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One glass row card.
// ---------------------------------------------------------------------------
function Card({
  row,
  index,
  reveal,
  frame,
}: {
  row: SlickRow;
  index: number;
  reveal: number;
  frame: number;
}) {
  const rank = index + 1;
  const lit = row.fromRank !== undefined; // the climber — the only coloured row
  const medal = medalFor(rank);

  const op = easeOutCubic(reveal);
  const land = backOut(reveal);
  const ty = (1 - land) * 24;
  const scale = lerp(0.965, 1, land);

  // Rolling figures.
  const co = easeOutCubic(reveal);
  const shareDisplay = Math.round(row.share * co);
  const jitter = (1 - co) * (2.0 + 1.6 * Math.sin(frame * 0.9 + index * 2.1));
  const valueDisplay = Math.max(0, row.value + jitter).toFixed(2);

  // Sheen sweep — a skewed highlight that travels across once as the card lands.
  const sheenT = clamp01((reveal - 0.05) / 0.7);
  const sheenX = lerp(-0.4, 1.4, sheenT) * CARD_W;
  const sheenOp = bell(sheenT) * 0.45;

  // Breathing pulse for the climber during the hold.
  const pulse = 0.5 + 0.5 * Math.sin((frame / PULSE_PERIOD) * Math.PI * 2);
  const top = CARDS_TOP + (CARD_H + CARD_GAP) * index;

  // Card surface — neutral glass, aqua-lit only for the climber. The #1 row gets
  // a hair more presence (brighter hairline) but stays colourless.
  const litBg = lit
    ? `linear-gradient(180deg, rgba(${AQUA},${(0.1 + 0.04 * pulse).toFixed(3)}) 0%, rgba(${AQUA},0.03) 100%)`
    : undefined;
  const borderColor = lit
    ? `rgba(${AQUA},${(0.42 + 0.16 * pulse).toFixed(3)})`
    : rank === 1
      ? "rgba(255,255,255,0.16)"
      : C.glassBorder;
  const outerGlow = lit
    ? `0 18px 50px rgba(0,0,0,0.5), 0 0 ${(34 + 22 * pulse).toFixed(0)}px rgba(${AQUA},${(0.16 + 0.1 * pulse).toFixed(3)})`
    : "0 16px 38px rgba(0,0,0,0.42)";

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: MARGIN_X,
        width: CARD_W,
        height: CARD_H,
        display: "flex",
        opacity: op,
        transform: `translateY(${ty.toFixed(2)}px) scale(${scale.toFixed(3)})`,
        transformOrigin: "50% 50%",
      }}
    >
      {/* Climber's rising light streak, behind the card. */}
      {lit ? (
        <div
          style={{
            position: "absolute",
            left: CARD_W * 0.5 - 150,
            top: -64,
            width: 300,
            height: CARD_H + 128,
            backgroundImage: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(${AQUA},${(0.12 + 0.07 * pulse).toFixed(3)}) 0%, rgba(${AQUA},0) 70%)`,
            display: "flex",
          }}
        />
      ) : null}

      {/* The glass surface (clips the sheen + specular line). */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: CARD_W,
          height: CARD_H,
          borderRadius: 20,
          backgroundColor: C.glassBg,
          backgroundImage: litBg,
          border: `1px solid ${borderColor}`,
          boxShadow: `${outerGlow}, inset 0 1px 0 rgba(255,255,255,0.07)`,
          overflow: "hidden",
          display: "flex",
        }}
      >
        {/* Top specular highlight line. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 28,
            width: CARD_W - 56,
            height: 1,
            backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${
              lit ? `rgba(${AQUA},0.6)` : "rgba(255,255,255,0.4)"
            } 50%, rgba(255,255,255,0) 100%)`,
            display: "flex",
          }}
        />
        {/* Sheen sweep. */}
        {sheenOp > 0.01 ? (
          <div
            style={{
              position: "absolute",
              top: -CARD_H,
              left: sheenX,
              width: 120,
              height: CARD_H * 3,
              backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${sheenOp.toFixed(3)}) 50%, rgba(255,255,255,0) 100%)`,
              transform: "rotate(18deg)",
              display: "flex",
            }}
          />
        ) : null}
      </div>

      {/* Card content (above the glass). */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: CARD_W,
          height: CARD_H,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: CARD_PAD_L,
          paddingRight: CARD_PAD_R,
        }}
      >
        <RankMark rank={rank} medal={medal} />

        {/* Model + harness + climber badge. */}
        <div
          style={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: SLICK_FONTS.sans,
                fontWeight: 700,
                fontSize: 29,
                letterSpacing: -0.3,
                color: lit ? `rgb(${AQUA})` : C.white,
                textShadow: lit ? `0 0 22px rgba(${AQUA},0.35)` : "none",
                display: "flex",
              }}
            >
              {row.model}
            </div>
            <div
              style={{
                fontFamily: SLICK_FONTS.sans,
                fontWeight: 400,
                fontSize: 17,
                letterSpacing: 0.2,
                color: lit ? `rgba(${AQUA},0.85)` : C.dim,
                marginTop: 5,
                display: "flex",
              }}
            >
              {row.harness}
            </div>
          </div>
          {lit ? (
            <ClimberBadge fromRank={row.fromRank!} rank={rank} pulse={pulse} />
          ) : null}
        </div>

        {/* Value figure. */}
        <div
          style={{
            width: COL_VALUE_W,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: SLICK_FONTS.mono,
              fontWeight: 700,
              fontSize: 35,
              letterSpacing: -1,
              color: lit ? `rgb(${AQUA})` : C.white,
              textShadow: lit ? `0 0 20px rgba(${AQUA},0.4)` : "none",
              display: "flex",
            }}
          >
            {valueDisplay}
          </div>
        </div>

        {/* Share bar with leading glow dot (climber only). */}
        <div
          style={{
            width: COL_BAR_W,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: 22,
            paddingRight: 4,
          }}
        >
          <Bar share={shareDisplay} lit={lit} pulse={pulse} />
        </div>

        {/* Share %. */}
        <div
          style={{
            width: COL_PCT_W,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: SLICK_FONTS.mono,
              fontWeight: 500,
              fontSize: 27,
              color: lit ? `rgb(${AQUA})` : C.text,
              display: "flex",
            }}
          >
            {`${shareDisplay}%`}
          </div>
        </div>
      </div>
    </div>
  );
}

// Rank mark: a real beveled metal medal for the top three, a quiet engraved
// numeral otherwise. The medal carries placement; it never tints the row.
function RankMark({ rank, medal }: { rank: number; medal: Medal }) {
  if (medal === null) {
    return (
      <div
        style={{
          width: COL_RANK_W,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: SLICK_FONTS.mono,
            fontWeight: 700,
            fontSize: 26,
            color: C.faint,
            display: "flex",
          }}
        >
          {String(rank)}
        </div>
      </div>
    );
  }

  const m = MEDAL[medal];
  const D = 60;
  const FACE = D - 13;

  return (
    <div style={{ width: COL_RANK_W, display: "flex", justifyContent: "center" }}>
      {/* Coin: a raised metal rim... */}
      <div
        style={{
          width: D,
          height: D,
          borderRadius: 999,
          backgroundImage: m.rim,
          border: `1px solid ${m.edge}`,
          boxShadow: `0 6px 14px rgba(0,0,0,0.5), 0 0 16px rgba(${m.glow},0.28), inset 0 1px 1px rgba(255,255,255,0.65)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* ...around a recessed engraved face. */}
        <div
          style={{
            width: FACE,
            height: FACE,
            borderRadius: 999,
            backgroundImage: m.face,
            boxShadow:
              "inset 0 2px 4px rgba(0,0,0,0.4), inset 0 -1px 1px rgba(255,255,255,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: SLICK_FONTS.mono,
              fontWeight: 700,
              fontSize: 24,
              color: m.num,
              display: "flex",
            }}
          >
            {String(rank)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Climber badge — "▲ from #N", aqua, with a chevron pointing the way the rank
// moved (up = climbed, down = slipped).
function ClimberBadge({
  fromRank,
  rank,
  pulse,
}: {
  fromRank: number;
  rank: number;
  pulse: number;
}) {
  const slipped = rank > fromRank;
  return (
    <div
      style={{
        marginLeft: "auto",
        marginRight: 4,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 7,
        paddingBottom: 7,
        paddingLeft: 13,
        paddingRight: 15,
        borderRadius: 999,
        border: `1px solid rgba(${AQUA},${(0.45 + 0.2 * pulse).toFixed(3)})`,
        backgroundColor: `rgba(${AQUA},0.08)`,
        boxShadow: `0 0 18px rgba(${AQUA},${(0.16 + 0.12 * pulse).toFixed(3)})`,
      }}
    >
      <svg
        width={12}
        height={10}
        viewBox="0 0 12 10"
        fill={`rgb(${AQUA})`}
        style={{ marginRight: 9 }}
      >
        <polygon points={slipped ? "0,0 12,0 6,10" : "6,0 12,10 0,10"} />
      </svg>
      <div
        style={{
          fontFamily: SLICK_FONTS.sans,
          fontWeight: 600,
          fontSize: 16,
          letterSpacing: 0.3,
          color: `rgb(${AQUA})`,
          display: "flex",
        }}
      >
        {`from #${fromRank}`}
      </div>
    </div>
  );
}

// Share bar — rounded track, gradient fill; the climber's fill glows and carries
// a leading dot. Everyone else stays a quiet neutral.
function Bar({
  share,
  lit,
  pulse,
}: {
  share: number;
  lit: boolean;
  pulse: number;
}) {
  const fillW = Math.max(0, (BAR_TRACK_W * share) / 100);
  const fillImg = lit
    ? "linear-gradient(90deg, #169aac 0%, #7df0dd 100%)"
    : "linear-gradient(90deg, #565660 0%, #c9c9d2 100%)";

  return (
    <div
      style={{
        width: BAR_TRACK_W,
        height: 6,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.10)",
        display: "flex",
        alignItems: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          width: fillW,
          height: 6,
          borderRadius: 999,
          backgroundImage: fillImg,
          boxShadow: lit ? `0 0 12px rgba(${AQUA},${(0.6 + 0.2 * pulse).toFixed(2)})` : "none",
          display: "flex",
        }}
      />
      {lit ? (
        <div
          style={{
            position: "absolute",
            left: fillW - 4,
            top: -1,
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: `rgb(${AQUA})`,
            boxShadow: `0 0 ${(8 + 6 * pulse).toFixed(0)}px rgba(${AQUA},0.95)`,
            display: "flex",
          }}
        />
      ) : null}
    </div>
  );
}
