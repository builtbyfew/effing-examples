import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interBold, interSemiBold, loadFonts } from "~/fonts";
import { DayBadge } from "~/components/day-badge";
import { PelicanOnBike } from "~/components/pelican-on-bike";
import { TemperatureDisplay } from "~/components/temperature-display";
import { WeatherScene } from "~/components/weather-scene";
import { skyGradient, wmoCategory } from "~/components/weather-codes";

export const propsSchema = z.object({
  city: z.string().min(1),
  dateLabel: z.string().min(1),
  maxTemperature: z.number(),
  wmoCode: z.number().int().nonnegative(),
});

export type WeatherPelicansCoverProps = z.infer<typeof propsSchema>;

export const previewProps: WeatherPelicansCoverProps = {
  city: "Ghent",
  dateLabel: "MON, 04 MAY",
  maxTemperature: 18,
  wmoCode: 2,
};

export async function runner({
  props: { city, dateLabel, maxTemperature, wmoCode },
  bounds: { width, height },
}: RunnerArgs<WeatherPelicansCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interBold, interSemiBold]);
  const sky = skyGradient(wmoCategory(wmoCode));
  const pelicanWidth = Math.round(width * 0.88);

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
          left: -Math.round(width * 0.18),
          right: 0,
          bottom: Math.round(height * 0.04),
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <PelicanOnBike width={pelicanWidth} wheelAngle={20} bobOffset={0} />
      </div>
      <DayBadge dateLabel={dateLabel} width={width} height={height} />
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
