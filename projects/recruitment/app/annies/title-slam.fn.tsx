import { z } from "zod";
import {
  createCanvas,
  findLargestUsableFontSize,
  renderReactElement,
} from "@effing/canvas";
import type { AnnieRunnerReturn, RunnerArgs } from "@effing/fn";
import { tween, easeOutQuint } from "@effing/tween";
import { loadFonts, spaceGroteskBold } from "~/fonts";
import { fontFamily, palette } from "~/theme";

// The job title again, with attitude: left-aligned uppercase lines slam in
// from the left one after another, the last line in the brand yellow, then
// the block drifts very slightly so the hold never feels frozen.

export const propsSchema = z.object({
  lines: z.array(z.string().min(1)).min(1).max(4),
  frameCount: z.number().int().min(1),
  // Beat duration as a fraction of the clip — one line slams in per beat
  // (the segment starts on a beat).
  beat: z.number().min(0.02).max(1).optional(),
});

export type TitleSlamProps = z.infer<typeof propsSchema>;

export const previewProps: TitleSlamProps = {
  lines: ["Senior", "Frontend", "Developer"],
  frameCount: 79,
  beat: 0.1667,
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export async function* runner({
  props: { lines, frameCount, beat },
  bounds: { width, height },
}: RunnerArgs<TitleSlamProps>): AnnieRunnerReturn {
  const [font] = await loadFonts([spaceGroteskBold]);
  const fonts = [font];

  const sidePad = width * 0.07;
  const fontSize = Math.min(
    ...lines.map((line) =>
      findLargestUsableFontSize({
        text: line.toUpperCase(),
        font,
        maxWidth: width - sidePad * 2,
        maxHeight: (height * 0.66) / lines.length,
        maxFontSize: Math.round(width * 0.17),
      }),
    ),
  );

  const lineStagger = beat ?? 0.09;

  yield* tween(frameCount, async ({ lower: t }) => {
    const drift = t * width * 0.008;

    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: sidePad,
        }}
      >
        {lines.map((line, i) => {
          // Each line LANDS on a beat (line i on beat i+1): the slide
          // happens in the ~0.35 beat before it, so the impact — motion
          // stopping — is what sits on the grid.
          const enter = easeOutQuint(
            clamp01(
              (t - (i + 0.65) * lineStagger) / (0.45 * lineStagger),
            ),
          );
          const slide = (1 - enter) * width * 0.9;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                fontFamily: fontFamily.display,
                fontWeight: 700,
                fontSize,
                lineHeight: 1.08,
                textTransform: "uppercase",
                color: i === lines.length - 1 ? palette.spark : palette.cream,
                opacity: enter > 0 ? 1 : 0,
                transform: `translateX(${(-slide + drift).toFixed(1)}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>,
      { fonts },
    );
    return canvas.encode("png");
  });
}
