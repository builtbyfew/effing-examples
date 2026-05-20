import { z } from "zod";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { loadFonts, robotoBold } from "~/fonts";

const IMAGE_URL = "https://static.effing.dev/meme/Drake-Hotline-Bling.jpg";
const IMAGE_ASPECT = 1; // 1200x1200, two 1200x600 panels stacked

export const propsSchema = z.object({
  rejectLabel: z.string().optional(),
  approveLabel: z.string().optional(),
  fontSize: z.number().int().min(1).optional(),
});

export type MemeDrakeHotlineBlingProps = z.infer<typeof propsSchema>;

export const previewProps: MemeDrakeHotlineBlingProps = {
  rejectLabel: "Reading the FFmpeg manual",
  approveLabel: "Reading the Effing manual",
};

export async function runner({
  props: { rejectLabel = "", approveLabel = "", fontSize },
  bounds: { width, height },
}: RunnerArgs<MemeDrakeHotlineBlingProps>): ImageRunnerReturn {
  const fonts = await loadFonts([robotoBold]);

  const resolvedFontSize = fontSize ?? Math.round(width / 24);
  const sidePadding = Math.round(resolvedFontSize * 0.7);

  // The template is square. Cover-crop for square/wider canvases (Drake stays
  // visible, captions drift slightly off-edge — acceptable). Fit-width and
  // letterbox top/bottom for portrait. Either way, the right half of each
  // panel of the *image* (not the canvas) is where captions belong.
  const useCover = width >= height;
  const imageRenderHeight = useCover
    ? height
    : Math.round(width / IMAGE_ASPECT);
  const imageTop = useCover ? 0 : Math.floor((height - imageRenderHeight) / 2);
  const panelHeight = imageRenderHeight / 2;

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
      {rejectLabel ? (
        <DrakeLabel
          text={rejectLabel}
          top={imageTop}
          height={panelHeight}
          canvasWidth={width}
          sidePadding={sidePadding}
          fontSize={resolvedFontSize}
        />
      ) : null}
      {approveLabel ? (
        <DrakeLabel
          text={approveLabel}
          top={imageTop + panelHeight}
          height={panelHeight}
          canvasWidth={width}
          sidePadding={sidePadding}
          fontSize={resolvedFontSize}
        />
      ) : null}
    </div>,
    { fonts },
  );

  return canvas.encode("jpeg");
}

function DrakeLabel({
  text,
  top,
  height,
  canvasWidth,
  sidePadding,
  fontSize,
}: {
  text: string;
  top: number;
  height: number;
  canvasWidth: number;
  sidePadding: number;
  fontSize: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: canvasWidth / 2,
        width: canvasWidth / 2,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: sidePadding,
        paddingRight: sidePadding,
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Roboto",
          fontWeight: 700,
          fontSize,
          color: "#000000",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {text}
      </div>
    </div>
  );
}
