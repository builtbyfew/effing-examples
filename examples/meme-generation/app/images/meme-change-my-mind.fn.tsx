import { z } from "zod";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { createCanvas, loadImage } from "@effing/canvas";
import { loadFonts, robotoBold } from "~/fonts";
import {
  IMAGE_URL,
  computePosterLayout,
  paintPosterText,
  renderPosterTextCanvas,
} from "~/meme-poster";

export const propsSchema = z.object({
  text: z.string().optional(),
  fontSize: z.number().int().min(1).optional(),
});

export type MemeChangeMyMindProps = z.infer<typeof propsSchema>;

export const previewProps: MemeChangeMyMindProps = {
  text: "JSX is a fine effing language",
};

export async function runner({
  props: { text = "", fontSize },
  bounds: { width, height },
}: RunnerArgs<MemeChangeMyMindProps>): ImageRunnerReturn {
  const imagePromise = loadImage(IMAGE_URL);
  const layout = computePosterLayout({ width, height });
  const { imageLeft, imageTop, imageRenderWidth, imageRenderHeight } = layout;

  const textCanvasPromise = text
    ? (async () => {
        const fonts = await loadFonts([robotoBold]);
        return renderPosterTextCanvas({
          text,
          fontSize,
          font: fonts[0],
          fonts,
          flatWidth: layout.flatWidth,
          flatHeight: layout.flatHeight,
        });
      })()
    : null;

  const [image, textCanvas] = await Promise.all([imagePromise, textCanvasPromise]);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, imageLeft, imageTop, imageRenderWidth, imageRenderHeight);
  if (textCanvas) {
    paintPosterText(ctx, textCanvas, layout, layout.flatWidth, layout.flatHeight);
  }

  return canvas.encode("jpeg");
}
