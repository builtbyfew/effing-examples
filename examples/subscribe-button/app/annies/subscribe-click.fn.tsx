import { z } from "zod";
import { interBold, interSemiBold, loadFonts } from "~/fonts";
import {
  tween,
  easeOutQuad,
  easeOutCubic,
  easeOutQuart,
  easeInOutCubic,
  easeOutBack,
} from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";

export const propsSchema = z.object({
  label: z.string().optional(),
  confirmedLabel: z.string().optional(),
  totalFrameCount: z.number().int().min(1).optional(),
});

export type SubscribeClickProps = z.infer<typeof propsSchema>;

export const previewProps: SubscribeClickProps = {
  label: "Subscribe",
  confirmedLabel: "Subscribed",
  totalFrameCount: 120,
};

const palette = {
  bg: "#f4efe6",
  buttonIdle: "#e0392b",
  buttonConfirmed: "#3a8a82",
  textOnButton: "#ffffff",
  cursorFill: "#1a1818",
  cursorStroke: "#ffffff",
  ripple: "#c9a96b",
  shadow: "#1a1818",
} as const;

// Phase boundaries (frame numbers within the timeline). Tuned for the default
// 120-frame / 4s timeline; if `totalFrameCount` is changed substantially the
// animation will end mid-phase or hold for longer at the end.
const T = {
  buttonIn: { start: 0, dur: 16 },
  cursorIn: { start: 8, dur: 38 },
  press: { start: 52, dur: 6 },
  release: { start: 58, dur: 8 },
  ripple: { start: 54, dur: 36 },
  confirm: { start: 64, dur: 28 },
} as const;

type Layout = ReturnType<typeof computeLayout>;

function computeLayout(width: number, height: number) {
  const min = Math.min(width, height);
  const fontSize = Math.round(min * 0.07);
  const paddingY = Math.round(fontSize * 0.8);
  const buttonHeight = fontSize + paddingY * 2;
  const buttonWidth = Math.round(min * 0.62);
  const buttonRadius = buttonHeight / 2;
  const buttonLeft = Math.round((width - buttonWidth) / 2);
  const buttonTop = Math.round((height - buttonHeight) / 2);
  const buttonCenterX = buttonLeft + buttonWidth / 2;
  const buttonCenterY = buttonTop + buttonHeight / 2;
  const cursorSize = Math.round(buttonHeight * 0.95);
  return {
    width,
    height,
    fontSize,
    buttonWidth,
    buttonHeight,
    buttonRadius,
    buttonLeft,
    buttonTop,
    buttonCenterX,
    buttonCenterY,
    cursorSize,
    checkSize: Math.round(fontSize * 0.95),
  };
}

export async function* runner({
  props: {
    label = "Subscribe",
    confirmedLabel = "Subscribed",
    totalFrameCount = 120,
  },
  bounds: { width, height },
}: RunnerArgs<SubscribeClickProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interBold, interSemiBold]);
  const layout = computeLayout(width, height);

  yield* tween(totalFrameCount, async (_interval, frame) => {
    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <SubscribeClick
        layout={layout}
        label={label}
        confirmedLabel={confirmedLabel}
        frame={frame}
      />,
      { fonts },
    );
    return canvas.encode("png");
  });
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function progress(frame: number, startFrame: number, durationFrames: number) {
  return clamp01((frame - startFrame) / durationFrames);
}

function SubscribeClick({
  layout,
  label,
  confirmedLabel,
  frame,
}: {
  layout: Layout;
  label: string;
  confirmedLabel: string;
  frame: number;
}) {
  const {
    width,
    height,
    buttonWidth,
    buttonHeight,
    buttonRadius,
    buttonLeft,
    buttonTop,
    buttonCenterX,
    buttonCenterY,
    cursorSize,
    fontSize,
    checkSize,
  } = layout;

  const buttonIn = easeOutBack(progress(frame, T.buttonIn.start, T.buttonIn.dur));
  const cursorIn = easeOutCubic(
    progress(frame, T.cursorIn.start, T.cursorIn.dur),
  );
  // Press is a brief down/up squish using a triangular envelope so the
  // compressed extreme falls between press end and release start.
  const pressP = progress(frame, T.press.start, T.press.dur);
  const releaseP = progress(frame, T.release.start, T.release.dur);
  const compressed = easeInOutCubic(pressP) - easeOutCubic(releaseP);
  const buttonScale =
    (0.92 + 0.08 * buttonIn) * (1 - 0.05 * clamp01(compressed));

  const ripple = easeOutQuart(progress(frame, T.ripple.start, T.ripple.dur));
  const confirmReveal = easeOutCubic(
    progress(frame, T.confirm.start, T.confirm.dur),
  );

  // Cursor path: enters from off-canvas bottom-right, eases to a point just
  // inside the button. The arrow tip is at the SVG's top-left, so we offset
  // the target slightly so the tip — not the SVG corner — hits center.
  const cursorTipTargetX = buttonCenterX - cursorSize * 0.05;
  const cursorTipTargetY = buttonCenterY - cursorSize * 0.05;
  const cursorStartX = width + cursorSize * 0.4;
  const cursorStartY = height + cursorSize * 0.4;
  const cursorBaseX =
    cursorStartX + (cursorTipTargetX - cursorStartX) * cursorIn;
  const cursorBaseY =
    cursorStartY + (cursorTipTargetY - cursorStartY) * cursorIn;
  // Tap dip: cursor moves slightly down-right at the press moment, springs
  // back during release.
  const dip = clamp01(compressed);
  const cursorX = cursorBaseX + dip * cursorSize * 0.04;
  const cursorY = cursorBaseY + dip * cursorSize * 0.06;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        backgroundColor: palette.bg,
      }}
    >
      <Ripple
        cx={buttonCenterX}
        cy={buttonCenterY}
        progress={ripple}
        maxRadius={Math.max(buttonWidth, buttonHeight) * 0.95}
      />

      <Button
        left={buttonLeft}
        top={buttonTop}
        width={buttonWidth}
        height={buttonHeight}
        radius={buttonRadius}
        scale={buttonScale}
        opacity={clamp01(buttonIn * 1.4)}
        label={label}
        confirmedLabel={confirmedLabel}
        confirmReveal={confirmReveal}
        fontSize={fontSize}
        checkSize={checkSize}
      />

      <Cursor x={cursorX} y={cursorY} size={cursorSize} opacity={cursorIn} />
    </div>
  );
}

function Button({
  left,
  top,
  width,
  height,
  radius,
  scale,
  opacity,
  label,
  confirmedLabel,
  confirmReveal,
  fontSize,
  checkSize,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
  scale: number;
  opacity: number;
  label: string;
  confirmedLabel: string;
  confirmReveal: number;
  fontSize: number;
  checkSize: number;
}) {
  const bg = mixColor(palette.buttonIdle, palette.buttonConfirmed, confirmReveal);
  const shadowAlpha = 0.18 + 0.06 * (1 - confirmReveal);
  // Wrapper extends below the button to give the offset shadow room — without
  // this the renderer clips abs-positioned children to the parent's box.
  const shadowOffset = Math.round(height * 0.18);
  const containerHeight = height + shadowOffset;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width,
        height: containerHeight,
        display: "flex",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: shadowOffset,
          left: 0,
          width,
          height,
          borderRadius: radius,
          backgroundColor: palette.shadow,
          opacity: shadowAlpha,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          borderRadius: radius,
          backgroundColor: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: palette.textOnButton,
          fontFamily: "Inter",
          fontSize,
          fontWeight: 700,
          letterSpacing: fontSize * 0.04,
        }}
      >
        <ButtonContents
          label={label}
          confirmedLabel={confirmedLabel}
          reveal={confirmReveal}
          checkSize={checkSize}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
}

function ButtonContents({
  label,
  confirmedLabel,
  reveal,
  checkSize,
  fontSize,
}: {
  label: string;
  confirmedLabel: string;
  reveal: number;
  checkSize: number;
  fontSize: number;
}) {
  // Crossfade the labels in place; the confirmed variant slides up from
  // below so the swap reads as a state change rather than a flicker.
  const labelOpacity = 1 - clamp01(reveal * 1.5);
  const confirmedOpacity = clamp01((reveal - 0.2) * 1.4);
  const confirmedLift = (1 - confirmedOpacity) * fontSize * 0.4;
  const checkScale = easeOutBack(clamp01((reveal - 0.4) * 1.8));
  const gap = Math.round(fontSize * 0.45);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          display: "flex",
          opacity: labelOpacity,
          transform: `translateY(${-clamp01(reveal) * fontSize * 0.4}px)`,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap,
          opacity: confirmedOpacity,
          transform: `translateY(${confirmedLift}px)`,
        }}
      >
        <Checkmark size={checkSize} progress={checkScale} />
        <div style={{ display: "flex" }}>{confirmedLabel}</div>
      </div>
    </div>
  );
}

function Checkmark({ size, progress }: { size: number; progress: number }) {
  // Two-stroke check, drawn with strokeDashoffset so it "writes on" as
  // progress goes 0 → 1.
  const stroke = Math.max(2, Math.round(size * 0.14));
  const draw = clamp01(progress);
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        position: "relative",
        transform: `scale(${0.6 + 0.4 * draw})`,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <path
          d="M4 12.5 L10 18.5 L20 6.5"
          fill="none"
          stroke={palette.textOnButton}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={40}
          strokeDashoffset={40 * (1 - draw)}
        />
      </svg>
    </div>
  );
}

function Ripple({
  cx,
  cy,
  progress,
  maxRadius,
}: {
  cx: number;
  cy: number;
  progress: number;
  maxRadius: number;
}) {
  if (progress <= 0) return null;
  const r = maxRadius * progress;
  const opacity = (1 - easeOutQuad(progress)) * 0.35;
  return (
    <div
      style={{
        position: "absolute",
        top: cy - r,
        left: cx - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r * 2,
        backgroundColor: palette.ripple,
        opacity,
        display: "flex",
      }}
    />
  );
}

function Cursor({
  x,
  y,
  size,
  opacity,
}: {
  x: number;
  y: number;
  size: number;
  opacity: number;
}) {
  // Classic arrow pointer; tip sits at the SVG's top-left so (x, y) is the
  // tip coordinate.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        top: y,
        left: x,
        width: size,
        height: size,
        opacity,
      }}
    >
      <path
        d="M3 2 L3 19 L8 14.5 L11 21 L14 19.7 L11 13.2 L17.5 13.2 Z"
        fill={palette.cursorFill}
        stroke={palette.cursorStroke}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Linear hex color mix; assumes "#rrggbb" inputs. Drives the subtle button
// color shift on confirmation.
function mixColor(a: string, b: string, t: number) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const k = clamp01(t);
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}
