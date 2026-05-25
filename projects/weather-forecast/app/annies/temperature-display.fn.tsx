import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { tween, easeOutQuad } from "@effing/tween";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { interBold, loadFonts } from "~/fonts";
import { TemperatureDisplay } from "~/components/temperature-display";

export const propsSchema = z.object({
  city: z.string().min(1),
  maxTemperature: z.number(),
  frameCount: z.number().int().min(1),
  countingFrameCount: z.number().int().min(1).optional(),
});

export type TemperatureDisplayAnnieProps = z.infer<typeof propsSchema>;

export const previewProps: TemperatureDisplayAnnieProps = {
  city: "Ghent",
  maxTemperature: 18,
  frameCount: 90,
};

export async function* runner({
  props: {
    city,
    maxTemperature,
    frameCount,
    countingFrameCount = Math.min(30, frameCount),
  },
  bounds: { width, height },
}: RunnerArgs<TemperatureDisplayAnnieProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interBold]);

  const target = Math.round(maxTemperature);
  // Generalized for negatives: count outward from ±1 toward the target, so
  // positive temps tick up (1 → 18) and negative temps tick down (-1 → -5).
  const start = target >= 0 ? 1 : -1;
  const counting = Math.min(countingFrameCount, frameCount);
  const hold = frameCount - counting;

  async function renderFrame(displayTemperature: number) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    await renderReactElement(
      ctx,
      <TemperatureDisplay
        city={city}
        maxTemperature={maxTemperature}
        displayTemperature={displayTemperature}
        width={width}
        height={height}
      />,
      { fonts },
    );
    return canvas.encode("png");
  }

  yield* tween(counting, async ({ lower: p }) => {
    const value = Math.round(start + (target - start) * easeOutQuad(p));
    return renderFrame(value);
  });

  if (hold > 0) {
    const finalFrame = await renderFrame(target);
    yield* tween(hold, async () => finalFrame);
  }
}
