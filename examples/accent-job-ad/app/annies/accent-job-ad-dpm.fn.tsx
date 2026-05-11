import { z } from "zod";
import { tween } from "@effing/tween";
import { createCanvas, registerFont } from "@effing/canvas";
import { trimPosterFat, loadFonts } from "~/fonts";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";

const ORANGE = "#E84610";
const WHITE = "#FFFFFF";

// Times derived by sampling reference frames in the dpm typewriter section
// (frames 282-351). Local time = (refFrame - 282) / 30.
const SYLLABLES = [
  { time: 0.0, lines: ["DIGI"] },
  { time: 0.07, lines: ["DIGITAL"] },
  { time: 0.5, lines: ["DIGITAL", "PER"] },
  { time: 0.9, lines: ["DIGITAL", "PERFORMANCE"] },
  { time: 1.3, lines: ["DIGITAL", "PERFORMANCE", "MAR"] },
  { time: 1.7, lines: ["DIGITAL", "PERFORMANCE", "MARKE"] },
  { time: 1.93, lines: ["DIGITAL", "PERFORMANCE", "MARKETEER"] },
];

const syllableSchema = z.object({
  time: z.number().nonnegative(),
  lines: z.array(z.string()),
});

export const propsSchema = z.object({
  duration: z.number().positive().optional(),
  fps: z.number().int().min(1).optional(),
  colorA: z.string().optional(),
  colorB: z.string().optional(),
  syllables: z.array(syllableSchema).optional(),
  holdStart: z.number().nonnegative().optional(),
  holdEnd: z.number().nonnegative().optional(),
});

export type AccentJobAdDpmProps = z.infer<typeof propsSchema>;

export const previewProps: AccentJobAdDpmProps = {
  duration: 2.3333,
  fps: 30,
  colorA: ORANGE,
  colorB: WHITE,
};

export async function* runner({
  props: {
    duration = 2.3333,
    fps = 30,
    colorA = ORANGE,
    colorB = WHITE,
    syllables = SYLLABLES,
    holdStart = 0.0,
    holdEnd = 2.0,
  },
  bounds: { width, height },
}: RunnerArgs<AccentJobAdDpmProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([trimPosterFat]);
  fonts.forEach(registerFont);

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const fontFamily = "TrimPoster";
  const fullLines = ["DIGITAL", "PERFORMANCE", "MARKETEER"];

  const targetWidth = width * 0.88;
  const targetHeight = height * 0.72;
  const testSize = width * 0.36;
  const canvas0 = createCanvas(width, height);
  const ctx0 = canvas0.getContext("2d");
  ctx0.font = `700 ${testSize}px ${fontFamily}`;
  let longestWidth = 0;
  for (const line of fullLines) {
    const w = ctx0.measureText(line).width;
    if (w > longestWidth) longestWidth = w;
  }
  const widthFontSize = longestWidth > 0 ? testSize * (targetWidth / longestWidth) : testSize;
  const heightFontSize = targetHeight / fullLines.length;
  const fontSize = Math.min(widthFontSize, heightFontSize);
  const lineHeight = fontSize * 1.0;

  yield* tween(totalFrames, async ({ lower: t }) => {
    const seconds = t * duration;

    let currentLines: string[] = [];
    const typewriterEnd = syllables[syllables.length - 1]?.time ?? 0;
    const typewriterStart = holdStart;

    if (seconds < typewriterStart) {
      currentLines = [];
    } else if (seconds < typewriterEnd + 0.01) {
      const localT = seconds - typewriterStart;
      for (let i = syllables.length - 1; i >= 0; i--) {
        if (localT >= syllables[i].time) {
          currentLines = syllables[i].lines;
          break;
        }
      }
    } else {
      currentLines = fullLines;
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = colorA;
    ctx.fillRect(0, 0, width, height);

    if (currentLines.length > 0) {
      ctx.font = `700 ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = colorB;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      const totalH = lineHeight * fullLines.length;
      const startY = (height - totalH) / 2 + lineHeight / 2 - height * 0.04;
      const leftX = (width - targetWidth) / 2;

      for (let i = 0; i < currentLines.length; i++) {
        ctx.fillText(currentLines[i], leftX, startY + i * lineHeight);
      }
    }

    return canvas.encode("jpeg");
  });
}
