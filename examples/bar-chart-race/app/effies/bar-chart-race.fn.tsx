import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import {
  DEFAULT_SERIES,
  DEFAULT_STEPS,
  type BarChartRaceProps,
} from "~/annies/bar-chart-race.fn";
import type { BarChartRaceCoverProps } from "~/images/bar-chart-race-cover.fn";

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
  valueSuffix: z.string().optional(),
});

type BarChartRaceEffieProps = z.infer<typeof propsSchema>;

export const previewProps: BarChartRaceEffieProps = {
  title: "Programming language popularity",
  subtitle: "Repositories created (millions, illustrative)",
  series: DEFAULT_SERIES,
  steps: DEFAULT_STEPS,
  topN: 10,
  secondsPerStep: 1.2,
  holdDuration: 2,
  valueSuffix: "M",
};

export async function runner({
  props: {
    title = "Programming language popularity",
    subtitle = "Repositories created (millions, illustrative)",
    series = DEFAULT_SERIES,
    steps = DEFAULT_STEPS,
    topN = 10,
    secondsPerStep = 1.2,
    holdDuration = 2,
    valueSuffix = "M",
  },
  bounds: { width, height },
}: RunnerArgs<BarChartRaceEffieProps>): EffieRunnerReturn {
  const fps = 30;
  const duration = (steps.length - 1) * secondsPerStep + holdDuration;

  const cover = await fnUrl(
    "image",
    "bar-chart-race-cover",
    {
      title,
      subtitle,
      series,
      steps,
      topN,
      valueSuffix,
    } satisfies BarChartRaceCoverProps,
    { width, height },
  );

  const animation = await fnUrl(
    "annie",
    "bar-chart-race",
    {
      title,
      subtitle,
      series,
      steps,
      topN,
      secondsPerStep,
      holdDuration,
      fps,
      valueSuffix,
    } satisfies BarChartRaceProps,
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
