import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interBold, loadFonts } from "~/fonts";
import { PelicanOnBike } from "~/components/pelican-on-bike";
import { TemperatureDisplay } from "~/components/temperature-display";
import { WeatherScene } from "~/components/weather-scene";
import { skyGradient, wmoCategory } from "~/components/weather-codes";

export const propsSchema = z.object({
  city: z.string().min(1),
  maxTemperature: z.number(),
  wmoCode: z.number().int().nonnegative(),
});

export type WeatherPelicansCoverProps = z.infer<typeof propsSchema>;

export const previewProps: WeatherPelicansCoverProps = {
  city: "Ghent",
  maxTemperature: 18,
  wmoCode: 2,
};

export async function runner({
  props: { city, maxTemperature, wmoCode },
  bounds: { width, height },
}: RunnerArgs<WeatherPelicansCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interBold]);
  const sky = skyGradient(wmoCategory(wmoCode));
  const pelicanWidth = Math.round(width * 0.7);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <div
      style={{
        width,
        height,
        display: "flex",
        backgroundImage: `linear-gradient(180deg, ${sky.top} 0%, ${sky.bottom} 100%)`,
      }}
    >
      <WeatherScene
        wmoCode={wmoCode}
        progress={0.4}
        width={width}
        height={height}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: Math.round(height * 0.08),
        }}
      >
        <PelicanOnBike width={pelicanWidth} wheelAngle={20} bobOffset={0} />
      </div>
      <TemperatureDisplay
        city={city}
        maxTemperature={maxTemperature}
        width={width}
        height={height}
      />
    </div>,
    { fonts },
  );
  return canvas.encode("jpeg");
}
