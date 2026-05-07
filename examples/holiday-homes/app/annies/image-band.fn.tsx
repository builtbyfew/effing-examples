import { z } from "zod";
import { tween } from "@effing/tween";
import { createCanvas, loadImage } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";

export const propsSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1),
  duration: z.number().positive().optional(),
  fps: z.number().positive().optional(),
});

export type ImageBandProps = z.infer<typeof propsSchema>;

export const previewProps: ImageBandProps = {
  imageUrls: [
    "https://static.effing.dev/unsplash/white-villa/wide.jpg",
    "https://static.effing.dev/unsplash/white-villa/elevated.jpg",
    "https://static.effing.dev/unsplash/white-villa/bedroom.jpg",
    "https://static.effing.dev/unsplash/white-villa/bathroom.jpg",
    "https://static.effing.dev/unsplash/white-villa/portrait.jpg",
  ],
  duration: 8,
  fps: 30,
};

export async function* runner({
  props: { imageUrls, duration = 6, fps = 30 },
  bounds: { width, height },
}: RunnerArgs<ImageBandProps>): AnnieRunnerReturn {
  const frameCount = Math.max(1, Math.round(duration * fps));
  const images = await Promise.all(
    imageUrls.map(async (url) => {
      const buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
      return loadImage(buffer);
    }),
  );

  const tileWidths = images.map((img) =>
    Math.max(1, Math.round((height / img.height) * img.width)),
  );
  const stripWidth = tileWidths.reduce((sum, w) => sum + w, 0);

  yield* tween(frameCount, async ({ lower: p }) => {
    const offset = p * stripWidth;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    let stripStart = -offset;
    while (stripStart < width) {
      let x = stripStart;
      for (let i = 0; i < images.length; i++) {
        const w = tileWidths[i];
        if (x + w >= 0 && x <= width) {
          ctx.drawImage(images[i], x, 0, w, height);
        }
        x += w;
      }
      stripStart += stripWidth;
    }

    return canvas.encode("jpeg");
  });
}
