import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { SubtitleCueOverlay } from "~/annies/subtitle-cue.fn";
import { interBlack, loadFonts } from "~/fonts";

// Cover still for the subtitled video: the caption styling from the
// subtitle-cue annie frozen mid-highlight on a dark gradient, so the
// thumbnail reads as "this video has captions".

export const propsSchema = z.object({
  text: z.string().min(1),
  fontSize: z.number().int().min(1).optional(),
  textColor: z.string().optional(),
  outlineColor: z.string().optional(),
  highlightColor: z.string().optional(),
  highlightTextColor: z.string().optional(),
});

export type SubtitleCoverProps = z.infer<typeof propsSchema>;

export const previewProps: SubtitleCoverProps = {
  text: "Captions that actually slap",
};

export async function runner({
  props: {
    text,
    fontSize = 96,
    textColor = "#ffffff",
    outlineColor = "#000000",
    highlightColor = "#5b2fd6",
    highlightTextColor = "#ffffff",
  },
  bounds: { width, height },
}: RunnerArgs<SubtitleCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interBlack]);

  // Fake per-word timings so the overlay highlights the last word: each word
  // "starts" at its index, and we render at t = words.length.
  const words = text
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => ({ text: word, start: i, end: i + 1 }));

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <div
      style={{
        width,
        height,
        display: "flex",
        backgroundImage: `linear-gradient(160deg, #19102e, #3b1c63, #120b20)`,
      }}
    >
      <SubtitleCueOverlay
        words={words}
        t={words.length}
        fontSize={fontSize}
        textColor={textColor}
        outlineColor={outlineColor}
        highlightColor={highlightColor}
        highlightTextColor={highlightTextColor}
        verticalPosition={0.5}
        width={width}
        height={height}
      />
    </div>,
    { fonts },
  );
  return canvas.encode("png");
}
