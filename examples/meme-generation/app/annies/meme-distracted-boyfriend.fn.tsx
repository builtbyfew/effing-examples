import { z } from "zod";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { tween, easeOutBack } from "@effing/tween";
import { loadFonts, antonRegular, type FontData } from "~/fonts";
import { MemeCaption } from "~/meme-caption";

const IMAGE_URL = "https://imgflip.com/s/meme/Distracted-Boyfriend.jpg";
const IMAGE_ASPECT = 1200 / 800;

export const propsSchema = z.object({
  otherWomanLabel: z.string(),
  boyfriendLabel: z.string(),
  girlfriendLabel: z.string(),
  fontSize: z.number().int().min(1).optional(),
  frameCount: z.number().int().min(1).optional(),
});

export type MemeDistractedBoyfriendAnnieProps = z.infer<typeof propsSchema>;

export const previewProps: MemeDistractedBoyfriendAnnieProps = {
  otherWomanLabel: "JSX on Effing Canvas",
  boyfriendLabel: "Me",
  girlfriendLabel: "Puppeteer",
  frameCount: 90,
};

export async function* runner({
  props: {
    otherWomanLabel,
    boyfriendLabel,
    girlfriendLabel,
    fontSize,
    frameCount = 90,
  },
  bounds: { width, height },
}: RunnerArgs<MemeDistractedBoyfriendAnnieProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([antonRegular]);

  const resolvedFontSize = fontSize ?? Math.round(width / 28);
  const columnGap = Math.round(resolvedFontSize * 0.7);
  const edgePadding = Math.round(resolvedFontSize * 1.4);

  const useCover = width >= height;
  const imageRenderHeight = useCover
    ? height
    : Math.round(width / IMAGE_ASPECT);
  const imageTop = useCover ? 0 : Math.floor((height - imageRenderHeight) / 2);
  const labelTopGap = Math.round(resolvedFontSize * 2.2);

  // Phase frame counts. Splits frameCount into intro hold → 3 sequential
  // caption pop-ins (left to right) → final hold, in roughly fixed
  // proportions. Each phase gets at least 2 frames so the easing curves
  // still have something to sample even at very small frameCounts.
  const introHold = Math.max(2, Math.round(frameCount * 0.1));
  const otherWomanReveal = Math.max(2, Math.round(frameCount * 0.18));
  const boyfriendReveal = Math.max(2, Math.round(frameCount * 0.18));
  const girlfriendReveal = Math.max(2, Math.round(frameCount * 0.22));
  const finalHold = Math.max(
    2,
    frameCount -
      introHold -
      otherWomanReveal -
      boyfriendReveal -
      girlfriendReveal,
  );

  const layout = {
    width,
    height,
    otherWomanLabel,
    boyfriendLabel,
    girlfriendLabel,
    fontSize: resolvedFontSize,
    columnGap,
    edgePadding,
    imageRenderHeight,
    imageTop,
    labelTopGap,
    fonts,
  };

  // Phase 1 — intro hold: image only, no captions.
  yield* tween(introHold, async () =>
    renderMemeFrame({ ...layout, girlfriend: 0, boyfriend: 0, otherWoman: 0 }),
  );

  // Phase 2 — other woman pops in (left).
  yield* tween(otherWomanReveal, async ({ upper: p }) =>
    renderMemeFrame({
      ...layout,
      otherWoman: easeOutBack(p),
      boyfriend: 0,
      girlfriend: 0,
    }),
  );

  // Phase 3 — boyfriend pops in (center).
  yield* tween(boyfriendReveal, async ({ upper: p }) =>
    renderMemeFrame({
      ...layout,
      otherWoman: 1,
      boyfriend: easeOutBack(p),
      girlfriend: 0,
    }),
  );

  // Phase 4 — girlfriend pops in (right).
  yield* tween(girlfriendReveal, async ({ upper: p }) =>
    renderMemeFrame({
      ...layout,
      otherWoman: 1,
      boyfriend: 1,
      girlfriend: easeOutBack(p),
    }),
  );

  // Phase 5 — final hold with everything visible.
  yield* tween(finalHold, async () =>
    renderMemeFrame({ ...layout, girlfriend: 1, boyfriend: 1, otherWoman: 1 }),
  );
}

type FrameLayout = {
  width: number;
  height: number;
  otherWomanLabel: string;
  boyfriendLabel: string;
  girlfriendLabel: string;
  fontSize: number;
  columnGap: number;
  edgePadding: number;
  imageRenderHeight: number;
  imageTop: number;
  labelTopGap: number;
  fonts: FontData[];
  otherWoman: number;
  boyfriend: number;
  girlfriend: number;
};

async function renderMemeFrame({
  width,
  height,
  otherWomanLabel,
  boyfriendLabel,
  girlfriendLabel,
  fontSize,
  columnGap,
  edgePadding,
  imageRenderHeight,
  imageTop,
  labelTopGap,
  fonts,
  otherWoman,
  boyfriend,
  girlfriend,
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
        <RevealSlot reveal={otherWoman}>
          <MemeCaption
            text={otherWomanLabel.toUpperCase()}
            fontSize={fontSize}
            textAlign="left"
          />
        </RevealSlot>
        <RevealSlot reveal={boyfriend}>
          <MemeCaption
            text={boyfriendLabel.toUpperCase()}
            fontSize={fontSize}
          />
        </RevealSlot>
        <RevealSlot reveal={girlfriend}>
          <MemeCaption
            text={girlfriendLabel.toUpperCase()}
            fontSize={fontSize}
            textAlign="right"
          />
        </RevealSlot>
      </div>
    </div>,
    { fonts },
  );
  return canvas.encode("jpeg");
}

// Wraps a caption in a flex slot that fades and pops it in. `reveal` is the
// eased progress (0 = hidden, 1 = fully visible; can transiently exceed 1
// thanks to easeOutBack overshoot, which is what gives the pop its bounce).
function RevealSlot({
  reveal,
  children,
}: {
  reveal: number;
  children: React.ReactNode;
}) {
  const opacity = Math.min(1, Math.max(0, reveal));
  const scale = 0.6 + 0.4 * reveal;
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center",
      }}
    >
      {children}
    </div>
  );
}
