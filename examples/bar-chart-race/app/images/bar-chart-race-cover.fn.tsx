import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { interBold, interSemiBold, loadFonts } from "~/fonts";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import {
  DEFAULT_SERIES,
  DEFAULT_STEPS,
  Header,
  computeLayout,
  drawRoundedRect,
  drawYearLabel,
  formatValue,
} from "~/annies/bar-chart-race.fn";

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
  valueSuffix: z.string().optional(),
});

export type BarChartRaceCoverProps = z.infer<typeof propsSchema>;

export const previewProps: BarChartRaceCoverProps = {
  title: "Programming language popularity",
  subtitle: "Repositories created (millions, illustrative)",
  series: DEFAULT_SERIES,
  steps: DEFAULT_STEPS,
  topN: 10,
  valueSuffix: "M",
};

export async function runner({
  props: {
    title = "Programming language popularity",
    subtitle = "Repositories created (millions, illustrative)",
    series = DEFAULT_SERIES,
    steps = DEFAULT_STEPS,
    topN = 10,
    valueSuffix = "M",
  },
  bounds: { width, height },
}: RunnerArgs<BarChartRaceCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);
  const layout = computeLayout(width, height, topN);
  const finalStep = steps[steps.length - 1];

  const ranked = [...series]
    .map((s) => ({ ...s, value: finalStep.values[s.id] ?? 0 }))
    .sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));

  const scaleMax = (ranked[0]?.value ?? 1) * 1.02;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <Header
      width={width}
      height={height}
      padding={layout.padding}
      title={title}
      subtitle={subtitle}
      titleSize={layout.titleSize}
      subtitleSize={layout.subtitleSize}
    />,
    { fonts },
  );

  drawYearLabel(
    ctx,
    width - layout.padding,
    layout.padding + layout.yearSize * 0.55,
    layout.yearSize,
    finalStep.time,
    finalStep.time,
    0,
  );

  ranked.slice(0, topN).forEach((s, rank) => {
    const y = layout.chartTopY + (rank + 0.5) * layout.rowSpacing;
    const barW = (s.value / scaleMax) * layout.barAreaWidth;

    ctx.fillStyle = s.color;
    drawRoundedRect(
      ctx,
      layout.barAreaStart,
      y - layout.barHeight / 2,
      Math.max(0, barW),
      layout.barHeight,
      layout.barRadius,
    );
    ctx.fill();

    ctx.fillStyle = "#1a1a1a";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${layout.labelFontSize}px Inter`;
    ctx.fillText(s.label, layout.barAreaStart - Math.round(width * 0.008), y);

    ctx.fillStyle = "#3a3a3a";
    ctx.textAlign = "left";
    ctx.font = `700 ${layout.valueFontSize}px Inter`;
    ctx.fillText(
      formatValue(s.value, valueSuffix),
      layout.barAreaStart + Math.max(0, barW) + Math.round(width * 0.008),
      y,
    );
  });

  return canvas.encode("png");
}
