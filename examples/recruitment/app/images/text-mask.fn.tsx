import { z } from "zod";
import { createCanvas } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interBlack, loadFonts } from "~/fonts";
import { computeLayout, paintOrangeWithCutouts } from "~/cutout";

export const propsSchema = z.object({
  title: z.string(),
  cta: z.string().optional(),
  linesShown: z.number().int().nonnegative().optional(),
  orangeColor: z.string().optional(),
  underlayColor: z.string().optional(),
});

export type TextMaskProps = z.infer<typeof propsSchema>;

export const previewProps: TextMaskProps = {
  title: "Senior Full-Stack Engineer",
  cta: "APPLY NOW >>>",
  linesShown: 3,
  orangeColor: "#FF6B00",
};

export async function runner({
  props: {
    title,
    cta,
    linesShown,
    orangeColor = "#FF6B00",
    underlayColor,
  },
  bounds: { width, height },
}: RunnerArgs<TextMaskProps>): ImageRunnerReturn {
  const fontDatas = await loadFonts([interBlack]);
  const layout = computeLayout({
    text: title.toUpperCase(),
    footer: cta?.toUpperCase(),
    width,
    height,
    fontFamily: "Inter",
    fontDatas,
  });

  // Default: cut everything (cover-style still). Pass an explicit `linesShown`
  // to render an in-progress stage where only the first N items are cut.
  const cuts = linesShown ?? layout.items.length;

  if (underlayColor) {
    // Opaque output: composite the orange-with-cutouts over `underlayColor`
    // so the result is a self-contained still (cover thumbnail). Doing
    // destination-out directly on the main canvas would punch through to
    // whatever's behind it in the encoder; the offscreen overlay keeps the
    // alpha math local.
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = underlayColor;
    ctx.fillRect(0, 0, width, height);
    const overlay = createCanvas(width, height);
    paintOrangeWithCutouts({
      ctx: overlay.getContext("2d"),
      width,
      height,
      orangeColor,
      layout,
      linesShown: cuts,
    });
    ctx.drawImage(overlay, 0, 0);
    return canvas.encode("jpeg");
  }

  // Transparent PNG so the effie can layer this over a video background and
  // have the cutouts read through to the video.
  const canvas = createCanvas(width, height);
  paintOrangeWithCutouts({
    ctx: canvas.getContext("2d"),
    width,
    height,
    orangeColor,
    layout,
    linesShown: cuts,
  });
  return canvas.encode("png");
}
