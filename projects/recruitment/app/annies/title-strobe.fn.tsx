import { z } from "zod";
import {
  createCanvas,
  findLargestUsableFontSize,
  registerFont,
  renderReactElement,
} from "@effing/canvas";
import type { AnnieRunnerReturn, RunnerArgs } from "@effing/fn";
import { tween } from "@effing/tween";
import { loadFonts, spaceGroteskBold } from "~/fonts";
import { fontFamily, palette } from "~/theme";
import { drawCurvedLine, measureCurvedLine } from "~/components/curved-text";

// The job-title reveal as a beat-locked strobe, like the classic kinetic
// job ads: a 16th-note flicker collage between the last punch word and the
// title in both colourways, easing into an 8th-note colour strobe, then an
// inverted flash on every remaining beat. The segment is expected to start
// on a beat; `beat` is the beat duration as a fraction of the clip. The
// annie paints its own background since the strobe owns the whole frame.

export const propsSchema = z.object({
  lines: z.array(z.string().min(1)).min(1).max(4),
  frameCount: z.number().int().min(1),
  // The word the strobe flashes back to (typically the punch word the
  // previous segment ended on). Omit for a colour-only strobe.
  strobeWord: z.string().min(1).optional(),
  // Beat duration as a fraction of the clip.
  beat: z.number().min(0.02).max(1).optional(),
});

export type TitleStrobeProps = z.infer<typeof propsSchema>;

export const previewProps: TitleStrobeProps = {
  lines: ["Senior", "Frontend", "Developer"],
  frameCount: 66,
  strobeWord: "stellar",
  beat: 0.2,
};

type StrobeState = "word" | "title-yellow" | "title-ember";

// One row per beat, one entry per 16th note. Rows past the end repeat the
// last row — an inverted flash on the beat, holding yellow in between.
const PATTERN: StrobeState[][] = [
  ["word", "title-yellow", "word", "title-ember"],
  ["word", "title-yellow", "title-ember", "title-yellow"],
  ["title-ember", "title-yellow", "title-ember", "title-yellow"],
  ["title-ember", "title-yellow", "title-yellow", "title-yellow"],
];

export async function* runner({
  props: { lines, frameCount, strobeWord, beat = 0.2 },
  bounds: { width, height },
}: RunnerArgs<TitleStrobeProps>): AnnieRunnerReturn {
  const [font] = await loadFonts([spaceGroteskBold]);
  registerFont(font);
  const fonts = [font];

  // One size for every line: the longest line dictates it.
  const fontSize = Math.min(
    ...lines.map((line) =>
      findLargestUsableFontSize({
        text: line.toUpperCase(),
        font,
        maxWidth: width * 0.84,
        maxHeight: (height * 0.6) / lines.length,
        maxFontSize: Math.round(width * 0.18),
      }),
    ),
  );

  // The strobe word matches the word-punch annie exactly (same fit, same
  // smile arc) so the flicker reads as the previous frame burnt in.
  const wordFontSize = strobeWord
    ? findLargestUsableFontSize({
        text: strobeWord,
        font,
        maxWidth: width * 0.88,
        maxHeight: height * 0.42,
        maxFontSize: Math.round(width * 0.34),
      })
    : 0;
  const measureCanvas = createCanvas(8, 8);
  const measureCtx = measureCanvas.getContext("2d");
  const wordFontStyle = `700 ${wordFontSize}px "Space Grotesk"`;
  measureCtx.font = wordFontStyle;
  const wordLine = strobeWord
    ? measureCurvedLine(measureCtx, strobeWord)
    : undefined;

  const renderTitle = async (
    background: string,
    color: string,
    scale: number,
  ) => {
    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: background,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontFamily: fontFamily.display,
            fontWeight: 700,
            fontSize,
            lineHeight: 1.06,
            textTransform: "uppercase",
            color,
            transform: `scale(${Math.max(0, scale).toFixed(3)})`,
          }}
        >
          {lines.map((line, i) => (
            <div key={i} style={{ display: "flex" }}>
              {line}
            </div>
          ))}
        </div>
      </div>,
      { fonts },
    );
    return canvas.encode("png");
  };

  yield* tween(frameCount, async ({ lower: t }) => {
    const sixteenth = beat / 4;
    const beatIndex = Math.floor(t / beat);
    const slot = Math.min(3, Math.floor((t - beatIndex * beat) / sixteenth));
    const row = PATTERN[Math.min(beatIndex, PATTERN.length - 1)];
    let state = row[slot];
    if (state === "word" && wordLine === undefined) state = "title-ember";

    // The flicker alternates a hair of scale per 16th so it vibrates, and
    // the title grows imperceptibly across the section.
    const globalSlot = Math.floor(t / sixteenth);
    const jitter = globalSlot % 2 === 0 ? 1 : 1.035;
    const grow = 1 + 0.04 * t;

    if (state === "word" && wordLine !== undefined) {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = palette.ember;
      ctx.fillRect(0, 0, width, height);
      ctx.font = wordFontStyle;
      ctx.fillStyle = palette.spark;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(jitter, jitter);
      drawCurvedLine(ctx, wordLine, 0, wordFontSize * 0.34, {
        // Same width-clamped amplitudes as word-punch, so the flicker
        // reads as the previous frame burnt in.
        arch: Math.min(wordFontSize * 0.1, wordLine.width * 0.05),
        waveAmp: Math.min(wordFontSize * 0.025, wordLine.width * 0.015),
        waveCycles: 1,
        wavePhase: t * Math.PI * 3,
      });
      ctx.restore();
      return canvas.encode("png");
    }
    return state === "title-yellow"
      ? renderTitle(palette.spark, palette.ember, jitter * grow)
      : renderTitle(palette.ember, palette.spark, jitter * grow);
  });
}
