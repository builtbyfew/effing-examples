import { z } from "zod";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { tween, easeOutBack } from "@effing/tween";
import { loadFonts, antonRegular } from "~/fonts";
import { memeCaptionTextStyle } from "~/meme-caption";

export const propsSchema = z.object({
  text: z.string(),
  fontSize: z.number().int().min(1),
  anchor: z.enum(["top", "bottom"]),
  offsetY: z.number().int().min(0),
  paddingX: z.number().int().min(0),
  startDelayFrac: z.number().min(0).max(1).optional(),
  revealFrac: z.number().min(0).max(1).optional(),
  frameCount: z.number().int().min(1).optional(),
});

export type MemeTopBottomCaptionProps = z.infer<typeof propsSchema>;

export const previewProps: MemeTopBottomCaptionProps = {
  text: "They photosynthesize",
  fontSize: 100,
  anchor: "top",
  offsetY: 70,
  paddingX: 38,
  frameCount: 90,
};

export async function* runner({
  props: {
    text,
    fontSize,
    anchor,
    offsetY,
    paddingX,
    startDelayFrac = 0.1,
    revealFrac = 0.65,
    frameCount = 90,
  },
  bounds: { width, height },
}: RunnerArgs<MemeTopBottomCaptionProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([antonRegular]);

  // Tokenise into words so flex-wrap breaks between words, not mid-word.
  const words = text
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => Array.from(w));
  const totalLetters = words.reduce((acc, w) => acc + w.length, 0);

  // Each letter falls ~1.5 line-heights into place — far enough to read as a
  // drop, short enough to keep the eased overshoot inside the canvas.
  const fallDistance = Math.round(fontSize * 1.5);
  const fallSign = anchor === "top" ? -1 : 1;

  // Per-letter window inside the reveal phase. Letters overlap heavily: each
  // takes 40% of the reveal, starts staggered across the remaining 60%.
  const perLetterDuration = 0.4;
  const staggerSpan = Math.max(0, 1 - perLetterDuration);
  const letterStarts = Array.from({ length: totalLetters }, (_, i) =>
    totalLetters > 1 ? (i / (totalLetters - 1)) * staggerSpan : 0,
  );

  const captionStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexWrap: "wrap",
    flexDirection: "row",
    justifyContent: "center",
    alignContent: "flex-start",
    columnGap: Math.round(fontSize * 0.32),
    rowGap: 0,
    ...memeCaptionTextStyle(fontSize),
  };
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    display: "flex",
    paddingLeft: paddingX,
    paddingRight: paddingX,
    ...(anchor === "top" ? { top: offsetY } : { bottom: offsetY }),
  };

  const startDelay = Math.max(0, Math.round(frameCount * startDelayFrac));
  const reveal = Math.max(2, Math.round(frameCount * revealFrac));
  const finalHold = Math.max(0, frameCount - startDelay - reveal);

  const renderFrame = async (overall: number): Promise<Buffer> => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    let letterIndex = 0;
    const renderedWords = words.map((word, wi) => {
      const letters = word.map((ch) => {
        const i = letterIndex++;
        const local = (overall - letterStarts[i]) / perLetterDuration;
        const clamped = Math.max(0, Math.min(1, local));
        const eased = easeOutBack(clamped);
        const dy = (1 - eased) * fallDistance * fallSign;
        const opacity = Math.max(0, Math.min(1, eased));
        return (
          <div
            key={`l${i}`}
            style={{
              display: "flex",
              transform: `translateY(${dy}px)`,
              opacity,
            }}
          >
            {ch}
          </div>
        );
      });
      return (
        <div
          key={`w${wi}`}
          style={{ display: "flex", flexDirection: "row", gap: 1 }}
        >
          {letters}
        </div>
      );
    });

    await renderReactElement(
      ctx,
      <div style={{ width, height, display: "flex" }}>
        <div style={containerStyle}>
          <div style={captionStyle}>{renderedWords}</div>
        </div>
      </div>,
      { fonts },
    );
    // PNG keeps the transparent areas around the caption so this annie
    // composites cleanly over the image layer underneath.
    return canvas.encode("png");
  };

  const blankFrame = await renderFrame(0);
  for (let i = 0; i < startDelay; i++) yield blankFrame;

  yield* tween(reveal, async ({ upper: p }) => renderFrame(p));

  const finalFrame = await renderFrame(1);
  for (let i = 0; i < finalHold; i++) yield finalFrame;
}
