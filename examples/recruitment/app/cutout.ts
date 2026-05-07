import {
  createCanvas,
  registerFont,
  type FontData,
  type SKRSContext2D,
} from "@effing/canvas";

// Greedy word wrap. Treats each whitespace-delimited token as an atomic unit;
// a single token longer than `maxWidth` is left on its own line and may exceed
// the bound. The font-size search in `computeLayout` then shrinks until even
// the widest token fits.
function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// One cutout — a piece of text knocked out of the orange surface at a given
// position and size. Title lines and the bottom CTA are both expressed this
// way so they share the rendering and reveal pipeline.
export type CutoutItem = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
};

export type CutoutLayout = {
  items: CutoutItem[];
  fontFamily: string;
};

// Auto-fit a single text line: shrink from `start` until it fits in `maxWidth`.
function fitSingleLine(
  ctx: SKRSContext2D,
  text: string,
  fontFamily: string,
  maxWidth: number,
  start: number,
  min = 24,
): number {
  let size = start;
  while (size >= min) {
    ctx.font = `900 ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return min;
}

// Auto-fit a wrapped paragraph: shrink until every wrapped line fits
// horizontally and the stacked block fits inside `maxBlockHeight`.
function fitWrappedBlock(
  ctx: SKRSContext2D,
  text: string,
  fontFamily: string,
  maxLineWidth: number,
  maxBlockHeight: number,
  start: number,
  min = 24,
): { fontSize: number; lines: string[] } {
  let size = start;
  let lines: string[] = [];
  while (size >= min) {
    ctx.font = `900 ${size}px ${fontFamily}`;
    lines = wrapText(ctx, text, maxLineWidth);
    const widest = lines.reduce(
      (a, l) => Math.max(a, ctx.measureText(l).width),
      0,
    );
    const blockHeight = lines.length * size * 0.95;
    if (widest <= maxLineWidth && blockHeight <= maxBlockHeight) break;
    size -= 2;
  }
  return { fontSize: size, lines };
}

// Build the cutout layout: a wrapped title centered vertically, plus an
// optional bottom CTA that sits inside the bottom padding band. Both auto-fit
// to the canvas; the title's vertical budget excludes the CTA's reserved
// area so the two never overlap.
//
// `fontDatas` is registered as a side effect so the caller doesn't need to
// remember to register before calling — registration is idempotent.
export function computeLayout({
  text,
  footer,
  width,
  height,
  fontFamily,
  fontDatas,
}: {
  text: string;
  footer?: string;
  width: number;
  height: number;
  fontFamily: string;
  fontDatas: FontData[];
}): CutoutLayout {
  for (const fd of fontDatas) registerFont(fd);

  const horizontalPadding = Math.round(width * 0.06);
  const verticalPadding = Math.round(height * 0.08);
  const maxLineWidth = width - 2 * horizontalPadding;

  const ctx = createCanvas(1, 1).getContext("2d");

  let footerItem: CutoutItem | null = null;
  let footerReservedHeight = 0;
  if (footer) {
    // CTA is small enough to read as secondary; cap at ~1/12 of canvas height.
    const footerFontSize = fitSingleLine(
      ctx,
      footer,
      fontFamily,
      maxLineWidth,
      Math.floor(height / 12),
    );
    const footerHeight = footerFontSize * 0.95;
    footerItem = {
      text: footer,
      x: horizontalPadding,
      y: height - verticalPadding - footerHeight,
      fontSize: footerFontSize,
    };
    // Reserve the CTA's full band (text + a little extra padding) so the
    // title's centered block doesn't crowd it.
    footerReservedHeight = footerHeight + verticalPadding;
  }

  const titleAreaTop = verticalPadding;
  const titleAreaBottom = height - verticalPadding - footerReservedHeight;
  const titleAreaHeight = titleAreaBottom - titleAreaTop;
  const { fontSize: titleFontSize, lines: titleLines } = fitWrappedBlock(
    ctx,
    text,
    fontFamily,
    maxLineWidth,
    titleAreaHeight,
    Math.floor(height / 3),
  );
  const titleLineHeight = titleFontSize * 0.95;
  const titleBlockHeight = titleLines.length * titleLineHeight;
  const titleBlockY =
    titleAreaTop + (titleAreaHeight - titleBlockHeight) / 2;

  const items: CutoutItem[] = titleLines.map((line, i) => ({
    text: line,
    x: horizontalPadding,
    y: titleBlockY + i * titleLineHeight,
    fontSize: titleFontSize,
  }));
  if (footerItem) items.push(footerItem);

  return { items, fontFamily };
}

// Paint solid orange across the whole canvas, then knock out the first
// `linesShown` items as transparent text-shaped holes. The result is a
// PNG-with-alpha overlay: when the renderer stacks this over a video
// background, the cutouts read through to the video.
export function paintOrangeWithCutouts({
  ctx,
  width,
  height,
  orangeColor,
  layout,
  linesShown,
}: {
  ctx: SKRSContext2D;
  width: number;
  height: number;
  orangeColor: string;
  layout: CutoutLayout;
  linesShown: number;
}) {
  ctx.fillStyle = orangeColor;
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = "top";
  ctx.globalCompositeOperation = "destination-out";
  const visible = Math.max(0, Math.min(linesShown, layout.items.length));
  for (let i = 0; i < visible; i++) {
    const item = layout.items[i];
    ctx.font = `900 ${item.fontSize}px ${layout.fontFamily}`;
    ctx.fillText(item.text, item.x, item.y);
  }
  ctx.globalCompositeOperation = "source-over";
}
