import {
  findLargestUsableFontSize,
  loadImage,
  type FontData,
} from "@effing/canvas";

export type MemeTopBottomLayout = {
  imageTop: number;
  imageRenderHeight: number;
  padding: number;
  fontSize: number;
  topOffsetY: number;
  bottomOffsetY: number;
};

// Letterbox the source image into the canvas (or cover-crop if its aspect is
// too tall to fit), then auto-fit each caption to the largest size that still
// clears the safe band, taking the smaller so top and bottom render at a
// matching size. The fontSize cap keeps very short labels from blooming.
export async function computeMemeTopBottomLayout({
  width,
  height,
  imageUrl,
  topText,
  bottomText,
  font,
  fontSize: forcedFontSize,
}: {
  width: number;
  height: number;
  imageUrl: string;
  topText: string;
  bottomText: string;
  font: FontData;
  fontSize?: number;
}): Promise<MemeTopBottomLayout> {
  const image = await loadImage(imageUrl);
  const naturalAspect = image.width / image.height;
  const fitWidthHeight = Math.round(width / naturalAspect);
  const useFitWidth = fitWidthHeight <= height;
  const imageRenderHeight = useFitWidth ? fitWidthHeight : height;
  const imageTop = useFitWidth
    ? Math.floor((height - imageRenderHeight) / 2)
    : 0;
  const imageBottomBand = height - (imageTop + imageRenderHeight);

  const padding = Math.round(Math.min(width, height) * 0.035);
  const captionMaxWidth = width - 2 * padding;
  const captionMaxHeight = Math.max(40, Math.round(imageRenderHeight * 0.22));
  const fontSizeCap = Math.round(Math.min(width, height) / 10);
  const fitText = (text: string) =>
    findLargestUsableFontSize({
      text: text.toUpperCase(),
      font,
      maxWidth: captionMaxWidth,
      maxHeight: captionMaxHeight,
      lineHeight: 1.05,
      maxFontSize: fontSizeCap,
    });
  const captions = [topText, bottomText].filter(Boolean);
  const fontSize =
    forcedFontSize ??
    (captions.length > 0
      ? Math.min(...captions.map(fitText))
      : fontSizeCap);

  return {
    imageTop,
    imageRenderHeight,
    padding,
    fontSize,
    topOffsetY: imageTop + padding,
    bottomOffsetY: imageBottomBand + padding,
  };
}
