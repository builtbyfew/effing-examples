import { z } from "zod";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { interBold, loadFonts } from "~/fonts";

export const propsSchema = z.object({
  text: z.string(),
  fontSize: z.number().int().min(1).optional(),
  fontColor: z.string().optional(),
  backgroundColor: z.string().optional(),
});

export type MagnifyingGlassCoverProps = z.infer<typeof propsSchema>;

export const previewProps: MagnifyingGlassCoverProps = {
  text: "read the fine print",
  fontColor: "#0a0a0a",
  backgroundColor: "#fafafa",
};

export async function runner({
  props: {
    text,
    fontSize,
    fontColor = "#0a0a0a",
    backgroundColor = "#fafafa",
  },
  bounds: { width, height },
}: RunnerArgs<MagnifyingGlassCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interBold]);
  const resolvedFontSize =
    fontSize ?? Math.round(Math.min(width, height) * 0.085);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        fontFamily: "Inter",
        fontWeight: 700,
        fontSize: resolvedFontSize,
        color: fontColor,
        letterSpacing: -1,
      }}
    >
      {text}
    </div>,
    { fonts },
  );
  return canvas.encode("jpeg");
}
