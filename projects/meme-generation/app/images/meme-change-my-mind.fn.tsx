import { z } from "zod";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { loadFonts, robotoBold } from "~/fonts";
import {
  IMAGE_URL,
  computePosterLayout,
  paintPosterText,
  renderPosterTextCanvas,
} from "~/meme-poster";
import { BlurredBackground } from "~/meme-blurred-background";

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
  const layout = computePosterLayout({ width, height });
  const { imageLeft, imageTop, imageRenderWidth, imageRenderHeight } = layout;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

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
    : Promise.resolve(null);

  const renderPromise = renderReactElement(
    ctx,
    <div style={{ width, height, display: "flex" }}>
      <BlurredBackground imageUrl={IMAGE_URL} width={width} height={height} />
      <img
        src={IMAGE_URL}
        width={imageRenderWidth}
        height={imageRenderHeight}
        style={{
          position: "absolute",
          top: imageTop,
          left: imageLeft,
          width: imageRenderWidth,
          height: imageRenderHeight,
        }}
      />
    </div>,
    { fonts: [] },
  );

  const [, textCanvas] = await Promise.all([renderPromise, textCanvasPromise]);

  if (textCanvas) {
    paintPosterText(ctx, textCanvas, layout, layout.flatWidth, layout.flatHeight);
  }

  return canvas.encode("jpeg");
}
