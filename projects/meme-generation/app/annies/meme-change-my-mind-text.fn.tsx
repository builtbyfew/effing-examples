import { z } from "zod";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { createCanvas } from "@effing/canvas";
import { tween, easeOutBack } from "@effing/tween";
import { loadFonts, robotoBold } from "~/fonts";
import {
  computePosterLayout,
  paintPosterText,
  renderPosterTextCanvas,
  shrinkPosterCorners,
} from "~/meme-poster";

export const propsSchema = z.object({
  text: z.string(),
  fontSize: z.number().int().min(1).optional(),
  frameCount: z.number().int().min(1).optional(),
});

export type MemeChangeMyMindTextProps = z.infer<typeof propsSchema>;

export const previewProps: MemeChangeMyMindTextProps = {
  text: "JSX is a fine effing language",
  frameCount: 90,
};

export async function* runner({
  props: { text, fontSize, frameCount = 90 },
  bounds: { width, height },
}: RunnerArgs<MemeChangeMyMindTextProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([robotoBold]);

  const layout = computePosterLayout({ width, height });
  const textCanvas = await renderPosterTextCanvas({
    text,
    fontSize,
    font: fonts[0],
    fonts,
    flatWidth: layout.flatWidth,
    flatHeight: layout.flatHeight,
  });

  // `reveal` is easeOutBack-shaped: it briefly exceeds 1.0 around p≈0.7 and
  // settles back to 1.0 at p=1 — feeding it raw (no clamp) into popScale
  // lets the text overshoot and bounce back.
  const renderFrame = async (reveal: number): Promise<Buffer> => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (reveal > 0) {
      const popScale = 0.6 + 0.4 * reveal;
      const corners = shrinkPosterCorners(layout, popScale);
      ctx.globalAlpha = Math.min(1, reveal);
      paintPosterText(ctx, textCanvas, corners, layout.flatWidth, layout.flatHeight);
    }
    // PNG keeps the canvas transparent so the projected text composites over
    // the separate poster image layer.
    return canvas.encode("png");
  };

  const introHold = Math.max(2, Math.round(frameCount * 0.12));
  const reveal = Math.max(2, Math.round(frameCount * 0.28));
  const finalHold = Math.max(2, frameCount - introHold - reveal);

  const introFrame = await renderFrame(0);
  for (let i = 0; i < introHold; i++) yield introFrame;

  yield* tween(reveal, async ({ upper: p }) => renderFrame(easeOutBack(p)));

  const finalFrame = await renderFrame(1);
  for (let i = 0; i < finalHold; i++) yield finalFrame;
}
