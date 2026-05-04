import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interBold, loadFonts } from "~/fonts";
import { TemperatureDisplay } from "~/components/temperature-display";

export const propsSchema = z.object({
  city: z.string().min(1),
  maxTemperature: z.number(),
});

export type TemperatureDisplayImageProps = z.infer<typeof propsSchema>;

export const previewProps: TemperatureDisplayImageProps = {
  city: "Ghent",
  maxTemperature: 18,
};

export async function runner({
  props: { city, maxTemperature },
  bounds: { width, height },
}: RunnerArgs<TemperatureDisplayImageProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interBold]);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <TemperatureDisplay
      city={city}
      maxTemperature={maxTemperature}
      width={width}
      height={height}
    />,
    { fonts },
  );
  return canvas.encode("png");
}
