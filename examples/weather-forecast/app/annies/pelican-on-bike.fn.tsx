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
  frameCount: 105,
  wheelTurns: 7 / 3,
  bobAmplitude: 8,
};

// All sin() multipliers in this annie and `~/components/pelican-on-bike` are
// chosen so the animation is invariant under a 6/7 progress shift — i.e. one
// natural cycle every 1.5s of a 3.5s annie. That matches the wipe overlap
// (3s / 3.5s = 6/7) used by the weather-pelicans effie, so a single shared
// `#pelican` source renders continuously across every wipe.

export async function* runner({
  props: { frameCount = 105, wheelTurns = 7 / 3, bobAmplitude = 8 },
  bounds: { width, height },
}: RunnerArgs<PelicanOnBikeProps>): AnnieRunnerReturn {
  const pelicanWidth = Math.round(width * 0.7);

  yield* tween(frameCount, async ({ lower: p }) => {
    const wheelAngle = p * 360 * wheelTurns;
    const bobOffset = Math.sin((p * Math.PI * 14) / 3) * bobAmplitude;

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
