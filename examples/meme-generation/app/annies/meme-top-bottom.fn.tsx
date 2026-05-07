import { z } from "zod";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import {
  createCanvas,
  findLargestUsableFontSize,
  loadImage,
  renderReactElement,
} from "@effing/canvas";
import { tween, easeOutBack } from "@effing/tween";
import { loadFonts, antonRegular, type FontData } from "~/fonts";
import { MemeCaption } from "~/meme-caption";

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  topText: z.string().optional(),
  bottomText: z.string().optional(),
  fontSize: z.number().int().min(1).optional(),
  frameCount: z.number().int().min(1).optional(),
});

export type MemeTopBottomAnnieProps = z.infer<typeof propsSchema>;

export const previewProps: MemeTopBottomAnnieProps = {
  imageUrl: "https://static.effing.dev/picsum/1080/1920/plants.jpg",
  topText: "They photosynthesize",
  bottomText: "I doom-scroll",
  frameCount: 90,
};

export async function* runner({
  props: {
    imageUrl,
    topText = "",
    bottomText = "",
    fontSize,
    frameCount = 90,
  },
  bounds: { width, height },
}: RunnerArgs<MemeTopBottomAnnieProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([antonRegular]);
  const antonFont = fonts[0];

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

  // How far each caption travels during its slide-in. Two lines' worth of
  // line-height is enough to push it cleanly off its slot before settling.
  const slideDistance = Math.round(resolvedFontSize * 2 + padding);

  // Phase frame counts. Splits frameCount into intro hold → top slide-in →
  // beat → bottom slide-in → final hold. If a caption is empty, its reveal
  // phase collapses to zero so the timing isn't wasted on a no-op.
  const hasTop = Boolean(topText);
  const hasBottom = Boolean(bottomText);
  const introHold = Math.max(2, Math.round(frameCount * 0.1));
  const topReveal = hasTop ? Math.max(2, Math.round(frameCount * 0.22)) : 0;
  const beat = hasTop && hasBottom ? Math.max(2, Math.round(frameCount * 0.08)) : 0;
  const bottomReveal = hasBottom
    ? Math.max(2, Math.round(frameCount * 0.22))
    : 0;
  const finalHold = Math.max(
    2,
    frameCount - introHold - topReveal - beat - bottomReveal,
  );

  const layout = {
    width,
    height,
    imageUrl,
    topText,
    bottomText,
    fontSize: resolvedFontSize,
    padding,
    imageRenderHeight,
    imageTop,
    imageBottomBand,
    slideDistance,
    fonts,
  };

  // Phase 1 — intro hold: image only.
  yield* tween(introHold, async () =>
    renderMemeFrame({ ...layout, top: 0, bottom: 0 }),
  );

  // Phase 2 — top text slides in from above.
  if (topReveal > 0) {
    yield* tween(topReveal, async ({ upper: p }) =>
      renderMemeFrame({ ...layout, top: easeOutBack(p), bottom: 0 }),
    );
  }

  // Phase 3 — beat between top and bottom.
  if (beat > 0) {
    yield* tween(beat, async () =>
      renderMemeFrame({ ...layout, top: 1, bottom: 0 }),
    );
  }

  // Phase 4 — bottom text slides in from below (the punchline).
  if (bottomReveal > 0) {
    yield* tween(bottomReveal, async ({ upper: p }) =>
      renderMemeFrame({
        ...layout,
        top: hasTop ? 1 : 0,
        bottom: easeOutBack(p),
      }),
    );
  }

  // Phase 5 — final hold with both visible.
  yield* tween(finalHold, async () =>
    renderMemeFrame({
      ...layout,
      top: hasTop ? 1 : 0,
      bottom: hasBottom ? 1 : 0,
    }),
  );
}

type FrameLayout = {
  width: number;
  height: number;
  imageUrl: string;
  topText: string;
  bottomText: string;
  fontSize: number;
  padding: number;
  imageRenderHeight: number;
  imageTop: number;
  imageBottomBand: number;
  slideDistance: number;
  fonts: FontData[];
  top: number;
  bottom: number;
};

async function renderMemeFrame({
  width,
  height,
  imageUrl,
  topText,
  bottomText,
  fontSize,
  padding,
  imageRenderHeight,
  imageTop,
  imageBottomBand,
  slideDistance,
  fonts,
  top,
  bottom,
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
        <SlideCaption
          reveal={top}
          slideFromAbove
          slideDistance={slideDistance}
          containerStyle={{
            position: "absolute",
            top: imageTop + padding,
            left: 0,
            right: 0,
            display: "flex",
            paddingLeft: padding,
            paddingRight: padding,
          }}
        >
          <MemeCaption text={topText.toUpperCase()} fontSize={fontSize} />
        </SlideCaption>
      ) : null}
      {bottomText ? (
        <SlideCaption
          reveal={bottom}
          slideFromAbove={false}
          slideDistance={slideDistance}
          containerStyle={{
            position: "absolute",
            bottom: imageBottomBand + padding,
            left: 0,
            right: 0,
            display: "flex",
            paddingLeft: padding,
            paddingRight: padding,
          }}
        >
          <MemeCaption text={bottomText.toUpperCase()} fontSize={fontSize} />
        </SlideCaption>
      ) : null}
    </div>,
    { fonts },
  );
  return canvas.encode("jpeg");
}

// Wraps a caption in a slot that fades + slides it into place. `reveal` is
// eased progress (0 = off-screen, 1 = settled). Values transiently above 1
// from easeOutBack push the caption a hair past its resting point before it
// settles — that's the bounce we want.
function SlideCaption({
  reveal,
  slideFromAbove,
  slideDistance,
  containerStyle,
  children,
}: {
  reveal: number;
  slideFromAbove: boolean;
  slideDistance: number;
  containerStyle: React.CSSProperties;
  children: React.ReactNode;
}) {
  const opacity = Math.min(1, Math.max(0, reveal));
  const direction = slideFromAbove ? -1 : 1;
  const translateY = direction * slideDistance * (1 - reveal);
  return (
    <div style={containerStyle}>
      <div
        style={{
          flex: 1,
          display: "flex",
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
