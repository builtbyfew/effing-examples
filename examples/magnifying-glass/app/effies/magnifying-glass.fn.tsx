import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { MagnifyingGlassProps } from "~/annies/magnifying-glass.fn";
import type { MagnifyingGlassCoverProps } from "~/images/magnifying-glass-cover.fn";

export const propsSchema = z.object({
  text: z.string(),
  duration: z.number().positive().optional(),
  zoom: z.number().min(1).max(8).optional(),
  fontColor: z.string().optional(),
  backgroundColor: z.string().optional(),
});

type MagnifyingGlassEffieProps = z.infer<typeof propsSchema>;

export const previewProps: MagnifyingGlassEffieProps = {
  text: "read the fine print",
  duration: 5,
  zoom: 2.4,
  fontColor: "#0a0a0a",
  backgroundColor: "#fafafa",
};

export async function runner({
  props: {
    text,
    duration = 5,
    zoom = 2.4,
    fontColor = "#0a0a0a",
    backgroundColor = "#fafafa",
  },
  bounds: { width, height },
}: RunnerArgs<MagnifyingGlassEffieProps>): EffieRunnerReturn {
  const fps = 30;

  const cover = await fnUrl(
    "image",
    "magnifying-glass-cover",
    {
      text,
      fontColor,
      backgroundColor,
    } satisfies MagnifyingGlassCoverProps,
    { width, height },
  );

  const animation = await fnUrl(
    "annie",
    "magnifying-glass",
    {
      text,
      zoom,
      frameCount: Math.round(duration * fps),
      fontColor,
      backgroundColor,
    } satisfies MagnifyingGlassProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps,
    cover,
    background: { type: "color", color: backgroundColor },
    segments: [
      effieSegment({
        duration,
        layers: [{ type: "animation", source: animation }],
      }),
    ],
  });
}
