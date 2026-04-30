import { z } from "zod";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { loadFonts, manropeSemiBold, manropeBold } from "~/fonts";
import { PillListOverlay } from "~/annies/pill-list.fn";

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  pills: z.array(
    z.object({
      text: z.string(),
      variant: z.enum(["dark", "light"]).optional(),
    }),
  ),
  fontSize: z.number().int().min(1),
});

export type ListingPromoCoverProps = z.infer<typeof propsSchema>;

export const previewProps: ListingPromoCoverProps = {
  imageUrl: "https://static.effing.dev/unsplash/white-villa/portrait.jpg",
  pills: [
    { text: "JUST LISTED", variant: "dark" },
    { text: "Marbella, Spain 29602", variant: "light" },
  ],
  fontSize: 64,
};

export async function runner({
  props: { imageUrl, pills, fontSize },
  bounds: { width, height },
}: RunnerArgs<ListingPromoCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([manropeSemiBold, manropeBold]);

  const canvas = createCanvas(width, height);
  await renderReactElement(
    canvas.getContext("2d"),
    <div
      style={{
        width,
        height,
        display: "flex",
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <PillListOverlay
        pills={pills}
        fontSize={fontSize}
        progresses={pills.map(() => 1)}
        horizontalAlignment="left"
        verticalAlignment="bottom"
        width={width}
        height={height}
      />
    </div>,
    { fonts },
  );

  return canvas.encode("jpeg");
}
