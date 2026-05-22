import { z } from "zod";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { loadFonts, antonRegular } from "~/fonts";
import { MemeCaption } from "~/meme-caption";
import { computeMemeTopBottomLayout } from "~/meme-top-bottom-layout";
import { BlurredBackground } from "~/meme-blurred-background";

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  topText: z.string().optional(),
  bottomText: z.string().optional(),
  fontSize: z.number().int().min(1).optional(),
});

export type MemeTopBottomProps = z.infer<typeof propsSchema>;

export const previewProps: MemeTopBottomProps = {
  imageUrl: "https://static.effing.dev/picsum/1080/1920/plants.jpg",
  topText: "They photosynthesize",
  bottomText: "I render videos in TypeScript",
};

export async function runner({
  props: { imageUrl, topText = "", bottomText = "", fontSize },
  bounds: { width, height },
}: RunnerArgs<MemeTopBottomProps>): ImageRunnerReturn {
  const fonts = await loadFonts([antonRegular]);
  const {
    imageTop,
    imageRenderHeight,
    padding,
    fontSize: resolvedFontSize,
    topOffsetY,
    bottomOffsetY,
  } = await computeMemeTopBottomLayout({
    width,
    height,
    imageUrl,
    topText,
    bottomText,
    font: fonts[0],
    fontSize,
  });

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <div
      style={{
        width,
        height,
        display: "flex",
      }}
    >
      <BlurredBackground imageUrl={imageUrl} width={width} height={height} />
      <img
        src={imageUrl}
        width={width}
        height={imageRenderHeight}
        style={{
          position: "absolute",
          top: imageTop,
          left: 0,
          width,
          height: imageRenderHeight,
          objectFit: "cover",
        }}
      />
      {topText ? (
        <div
          style={{
            position: "absolute",
            top: topOffsetY,
            left: 0,
            right: 0,
            display: "flex",
            paddingLeft: padding,
            paddingRight: padding,
          }}
        >
          <MemeCaption
            text={topText.toUpperCase()}
            fontSize={resolvedFontSize}
          />
        </div>
      ) : null}
      {bottomText ? (
        <div
          style={{
            position: "absolute",
            bottom: bottomOffsetY,
            left: 0,
            right: 0,
            display: "flex",
            paddingLeft: padding,
            paddingRight: padding,
          }}
        >
          <MemeCaption
            text={bottomText.toUpperCase()}
            fontSize={resolvedFontSize}
          />
        </div>
      ) : null}
    </div>,
    { fonts },
  );

  return canvas.encode("jpeg");
}
