import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { ImageRunnerReturn, RunnerArgs } from "@effing/fn";

export const propsSchema = z.object({
  imageUrl: z.string().url(),
});

export type CoverPhotoProps = z.infer<typeof propsSchema>;

export const previewProps: CoverPhotoProps = {
  imageUrl: "https://static.effing.dev/unsplash/white-villa/wide.jpg",
};

export async function runner({
  props: { imageUrl },
  bounds: { width, height },
}: RunnerArgs<CoverPhotoProps>): ImageRunnerReturn {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <div
      style={{
        width,
        height,
        display: "flex",
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />,
  );
  return canvas.encode("jpeg");
}
