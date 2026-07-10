import { z } from "zod";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { loadFonts, antonRegular } from "~/fonts";
import { MemeCaption } from "~/meme-caption";

// Full-bleed photo meme: the image cover-crops the whole frame (no
// letterboxing — unlike meme-top-bottom) with an optional caption near the
// bottom. Matches how FFS composites video backgrounds, so it can double as
// a freeze-frame or poster for a video effie.
export const propsSchema = z.object({
  imageUrl: z.string().url(),
  caption: z.string().optional(),
  fontSize: z.number().int().min(1).optional(),
  offsetY: z.number().int().min(0).optional(),
  paddingX: z.number().int().min(0).optional(),
});

export type MemePhotoCaptionProps = z.infer<typeof propsSchema>;

export const previewProps: MemePhotoCaptionProps = {
  imageUrl: "https://media4.giphy.com/media/R8rRQmDIewbRPeJl0H/480w_s.jpg",
  caption: "Effing videos!",
};

export async function runner({
  props: { imageUrl, caption, fontSize, offsetY, paddingX },
  bounds: { width, height },
}: RunnerArgs<MemePhotoCaptionProps>): ImageRunnerReturn {
  const fonts = caption ? await loadFonts([antonRegular]) : [];

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <div style={{ width, height, display: "flex" }}>
      <img
        src={imageUrl}
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          objectFit: "cover",
        }}
      />
      {caption ? (
        <div
          style={{
            position: "absolute",
            bottom: offsetY ?? Math.round(height * 0.06),
            left: 0,
            right: 0,
            display: "flex",
            paddingLeft: paddingX ?? Math.round(width * 0.035),
            paddingRight: paddingX ?? Math.round(width * 0.035),
          }}
        >
          <MemeCaption
            text={caption.toUpperCase()}
            fontSize={fontSize ?? Math.round(width * 0.105)}
          />
        </div>
      ) : null}
    </div>,
    { fonts },
  );

  return canvas.encode("jpeg");
}
