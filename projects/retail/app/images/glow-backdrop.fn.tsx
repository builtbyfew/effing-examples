import { z } from "zod";
import { createCanvas } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";

// The logo intro's backdrop as a still — the dark vertical gradient with a
// soft accent glow — so other segments (the chat-promo CTA outro) can share
// the same treatment.

export const propsSchema = z.object({
  accentColor: z.string().optional(),
  // Vertical center of the glow, as a fraction of the height.
  glowY: z.number().min(0).max(1).optional(),
});

export type GlowBackdropProps = z.infer<typeof propsSchema>;

export const previewProps: GlowBackdropProps = {};

function accentRgb(color: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(color);
  if (!match) return [124, 92, 214]; // the default accent
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export async function runner({
  props: { accentColor = "#7c5cd6", glowY = 0.42 },
  bounds: { width, height },
}: RunnerArgs<GlowBackdropProps>): ImageRunnerReturn {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const min = Math.min(width, height);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#1d1530");
  bg.addColorStop(1, "#0e0a18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const [ar, ag, ab] = accentRgb(accentColor);
  const glow = ctx.createRadialGradient(
    width / 2,
    height * glowY,
    0,
    width / 2,
    height * glowY,
    min * 0.52,
  );
  glow.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, 0.3)`);
  glow.addColorStop(1, `rgba(${ar}, ${ag}, ${ab}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  return canvas.encode("jpeg");
}
