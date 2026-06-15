import { z } from "zod";
import {
  createCanvas,
  findLargestUsableFontSize,
  registerFont,
} from "@effing/canvas";
import type { AnnieRunnerReturn, RunnerArgs } from "@effing/fn";
import { tween, easeOutQuint } from "@effing/tween";
import { loadFonts, spaceGroteskBold } from "~/fonts";
import { palette } from "~/theme";
import { drawCurvedLine, measureCurvedLine } from "~/components/curved-text";

// Rapid-fire kinetic type: one word at a time fills the frame ("is" /
// "looking" / "for" / "a" / "stellar"), each punching in slightly oversized
// and settling with a small tilt. Every word sits on a gentle per-letter
// arc — alternating smile/frown — with a slow ripple so the hold stays
// alive. Accented words render in the brand yellow.

export const propsSchema = z.object({
  words: z
    .array(
      z.object({
        text: z.string().min(1),
        accent: z.boolean().optional(),
      }),
    )
    .min(1),
  frameCount: z.number().int().min(1),
});

export type WordPunchProps = z.infer<typeof propsSchema>;

export const previewProps: WordPunchProps = {
  words: [
    { text: "is" },
    { text: "looking" },
    { text: "for" },
    { text: "a" },
    { text: "stellar", accent: true },
  ],
  frameCount: 72,
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export async function* runner({
  props: { words, frameCount },
  bounds: { width, height },
}: RunnerArgs<WordPunchProps>): AnnieRunnerReturn {
  const [font] = await loadFonts([spaceGroteskBold]);
  registerFont(font);

  // Short words still punch big, long words still fit — size each word to
  // the frame with a generous cap, and measure its glyphs once.
  const measureCanvas = createCanvas(8, 8);
  const measureCtx = measureCanvas.getContext("2d");
  const sized = words.map((word) => {
    const fontSize = findLargestUsableFontSize({
      text: word.text,
      font,
      maxWidth: width * 0.88,
      maxHeight: height * 0.42,
      maxFontSize: Math.round(width * 0.34),
    });
    const fontStyle = `700 ${fontSize}px "Space Grotesk"`;
    measureCtx.font = fontStyle;
    return {
      ...word,
      fontSize,
      fontStyle,
      line: measureCurvedLine(measureCtx, word.text),
    };
  });

  yield* tween(frameCount, async ({ lower: t }) => {
    // Which word owns this frame, and how far into its slice we are.
    const slice = 1 / words.length;
    const index = Math.min(words.length - 1, Math.floor(t / slice));
    const local = (t - index * slice) / slice;
    const word = sized[index];

    // Punch: oversized and snapping down to rest, with a tiny settling tilt.
    const settle = easeOutQuint(clamp01(local / 0.45));
    const scale = 1.22 - 0.22 * settle;
    const tilt = (index % 2 === 0 ? 1 : -1) * 2.4 * (1 - settle);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.font = word.fontStyle;
    ctx.fillStyle = word.accent ? palette.spark : palette.cream;

    // Whole-word punch transform around the frame centre; the per-letter
    // arc rides inside it.
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.rotate((tilt * Math.PI) / 180);
    // Amplitudes clamp against the measured width so short words at huge
    // sizes don't get steep slopes that tilt their few glyphs into each
    // other.
    drawCurvedLine(ctx, word.line, 0, word.fontSize * 0.34, {
      // Alternate smile/frown arcs word to word, like the reference ad.
      arch:
        Math.min(word.fontSize * 0.1, word.line.width * 0.05) *
        (index % 2 === 0 ? 1 : -1),
      waveAmp: Math.min(word.fontSize * 0.025, word.line.width * 0.015),
      waveCycles: 1,
      wavePhase: t * Math.PI * 3,
    });
    ctx.restore();

    return canvas.encode("png");
  });
}
