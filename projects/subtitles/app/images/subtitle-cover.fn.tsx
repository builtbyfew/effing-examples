import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import {
  CaptionOverlay,
  captionStyleSchema,
  loadCaptionFonts,
  resolveCaptionStyle,
} from "~/captions";

// Cover still for the subtitled video: the caption look frozen on its last
// word, centered on a gradient derived from the highlight color, so the
// thumbnail reads as "this video has captions".

export const propsSchema = z.object({
  text: z.string().min(1),
  ...captionStyleSchema.shape,
});

export type SubtitleCoverProps = z.infer<typeof propsSchema>;

export const previewProps: SubtitleCoverProps = {
  text: "Captions that actually slap",
};

/** Darken a `#rrggbb` color by the given factor (0 = black, 1 = unchanged). */
function shade(hex: string, factor: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const rgb = parseInt(match[1]!, 16);
  const channel = (shift: number) =>
    Math.round(((rgb >> shift) & 0xff) * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

export async function runner({
  props,
  bounds: { width, height },
}: RunnerArgs<SubtitleCoverProps>): ImageRunnerReturn {
  const style = resolveCaptionStyle(props, {
    fontSize: 96,
    verticalPosition: 0.5,
  });
  const fonts = await loadCaptionFonts();
  const words = props.text.split(/\s+/).filter(Boolean);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <div
      style={{
        width,
        height,
        display: "flex",
        backgroundImage: `linear-gradient(160deg, ${shade(style.highlightColor, 0.2)}, ${shade(style.highlightColor, 0.45)}, ${shade(style.highlightColor, 0.14)})`,
      }}
    >
      <CaptionOverlay
        words={words}
        activeIndex={words.length - 1}
        style={style}
        width={width}
        height={height}
      />
    </div>,
    { fonts },
  );
  return canvas.encode("png");
}
