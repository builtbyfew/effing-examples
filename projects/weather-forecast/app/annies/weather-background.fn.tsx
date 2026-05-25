import { z } from "zod";
import { tween } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { WeatherScene } from "~/components/weather-scene";
import { skyGradient, wmoCategory } from "~/components/weather-codes";

export const propsSchema = z.object({
  wmoCode: z.number().int().nonnegative(),
  frameCount: z.number().int().min(1).optional(),
});

export type WeatherBackgroundProps = z.infer<typeof propsSchema>;

export const previewProps: WeatherBackgroundProps = {
  wmoCode: 61,
  frameCount: 90,
};

export async function* runner({
  props: { wmoCode, frameCount = 90 },
  bounds: { width, height },
}: RunnerArgs<WeatherBackgroundProps>): AnnieRunnerReturn {
  const sky = skyGradient(wmoCategory(wmoCode));

  yield* tween(frameCount, async ({ lower: p }) => {
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
          progress={p}
          width={width}
          height={height}
        />
      </div>,
      { fonts: [] },
    );
    return canvas.encode("jpeg");
  });
}
