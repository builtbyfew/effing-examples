import { z } from "zod";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { tween } from "@effing/tween";
import { loadFonts, robotoBold, type FontData } from "~/fonts";

// Source-image aspect, used only to position the panel labels relative to
// the letterboxed image. The image itself is composed in by a separate layer.
const IMAGE_ASPECT = 1; // 1200x1200, two 1200x600 panels stacked

const ALPHA_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALPHA_LOWER = "abcdefghijklmnopqrstuvwxyz";

// Scramble swaps each letter for a same-case random letter. Keeping the
// character class stable (letter→letter, digit→digit) preserves glyph widths,
// so wrapping doesn't jitter as the scramble cycles.
function scrambleChar(ch: string, tick: number, i: number): string {
  const seed = (tick * 13 + i * 31) % 26;
  if (ch >= "A" && ch <= "Z") return ALPHA_UPPER[seed];
  if (ch >= "a" && ch <= "z") return ALPHA_LOWER[seed];
  return ch;
}

function buildDecodingText(
  text: string,
  lockProgress: number,
  tick: number,
): string {
  const chars = Array.from(text);
  const lockedCount = Math.floor(lockProgress * chars.length);
  return chars
    .map((ch, i) => (i < lockedCount ? ch : scrambleChar(ch, tick, i)))
    .join("");
}

export const propsSchema = z.object({
  rejectLabel: z.string(),
  approveLabel: z.string(),
  fontSize: z.number().int().min(1).optional(),
  frameCount: z.number().int().min(1).optional(),
});

export type MemeDrakeHotlineBlingLabelsProps = z.infer<typeof propsSchema>;

export const previewProps: MemeDrakeHotlineBlingLabelsProps = {
  rejectLabel: "Reading the FFmpeg manual",
  approveLabel: "Reading the Effing manual",
  frameCount: 90,
};

export async function* runner({
  props: { rejectLabel, approveLabel, fontSize, frameCount = 90 },
  bounds: { width, height },
}: RunnerArgs<MemeDrakeHotlineBlingLabelsProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([robotoBold]);

  const resolvedFontSize = fontSize ?? Math.round(width / 24);
  const sidePadding = Math.round(resolvedFontSize * 0.7);

  const useCover = width >= height;
  const imageRenderHeight = useCover
    ? height
    : Math.round(width / IMAGE_ASPECT);
  const imageTop = useCover ? 0 : Math.floor((height - imageRenderHeight) / 2);
  const panelHeight = imageRenderHeight / 2;

  // Quantise the scramble cadence: change glyphs every 2 frames so at 30fps
  // the noise reads at ~15Hz — fast enough to look like decoding, slow enough
  // to not strobe.
  const tickEvery = 2;

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
    fonts,
  };

  let frameIndex = 0;
  const advance = () => {
    frameIndex++;
  };

  // Intro hold — both labels hidden. Identical every frame.
  const introFrame = await renderMemeFrame({
    ...layout,
    rejectProgress: 0,
    approveProgress: 0,
    tick: 0,
  });
  for (let i = 0; i < introHold; i++) {
    advance();
    yield introFrame;
  }

  // Reject reveal — characters scramble at the start, lock in left-to-right.
  // Linear lockProgress so the lock front moves at constant speed.
  yield* tween(rejectReveal, async ({ upper: p }) => {
    const frame = await renderMemeFrame({
      ...layout,
      rejectProgress: p,
      approveProgress: 0,
      tick: Math.floor(frameIndex / tickEvery),
    });
    advance();
    return frame;
  });

  // Beat — reject locked, approve still hidden. Identical every frame.
  const beatFrame = await renderMemeFrame({
    ...layout,
    rejectProgress: 1,
    approveProgress: 0,
    tick: 0,
  });
  for (let i = 0; i < beat; i++) {
    advance();
    yield beatFrame;
  }

  // Approve reveal — same mechanism, this time on the approve label.
  yield* tween(approveReveal, async ({ upper: p }) => {
    const frame = await renderMemeFrame({
      ...layout,
      rejectProgress: 1,
      approveProgress: p,
      tick: Math.floor(frameIndex / tickEvery),
    });
    advance();
    return frame;
  });

  // Final hold — both labels locked. Identical every frame.
  const finalFrame = await renderMemeFrame({
    ...layout,
    rejectProgress: 1,
    approveProgress: 1,
    tick: 0,
  });
  for (let i = 0; i < finalHold; i++) yield finalFrame;
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
  fonts: FontData[];
  rejectProgress: number;
  approveProgress: number;
  tick: number;
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
  fonts,
  rejectProgress,
  approveProgress,
  tick,
}: FrameLayout) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <div style={{ width, height, display: "flex" }}>
      {rejectProgress > 0 ? (
        <DrakeLabel
          text={buildDecodingText(rejectLabel, rejectProgress, tick)}
          top={imageTop}
          height={panelHeight}
          canvasWidth={width}
          sidePadding={sidePadding}
          fontSize={fontSize}
        />
      ) : null}
      {approveProgress > 0 ? (
        <DrakeLabel
          text={buildDecodingText(approveLabel, approveProgress, tick)}
          top={imageTop + panelHeight}
          height={panelHeight}
          canvasWidth={width}
          sidePadding={sidePadding}
          fontSize={fontSize}
        />
      ) : null}
    </div>,
    { fonts },
  );
  // PNG keeps the canvas transparent so the labels composite over the
  // separate image background layer.
  return canvas.encode("png");
}

// Drake-style label: black-on-photo, right-half panel. The text passed in
// has already had its scramble/lock mix applied — this just lays it out.
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
