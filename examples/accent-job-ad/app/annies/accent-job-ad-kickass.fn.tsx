import { z } from "zod";
import { tween } from "@effing/tween";
import { createCanvas, registerFont } from "@effing/canvas";
import { attilaSansSharpBold, trimPosterFat, loadFonts } from "~/fonts";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import {
  slideSchema,
  findActiveSlide,
  drawTextSlide,
  type Slide,
} from "./_accent-job-ad-draw";

const ORANGE = "#E84610";
const WHITE = "#FFFFFF";

export const DEFAULT_KICKASS_SLIDES: Slide[] = [
  {
    type: "text",
    time: 0,
    duration: 0.3333,
    text: "kick-ass",
    layout: "curve-down",
    curveAmount: 0.32,
    scale: 0.5,
    font: "trim",
    theme: "a",
    drift: 0,
  },
];

export const propsSchema = z.object({
  duration: z.number().positive().optional(),
  fps: z.number().int().min(1).optional(),
  colorA: z.string().optional(),
  colorB: z.string().optional(),
  slides: z.array(slideSchema).optional(),
});

export type AccentJobAdKickassProps = z.infer<typeof propsSchema>;

export const previewProps: AccentJobAdKickassProps = {
  duration: 0.3333,
  fps: 30,
  colorA: ORANGE,
  colorB: WHITE,
};

export async function* runner({
  props: {
    duration = 0.3333,
    fps = 30,
    colorA = ORANGE,
    colorB = WHITE,
    slides = DEFAULT_KICKASS_SLIDES,
  },
  bounds: { width, height },
}: RunnerArgs<AccentJobAdKickassProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([trimPosterFat, attilaSansSharpBold]);
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
