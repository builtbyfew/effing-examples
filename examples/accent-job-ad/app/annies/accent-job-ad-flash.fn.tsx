import { z } from "zod";
import { tween } from "@effing/tween";
import { createCanvas, registerFont } from "@effing/canvas";
import { attilaSansSharpBold, trimPosterFat, loadFonts } from "~/fonts";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import {
  slideSchema,
  flashSlide,
  findActiveSlide,
  drawTextSlide,
  type Slide,
} from "./_accent-job-ad-draw";

const ORANGE = "#E84610";
const WHITE = "#FFFFFF";

// Exact reference timings derived from analyzing /tmp/ref-frames/story.
// First sequence alternates DPM-on-white and kick-ass-on-orange.
// After a long pause on kick-ass, the second sequence alternates DPM in both
// directions: DPM-orange-on-white and DPM-white-on-orange (no kick-ass).
const FLASH_TRANSITIONS: Array<[number, "dpm_b" | "kick" | "dpm_a"]> = [
  [0, "dpm_b"],
  [6, "kick"],
  [10, "dpm_b"],
  [14, "kick"],
  [18, "dpm_b"],
  [22, "kick"],
  [26, "dpm_b"],
  [30, "kick"],
  [34, "dpm_b"],
  [38, "kick"],
  [42, "dpm_b"],
  [46, "kick"],
  [50, "dpm_b"],
  [54, "kick"],
  [73, "dpm_b"],
  [77, "dpm_a"],
  [81, "dpm_b"],
  [85, "dpm_a"],
  [89, "dpm_b"],
  [93, "dpm_a"],
  [97, "dpm_b"],
  [101, "dpm_a"],
  [105, "dpm_b"],
  [109, "dpm_a"],
  [113, "dpm_b"],
  [117, "dpm_a"],
  [121, "dpm_b"],
];

const FPS = 30;

function buildFlashSlides(totalFrames: number): Slide[] {
  const slides: Slide[] = [];
  for (let i = 0; i < FLASH_TRANSITIONS.length; i++) {
    const [startFrame, kind] = FLASH_TRANSITIONS[i];
    const nextFrame =
      i + 1 < FLASH_TRANSITIONS.length
        ? FLASH_TRANSITIONS[i + 1][0]
        : totalFrames;
    // Shift slightly earlier than the frame boundary so the slide is active
    // when tween samples at frame N (which can come in slightly under N/fps
    // due to lower = N/totalFrames rounding when fps*duration isn't integer).
    const time = startFrame / FPS - 0.001;
    const duration = (nextFrame - startFrame) / FPS;
    if (kind === "dpm_b" || kind === "dpm_a") {
      slides.push({
        type: "text",
        time,
        duration,
        text: ["DIGITAL", "PERFORMANCE", "MARKETEER"],
        layout: "straight",
        scale: 1.0,
        font: "trim",
        theme: kind === "dpm_b" ? "b" : "a",
        letterSpacing: 0,
      });
    } else {
      slides.push({
        type: "text",
        time,
        duration,
        text: "kick-ass",
        layout: "curve-down",
        curveAmount: 0.32,
        scale: 0.5,
        font: "trim",
        theme: "a",
        letterSpacing: 0,
      });
    }
  }
  return slides;
}

export const DEFAULT_FLASH_SLIDES: Slide[] = buildFlashSlides(123);

export const propsSchema = z.object({
  duration: z.number().positive().optional(),
  fps: z.number().int().min(1).optional(),
  colorA: z.string().optional(),
  colorB: z.string().optional(),
  slides: z.array(slideSchema).optional(),
});

export type AccentJobAdFlashProps = z.infer<typeof propsSchema>;

export const previewProps: AccentJobAdFlashProps = {
  duration: 4.1,
  fps: 30,
  colorA: ORANGE,
  colorB: WHITE,
};

export async function* runner({
  props: {
    duration = 4.1,
    fps = 30,
    colorA = ORANGE,
    colorB = WHITE,
    slides = DEFAULT_FLASH_SLIDES,
  },
  bounds: { width, height },
}: RunnerArgs<AccentJobAdFlashProps>): AnnieRunnerReturn {
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
