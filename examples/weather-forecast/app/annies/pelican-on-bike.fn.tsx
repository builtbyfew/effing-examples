import { z } from "zod";
import { tween } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { PelicanOnBike } from "~/components/pelican-on-bike";

export const propsSchema = z.object({
  frameCount: z.number().int().min(1).optional(),
  wheelTurns: z.number().positive().optional(),
  bobAmplitude: z.number().nonnegative().optional(),
});

export type PelicanOnBikeProps = z.infer<typeof propsSchema>;

export const previewProps: PelicanOnBikeProps = {
  frameCount: 90,
  wheelTurns: 2,
  bobAmplitude: 8,
};

export async function* runner({
  props: { frameCount = 90, wheelTurns = 2, bobAmplitude = 8 },
  bounds: { width, height },
}: RunnerArgs<PelicanOnBikeProps>): AnnieRunnerReturn {
  const pelicanWidth = Math.round(width * 0.7);

  yield* tween(frameCount, async ({ lower: p }) => {
    const wheelAngle = p * 360 * wheelTurns;
    const bobOffset = Math.sin(p * Math.PI * 4) * bobAmplitude;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    await renderReactElement(
      ctx,
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: Math.round(height * 0.08),
        }}
      >
        <PelicanOnBike
          width={pelicanWidth}
          wheelAngle={wheelAngle}
          bobOffset={bobOffset}
          progress={p}
        />
      </div>,
      { fonts: [] },
    );
    return canvas.encode("png");
  });
}
