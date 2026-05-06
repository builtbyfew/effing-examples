import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { ImageRunnerReturn, RunnerArgs } from "@effing/fn";
import { loadFonts, manropeBold, manropeSemiBold } from "~/fonts";
import { PillListOverlay } from "~/annies/pill-list.fn";

export const propsSchema = z.object({
  pills: z.array(
    z.object({
      text: z.string(),
      variant: z.enum(["dark", "light"]).optional(),
    }),
  ),
  fontSize: z.number().int().min(1),
  pillIndex: z.number().int().min(0).optional(),
});

export type ListingPromoPillsProps = z.infer<typeof propsSchema>;

export const previewProps: ListingPromoPillsProps = {
  pills: [
    { text: "JUST LISTED", variant: "dark" },
    { text: "Marbella, Spain 29602", variant: "light" },
  ],
  fontSize: 64,
};

export async function runner({
  props: { pills, fontSize, pillIndex },
  bounds: { width, height },
}: RunnerArgs<ListingPromoPillsProps>): ImageRunnerReturn {
  const fonts = await loadFonts([manropeSemiBold, manropeBold]);
  const canvas = createCanvas(width, height);
  const progresses =
    pillIndex === undefined
      ? pills.map(() => 1)
      : pills.map((_pill, i) => (i === pillIndex ? 1 : 0));

  await renderReactElement(
    canvas.getContext("2d"),
    <PillListOverlay
      pills={pills}
      fontSize={fontSize}
      progresses={progresses}
      horizontalAlignment="left"
      verticalAlignment="bottom"
      width={width}
      height={height}
    />,
    { fonts },
  );

  return canvas.encode("png");
}
