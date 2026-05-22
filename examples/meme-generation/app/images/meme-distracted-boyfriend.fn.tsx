import { z } from "zod";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { loadFonts, antonRegular } from "~/fonts";
import { MemeCaption } from "~/meme-caption";
import { BlurredBackground } from "~/meme-blurred-background";

const IMAGE_URL = "https://static.effing.dev/meme/Distracted-Boyfriend.jpg";
const IMAGE_ASPECT = 1200 / 800;

export const propsSchema = z.object({
  otherWomanLabel: z.string().optional(),
  boyfriendLabel: z.string().optional(),
  girlfriendLabel: z.string().optional(),
  fontSize: z.number().int().min(1).optional(),
});

export type MemeDistractedBoyfriendProps = z.infer<typeof propsSchema>;

export const previewProps: MemeDistractedBoyfriendProps = {
  otherWomanLabel: "JSX on Effing Canvas",
  boyfriendLabel: "Me",
  girlfriendLabel: "Puppeteer",
};

export async function runner({
  props: {
    otherWomanLabel = "",
    boyfriendLabel = "",
    girlfriendLabel = "",
    fontSize,
  },
  bounds: { width, height },
}: RunnerArgs<MemeDistractedBoyfriendProps>): ImageRunnerReturn {
  const fonts = await loadFonts([antonRegular]);

  const resolvedFontSize = fontSize ?? Math.round(width / 28);
  const columnGap = Math.round(resolvedFontSize * 0.7);
  const edgePadding = Math.round(resolvedFontSize * 1.4);

  // Cover-crop for square/landscape (subjects stay centered, side crop is
  // safe) and letterbox for portrait (avoids cropping the subjects). The
  // labelTopGap below is chosen so labels clear TikTok's top-14% safe zone
  // when rendered at 9:16.
  const useCover = width >= height;
  const imageRenderHeight = useCover
    ? height
    : Math.round(width / IMAGE_ASPECT);
  const imageTop = useCover
    ? 0
    : Math.floor((height - imageRenderHeight) / 2);
  const labelTopGap = Math.round(resolvedFontSize * 2.2);

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
      <BlurredBackground imageUrl={IMAGE_URL} width={width} height={height} />
      <img
        src={IMAGE_URL}
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
      {otherWomanLabel || boyfriendLabel || girlfriendLabel ? (
        <div
          style={{
            position: "absolute",
            top: imageTop + labelTopGap,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "row",
            paddingLeft: edgePadding,
            paddingRight: edgePadding,
            gap: columnGap,
          }}
        >
          <MemeCaption
            text={otherWomanLabel.toUpperCase()}
            fontSize={resolvedFontSize}
            textAlign="left"
          />
          <MemeCaption
            text={boyfriendLabel.toUpperCase()}
            fontSize={resolvedFontSize}
          />
          <MemeCaption
            text={girlfriendLabel.toUpperCase()}
            fontSize={resolvedFontSize}
            textAlign="right"
          />
        </div>
      ) : null}
    </div>,
    { fonts },
  );

  return canvas.encode("jpeg");
}

