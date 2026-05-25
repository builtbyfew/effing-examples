import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interSemiBold, loadFonts } from "~/fonts";
import { DayBadge } from "~/components/day-badge";

export const propsSchema = z.object({
  dateLabel: z.string().min(1),
});

export type DayBadgeImageProps = z.infer<typeof propsSchema>;

export const previewProps: DayBadgeImageProps = {
  dateLabel: "MON, 04 MAY",
};

export async function runner({
  props: { dateLabel },
  bounds: { width, height },
}: RunnerArgs<DayBadgeImageProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interSemiBold]);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <DayBadge dateLabel={dateLabel} width={width} height={height} />,
    { fonts },
  );
  return canvas.encode("png");
}
