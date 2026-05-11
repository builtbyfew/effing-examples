import { z } from "zod";
import { tween } from "@effing/tween";
import {
  createCanvas,
  renderReactElement,
  type SKRSContext2D,
} from "@effing/canvas";
import { openSansRegular, openSansSemiBold, loadFonts } from "~/fonts";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";

export const propsSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  data: z
    .array(z.object({ label: z.string(), value: z.number() }))
    .min(2)
    .optional(),
  yMax: z.number().positive().optional(),
  yStep: z.number().positive().optional(),
  drawDuration: z.number().positive().optional(),
  holdDuration: z.number().nonnegative().optional(),
  fps: z.number().int().min(1).optional(),
});

export type ProduceSalesChartProps = z.infer<typeof propsSchema>;

export const DEFAULT_DATA = [
  { label: "APPLES", value: 35 },
  { label: "PEARS", value: 63 },
  { label: "LIMES", value: 31 },
  { label: "LEMONS", value: 34 },
  { label: "DATES", value: 44 },
  { label: "GRAPES", value: 11 },
  { label: "KIWIS", value: 24 },
  { label: "PLUMS", value: 53 },
  { label: "PEACHES", value: 77 },
];

export const previewProps: ProduceSalesChartProps = {
  title: "Produce sales",
  subtitle: "IN THOUSANDS (USD)",
  data: DEFAULT_DATA,
  yMax: 90,
  yStep: 10,
  drawDuration: 3,
  holdDuration: 1.2,
  fps: 30,
};

const TITLE_COLOR = "#4a4a4a";
const MUTED_COLOR = "#a8a8a8";
const AXIS_COLOR = "#cfcfcf";
const LINE_COLOR = "#000";

export async function* runner({
  props: {
    title = "Produce sales",
    subtitle = "IN THOUSANDS (USD)",
    data = DEFAULT_DATA,
    yMax = 90,
    yStep = 10,
    drawDuration = 3,
    holdDuration = 1.2,
    fps = 30,
  },
  bounds: { width, height },
}: RunnerArgs<ProduceSalesChartProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([openSansRegular, openSansSemiBold]);

  const plotLeft = Math.round(width * 0.085);
  const plotRight = width - Math.round(width * 0.04);
  const plotTop = Math.round(height * 0.23);
  const plotBottom = height - Math.round(height * 0.13);
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const points: Point[] = data.map((d, i) => ({
    label: d.label,
    value: d.value,
    x: plotLeft + (i * plotWidth) / (data.length - 1),
    y: plotBottom - (d.value / yMax) * plotHeight,
  }));

  const yLabels: number[] = [];
  for (let v = 0; v <= yMax + 1e-6; v += yStep) yLabels.push(Math.round(v));

  const baseCanvas = createCanvas(width, height);
  const baseCtx = baseCanvas.getContext("2d");
  await renderReactElement(
    baseCtx,
    <ChartFrame
      width={width}
      height={height}
      title={title}
      subtitle={subtitle}
      yLabels={yLabels}
      yMax={yMax}
      data={data}
      plotLeft={plotLeft}
      plotRight={plotRight}
      plotTop={plotTop}
      plotBottom={plotBottom}
    />,
    { fonts },
  );
  drawAxisBaseline(baseCtx, points, plotLeft, plotRight, plotBottom, height);

  const totalDuration = drawDuration + holdDuration;
  const frameCount = Math.max(1, Math.round(totalDuration * fps));

  const dotRadius = Math.max(8, Math.round(height * 0.018));
  const lineWidth = Math.max(4, Math.round(height * 0.008));
  const popDuration = 0.25;

  yield* tween(frameCount, async ({ lower: t }) => {
    const seconds = t * totalDuration;
    const lineP = Math.min(1, seconds / drawDuration);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseCanvas, 0, 0);

    drawProgressiveLine(ctx, points, lineP, lineWidth);
    drawProgressiveDots(ctx, points, seconds, drawDuration, popDuration, dotRadius);

    return canvas.encode("png");
  });
}

export type Point = { x: number; y: number; label: string; value: number };

export function drawAxisBaseline(
  ctx: SKRSContext2D,
  points: Point[],
  plotLeft: number,
  plotRight: number,
  plotBottom: number,
  height: number,
) {
  const tickLength = Math.max(4, Math.round(height * 0.012));
  ctx.save();
  ctx.strokeStyle = AXIS_COLOR;
  ctx.lineWidth = Math.max(1, Math.round(height * 0.0015));
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  ctx.lineWidth = Math.max(1, Math.round(height * 0.0015));
  for (const p of points) {
    ctx.beginPath();
    ctx.moveTo(p.x, plotBottom);
    ctx.lineTo(p.x, plotBottom + tickLength);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawProgressiveLine(
  ctx: SKRSContext2D,
  points: Point[],
  p: number,
  lineWidth: number,
) {
  if (p <= 0) return;
  const xStart = points[0].x;
  const xEnd = points[points.length - 1].x;
  const xCurrent = xStart + (xEnd - xStart) * p;

  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = LINE_COLOR;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cur = points[i];
    if (xCurrent >= cur.x) {
      ctx.lineTo(cur.x, cur.y);
      continue;
    }
    const prev = points[i - 1];
    const t = (xCurrent - prev.x) / (cur.x - prev.x);
    ctx.lineTo(prev.x + t * (cur.x - prev.x), prev.y + t * (cur.y - prev.y));
    break;
  }
  ctx.stroke();
  ctx.restore();
}

export function drawProgressiveDots(
  ctx: SKRSContext2D,
  points: Point[],
  seconds: number,
  drawDuration: number,
  popDuration: number,
  radius: number,
) {
  const N = points.length;

  for (let i = 0; i < N; i++) {
    const tDot = drawDuration * (i / (N - 1));
    if (seconds < tDot) continue;
    const local = Math.min(1, (seconds - tDot) / popDuration);
    const scale = popEase(local);
    if (scale <= 0) continue;

    ctx.save();
    ctx.translate(points[i].x, points[i].y);
    ctx.scale(scale, scale);
    ctx.fillStyle = LINE_COLOR;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function popEase(t: number): number {
  // Overshoot to 1.18 then settle to 1.0.
  const peak = 1.18;
  if (t < 0.7) {
    const u = t / 0.7;
    return peak * (3 * u * u - 2 * u * u * u);
  }
  const u = (t - 0.7) / 0.3;
  return peak + (1 - peak) * (3 * u * u - 2 * u * u * u);
}

export function ChartFrame({
  width,
  height,
  title,
  subtitle,
  yLabels,
  yMax,
  data,
  plotLeft,
  plotRight,
  plotTop,
  plotBottom,
}: {
  width: number;
  height: number;
  title: string;
  subtitle: string;
  yLabels: number[];
  yMax: number;
  data: { label: string; value: number }[];
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
}) {
  const titleSize = Math.round(height * 0.058);
  const subtitleSize = Math.round(height * 0.022);
  const yLabelSize = Math.round(height * 0.026);
  const xLabelSize = Math.round(height * 0.026);
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;
  const yLabelGap = Math.round(width * 0.012);
  const xLabelGap = Math.round(height * 0.045);

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        display: "flex",
        backgroundColor: "white",
        fontFamily: "Open Sans",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: Math.round(height * 0.05),
          left: Math.round(width * 0.03),
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: titleSize,
            color: TITLE_COLOR,
            fontWeight: 600,
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: Math.round(height * 0.008),
            fontSize: subtitleSize,
            color: MUTED_COLOR,
            letterSpacing: 1,
            fontWeight: 400,
          }}
        >
          {subtitle}
        </div>
      </div>

      {yLabels.map((v) => {
        const y = plotBottom - (v / yMax) * plotHeight;
        return (
          <div
            key={v}
            style={{
              position: "absolute",
              top: y - yLabelSize * 0.7,
              left: 0,
              width: plotLeft - yLabelGap,
              display: "flex",
              justifyContent: "flex-end",
              fontSize: yLabelSize,
              color: MUTED_COLOR,
              fontWeight: 400,
            }}
          >
            {v}
          </div>
        );
      })}

      {data.map((d, i) => {
        const x = plotLeft + (i * plotWidth) / (data.length - 1);
        const cellWidth = Math.round(width * 0.18);
        return (
          <div
            key={d.label}
            style={{
              position: "absolute",
              top: plotBottom + xLabelGap,
              left: x - cellWidth / 2,
              width: cellWidth,
              display: "flex",
              justifyContent: "center",
              fontSize: xLabelSize,
              color: MUTED_COLOR,
              fontWeight: 400,
              letterSpacing: 0.5,
            }}
          >
            {d.label}
          </div>
        );
      })}
    </div>
  );
}
