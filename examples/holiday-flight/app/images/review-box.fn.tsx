import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interBold, interSemiBold, loadFonts } from "~/fonts";

export const propsSchema = z.object({
  handle: z.string(),
  text: z.string(),
  rating: z.number().int().min(1).max(5).optional(),
});

export type ReviewBoxProps = z.infer<typeof propsSchema>;

export const previewProps: ReviewBoxProps = {
  handle: "@davidrainbowie72",
  text: "Stunning villa, breathtaking sea views, and the most attentive host. Every detail was thought through.",
  rating: 5,
};

export async function runner({
  props: { handle, text, rating = 5 },
  bounds: { width, height },
}: RunnerArgs<ReviewBoxProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const boxMarginX = Math.round(width * 0.08);
  const boxMarginBottom = Math.round(height * 0.06);
  const boxRadius = Math.round(height * 0.025);
  const padding = Math.round(height * 0.04);
  const starFontSize = Math.round(height * 0.035);
  const textFontSize = Math.round(height * 0.028);
  const handleFontSize = Math.round(height * 0.024);

  await renderReactElement(
    ctx,
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "#ffffff",
          marginLeft: boxMarginX,
          marginRight: boxMarginX,
          marginBottom: boxMarginBottom,
          paddingTop: padding,
          paddingBottom: padding,
          paddingLeft: padding * 1.4,
          paddingRight: padding * 1.4,
          borderRadius: boxRadius,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: starFontSize,
            letterSpacing: starFontSize * 0.15,
          }}
        >
          {"⭐".repeat(rating)}
        </div>
        <div
          style={{
            marginTop: padding * 0.7,
            fontSize: textFontSize,
            color: "#0f172a",
            fontFamily: "Inter",
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.35,
          }}
        >
          {text}
        </div>
        <div
          style={{
            marginTop: padding * 0.6,
            fontSize: handleFontSize,
            color: "#475569",
            fontFamily: "Inter",
            fontWeight: 700,
          }}
        >
          {handle}
        </div>
      </div>
    </div>,
    { fonts },
  );

  return canvas.encode("png");
}
