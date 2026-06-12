import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import {
  captionGradient,
  captionStyleSchema,
  loadCaptionFonts,
  resolveCaptionStyle,
} from "~/captions";

// Closing card for the subtitled video: a single quiet line (typically
// attribution or a credit) over the same gradient as the cover, so the video
// ends on the brand look instead of a dead black frame. Deliberately more
// subdued than the cover — this is an ending, not another title.

export const propsSchema = z.object({
  text: z.string().min(1),
  ...captionStyleSchema.shape,
});

export type SubtitleOutroProps = z.infer<typeof propsSchema>;

export const previewProps: SubtitleOutroProps = {
  text: "Footage courtesy of NASA",
};

export async function runner({
  props,
  bounds: { width, height },
}: RunnerArgs<SubtitleOutroProps>): ImageRunnerReturn {
  const style = resolveCaptionStyle(props, { fontSize: 104 });
  const fonts = await loadCaptionFonts();

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: captionGradient(style.highlightColor),
      }}
    >
      <div
        style={{
          width: style.fontSize * 0.9,
          height: style.fontSize * 0.08,
          borderRadius: style.fontSize,
          backgroundColor: style.highlightColor,
          marginBottom: style.fontSize * 0.45,
        }}
      />
      <div
        style={{
          maxWidth: width * 0.8,
          fontFamily: "Inter",
          fontWeight: 900,
          fontSize: style.fontSize * 0.3,
          letterSpacing: style.fontSize * 0.04,
          lineHeight: 1.5,
          color: "rgba(255, 255, 255, 0.78)",
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {props.text}
      </div>
    </div>,
    { fonts },
  );
  return canvas.encode("png");
}
