import {
  Canvas,
  createCanvas,
  findLargestUsableFontSize,
  renderReactElement,
  type FontData,
  type SKRSContext2D,
} from "@effing/canvas";

export const IMAGE_URL = "https://static.effing.dev/meme/Change-My-Mind.jpg";

const NATURAL_WIDTH = 482;
const NATURAL_HEIGHT = 361;

// Four corners of the writable area on the poster — the blank space above
// the printed "CHANGE MY MIND" line.
const POSTER = {
  tl: { x: 218.5 / NATURAL_WIDTH, y: 233.5 / NATURAL_HEIGHT },
  tr: { x: 414.5 / NATURAL_WIDTH, y: 212 / NATURAL_HEIGHT },
  bl: { x: 225.5 / NATURAL_WIDTH, y: 310 / NATURAL_HEIGHT },
  br: { x: 414.5 / NATURAL_WIDTH, y: 283.5 / NATURAL_HEIGHT },
};

export type Point = { x: number; y: number };

export type PosterLayout = {
  imageLeft: number;
  imageTop: number;
  imageRenderWidth: number;
  imageRenderHeight: number;
  TL: Point;
  TR: Point;
  BL: Point;
  BR: Point;
  flatWidth: number;
  flatHeight: number;
};

/**
 * Cover-crop for square/landscape (subject stays centered), letterbox top/
 * bottom for portrait. Returns image placement + the four poster corners in
 * canvas space, plus a "flat" working size for the text canvas chosen so the
 * densest part of the projection still resolves crisply.
 */
export function computePosterLayout(bounds: {
  width: number;
  height: number;
}): PosterLayout {
  const { width, height } = bounds;
  const useCover = width >= height;
  const scale = useCover
    ? Math.max(width / NATURAL_WIDTH, height / NATURAL_HEIGHT)
    : Math.min(width / NATURAL_WIDTH, height / NATURAL_HEIGHT);
  const imageRenderWidth = Math.round(NATURAL_WIDTH * scale);
  const imageRenderHeight = Math.round(NATURAL_HEIGHT * scale);
  const imageLeft = Math.round((width - imageRenderWidth) / 2);
  const imageTop = Math.round((height - imageRenderHeight) / 2);

  const corner = (c: Point): Point => ({
    x: imageLeft + c.x * imageRenderWidth,
    y: imageTop + c.y * imageRenderHeight,
  });
  const TL = corner(POSTER.tl);
  const TR = corner(POSTER.tr);
  const BL = corner(POSTER.bl);
  const BR = corner(POSTER.br);

  const topWidth = Math.hypot(TR.x - TL.x, TR.y - TL.y);
  const bottomWidth = Math.hypot(BR.x - BL.x, BR.y - BL.y);
  const leftHeight = Math.hypot(BL.x - TL.x, BL.y - TL.y);
  const rightHeight = Math.hypot(BR.x - TR.x, BR.y - TR.y);
  const flatWidth = Math.max(2, Math.round(Math.max(topWidth, bottomWidth)));
  const flatHeight = Math.max(
    2,
    Math.round((leftHeight + rightHeight) / 2),
  );

  return {
    imageLeft,
    imageTop,
    imageRenderWidth,
    imageRenderHeight,
    TL,
    TR,
    BL,
    BR,
    flatWidth,
    flatHeight,
  };
}

/**
 * Render the caption to a flat offscreen canvas at `flatWidth × flatHeight`,
 * auto-sizing the font to fill the available space. The canvas has a
 * transparent background, so projection only paints the text pixels.
 */
export async function renderPosterTextCanvas({
  text,
  fontSize,
  font,
  fonts,
  flatWidth,
  flatHeight,
}: {
  text: string;
  fontSize?: number;
  font: FontData;
  fonts: FontData[];
  flatWidth: number;
  flatHeight: number;
}): Promise<Canvas> {
  const padding = Math.round(flatHeight * 0.04);
  const resolvedFontSize =
    fontSize ??
    findLargestUsableFontSize({
      text,
      font,
      maxWidth: Math.max(1, flatWidth - 2 * padding),
      maxHeight: Math.max(1, flatHeight - 2 * padding),
      lineHeight: 1.15,
    });
  const canvas = createCanvas(flatWidth, flatHeight);
  await renderReactElement(
    canvas.getContext("2d"),
    <div
      style={{
        width: flatWidth,
        height: flatHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding,
        fontFamily: "Roboto",
        fontWeight: 700,
        fontSize: resolvedFontSize,
        color: "#0a0a0a",
        textAlign: "center",
        lineHeight: 1.15,
      }}
    >
      {text}
    </div>,
    { fonts },
  );
  return canvas;
}

/**
 * Project the flat text canvas onto the given quadrilateral via horizontal
 * scanline strips. Each strip uses an affine `setTransform` — fine for a
 * thin strip — and together they approximate the (slight) perspective of
 * the poster. Caller controls opacity by setting `ctx.globalAlpha`.
 */
export function paintPosterText(
  ctx: SKRSContext2D,
  textCanvas: Canvas,
  corners: { TL: Point; TR: Point; BL: Point; BR: Point },
  flatWidth: number,
  flatHeight: number,
) {
  const { TL, TR, BL, BR } = corners;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  // ~24 strips is plenty for a near-affine quad like this poster; the strip
  // approach exists to absorb future cases where the perspective is steeper.
  const N = Math.max(24, Math.round(flatHeight / 12));
  for (let i = 0; i < N; i++) {
    const t1 = i / N;
    const t2 = (i + 1) / N;
    const topL: Point = {
      x: lerp(TL.x, BL.x, t1),
      y: lerp(TL.y, BL.y, t1),
    };
    const topR: Point = {
      x: lerp(TR.x, BR.x, t1),
      y: lerp(TR.y, BR.y, t1),
    };
    const botL: Point = {
      x: lerp(TL.x, BL.x, t2),
      y: lerp(TL.y, BL.y, t2),
    };
    const sy = t1 * flatHeight;
    const sh = (t2 - t1) * flatHeight;
    // Affine map: source (0,0)→topL, (flatWidth,0)→topR, (0,sh)→botL.
    const a = (topR.x - topL.x) / flatWidth;
    const b = (topR.y - topL.y) / flatWidth;
    const c = (botL.x - topL.x) / sh;
    const d = (botL.y - topL.y) / sh;
    ctx.save();
    ctx.setTransform(a, b, c, d, topL.x, topL.y);
    // Slight vertical overdraw avoids hairline seams between adjacent strips
    // from anti-aliased edges.
    const overdraw = i + 1 < N ? sh * 0.5 : 0;
    ctx.drawImage(
      textCanvas,
      0,
      sy,
      flatWidth,
      sh + overdraw,
      0,
      0,
      flatWidth,
      sh + overdraw,
    );
    ctx.restore();
  }
}

/**
 * Shrink the four poster corners toward their centroid by `scale` (1.0 = no
 * shrink). Used by the annie's pop-in animation to start the text smaller
 * than its resting position.
 */
export function shrinkPosterCorners(
  corners: { TL: Point; TR: Point; BL: Point; BR: Point },
  scale: number,
): { TL: Point; TR: Point; BL: Point; BR: Point } {
  const { TL, TR, BL, BR } = corners;
  const cx = (TL.x + TR.x + BL.x + BR.x) / 4;
  const cy = (TL.y + TR.y + BL.y + BR.y) / 4;
  const s = (p: Point): Point => ({
    x: cx + (p.x - cx) * scale,
    y: cy + (p.y - cy) * scale,
  });
  return { TL: s(TL), TR: s(TR), BL: s(BL), BR: s(BR) };
}
