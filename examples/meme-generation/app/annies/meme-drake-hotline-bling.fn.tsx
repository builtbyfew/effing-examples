import { z } from "zod";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { tween, easeOutBack } from "@effing/tween";
import { loadFonts, robotoBold, type FontData } from "~/fonts";

const IMAGE_URL = "https://imgflip.com/s/meme/Drake-Hotline-Bling.jpg";
const IMAGE_ASPECT = 1; // 1200x1200, two 1200x600 panels stacked

export const propsSchema = z.object({
  rejectLabel: z.string(),
  approveLabel: z.string(),
  fontSize: z.number().int().min(1).optional(),
  frameCount: z.number().int().min(1).optional(),
});

export type MemeDrakeHotlineBlingAnnieProps = z.infer<typeof propsSchema>;

export const previewProps: MemeDrakeHotlineBlingAnnieProps = {
  rejectLabel: "Reading the FFmpeg manual",
  approveLabel: "Reading the Effing manual",
  frameCount: 90,
};

export async function* runner({
  props: { rejectLabel, approveLabel, fontSize, frameCount = 90 },
  bounds: { width, height },
}: RunnerArgs<MemeDrakeHotlineBlingAnnieProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([robotoBold]);

  const resolvedFontSize = fontSize ?? Math.round(width / 24);
  const sidePadding = Math.round(resolvedFontSize * 0.7);

  const useCover = width >= height;
  const imageRenderHeight = useCover
    ? height
    : Math.round(width / IMAGE_ASPECT);
  const imageTop = useCover ? 0 : Math.floor((height - imageRenderHeight) / 2);
  const panelHeight = imageRenderHeight / 2;

  // Captions live in the right half of each panel, so they slide in from
  // off-canvas right — half the canvas width is enough to start fully
  // outside the frame.
  const slideDistance = Math.round(width / 2);

  // Phase frame counts. Splits frameCount into intro hold → reject reveal →
  // beat → approve reveal → final hold.
  const introHold = Math.max(2, Math.round(frameCount * 0.1));
  const rejectReveal = Math.max(2, Math.round(frameCount * 0.2));
  const beat = Math.max(2, Math.round(frameCount * 0.2));
  const approveReveal = Math.max(2, Math.round(frameCount * 0.2));
  const finalHold = Math.max(
    2,
    frameCount - introHold - rejectReveal - beat - approveReveal,
  );

  const layout = {
    width,
    height,
    rejectLabel,
    approveLabel,
    fontSize: resolvedFontSize,
    sidePadding,
    imageRenderHeight,
    imageTop,
    panelHeight,
    slideDistance,
    fonts,
  };

  // Phase 1 — intro hold: image only.
  yield* tween(introHold, async () =>
    renderMemeFrame({ ...layout, reject: 0, approve: 0 }),
  );

  // Phase 2 — reject label slides in (the "no").
  yield* tween(rejectReveal, async ({ upper: p }) =>
    renderMemeFrame({ ...layout, reject: easeOutBack(p), approve: 0 }),
  );

  // Phase 3 — beat between reject and approve.
  yield* tween(beat, async () =>
    renderMemeFrame({ ...layout, reject: 1, approve: 0 }),
  );

  // Phase 4 — approve label slides in (the "yes").
  yield* tween(approveReveal, async ({ upper: p }) =>
    renderMemeFrame({ ...layout, reject: 1, approve: easeOutBack(p) }),
  );

  // Phase 5 — final hold with both visible.
  yield* tween(finalHold, async () =>
    renderMemeFrame({ ...layout, reject: 1, approve: 1 }),
  );
}

type FrameLayout = {
  width: number;
  height: number;
  rejectLabel: string;
  approveLabel: string;
  fontSize: number;
  sidePadding: number;
  imageRenderHeight: number;
  imageTop: number;
  panelHeight: number;
  slideDistance: number;
  fonts: FontData[];
  reject: number;
  approve: number;
};

async function renderMemeFrame({
  width,
  height,
  rejectLabel,
  approveLabel,
  fontSize,
  sidePadding,
  imageRenderHeight,
  imageTop,
  panelHeight,
  slideDistance,
  fonts,
  reject,
  approve,
}: FrameLayout) {
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
      <DrakeLabel
        text={rejectLabel}
        top={imageTop}
        height={panelHeight}
        canvasWidth={width}
        sidePadding={sidePadding}
        fontSize={fontSize}
        reveal={reject}
        slideDistance={slideDistance}
      />
      <DrakeLabel
        text={approveLabel}
        top={imageTop + panelHeight}
        height={panelHeight}
        canvasWidth={width}
        sidePadding={sidePadding}
        fontSize={fontSize}
        reveal={approve}
        slideDistance={slideDistance}
      />
    </div>,
    { fonts },
  );
  return canvas.encode("jpeg");
}

// Drake-style label: black-on-photo, right-half panel, slides in from the
// right with a small overshoot bounce. `reveal` is eased progress in [0, 1+].
function DrakeLabel({
  text,
  top,
  height,
  canvasWidth,
  sidePadding,
  fontSize,
  reveal,
  slideDistance,
}: {
  text: string;
  top: number;
  height: number;
  canvasWidth: number;
  sidePadding: number;
  fontSize: number;
  reveal: number;
  slideDistance: number;
}) {
  const opacity = Math.min(1, Math.max(0, reveal));
  const translateX = slideDistance * (1 - reveal);
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
        opacity,
        transform: `translateX(${translateX}px)`,
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
