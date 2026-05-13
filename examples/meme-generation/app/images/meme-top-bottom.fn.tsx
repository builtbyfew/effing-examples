import { z } from "zod";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import {
  createCanvas,
  findLargestUsableFontSize,
  loadImage,
  renderReactElement,
} from "@effing/canvas";
import { loadFonts, antonRegular } from "~/fonts";
import { MemeCaption } from "~/meme-caption";

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
  const antonFont = fonts[0];

  // Fit-to-width with letterboxing preserves the whole image; fall back to
  // cover-crop when fitting to width would overflow the canvas vertically.
  // Captions hug the visible image edges either way.
  const image = await loadImage(imageUrl);
  const naturalAspect = image.width / image.height;
  const fitWidthHeight = Math.round(width / naturalAspect);
  const useFitWidth = fitWidthHeight <= height;
  const imageRenderHeight = useFitWidth ? fitWidthHeight : height;
  const imageTop = useFitWidth
    ? Math.floor((height - imageRenderHeight) / 2)
    : 0;
  const imageBottomBand = height - (imageTop + imageRenderHeight);

  // Auto-fit each caption to the largest size that still fits, then pick the
  // smaller so both render at a matching size. The cap keeps short labels
  // from blooming to billboard scale.
  const padding = Math.round(Math.min(width, height) * 0.035);
  const captionMaxWidth = width - 2 * padding;
  const captionMaxHeight = Math.max(40, Math.round(imageRenderHeight * 0.22));
  const fontSizeCap = Math.round(Math.min(width, height) / 10);
  const fitText = (text: string) =>
    findLargestUsableFontSize({
      text: text.toUpperCase(),
      font: antonFont,
      maxWidth: captionMaxWidth,
      maxHeight: captionMaxHeight,
      lineHeight: 1.05,
      maxFontSize: fontSizeCap,
    });
  const captions = [topText, bottomText].filter(Boolean);
  const resolvedFontSize =
    fontSize ??
    (captions.length > 0
      ? Math.min(...captions.map(fitText))
      : fontSizeCap);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <div
      style={{
        width,
        height,
        display: "flex",
        backgroundColor: "#000000",
      }}
    >
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
            top: imageTop + padding,
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
            bottom: imageBottomBand + padding,
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

