import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { captionStyleSchema, loadCaptionFonts, resolveCaptionStyle } from "~/captions";

// Cover for the subtitled video, doubling as its title card. It shares the
// captions' palette and typeface but is deliberately NOT styled like a
// caption — mixed case, no outline, no highlight pill — so the title reads
// as a title, with an accent rule in the highlight color tying it to the
// captions that follow.

export const propsSchema = z.object({
  text: z.string().min(1),
  /** Small line above the title (e.g. who is speaking, where, when). */
  kicker: z.string().min(1).optional(),
  ...captionStyleSchema.shape,
});

export type SubtitleCoverProps = z.infer<typeof propsSchema>;

export const previewProps: SubtitleCoverProps = {
  text: "Captions that actually slap",
  kicker: "Effing · subtitles example",
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
        backgroundImage: `linear-gradient(160deg, ${shade(style.highlightColor, 0.2)}, ${shade(style.highlightColor, 0.45)}, ${shade(style.highlightColor, 0.14)})`,
      }}
    >
      {props.kicker ? (
        <div
          style={{
            fontFamily: "Inter",
            fontWeight: 900,
            fontSize: style.fontSize * 0.26,
            letterSpacing: style.fontSize * 0.05,
            color: "rgba(255, 255, 255, 0.75)",
            textTransform: "uppercase",
            marginBottom: style.fontSize * 0.5,
          }}
        >
          {props.kicker}
        </div>
      ) : null}
      <div
        style={{
          maxWidth: width * 0.8,
          fontFamily: "Inter",
          fontWeight: 900,
          fontSize: style.fontSize,
          lineHeight: 1.15,
          color: style.textColor,
          textAlign: "center",
          textShadow: `0 ${style.fontSize * 0.04}px ${style.fontSize * 0.2}px rgba(0, 0, 0, 0.4)`,
        }}
      >
        {props.text}
      </div>
      <div
        style={{
          width: style.fontSize * 1.5,
          height: style.fontSize * 0.12,
          borderRadius: style.fontSize,
          backgroundColor: style.highlightColor,
          marginTop: style.fontSize * 0.55,
        }}
      />
    </div>,
    { fonts },
  );
  return canvas.encode("png");
}
