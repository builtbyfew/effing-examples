import { z } from "zod";
import { tween } from "@effing/tween";
import { createCanvas, registerFont } from "@effing/canvas";
import { trimPosterFat, loadFonts } from "~/fonts";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import {
  slideSchema,
  findActiveSlide,
  drawTextSlide,
  type Slide,
} from "./_accent-job-ad-draw";

const ORANGE = "#E84610";
const WHITE = "#FFFFFF";

export const DEFAULT_WORDS_SLIDES: Slide[] = [
  {
    type: "text",
    time: 0.03,
    duration: 0.52,
    text: "is",
    layout: "straight",
    scale: 0.25,
    font: "trim",
    theme: "a",
  },
  {
    type: "text",
    time: 0.55,
    duration: 0.6,
    text: "looking",
    layout: "straight",
    scale: 0.7,
    font: "trim",
    theme: "a",
  },
  {
    type: "text",
    time: 1.15,
    duration: 0.7,
    text: "for",
    layout: "straight",
    scale: 0.45,
    font: "trim",
    theme: "a",
  },
  {
    type: "text",
    time: 1.85,
    duration: 0.7,
    text: "a",
    layout: "straight",
    scale: 0.25,
    font: "trim",
    theme: "a",
  },
];

export const propsSchema = z.object({
  duration: z.number().positive().optional(),
  fps: z.number().int().min(1).optional(),
  colorA: z.string().optional(),
  colorB: z.string().optional(),
  slides: z.array(slideSchema).optional(),
});

export type AccentJobAdWordsProps = z.infer<typeof propsSchema>;

export const previewProps: AccentJobAdWordsProps = {
  duration: 2.5333,
  fps: 30,
  colorA: ORANGE,
  colorB: WHITE,
};

export async function* runner({
  props: {
    duration = 2.5333,
    fps = 30,
    colorA = ORANGE,
    colorB = WHITE,
    slides = DEFAULT_WORDS_SLIDES,
  },
  bounds: { width, height },
}: RunnerArgs<AccentJobAdWordsProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([trimPosterFat]);
  fonts.forEach(registerFont);

  const totalFrames = Math.max(1, Math.round(duration * fps));

  yield* tween(totalFrames, async ({ lower: t }) => {
    const seconds = t * duration;
    const slide = findActiveSlide(slides, seconds);
    const theme =
      slide?.type === "text" && slide.theme === "b"
        ? { bg: colorB, fg: colorA }
        : { bg: colorA, fg: colorB };

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    if (slide?.type === "text") {
      drawTextSlide(ctx, slide, seconds, theme.fg, width, height);
    }

    return canvas.encode("jpeg");
  });
}
