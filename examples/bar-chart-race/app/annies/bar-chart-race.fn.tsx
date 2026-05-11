import { z } from "zod";
import { tween, easeInOutCubic } from "@effing/tween";
import {
  createCanvas,
  renderReactElement,
  type SKRSContext2D,
} from "@effing/canvas";
import { interBold, interSemiBold, loadFonts } from "~/fonts";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";

const seriesSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string(),
});

const stepSchema = z.object({
  time: z.string(),
  values: z.record(z.string(), z.number()),
});

export const propsSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  series: z.array(seriesSchema).min(2).optional(),
  steps: z.array(stepSchema).min(2).optional(),
  topN: z.number().int().min(1).optional(),
  secondsPerStep: z.number().positive().optional(),
  holdDuration: z.number().nonnegative().optional(),
  fps: z.number().int().min(1).optional(),
  valueSuffix: z.string().optional(),
});

type SeriesDef = z.infer<typeof seriesSchema>;
type StepDef = z.infer<typeof stepSchema>;
export type BarChartRaceProps = z.infer<typeof propsSchema>;

export const DEFAULT_SERIES: SeriesDef[] = [
  { id: "javascript", label: "JavaScript", color: "#f7df1e" },
  { id: "python", label: "Python", color: "#3776ab" },
  { id: "java", label: "Java", color: "#e76f00" },
  { id: "typescript", label: "TypeScript", color: "#3178c6" },
  { id: "cpp", label: "C++", color: "#00599c" },
  { id: "csharp", label: "C#", color: "#68217a" },
  { id: "php", label: "PHP", color: "#787cb5" },
  { id: "go", label: "Go", color: "#00add8" },
  { id: "rust", label: "Rust", color: "#b7410e" },
  { id: "kotlin", label: "Kotlin", color: "#7f52ff" },
];

// Made-up but plausible numbers — illustrative, not real.
export const DEFAULT_STEPS: StepDef[] = [
  { time: "2016", values: { javascript: 850, java: 900, python: 400, cpp: 400, csharp: 350, php: 600, typescript: 50, go: 80, rust: 20, kotlin: 30 } },
  { time: "2017", values: { javascript: 900, java: 920, python: 550, cpp: 410, csharp: 370, php: 580, typescript: 120, go: 130, rust: 40, kotlin: 80 } },
  { time: "2018", values: { javascript: 950, java: 900, python: 720, cpp: 420, csharp: 400, php: 540, typescript: 240, go: 200, rust: 80, kotlin: 140 } },
  { time: "2019", values: { javascript: 1000, java: 870, python: 900, cpp: 440, csharp: 420, php: 500, typescript: 400, go: 290, rust: 130, kotlin: 200 } },
  { time: "2020", values: { javascript: 1050, java: 830, python: 1050, cpp: 460, csharp: 440, php: 460, typescript: 580, go: 370, rust: 190, kotlin: 260 } },
  { time: "2021", values: { javascript: 1100, java: 800, python: 1200, cpp: 480, csharp: 460, php: 420, typescript: 750, go: 440, rust: 270, kotlin: 320 } },
  { time: "2022", values: { javascript: 1140, java: 770, python: 1350, cpp: 500, csharp: 480, php: 380, typescript: 920, go: 500, rust: 360, kotlin: 370 } },
  { time: "2023", values: { javascript: 1180, java: 740, python: 1500, cpp: 520, csharp: 500, php: 340, typescript: 1080, go: 550, rust: 460, kotlin: 410 } },
  { time: "2024", values: { javascript: 1200, java: 720, python: 1650, cpp: 540, csharp: 520, php: 300, typescript: 1240, go: 600, rust: 560, kotlin: 440 } },
];

export const previewProps: BarChartRaceProps = {
  title: "Programming language popularity",
  subtitle: "Repositories created (millions, illustrative)",
  series: DEFAULT_SERIES,
  steps: DEFAULT_STEPS,
  topN: 10,
  secondsPerStep: 1.2,
  holdDuration: 2,
  fps: 30,
  valueSuffix: "M",
};

export async function* runner({
  props: {
    title = "Programming language popularity",
    subtitle = "Repositories created (millions, illustrative)",
    series = DEFAULT_SERIES,
    steps = DEFAULT_STEPS,
    topN = 10,
    secondsPerStep = 1.2,
    holdDuration = 2,
    fps = 30,
    valueSuffix = "M",
  },
  bounds: { width, height },
}: RunnerArgs<BarChartRaceProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);

  // Pre-compute integer-step ranks (0 = top). Series sharing a step value get
  // stable ordering by id.
  const ranksAtStep = steps.map((step) => {
    const sorted = [...series].sort((a, b) => {
      const va = step.values[a.id] ?? 0;
      const vb = step.values[b.id] ?? 0;
      if (vb !== va) return vb - va;
      return a.id.localeCompare(b.id);
    });
    const m = new Map<string, number>();
    sorted.forEach((s, idx) => m.set(s.id, idx));
    return m;
  });

  // Bar widths scale to each frame's leader so the leading bar always fills
  // the chart — the classic race feel.

  const stepCount = steps.length;
  const transitionDuration = (stepCount - 1) * secondsPerStep;
  const totalDuration = transitionDuration + holdDuration;
  const frameCount = Math.max(1, Math.round(totalDuration * fps));

  const layout = computeLayout(width, height, topN);
  const {
    padding,
    titleSize,
    subtitleSize,
    yearSize,
    barAreaStart,
    barAreaWidth,
    chartTopY,
    rowSpacing,
    barHeight,
    barRadius,
    labelFontSize,
    valueFontSize,
  } = layout;

  // Render header (title + subtitle) once. This also globally registers the
  // fonts so direct ctx.fillText below can use them.
  const baseCanvas = createCanvas(width, height);
  const baseCtx = baseCanvas.getContext("2d");
  await renderReactElement(
    baseCtx,
    <Header
      width={width}
      height={height}
      padding={padding}
      title={title}
      subtitle={subtitle}
      titleSize={titleSize}
      subtitleSize={subtitleSize}
    />,
    { fonts },
  );

  yield* tween(frameCount, async ({ lower: t }) => {
    const seconds = t * totalDuration;
    const stepF = Math.min(stepCount - 1, seconds / secondsPerStep);
    const lowIdx = Math.floor(stepF);
    const highIdx = Math.min(stepCount - 1, lowIdx + 1);
    const local = stepF - lowIdx;
    const easedLocal = easeInOutCubic(local);

    const sLow = steps[lowIdx];
    const sHigh = steps[highIdx];
    const rLow = ranksAtStep[lowIdx];
    const rHigh = ranksAtStep[highIdx];

    // Catmull-Rom over the four neighboring step values gives a globally
    // smooth curve that still passes through each year's value exactly. No
    // velocity discontinuities at year boundaries → bars grow gradually.
    const v0Idx = Math.max(0, lowIdx - 1);
    const v3Idx = Math.min(stepCount - 1, highIdx + 1);
    const interp = series.map((s) => {
      const v0 = steps[v0Idx].values[s.id] ?? 0;
      const v1 = sLow.values[s.id] ?? 0;
      const v2 = sHigh.values[s.id] ?? 0;
      const v3 = steps[v3Idx].values[s.id] ?? 0;
      const value = Math.max(0, catmullRom(v0, v1, v2, v3, local));
      const orL = rLow.get(s.id) ?? series.length;
      const orH = rHigh.get(s.id) ?? series.length;
      const rank = orL + (orH - orL) * easedLocal;
      return { ...s, value, rank };
    });

    // Frame leader value — bars scale relative to it. Use the larger of the
    // two adjacent steps' leaders so the scale doesn't dip during a transition.
    const stepMax = Math.max(
      ...series.map((s) =>
        Math.max(sLow.values[s.id] ?? 0, sHigh.values[s.id] ?? 0),
      ),
    );
    const scaleMax = stepMax * 1.02;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseCanvas, 0, 0);

    drawYearLabel(
      ctx,
      width - padding,
      padding + yearSize * 0.55,
      yearSize,
      sLow.time,
      sHigh.time,
      lowIdx === highIdx ? 0 : local,
    );

    for (const s of interp) {
      if (s.rank > topN + 0.4) continue;
      const y = chartTopY + (s.rank + 0.5) * rowSpacing;
      const barW = (s.value / scaleMax) * barAreaWidth;

      // Bar
      ctx.fillStyle = s.color;
      drawRoundedRect(
        ctx,
        barAreaStart,
        y - barHeight / 2,
        Math.max(0, barW),
        barHeight,
        barRadius,
      );
      ctx.fill();

      // Label (right-aligned in the left gutter).
      ctx.fillStyle = "#1a1a1a";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${labelFontSize}px Inter`;
      ctx.fillText(s.label, barAreaStart - Math.round(width * 0.008), y);

      // Value (just past the bar end).
      ctx.fillStyle = "#3a3a3a";
      ctx.textAlign = "left";
      ctx.font = `700 ${valueFontSize}px Inter`;
      ctx.fillText(
        formatValue(s.value, valueSuffix),
        barAreaStart + Math.max(0, barW) + Math.round(width * 0.008),
        y,
      );
    }

    return canvas.encode("png");
  });
}

export type Layout = ReturnType<typeof computeLayout>;

export function computeLayout(width: number, height: number, topN: number) {
  const padding = Math.round(width * 0.04);
  const titleSize = Math.round(height * 0.05);
  const subtitleSize = Math.round(height * 0.022);
  const yearSize = Math.round(height * 0.22);

  const labelAreaWidth = Math.round(width * 0.135);
  const valueAreaWidth = Math.round(width * 0.1);
  const barAreaStart = padding + labelAreaWidth + Math.round(width * 0.012);
  const barAreaEnd = width - padding - valueAreaWidth;
  const barAreaWidth = barAreaEnd - barAreaStart;

  const headerHeight =
    padding + titleSize + Math.round(height * 0.012) + subtitleSize;
  const chartTopY = headerHeight + Math.round(height * 0.06);
  const chartBottomY = height - padding;
  const rowSpacing = (chartBottomY - chartTopY) / topN;
  const barHeight = Math.round(rowSpacing * 0.62);
  const barRadius = Math.max(4, Math.round(barHeight * 0.15));
  const labelFontSize = Math.round(rowSpacing * 0.32);
  const valueFontSize = Math.round(rowSpacing * 0.34);

  return {
    width,
    height,
    padding,
    titleSize,
    subtitleSize,
    yearSize,
    labelAreaWidth,
    valueAreaWidth,
    barAreaStart,
    barAreaEnd,
    barAreaWidth,
    chartTopY,
    chartBottomY,
    rowSpacing,
    barHeight,
    barRadius,
    labelFontSize,
    valueFontSize,
  };
}

export function Header({
  width,
  height,
  padding,
  title,
  subtitle,
  titleSize,
  subtitleSize,
}: {
  width: number;
  height: number;
  padding: number;
  title: string;
  subtitle: string;
  titleSize: number;
  subtitleSize: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: "white",
        display: "flex",
        flexDirection: "column",
        padding,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          fontSize: titleSize,
          fontWeight: 700,
          color: "#1a1a1a",
          lineHeight: 1.1,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: subtitleSize,
          color: "#888",
          marginTop: Math.round(height * 0.01),
          fontWeight: 400,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

export function drawYearLabel(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  size: number,
  current: string,
  next: string,
  local: number,
) {
  const fadeStart = 0.7;
  const blend =
    local <= fadeStart ? 0 : (local - fadeStart) / (1 - fadeStart);
  const alphaCurrent = current === next ? 1 : 1 - blend;
  const alphaNext = current === next ? 0 : blend;

  ctx.save();
  ctx.font = `700 ${size}px Inter`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";

  if (alphaCurrent > 0) {
    ctx.fillStyle = `rgba(20, 20, 20, ${0.07 * alphaCurrent})`;
    ctx.fillText(current, x, y);
  }
  if (alphaNext > 0) {
    ctx.fillStyle = `rgba(20, 20, 20, ${0.07 * alphaNext})`;
    ctx.fillText(next, x, y);
  }
  ctx.restore();
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export function formatValue(v: number, suffix: string) {
  return Math.round(v).toLocaleString("en-US") + suffix;
}

export function drawRoundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (w <= 0) return;
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}
