import type { SKRSContext2D } from "@effing/canvas";

// Per-letter curved typesetting, in the spirit of classic kinetic-typography
// job ads: a line of type rides a static arch plus a travelling wave, every
// glyph rotated to follow the local slope. Glyph positions come from real
// text measurement (cumulative substring widths, so kerning is respected)
// and drawing happens straight on the canvas — no flexbox involved.

export type CurvedGlyph = {
  char: string;
  /** Glyph centre, relative to the line's left edge. */
  x: number;
  /** Index of the word this glyph belongs to (for per-word entrances). */
  wordIndex: number;
};

export type MeasuredLine = {
  glyphs: CurvedGlyph[];
  width: number;
};

/**
 * Measure a line of text into glyph centres. `ctx.font` must be set to the
 * font the line will be drawn with. Word indices count across the whole
 * text (offset by `firstWordIndex`), so staggered entrances can run across
 * wrapped lines.
 */
export function measureCurvedLine(
  ctx: SKRSContext2D,
  text: string,
  firstWordIndex = 0,
): MeasuredLine {
  const glyphs: CurvedGlyph[] = [];
  let wordIndex = firstWordIndex;
  let prevWasSpace = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === " ") {
      prevWasSpace = true;
      continue;
    }
    if (prevWasSpace) {
      wordIndex++;
      prevWasSpace = false;
    }
    const before = ctx.measureText(text.slice(0, i)).width;
    const through = ctx.measureText(text.slice(0, i + 1)).width;
    glyphs.push({ char, x: (before + through) / 2, wordIndex });
  }
  return { glyphs, width: ctx.measureText(text).width };
}

/**
 * Greedy word-wrap against a pixel budget. `ctx.font` must be set.
 */
export function wrapWords(
  ctx: SKRSContext2D,
  words: string[],
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (current !== "" && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

export type CurvedLineStyle = {
  /** Static arch amplitude in px — positive dips the middle (a "smile"). */
  arch: number;
  /** Travelling-wave amplitude in px. */
  waveAmp: number;
  /** Wave cycles across the line. */
  waveCycles: number;
  /** Wave phase in radians — advance over time to make the wave travel. */
  wavePhase: number;
};

/**
 * Draw a measured line along its curve, centred on (centerX, baselineY).
 * `ctx.font` and `ctx.fillStyle` select the type; `wordScale` (indexed by
 * glyph wordIndex) drives per-word entrance pops — missing entries mean 1.
 */
export function drawCurvedLine(
  ctx: SKRSContext2D,
  line: MeasuredLine,
  centerX: number,
  baselineY: number,
  style: CurvedLineStyle,
  wordScale?: (wordIndex: number) => number,
) {
  const { arch, waveAmp, waveCycles, wavePhase } = style;
  const left = centerX - line.width / 2;
  const curveY = (u: number) =>
    arch * Math.sin(Math.PI * u) +
    waveAmp * Math.sin(Math.PI * 2 * waveCycles * u - wavePhase);
  // d(curveY)/du, converted to d/dx via the line width for the glyph tilt.
  const curveSlope = (u: number) =>
    (arch * Math.PI * Math.cos(Math.PI * u) +
      waveAmp * Math.PI * 2 * waveCycles *
        Math.cos(Math.PI * 2 * waveCycles * u - wavePhase)) /
    Math.max(1, line.width);

  const prevAlign = ctx.textAlign;
  const prevBaseline = ctx.textBaseline;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (const glyph of line.glyphs) {
    const scale = wordScale ? wordScale(glyph.wordIndex) : 1;
    if (scale <= 0) continue;
    const u = line.width > 0 ? glyph.x / line.width : 0.5;
    ctx.save();
    ctx.translate(left + glyph.x, baselineY + curveY(u));
    ctx.rotate(Math.atan(curveSlope(u)));
    ctx.scale(scale, scale);
    ctx.fillText(glyph.char, 0, 0);
    ctx.restore();
  }
  ctx.textAlign = prevAlign;
  ctx.textBaseline = prevBaseline;
}
