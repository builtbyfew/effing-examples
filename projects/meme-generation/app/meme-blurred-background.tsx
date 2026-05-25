import type { ReactNode } from "react";

// CSS blur fades at the image's edges, which would show as a darker band
// at the canvas border. Render the image larger than the visible area and
// shift it by half the excess so blur sample pixels live past every edge.
const OVERSCAN_PCT = 12;

/**
 * Absolutely-positioned, heavy-blur cover of an image. Scales with whatever
 * positioned ancestor it lives in. `width`/`height` are only used to pick a
 * blur radius proportional to the canvas — layout is percentage-based.
 */
export function BlurredBackground({
  imageUrl,
  width,
  height,
  blurRadius,
  brightness = 0.55,
}: {
  imageUrl: string;
  width: number;
  height: number;
  blurRadius?: number;
  brightness?: number;
}): ReactNode {
  const resolvedBlur = blurRadius ?? Math.round(Math.min(width, height) / 15);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#000000",
      }}
    >
      <img
        src={imageUrl}
        style={{
          position: "absolute",
          top: `-${OVERSCAN_PCT}%`,
          left: `-${OVERSCAN_PCT}%`,
          width: `${100 + 2 * OVERSCAN_PCT}%`,
          height: `${100 + 2 * OVERSCAN_PCT}%`,
          objectFit: "cover",
          filter: `blur(${resolvedBlur}px) brightness(${brightness})`,
        }}
      />
    </div>
  );
}
