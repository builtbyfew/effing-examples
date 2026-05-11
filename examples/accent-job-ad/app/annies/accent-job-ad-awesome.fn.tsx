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

export const DEFAULT_AWESOME_SLIDES: Slide[] = [
  {
    type: "text",
    time: 0.05,
    duration: 1.15,
    text: "Awesome",
    sizeText: ["Awesome", "marketing team"],
    layout: "curve-down",
    curveAmount: 0.32,
    scale: 0.72,
    font: "trim",
    theme: "a",
    slideIn: "left",
    slideDuration: 0.13,
    drift: 15,
  },
  {
    type: "text",
    time: 1.2,
    duration: 1.13,
    text: ["Awesome", "marketing team"],
    layout: "curve-down",
    curveAmount: 0.32,
    scale: 0.72,
    font: "trim",
    theme: "a",
    slideIn: "right",
    slideDuration: 0.10,
    stagger: "lines",
    staggerStep: 0,
    slideOut: "left",
    drift: [15, -15],
    driftStart: [17.25, 0],
    // Anchor line 0 ("Awesome") at canvas center so it doesn't shift up when
    // line 1 ("marketing team") joins it below; the reference keeps "Awesome"
    // in its slide-1 position throughout the transition.
    anchorLine: 0,
  },
];

export const propsSchema = z.object({
  duration: z.number().positive().optional(),
  fps: z.number().int().min(1).optional(),
  colorA: z.string().optional(),
  colorB: z.string().optional(),
  slides: z.array(slideSchema).optional(),
});

export type AccentJobAdAwesomeProps = z.infer<typeof propsSchema>;

export const previewProps: AccentJobAdAwesomeProps = {
  duration: 2.4,
  fps: 30,
  colorA: ORANGE,
  colorB: WHITE,
};

export async function* runner({
  props: {
    duration = 2.4,
    fps = 30,
    colorA = ORANGE,
    colorB = WHITE,
    slides = DEFAULT_AWESOME_SLIDES,
  },
  bounds: { width, height },
}: RunnerArgs<AccentJobAdAwesomeProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([trimPosterFat]);
  fonts.forEach(registerFont);

  const totalFrames = Math.max(1, Math.round(duration * fps));

  // computeFontSize sizes text based on canvas WIDTH, so a 0.72 scale produces
  // the same absolute text size in 1080×1080 (square) and 1080×1920 (story).
  // In 9:16 that text occupies a much smaller fraction of the canvas height
  // and reads as too small. Boost the scale in portrait so the text fills
  // the canvas with similar visual weight to the square crop.
  const isPortrait = height > width * 1.1;
  const portraitScaleBoost = isPortrait ? 1.6 : 1;

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
      const adjusted =
        portraitScaleBoost === 1
          ? slide
          : { ...slide, scale: (slide.scale ?? 0.7) * portraitScaleBoost };
      drawTextSlide(ctx, adjusted, seconds, theme.fg, width, height);
    }

    return canvas.encode("jpeg");
  });
}
