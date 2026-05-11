import { z } from "zod";
import type { SKRSContext2D, Image } from "@effing/canvas";

export const textSlideSchema = z.object({
  type: z.literal("text"),
  time: z.number().nonnegative(),
  duration: z.number().positive(),
  text: z.union([z.string(), z.array(z.string())]),
  sizeText: z.array(z.string()).optional(),
  layout: z.enum(["straight", "curve-down", "curve-up"]).optional(),
  curveAmount: z.number().optional(),
  scale: z.number().positive().optional(),
  font: z.enum(["trim", "attila"]).optional(),
  theme: z.enum(["a", "b"]).optional(),
  rotation: z.number().optional(),
  letterSpacing: z.number().optional(),
  slideIn: z.enum(["right", "left", "none"]).optional(),
  slideOut: z.enum(["right", "left", "none"]).optional(),
  slideDuration: z.number().nonnegative().optional(),
  slideEase: z.enum(["ease-out", "elastic"]).optional(),
  waveAmplitude: z.number().nonnegative().optional(),
  stagger: z.enum(["none", "lines", "words"]).optional(),
  staggerStep: z.number().min(0).optional(),
  drift: z.union([z.number(), z.array(z.number())]).optional(),
  driftStart: z.union([z.number(), z.array(z.number())]).optional(),
  anchorLine: z.number().int().nonnegative().optional(),
});

export const photoSlideSchema = z.object({
  type: z.literal("photo"),
  time: z.number().nonnegative(),
  duration: z.number().positive(),
  photoUrl: z.string(),
  overlayText: z.array(z.string()).optional(),
  overlayScale: z.number().positive().optional(),
  overlayCurveAmount: z.number().optional(),
});

export const slideSchema = z.discriminatedUnion("type", [
  textSlideSchema,
  photoSlideSchema,
]);

export type TextSlide = z.infer<typeof textSlideSchema>;
export type PhotoSlide = z.infer<typeof photoSlideSchema>;
export type Slide = z.infer<typeof slideSchema>;

// --- Easing ---

export function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInQuad(t: number) {
  return t * t;
}

export function easeOutElastic(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1;
}

// --- Helpers ---

export function findActiveSlide(slides: Slide[], t: number): Slide | null {
  for (let i = slides.length - 1; i >= 0; i--) {
    const s = slides[i];
    if (s.time <= t && t < s.time + s.duration) return s;
  }
  return null;
}

const FLASH_STEP = 0.13;
export function flashSlide(
  time: number,
  text: string | string[],
  opts: Partial<TextSlide>,
): TextSlide {
  return {
    type: "text",
    time,
    duration: FLASH_STEP,
    text,
    layout: "straight",
    scale: 1.0,
    font: "attila",
    theme: "a",
    letterSpacing: -8,
    ...opts,
  };
}

// --- Drawing ---

export function computeFontSize(
  ctx: SKRSContext2D,
  width: number,
  lines: string[],
  scale: number,
  fontFamily: string,
  letterSpacing: number,
) {
  const cap = width * 0.36;
  const targetWidth = Math.min(width * 0.95, width * 0.82 * scale);
  const startSize = cap * scale;
  ctx.save();
  ctx.font = `700 ${startSize}px ${fontFamily}`;
  let longestWidth = 0;
  for (const line of lines) {
    const w =
      ctx.measureText(line).width +
      Math.max(0, line.length - 1) * letterSpacing;
    if (w > longestWidth) longestWidth = w;
  }
  ctx.restore();
  if (longestWidth <= targetWidth || longestWidth === 0) return startSize;
  return startSize * (targetWidth / longestWidth);
}

export function drawLine(
  ctx: SKRSContext2D,
  text: string,
  cx: number,
  cy: number,
  fontSize: number,
  fontFamily: string,
  color: string,
  slide: TextSlide,
  arcOffset = 0,
) {
  ctx.save();
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const letterSpacing = slide.letterSpacing ?? 0;
  const widths = [...text].map((c) => ctx.measureText(c).width);
  const totalWidth =
    widths.reduce((a, b) => a + b, 0) + letterSpacing * (text.length - 1);

  const layout = slide.layout ?? "straight";
  if (layout === "straight" || !slide.curveAmount) {
    const effectiveCx = cx + arcOffset;
    if (letterSpacing === 0) {
      ctx.fillText(text, effectiveCx, cy);
    } else {
      let x = effectiveCx - totalWidth / 2;
      for (let i = 0; i < text.length; i++) {
        ctx.textAlign = "left";
        ctx.fillText(text[i], x, cy);
        x += widths[i] + letterSpacing;
      }
    }
    ctx.restore();
    return;
  }

  const sign = layout === "curve-up" ? -1 : 1;
  const halfWidth = totalWidth / 2;
  const amplitude = Math.abs(slide.curveAmount!) * totalWidth * 0.15;
  const waveFreq = Math.PI / halfWidth;

  let cumulative = 0;
  for (let i = 0; i < text.length; i++) {
    const charW = widths[i];
    const homeX = cumulative + charW / 2 + letterSpacing * i - halfWidth;
    const wx = homeX + arcOffset;
    const waveY = sign * amplitude * Math.cos(waveFreq * wx);
    const slope = -sign * amplitude * waveFreq * Math.sin(waveFreq * wx);
    const rotation = Math.atan2(slope, 1);

    ctx.save();
    ctx.translate(cx + wx, cy + waveY);
    ctx.rotate(rotation);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();

    cumulative += charW;
  }
  ctx.restore();
}

export function drawTextSlide(
  ctx: SKRSContext2D,
  slide: TextSlide,
  seconds: number,
  fg: string,
  width: number,
  height: number,
) {
  const allLines = Array.isArray(slide.text) ? slide.text : [slide.text];
  const fontFamily = slide.font === "attila" ? "AttilaSansSharp" : "TrimPoster";
  const sizeLines = slide.sizeText ?? allLines;
  const fontSize = computeFontSize(
    ctx,
    width,
    sizeLines,
    slide.scale ?? 0.7,
    fontFamily,
    slide.letterSpacing ?? 0,
  );
  const lineHeight = fontSize * (slide.font === "attila" ? 0.92 : 1.0);

  const localT = seconds - slide.time;
  const slideDur = slide.slideDuration ?? 0.18;
  const slideIn = slide.slideIn ?? "none";
  const slideOut = slide.slideOut ?? "none";
  const slideEase = slide.slideEase ?? "ease-out";
  const waveAmp = slide.waveAmplitude ?? 0;
  const stagger = slide.stagger ?? "none";
  const staggerStep = slide.staggerStep ?? 0.18;
  const driftRaw = slide.drift ?? 0;
  const driftSpeeds = Array.isArray(driftRaw) ? driftRaw : [driftRaw];
  const driftStartRaw = slide.driftStart ?? 0;
  const driftStarts = Array.isArray(driftStartRaw) ? driftStartRaw : [driftStartRaw];
  const lineDrift = (i: number) =>
    (driftStarts[Math.min(i, driftStarts.length - 1)] ?? 0) +
    (driftSpeeds[Math.min(i, driftSpeeds.length - 1)] ?? 0) * localT;

  const perLineSlide = stagger === "lines" && slideIn !== "none";

  let slideOffset = lineDrift(0);
  let offsetY = 0;
  if (!perLineSlide && slideIn !== "none" && localT < slideDur) {
    const progress = localT / slideDur;
    const positionFraction =
      slideEase === "elastic"
        ? 1 - easeOutElastic(progress)
        : 1 - easeOutCubic(progress);
    slideOffset += (slideIn === "right" ? 1 : -1) * width * 1.1 * positionFraction;
    if (waveAmp > 0) {
      offsetY +=
        Math.sin(progress * Math.PI * 3) * waveAmp * (1 - progress);
    }
  }

  let slideOutOffset = 0;
  if (slideOut !== "none" && localT > slide.duration - slideDur) {
    const f = (localT - (slide.duration - slideDur)) / slideDur;
    const eased = easeInQuad(f);
    slideOutOffset = (slideOut === "left" ? -1 : 1) * width * 1.1 * eased;
  }
  slideOffset += slideOutOffset;

  const punch =
    slide.anchorLine == null && localT < 0.1
      ? 1 + 0.05 * Math.max(0, 1 - localT / 0.1)
      : 1;

  ctx.save();
  ctx.translate(width / 2, height / 2 + offsetY);
  if (slide.rotation) ctx.rotate((slide.rotation * Math.PI) / 180);
  ctx.scale(punch, punch);

  const anchorLine = slide.anchorLine;
  const yStart =
    anchorLine != null
      ? -anchorLine * lineHeight
      : -((lineHeight * allLines.length) / 2) + lineHeight / 2;

  if (perLineSlide) {
    let y = yStart;
    for (let i = 0; i < allLines.length; i++) {
      let lineArcOffset = slideOutOffset + lineDrift(i);
      if (i > 0) {
        const lineDelay = staggerStep * i;
        const lineLocalT = localT - lineDelay;
        if (lineLocalT < 0) {
          lineArcOffset +=
            (slideIn === "right" ? 1 : -1) * width * 1.1;
        } else if (lineLocalT < slideDur) {
          const progress = lineLocalT / slideDur;
          const frac =
            slideEase === "elastic"
              ? 1 - easeOutElastic(progress)
              : 1 - easeOutCubic(progress);
          lineArcOffset +=
            (slideIn === "right" ? 1 : -1) * width * 1.1 * frac;
        }
      }
      drawLine(
        ctx,
        allLines[i],
        0,
        y,
        fontSize,
        fontFamily,
        fg,
        slide,
        lineArcOffset,
      );
      y += lineHeight;
    }
  } else if (stagger === "lines") {
    const visibleCount = Math.max(0, Math.floor(localT / staggerStep) + 1);
    const visible = allLines.slice(0, Math.min(allLines.length, visibleCount));
    let y = yStart;
    for (let i = 0; i < allLines.length; i++) {
      if (i < visible.length) {
        const off = slideOffset - lineDrift(0) + lineDrift(i);
        drawLine(ctx, allLines[i], 0, y, fontSize, fontFamily, fg, slide, off);
      }
      y += lineHeight;
    }
  } else {
    let y = yStart;
    for (let i = 0; i < allLines.length; i++) {
      const off = slideOffset - lineDrift(0) + lineDrift(i);
      drawLine(ctx, allLines[i], 0, y, fontSize, fontFamily, fg, slide, off);
      y += lineHeight;
    }
  }
  ctx.restore();
}

export function drawPhotoSlide(
  ctx: SKRSContext2D,
  img: Image,
  width: number,
  height: number,
  panX = 0,
  panY = 0,
) {
  const imgRatio = img.width / img.height;
  const canvasRatio = width / height;
  let dw: number, dh: number, dx: number, dy: number;
  if (imgRatio > canvasRatio) {
    dh = height;
    dw = dh * imgRatio;
    dx = (width - dw) / 2;
    dy = 0;
  } else {
    dw = width;
    dh = dw / imgRatio;
    dx = 0;
    dy = (height - dh) / 2;
  }
  ctx.drawImage(img, dx + panX, dy + panY, dw, dh);
}

export function drawPhotoOverlayText(
  ctx: SKRSContext2D,
  lines: string[],
  width: number,
  height: number,
  scale: number,
  curveAmount: number,
) {
  const fontFamily = "TrimPoster";
  const slide: TextSlide = {
    type: "text",
    time: 0,
    duration: 1,
    text: lines,
    layout: curveAmount ? "curve-down" : "straight",
    curveAmount,
    scale,
    font: "trim",
    theme: "a",
  };
  const fontSize = computeFontSize(ctx, width, lines, scale, fontFamily, 0);
  const lineHeight = fontSize * 1.0;
  const totalH = lineHeight * lines.length;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  let y = -totalH / 2 + lineHeight / 2;
  for (const line of lines) {
    drawLine(ctx, line, 0, y, fontSize, fontFamily, "#FFFFFF", slide);
    y += lineHeight;
  }
  ctx.restore();
}
