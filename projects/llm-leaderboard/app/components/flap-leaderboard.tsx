import type { ReactElement, CSSProperties } from "react";
import type { LeaderboardRow } from "~/components/original-leaderboard";

/**
 * The "Flap" leaderboard — a Solari split-flap departure board.
 *
 * The whole story plays on a single physical board: the tiles clatter to life
 * filling in `mean@5`, hold, then — without a cut — *re-flip in place* to
 * `best@5`, the rows reshuffling as GLM-5.2's row rolls up into 2nd. Only the
 * tiles whose character actually changes flip; everything else stays put, so
 * the eye is drawn exactly to what moved. The header's metric module flaps
 * over from MEAN@5 to BEST@5 at the same beat.
 *
 * There's no 3D in the canvas, so the fold is faked the way it reads best: each
 * flipping cell is split at a centre seam, the leaf's top half collapsing
 * (scaleY 1→0, hinged at the seam) to reveal the new top, then the new bottom
 * leaf dropping in (scaleY 0→1) to cover the old — the canonical split-flap
 * two-phase fold. Cells roll forward through a fixed glyph reel between their
 * old and new characters, exactly like the mechanism.
 *
 * Authored in a fixed 1280×720 (16:9) design space and scaled uniformly to the
 * requested bounds — a departure board is wide, so it's framed widescreen
 * rather than the 6:5 of the other cuts. The annie sweeps `frame`; the still
 * cover pins a settled `best@5` frame — so the two always match.
 */

export type FlapState = {
  /** Benchmark label for this state, e.g. "mean@5" — shown on the metric flaps. */
  metric: string;
  /** Rows in ranked order (top = best) for this state. */
  rows: LeaderboardRow[];
};

export type FlapLeaderboardProps = {
  width: number;
  height: number;
  /** Board header plaque, e.g. "FrontierSWE Leaderboard". */
  title: string;
  /** Name of the primary figure; titles its column, e.g. "avg rank". */
  valueLabel: string;
  /** Title for the share column. Defaults to "Dominance". */
  shareLabel?: string;
  /** The board states, played in order — typically [mean@5, best@5]. */
  states: FlapState[];
  /**
   * Current frame within the animation. The timeline is absolute-frame based
   * (see the timeline constants below), so this is all the board needs to know.
   */
  frame: number;
};

// Fonts this board expects to be passed to renderReactElement.
export const FLAP_FONTS = { mono: "Space Mono" } as const;

// ---------------------------------------------------------------------------
// Design space + the flap reel.
// ---------------------------------------------------------------------------
const DW = 1280;
const DH = 720;

// The fixed glyph reel every tile rolls through (blank → letters → digits →
// punctuation), in mechanical order. Rolls are always forward, like the real
// mechanism.
const SEQ = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-%@";
const N = SEQ.length;
const idxOf = (ch: string) => {
  const i = SEQ.indexOf(ch);
  return i < 0 ? 0 : i;
};
const mod = (a: number, n: number) => ((a % n) + n) % n;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---------------------------------------------------------------------------
// Tile + grid geometry (design-space px).
// ---------------------------------------------------------------------------
const TW = 44; // tile width
const TH = 72; // tile height
const CELL_GAP = 2; // gap between tiles within a field
const FIELD_GAP = 18; // gap between fields
const ROW_GAP = 18; // gap between rows
const TILE_FONT = 44;

type FieldKey = "rank" | "model" | "value" | "pct";
const FIELDS: { key: FieldKey; width: number; align: "left" | "right" }[] = [
  { key: "rank", width: 1, align: "right" },
  { key: "model", width: 15, align: "left" },
  { key: "value", width: 4, align: "right" },
  { key: "pct", width: 3, align: "right" },
];

const ROWS = 5;

// Pre-computed column layout: one entry per tile across a row, with its field,
// in-field char index, x offset and running "across" index (for the diagonal
// fill cascade).
type Column = { key: FieldKey; ci: number; x: number; across: number };
const COLUMNS: Column[] = (() => {
  const cols: Column[] = [];
  let x = 0;
  let across = 0;
  for (let f = 0; f < FIELDS.length; f++) {
    const field = FIELDS[f];
    for (let ci = 0; ci < field.width; ci++) {
      cols.push({ key: field.key, ci, x, across });
      x += TW + CELL_GAP;
      across += 1;
    }
    x += FIELD_GAP - CELL_GAP; // field gap replaces the trailing cell gap
  }
  return cols;
})();

const ROW_INNER_W = (() => {
  const last = COLUMNS[COLUMNS.length - 1];
  return last.x + TW;
})();
const MAX_DIAG = ROWS - 1 + (COLUMNS.length - 1);

// Field x ranges (for the column labels), keyed by field.
const FIELD_X: Record<FieldKey, { x: number; w: number }> = (() => {
  const out = {} as Record<FieldKey, { x: number; w: number }>;
  for (const field of FIELDS) {
    const cs = COLUMNS.filter((c) => c.key === field.key);
    const x0 = cs[0].x;
    const xEnd = cs[cs.length - 1].x + TW;
    out[field.key] = { x: x0, w: xEnd - x0 };
  }
  return out;
})();

// Housing.
const PAD_X = 40;
const PAD_TOP = 30;
const HEADER_H = 80;
const COLLAB_H = 26;
const HEADER_GAP = 18;
const LABELS_GAP = 16;
const ROWS_H = ROWS * TH + (ROWS - 1) * ROW_GAP;

const HOUSING_W = ROW_INNER_W + PAD_X * 2;
const CONTENT_H = HEADER_H + HEADER_GAP + COLLAB_H + LABELS_GAP + ROWS_H;
const HOUSING_H = CONTENT_H + PAD_TOP * 2;
const HOUSING_LEFT = (DW - HOUSING_W) / 2;
const HOUSING_TOP = (DH - HOUSING_H) / 2;

const CONTENT_LEFT = HOUSING_LEFT + PAD_X;
const HEADER_TOP = HOUSING_TOP + PAD_TOP;
const LABELS_TOP = HEADER_TOP + HEADER_H + HEADER_GAP;
const GRID_TOP = LABELS_TOP + COLLAB_H + LABELS_GAP;
const rowY = (r: number) => GRID_TOP + r * (TH + ROW_GAP);

// Metric flap module (header right).
const MTW = 28;
const MTH = 46;
const MCELL_GAP = 2;
const MTILE_FONT = 28;

// ---------------------------------------------------------------------------
// Palette — warm Solari board: brushed-charcoal housing, graphite tiles, ivory
// glyphs, and a single amber that follows the climber.
// ---------------------------------------------------------------------------
const TILE_TOP_BG = "linear-gradient(180deg, #2c2925 0%, #232019 100%)";
const TILE_BOT_BG = "linear-gradient(180deg, #1d1a14 0%, #15120b 100%)";
const TILE_FULL_BG =
  "linear-gradient(180deg, #2c2925 0%, #232019 49.8%, #1d1a14 50.2%, #15120b 100%)";

// How dark a leaf gets as it turns edge-on (peaks at the fold's midpoint) — the
// shadow that sells the fold without real 3D.
const FOLD_SHADE = 0.55;

type Accent = { glyph: string; shadow: string };
const IVORY: Accent = {
  glyph: "#f0e6d0",
  shadow: "0 1px 1px rgba(0,0,0,0.65)",
};
const AMBER: Accent = {
  glyph: "#ffc266",
  shadow: "0 0 12px rgba(255,170,60,0.5), 0 1px 1px rgba(0,0,0,0.65)",
};
const AMBER_RGB = "255,178,72";

// ---------------------------------------------------------------------------
// Animation timeline (frames). The board fills in (every tile spins up through
// the reel into mean@5, on a diagonal cascade), holds, then re-flips in place
// to best@5 (only changed tiles move, rolling forward the real delta), holds.
// ---------------------------------------------------------------------------
const FILL_START = 8;
const FILL_DIAG_STAGGER = 3;
const FILL_SPIN = 12; // flaps each tile rolls on the way in
const FPF = 1.5; // frames per single flap
const HOLD_MEAN = 38;
const UPDATE_DIAG_STAGGER = 2;
const HOLD_BEST = 72;
const TAIL = 10;

const FILL_END = FILL_START + MAX_DIAG * FILL_DIAG_STAGGER + FILL_SPIN * FPF;
const UPDATE_START = FILL_END + HOLD_MEAN;

// ---------------------------------------------------------------------------
// Field formatting → fixed-width strings.
// ---------------------------------------------------------------------------
const pad = (s: string, w: number, align: "left" | "right") =>
  align === "left" ? s.padEnd(w).slice(0, w) : s.padStart(w).slice(-w);

function fieldChar(
  state: FlapState,
  rowIndex: number,
  key: FieldKey,
  ci: number,
): string {
  const row = state.rows[rowIndex];
  if (!row) return " ";
  let s: string;
  switch (key) {
    case "rank":
      s = pad(String(rowIndex + 1), 1, "right");
      break;
    case "model":
      s = pad(row.model.toUpperCase(), 15, "left");
      break;
    case "value":
      s = pad(row.value.toFixed(2), 4, "right");
      break;
    case "pct":
      s = pad(`${Math.round(row.share)}%`, 3, "right");
      break;
  }
  return s[ci] ?? " ";
}

const metricWidth = (states: FlapState[]) =>
  Math.max(1, ...states.map((s) => s.metric.length));

const metricChar = (states: FlapState[], si: number, ci: number) => {
  const w = metricWidth(states);
  const s = pad((states[si]?.metric ?? "").toUpperCase(), w, "left");
  return s[ci] ?? " ";
};

// Which row holds the climber (fromRank set) in a given state, or -1.
const climberRow = (state: FlapState | undefined) =>
  state ? state.rows.findIndex((r) => r.fromRank !== undefined) : -1;

// ---------------------------------------------------------------------------
// The flap reel: given a frame, work out what a tile is showing.
// ---------------------------------------------------------------------------
type Display =
  | { flipping: false; char: string }
  | { flipping: true; fromChar: string; toChar: string; fp: number };

// Spin a blank tile up to its target over FILL_SPIN flaps.
function spinDisplay(frame: number, start: number, toIdx: number): Display {
  if (frame < start) return { flipping: false, char: " " };
  const flaps = (frame - start) / FPF;
  if (flaps >= FILL_SPIN) return { flipping: false, char: SEQ[toIdx] };
  const cur = Math.floor(flaps);
  const fromIdx = mod(toIdx - FILL_SPIN + cur, N);
  const nextIdx = mod(fromIdx + 1, N);
  return {
    flipping: true,
    fromChar: SEQ[fromIdx],
    toChar: SEQ[nextIdx],
    fp: flaps - cur,
  };
}

// Roll a settled tile forward from one character to another (the real delta).
function deltaDisplay(
  frame: number,
  start: number,
  fromIdx: number,
  toIdx: number,
): Display {
  const steps = mod(toIdx - fromIdx, N);
  if (steps === 0) return { flipping: false, char: SEQ[toIdx] };
  if (frame < start) return { flipping: false, char: SEQ[fromIdx] };
  const flaps = (frame - start) / FPF;
  if (flaps >= steps) return { flipping: false, char: SEQ[toIdx] };
  const cur = Math.floor(flaps);
  const a = mod(fromIdx + cur, N);
  const b = mod(a + 1, N);
  return { flipping: true, fromChar: SEQ[a], toChar: SEQ[b], fp: flaps - cur };
}

// A tile that fills to its mean value then re-flips to its best value.
function tileDisplay(
  frame: number,
  diag: number,
  i0: number,
  i1: number,
): Display {
  if (frame < UPDATE_START) {
    return spinDisplay(frame, FILL_START + diag * FILL_DIAG_STAGGER, i0);
  }
  return deltaDisplay(frame, UPDATE_START + diag * UPDATE_DIAG_STAGGER, i0, i1);
}

/**
 * Total frames the full fill → hold → update → hold sequence needs, computed
 * from the actual content (so longer character rolls get the time they need).
 * Shared by the annie and effie so the timing always lines up.
 */
export function flapTotalFrames(states: FlapState[]): number {
  const s0 = states[0];
  const s1 = states[1] ?? states[0];
  let updateEnd = UPDATE_START;
  // Grid tiles.
  for (let r = 0; r < ROWS; r++) {
    for (const col of COLUMNS) {
      const i0 = idxOf(fieldChar(s0, r, col.key, col.ci));
      const i1 = idxOf(fieldChar(s1, r, col.key, col.ci));
      const steps = mod(i1 - i0, N);
      if (steps === 0) continue;
      const diag = r + col.across;
      const end = UPDATE_START + diag * UPDATE_DIAG_STAGGER + steps * FPF;
      if (end > updateEnd) updateEnd = end;
    }
  }
  // Metric tiles.
  const mw = metricWidth(states);
  for (let ci = 0; ci < mw; ci++) {
    const i0 = idxOf(metricChar(states, 0, ci));
    const i1 = idxOf(metricChar(states, states.length > 1 ? 1 : 0, ci));
    const steps = mod(i1 - i0, N);
    if (steps === 0) continue;
    const end = UPDATE_START + ci * UPDATE_DIAG_STAGGER + steps * FPF;
    if (end > updateEnd) updateEnd = end;
  }
  return Math.ceil(updateEnd + HOLD_BEST + TAIL);
}

// ---------------------------------------------------------------------------
// One half of a tile — the clipped top or bottom of a glyph on a tile face.
// Used for the two static halves and the two moving leaves of a flip.
// ---------------------------------------------------------------------------
function HalfTile({
  half,
  char,
  accent,
  tw,
  th,
  fontSize,
  scaleY,
  shade,
}: {
  half: "top" | "bottom";
  char: string;
  accent: Accent;
  tw: number;
  th: number;
  fontSize: number;
  scaleY?: number;
  shade?: number;
}) {
  const h = th / 2;
  const moving = scaleY !== undefined;
  const style: CSSProperties = {
    position: "absolute",
    left: 0,
    top: half === "top" ? 0 : h,
    width: tw,
    height: h,
    overflow: "hidden",
    display: "flex",
    backgroundImage: half === "top" ? TILE_TOP_BG : TILE_BOT_BG,
    borderTopLeftRadius: half === "top" ? 5 : 0,
    borderTopRightRadius: half === "top" ? 5 : 0,
    borderBottomLeftRadius: half === "bottom" ? 5 : 0,
    borderBottomRightRadius: half === "bottom" ? 5 : 0,
  };
  if (moving) {
    style.transform = `scale(1, ${Math.max(0, scaleY!).toFixed(3)})`;
    style.transformOrigin = half === "top" ? "50% 100%" : "50% 0%";
  }
  return (
    <div style={style}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: half === "top" ? 0 : -h,
          width: tw,
          height: th,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FLAP_FONTS.mono,
          fontWeight: 700,
          fontSize,
          lineHeight: 1,
          color: accent.glyph,
          textShadow: accent.shadow,
        }}
      >
        {char}
      </div>
      {shade && shade > 0.01 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: tw,
            height: h,
            backgroundColor: `rgba(0,0,0,${shade.toFixed(3)})`,
            display: "flex",
          }}
        />
      ) : null}
    </div>
  );
}

// The centre seam: a dark hairline with a lit top edge on the lower card, plus
// the two axle pegs. Drawn on top of every tile (resting or flipping).
function Seam({ tw, th }: { tw: number; th: number }) {
  const mid = th / 2;
  const pegH = Math.round(th * 0.13);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: tw,
        height: th,
        display: "flex",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: mid - 1,
          width: tw,
          height: 2,
          backgroundColor: "#090706",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: mid + 1,
          width: tw,
          height: 1,
          backgroundColor: "rgba(255,230,190,0.05)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -1,
          top: mid - pegH / 2,
          width: 3,
          height: pegH,
          borderRadius: 1,
          backgroundColor: "#0c0a08",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: tw - 2,
          top: mid - pegH / 2,
          width: 3,
          height: pegH,
          borderRadius: 1,
          backgroundColor: "#0c0a08",
          display: "flex",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// One flap tile.
// ---------------------------------------------------------------------------
function FlapCell({
  x,
  y,
  display,
  accent,
  tw,
  th,
  fontSize,
}: {
  x: number;
  y: number;
  display: Display;
  accent: Accent;
  tw: number;
  th: number;
  fontSize: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: tw,
        height: th,
        display: "flex",
      }}
    >
      {display.flipping ? (
        <>
          {/* Revealed static halves behind the moving leaf. */}
          <HalfTile
            half="top"
            char={display.toChar}
            accent={accent}
            tw={tw}
            th={th}
            fontSize={fontSize}
          />
          <HalfTile
            half="bottom"
            char={display.fromChar}
            accent={accent}
            tw={tw}
            th={th}
            fontSize={fontSize}
          />
          {/* The moving leaf: first the old top collapses, then the new bottom
              drops in. */}
          {display.fp < 0.5 ? (
            <HalfTile
              half="top"
              char={display.fromChar}
              accent={accent}
              tw={tw}
              th={th}
              fontSize={fontSize}
              scaleY={1 - display.fp / 0.5}
              shade={FOLD_SHADE * (display.fp / 0.5)}
            />
          ) : (
            <HalfTile
              half="bottom"
              char={display.toChar}
              accent={accent}
              tw={tw}
              th={th}
              fontSize={fontSize}
              scaleY={(display.fp - 0.5) / 0.5}
              shade={FOLD_SHADE * (1 - (display.fp - 0.5) / 0.5)}
            />
          )}
        </>
      ) : (
        // Resting tile — a single full face (cheap), the glyph split by the seam.
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: tw,
            height: th,
            borderRadius: 5,
            overflow: "hidden",
            backgroundImage: TILE_FULL_BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: FLAP_FONTS.mono,
              fontWeight: 700,
              fontSize,
              lineHeight: 1,
              color: accent.glyph,
              textShadow: accent.shadow,
              display: "flex",
            }}
          >
            {display.char}
          </div>
        </div>
      )}
      <Seam tw={tw} th={th} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The board.
// ---------------------------------------------------------------------------
export function FlapLeaderboard({
  width,
  height,
  title,
  valueLabel,
  shareLabel = "Dominance",
  states,
  frame,
}: FlapLeaderboardProps): ReactElement {
  const k = Math.min(width / DW, height / DH);
  const s0 = states[0];
  const s1 = states[1] ?? states[0];

  // The amber follows the climber: it sits on mean's climber row while the
  // board fills, then jumps to best's climber row the instant the update begins
  // — so the winning slot lights up as the new data flaps into it.
  const targetState = frame < UPDATE_START ? 0 : 1;
  const amberRow = climberRow(states[targetState] ?? s0);

  const headerFade = clamp01((frame - FILL_START) / 14);
  const labelsFade = clamp01((frame - (FILL_START + 6)) / 16);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        display: "flex",
        backgroundColor: "#0c0a08",
      }}
    >
      <Backdrop width={width} height={height} />

      {/* Scaled 1080×900 design surface, centred in the bounds. */}
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
        <Housing />

        {/* Amber spotlight behind the climber row. */}
        {amberRow >= 0 ? (
          <div
            style={{
              position: "absolute",
              left: CONTENT_LEFT - 14,
              top: rowY(amberRow) - 10,
              width: ROW_INNER_W + 28,
              height: TH + 20,
              borderRadius: 12,
              backgroundImage: `radial-gradient(ellipse 70% 120% at 50% 50%, rgba(${AMBER_RGB},0.16) 0%, rgba(${AMBER_RGB},0) 72%)`,
              display: "flex",
            }}
          />
        ) : null}

        <Header title={title} states={states} frame={frame} fade={headerFade} />
        <ColumnLabels
          valueLabel={valueLabel}
          shareLabel={shareLabel}
          fade={labelsFade}
        />

        {/* The grid. */}
        {Array.from({ length: ROWS }).map((_, r) =>
          COLUMNS.map((col) => {
            const c0 = fieldChar(s0, r, col.key, col.ci);
            const c1 = fieldChar(s1, r, col.key, col.ci);
            const display = tileDisplay(
              frame,
              r + col.across,
              idxOf(c0),
              idxOf(c1),
            );
            const accent = r === amberRow ? AMBER : IVORY;
            return (
              <FlapCell
                key={`c-${r}-${col.key}-${col.ci}`}
                x={CONTENT_LEFT + col.x}
                y={rowY(r)}
                display={display}
                accent={accent}
                tw={TW}
                th={TH}
                fontSize={TILE_FONT}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Backdrop: deep warm dark with a soft overhead glow and a seating vignette.
// ---------------------------------------------------------------------------
function Backdrop({ width, height }: { width: number; height: number }) {
  const fill = (image: string) => (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        backgroundImage: image,
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
      {fill(
        `radial-gradient(ellipse 120% 90% at 50% -8%, #181310 0%, #100c09 46%, #090706 100%)`,
      )}
      {fill(
        `radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,196,120,0.05) 0%, rgba(255,196,120,0) 70%)`,
      )}
      {fill(
        `radial-gradient(ellipse 96% 90% at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.66) 100%)`,
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Housing: the brushed-charcoal cabinet the tiles sit in, with corner screws.
// ---------------------------------------------------------------------------
function Housing() {
  const screw = (left: number, top: number) => (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: 11,
        height: 11,
        borderRadius: 999,
        backgroundImage:
          "radial-gradient(ellipse 120% 120% at 35% 30%, #4a443a 0%, #221e18 70%, #15110c 100%)",
        boxShadow:
          "inset 0 1px 1px rgba(255,235,200,0.25), 0 1px 2px rgba(0,0,0,0.6)",
        display: "flex",
      }}
    />
  );
  return (
    <div
      style={{
        position: "absolute",
        left: HOUSING_LEFT,
        top: HOUSING_TOP,
        width: HOUSING_W,
        height: HOUSING_H,
        borderRadius: 18,
        backgroundImage: "linear-gradient(180deg, #211d18 0%, #17130f 100%)",
        border: "1px solid #2d2720",
        boxShadow:
          "0 44px 100px rgba(0,0,0,0.7), inset 0 2px 0 rgba(255,236,200,0.06), inset 0 -4px 10px rgba(0,0,0,0.6)",
        display: "flex",
      }}
    >
      {/* Inner recessed well the tiles drop into. */}
      <div
        style={{
          position: "absolute",
          left: PAD_X - 14,
          top: PAD_TOP + HEADER_H + 4,
          width: HOUSING_W - (PAD_X - 14) * 2,
          height: HOUSING_H - (PAD_TOP + HEADER_H + 4) - (PAD_TOP - 8),
          borderRadius: 10,
          backgroundColor: "rgba(0,0,0,0.32)",
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.7)",
          display: "flex",
        }}
      />
      {screw(16, 16)}
      {screw(HOUSING_W - 27, 16)}
      {screw(16, HOUSING_H - 27)}
      {screw(HOUSING_W - 27, HOUSING_H - 27)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header: engraved plaque title with a live LED, and the metric flap module.
// ---------------------------------------------------------------------------
function Header({
  title,
  states,
  frame,
  fade,
}: {
  title: string;
  states: FlapState[];
  frame: number;
  fade: number;
}) {
  const mw = metricWidth(states);
  const moduleW = mw * MTW + (mw - 1) * MCELL_GAP;
  const metricLeft = CONTENT_LEFT + ROW_INNER_W - moduleW;
  const metricTop = HEADER_TOP + (HEADER_H - MTH) / 2 + 6;

  return (
    <div style={{ display: "flex", opacity: fade }}>
      {/* Title plaque. */}
      <div
        style={{
          position: "absolute",
          left: CONTENT_LEFT,
          top: HEADER_TOP,
          width: ROW_INNER_W,
          height: HEADER_H,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 13,
            height: 13,
            borderRadius: 999,
            backgroundColor: `rgb(${AMBER_RGB})`,
            boxShadow: `0 0 13px rgba(${AMBER_RGB},0.9)`,
            marginRight: 18,
            display: "flex",
          }}
        />
        <div
          style={{
            fontFamily: FLAP_FONTS.mono,
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#e9dec6",
            textShadow:
              "0 1px 0 rgba(0,0,0,0.7), 0 0 18px rgba(255,200,120,0.12)",
            display: "flex",
          }}
        >
          {title}
        </div>
      </div>

      {/* "SCORING" caption over the metric module. */}
      <div
        style={{
          position: "absolute",
          left: metricLeft,
          top: metricTop - 17,
          width: moduleW,
          display: "flex",
          justifyContent: "flex-end",
          fontFamily: FLAP_FONTS.mono,
          fontWeight: 400,
          fontSize: 12,
          letterSpacing: 3,
          color: "#7d7058",
        }}
      >
        SCORING
      </div>

      {/* Metric flap module. */}
      {Array.from({ length: mw }).map((_, ci) => {
        const c0 = metricChar(states, 0, ci);
        const c1 = metricChar(states, states.length > 1 ? 1 : 0, ci);
        const display =
          frame < UPDATE_START
            ? spinDisplay(frame, FILL_START + ci * FILL_DIAG_STAGGER, idxOf(c0))
            : deltaDisplay(
                frame,
                UPDATE_START + ci * UPDATE_DIAG_STAGGER,
                idxOf(c0),
                idxOf(c1),
              );
        return (
          <FlapCell
            key={`m-${ci}`}
            x={metricLeft + ci * (MTW + MCELL_GAP)}
            y={metricTop}
            display={display}
            accent={IVORY}
            tw={MTW}
            th={MTH}
            fontSize={MTILE_FONT}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column labels — small engraved caps over each field.
// ---------------------------------------------------------------------------
function ColumnLabels({
  valueLabel,
  shareLabel,
  fade,
}: {
  valueLabel: string;
  shareLabel: string;
  fade: number;
}) {
  const base: CSSProperties = {
    position: "absolute",
    top: LABELS_TOP,
    height: COLLAB_H,
    display: "flex",
    alignItems: "flex-end",
    fontFamily: FLAP_FONTS.mono,
    fontWeight: 400,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#8a7c61",
  };
  const label = (
    key: FieldKey,
    text: string,
    align: "flex-start" | "flex-end" | "center",
  ) => {
    const f = FIELD_X[key];
    return (
      <div
        style={{
          ...base,
          left: CONTENT_LEFT + f.x,
          width: f.w,
          justifyContent: align,
        }}
      >
        {text}
      </div>
    );
  };
  return (
    <div style={{ display: "flex", opacity: fade }}>
      {label("rank", "#", "center")}
      {label("model", "Model", "flex-start")}
      {label("value", valueLabel, "flex-end")}
      {label("pct", shareLabel, "flex-end")}
    </div>
  );
}
