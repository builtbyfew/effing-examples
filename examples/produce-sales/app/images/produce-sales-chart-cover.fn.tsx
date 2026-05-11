import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { openSansRegular, openSansSemiBold, loadFonts } from "~/fonts";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import {
  ChartFrame,
  DEFAULT_DATA,
  drawAxisBaseline,
  drawProgressiveDots,
  drawProgressiveLine,
  type Point,
} from "~/annies/produce-sales-chart.fn";

export const propsSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  data: z
    .array(z.object({ label: z.string(), value: z.number() }))
    .min(2)
    .optional(),
  yMax: z.number().positive().optional(),
  yStep: z.number().positive().optional(),
});

export type ProduceSalesChartCoverProps = z.infer<typeof propsSchema>;

export const previewProps: ProduceSalesChartCoverProps = {
  title: "Produce sales",
  subtitle: "IN THOUSANDS (USD)",
  data: DEFAULT_DATA,
  yMax: 90,
  yStep: 10,
};

export async function runner({
  props: {
    title = "Produce sales",
    subtitle = "IN THOUSANDS (USD)",
    data = DEFAULT_DATA,
    yMax = 90,
    yStep = 10,
  },
  bounds: { width, height },
}: RunnerArgs<ProduceSalesChartCoverProps>): ImageRunnerReturn {
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

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
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
  drawAxisBaseline(ctx, points, plotLeft, plotRight, plotBottom, height);

  const dotRadius = Math.max(8, Math.round(height * 0.018));
  const lineWidth = Math.max(4, Math.round(height * 0.008));
  // Final state: line fully drawn, every dot fully popped.
  drawProgressiveLine(ctx, points, 1, lineWidth);
  drawProgressiveDots(ctx, points, Number.POSITIVE_INFINITY, 1, 0.25, dotRadius);

  return canvas.encode("png");
}
