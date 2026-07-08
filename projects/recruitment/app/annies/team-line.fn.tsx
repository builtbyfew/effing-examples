import { z } from "zod";
import { createCanvas, registerFont } from "@effing/canvas";
import type { AnnieRunnerReturn, RunnerArgs } from "@effing/fn";
import { tween, easeOutBack } from "@effing/tween";
import { baloo2ExtraBold, loadFonts } from "~/fonts";
import { palette } from "~/theme";
import {
  drawCurvedLine,
  measureCurvedLine,
  wrapWords,
} from "~/components/curved-text";

// The playful opening line of the job ad ("An ambitious product team"…):
// rounded extra-bold words pop in one after another along an arched
// baseline, every letter rotated to follow the curve, and the whole line
// keeps riding a travelling wave — classic kinetic-typography grooving.

export const propsSchema = z.object({
  text: z.string().min(1),
  frameCount: z.number().int().min(1),
  // Fraction of the clip between word pops — pass half a beat to put the
  // pops on the eighth-note grid (the segment starts on a beat).
  wordStagger: z.number().min(0.01).max(1).optional(),
});

export type TeamLineProps = z.infer<typeof propsSchema>;

export const previewProps: TeamLineProps = {
  text: "An ambitious product team",
  frameCount: 66,
  wordStagger: 0.1,
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export async function* runner({
  props: { text, frameCount, wordStagger },
  bounds: { width, height },
}: RunnerArgs<TeamLineProps>): AnnieRunnerReturn {
  const [fontData] = await loadFonts([baloo2ExtraBold]);
  registerFont(fontData);
  const u = Math.min(width, height);

  const fontSize = Math.round(u * 0.105);
  const font = `800 ${fontSize}px "Baloo 2"`;
  const lineHeight = fontSize * 1.3;

  // Wrap and measure once — only the curve phase changes per frame.
  const measureCanvas = createCanvas(8, 8);
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  const lineTexts = wrapWords(measureCtx, words, width * 0.84);
  let wordOffset = 0;
  const lines = lineTexts.map((lineText) => {
    const line = measureCurvedLine(measureCtx, lineText, wordOffset);
    wordOffset += lineText.split(" ").length;
    return line;
  });

  // Without an explicit (beat-derived) stagger, all words are on screen by
  // 60% of the clip; the wave never stops either way.
  const stagger = wordStagger ?? 0.45 / Math.max(1, words.length - 1);
  const blockTop =
    height / 2 - (lines.length * lineHeight) / 2 + fontSize * 0.78;

  yield* tween(frameCount, async ({ lower: t }) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    ctx.fillStyle = palette.cream;

    lines.forEach((line, lineIndex) => {
      drawCurvedLine(
        ctx,
        line,
        width / 2,
        blockTop + lineIndex * lineHeight,
        {
          arch: fontSize * 0.22,
          waveAmp: fontSize * 0.13,
          waveCycles: 1.1,
          // Successive lines lag the wave a little, like a flag rippling.
          wavePhase: t * Math.PI * 3.2 + lineIndex * 0.9,
        },
        (wordIndex) =>
          easeOutBack(clamp01((t - 0.02 - wordIndex * stagger) / 0.12)),
      );
    });

    return canvas.encode("png");
  });
}
