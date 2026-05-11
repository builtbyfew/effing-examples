import { z } from "zod";
import { createCanvas, loadImage, registerFont } from "@effing/canvas";
import { attilaSansSharpBold, trimPosterFat, loadFonts } from "~/fonts";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";

export const propsSchema = z.object({
  photoUrl: z.string().optional(),
});

export type AccentJobAdCoverProps = z.infer<typeof propsSchema>;

export const previewProps: AccentJobAdCoverProps = {
  photoUrl: "/team-photo-3.jpg",
};

export async function runner({
  props: { photoUrl = "/team-photo-3.jpg" },
  bounds: { width, height },
}: RunnerArgs<AccentJobAdCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([trimPosterFat, attilaSansSharpBold]);
  fonts.forEach(registerFont);

  const baseUrl = process.env.BASE_URL ?? "http://localhost:3839";
  const fullUrl = photoUrl.startsWith("http") ? photoUrl : `${baseUrl}${photoUrl}`;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#E84610";
  ctx.fillRect(0, 0, width, height);

  try {
    const res = await fetch(fullUrl);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      const img = await loadImage(Buffer.from(buf));
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      let dw: number, dh: number, dx: number, dy: number;
      if (imgRatio > canvasRatio) {
        dh = height;
        dw = dh * imgRatio;
        dx = (width - dw) / 2;
        dy = 0;
      } else {
        dw = width;
        dh = dw / imgRatio;
        dx = 0;
        dy = (height - dh) / 2;
      }
      ctx.drawImage(img, dx, dy, dw, dh);
    }
  } catch {
    // Photo unavailable — keep the orange background.
  }

  return canvas.encode("jpeg");
}
