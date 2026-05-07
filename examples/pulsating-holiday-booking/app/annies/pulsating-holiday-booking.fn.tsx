import { z } from "zod";
import { interSemiBold, interBold, loadFonts } from "~/fonts";
import { loadImage, createCanvas, renderReactElement } from "@effing/canvas";
import { tween, easeOutCubic, easeOutQuad, easeOutBack } from "@effing/tween";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  totalFrameCount: z.number().int().min(1),
  introFrameCount: z.number().int().min(1).optional(),
  pulseFrameCount: z.number().int().min(1).optional(),
  blurRadius: z.number().min(0).optional(),
  baseScale: z.number().min(0.1).max(1).optional(),
  pulseAmount: z.number().min(0).optional(),
  pulsePeriod: z.number().int().min(10).optional(),
});

export type HolidayBookingProps = z.infer<typeof propsSchema>;

export const previewProps: HolidayBookingProps = {
  imageUrl:
    "https://item-assets.itemwise.supplies/realestate/villa/3.jpg",
  totalFrameCount: 300,
  introFrameCount: 45,
  pulseFrameCount: 188,
  blurRadius: 18,
  baseScale: 0.82,
  pulseAmount: 0.025,
  pulsePeriod: 75,
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export async function* runner({
  props: {
    imageUrl,
    totalFrameCount,
    introFrameCount = 45,
    pulseFrameCount = 225,
    blurRadius = 18,
    baseScale = 0.82,
    pulseAmount = 0.025,
    pulsePeriod = 75,
  },
  bounds: { width, height },
}: RunnerArgs<HolidayBookingProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);

  // Fetch image once and reuse as a data URL to avoid per-frame network calls.
  const rawBuffer = await fetch(imageUrl).then((r) => r.arrayBuffer());
  const imageBuffer = Buffer.from(new Uint8Array(rawBuffer));
  const image = await loadImage(imageBuffer);
  const dataUrl = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

  // Background: cover-fill the canvas, extended by blurRadius on each side to
  // prevent the blur from fading to transparent near the edges.
  const imgRatio = image.width / image.height;
  const canvasRatio = width / height;
  let bgW: number, bgH: number;
  if (imgRatio > canvasRatio) {
    bgH = height + blurRadius * 2;
    bgW = bgH * imgRatio;
  } else {
    bgW = width + blurRadius * 2;
    bgH = bgW / imgRatio;
  }
  const bgX = (width - bgW) / 2;
  const bgY = (height - bgH) / 2;

  // Fixed card layout — constant integers computed once so rounding never
  // causes per-frame pixel jumps in the text position.
  const fixedCardW = Math.round(baseScale * width);
  const fixedCardH = Math.round(baseScale * height);
  const fixedCardX = Math.round((width - fixedCardW) / 2);
  const fixedCardY = Math.round((height - fixedCardH) / 2);

  // Band appears when the image first crests and starts shrinking back down —
  // a quarter period into the pulsation phase.
  const bandRevealFrame = introFrameCount + Math.round(pulsePeriod / 4);
  const bandAnimFrames = 22;

  yield* tween(totalFrameCount, async (_interval, frame) => {
    // pulseTransform drives a CSS transform:scale() on the card so the
    // pulsating is sub-pixel smooth rather than rounded-integer jumpy.
    let pulseTransform: number;
    let opacity: number;

    if (frame < introFrameCount) {
      const t = clamp01(frame / introFrameCount);
      // Grow to the pulsation peak (baseScale + pulseAmount) expressed as a
      // transform relative to the fixed baseScale card size.
      pulseTransform = (1 + pulseAmount / baseScale) * (0.15 + 0.85 * easeOutCubic(t));
      opacity = easeOutQuad(clamp01(t / 0.35));
    } else if (frame < introFrameCount + pulseFrameCount) {
      const t = frame - introFrameCount;
      // Start at phase π/2 (the sine peak, derivative = 0) so the pulsation
      // picks up exactly where the intro left off — both sides of the boundary
      // have zero velocity, making the transition mathematically seamless.
      const phase = Math.PI / 2 + (t / pulsePeriod) * Math.PI * 2;
      pulseTransform = 1 + (Math.sin(phase) * pulseAmount) / baseScale;
      opacity = 1;
    } else {
      pulseTransform = 1 - pulseAmount / baseScale;
      opacity = 1;
    }

    // Raw 0→1 progress; Card applies its own easings per layer.
    const bandProgress = clamp01((frame - bandRevealFrame) / bandAnimFrames);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 1. Blurred background
    ctx.filter = `blur(${blurRadius}px)`;
    ctx.drawImage(image, bgX, bgY, bgW, bgH);
    ctx.filter = "none";

    // 2. Subtle dark veil so the card pops
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, width, height);

    // 3. Card (image + white band) composited on top via satori
    await renderReactElement(
      ctx,
      <Card
        dataUrl={dataUrl}
        cardW={fixedCardW}
        cardH={fixedCardH}
        cardX={fixedCardX}
        cardY={fixedCardY}
        pulseTransform={pulseTransform}
        opacity={opacity}
        bandProgress={bandProgress}
        width={width}
        height={height}
      />,
      { fonts },
    );

    return canvas.encode("png");
  });
}

const BAND_RATIO = 0.115; // white band as a share of total card height

function Card({
  dataUrl,
  cardW,
  cardH,
  cardX,
  cardY,
  pulseTransform,
  opacity,
  bandProgress,
  width,
  height,
}: {
  dataUrl: string;
  cardW: number;
  cardH: number;
  cardX: number;
  cardY: number;
  pulseTransform: number;
  opacity: number;
  bandProgress: number;
  width: number;
  height: number;
}) {
  const bandH = Math.round(cardH * BAND_RATIO);
  const fontSize = Math.round(cardW * 0.052);
  const radius = Math.round(Math.min(cardW, cardH) * 0.016);

  // Band slides up from below the card; overflow:hidden on the card clips it.
  const bandSlide = easeOutCubic(bandProgress);
  const bandBottom = -(1 - bandSlide) * bandH;

  // Text pops in with a bounce once the band is mostly in place.
  const textT = clamp01((bandProgress - 0.45) / 0.55);
  const textScale = 0.78 + 0.22 * easeOutBack(textT);
  const textOpacity = easeOutQuad(textT);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: cardY,
          left: cardX,
          width: cardW,
          height: cardH,
          display: "flex",
          borderRadius: radius,
          overflow: "hidden",
          opacity,
          transform: `scale(${pulseTransform})`,
          transformOrigin: "center center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <img
          src={dataUrl}
          width={cardW}
          height={cardH}
          style={{
            display: "flex",
            width: cardW,
            height: cardH,
            objectFit: "cover",
          }}
        />
        {/* Slides up from below; clipped by the card's overflow:hidden */}
        <div
          style={{
            position: "absolute",
            bottom: bandBottom,
            left: 0,
            display: "flex",
            width: cardW,
            height: bandH,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Text bounces in once the band has mostly arrived */}
          <span
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontSize,
              fontWeight: 700,
              color: "#111827",
              letterSpacing: fontSize * 0.015,
              opacity: textOpacity,
              transform: `scale(${textScale})`,
            }}
          >
            Book your holiday now
          </span>
        </div>
      </div>
    </div>
  );
}
