import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import {
  DEFAULT_DATA,
  type ProduceSalesChartProps,
} from "~/annies/produce-sales-chart.fn";
import type { ProduceSalesChartCoverProps } from "~/images/produce-sales-chart-cover.fn";

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
});

type ProduceSalesEffieProps = z.infer<typeof propsSchema>;

export const previewProps: ProduceSalesEffieProps = {
  title: "Produce sales",
  subtitle: "IN THOUSANDS (USD)",
  data: DEFAULT_DATA,
  yMax: 90,
  yStep: 10,
  drawDuration: 3,
  holdDuration: 1.2,
};

export async function runner({
  props: {
    title = "Produce sales",
    subtitle = "IN THOUSANDS (USD)",
    data = DEFAULT_DATA,
    yMax = 90,
    yStep = 10,
    drawDuration = 3,
    holdDuration = 1.2,
  },
  bounds: { width, height },
}: RunnerArgs<ProduceSalesEffieProps>): EffieRunnerReturn {
  const fps = 30;
  const duration = drawDuration + holdDuration;

  const cover = await fnUrl(
    "image",
    "produce-sales-chart-cover",
    {
      title,
      subtitle,
      data,
      yMax,
      yStep,
    } satisfies ProduceSalesChartCoverProps,
    { width, height },
  );

  const animation = await fnUrl(
    "annie",
    "produce-sales-chart",
    {
      title,
      subtitle,
      data,
      yMax,
      yStep,
      drawDuration,
      holdDuration,
      fps,
    } satisfies ProduceSalesChartProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps,
    cover,
    background: { type: "color", color: "white" },
    segments: [
      effieSegment({
        duration,
        layers: [{ type: "animation", source: animation }],
      }),
    ],
  });
}
