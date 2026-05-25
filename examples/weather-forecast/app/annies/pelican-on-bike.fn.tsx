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
  const pelicanWidth = Math.round(width * 0.88);

  yield* tween(frameCount, async ({ lower: p }) => {
    const wheelAngle = p * 360 * wheelTurns;
    const bobOffset = Math.sin((p * Math.PI * 14) / 3) * bobAmplitude;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    await renderReactElement(
      ctx,
      <div style={{ width, height, display: "flex" }}>
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
          <PelicanOnBike
            width={pelicanWidth}
            wheelAngle={wheelAngle}
            bobOffset={bobOffset}
            progress={p}
          />
        </div>
      </div>,
      { fonts: [] },
    );
    return canvas.encode("png");
  });
}
