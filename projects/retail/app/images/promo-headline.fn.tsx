import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interBold, interSemiBold, loadFonts } from "~/fonts";

export const propsSchema = z.object({
  kicker: z.string(),
  productName: z.string(),
  tagline: z.string(),
  accentColor: z.string().optional(),
  // When set, the photo is drawn behind the text and the result is a JPEG —
  // handy as an effie cover. Without it, the background stays transparent
  // (PNG) so the image works as an overlay layer.
  backgroundImageUrl: z.string().url().optional(),
});

export type PromoHeadlineProps = z.infer<typeof propsSchema>;

export const previewProps: PromoHeadlineProps = {
  kicker: "New drop",
  productName: "Cloudstep 574",
  tagline: "Running shoes that float",
  backgroundImageUrl:
    "https://static.effing.dev/unsplash/sneakers/max-petrunin-A4fETzh_wlo-unsplash.jpg",
};

export async function runner({
  props: { kicker, productName, tagline, accentColor = "#7c5cd6", backgroundImageUrl },
  bounds: { width, height },
}: RunnerArgs<PromoHeadlineProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interBold, interSemiBold]);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  await renderReactElement(
    ctx,
    <div
      style={{
        width,
        height,
        display: "flex",
        backgroundImage: backgroundImageUrl
          ? `url(${backgroundImageUrl})`
          : undefined,
        backgroundSize: "cover",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: width * 0.07,
          backgroundImage:
            "linear-gradient(to bottom, rgba(26, 18, 48, 0) 55%, rgba(26, 18, 48, 0.75) 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            backgroundColor: accentColor,
            color: "#ffffff",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: width * 0.028,
            letterSpacing: width * 0.004,
            padding: `${width * 0.012}px ${width * 0.024}px`,
            borderRadius: width * 0.012,
            marginBottom: width * 0.025,
          }}
        >
          {kicker.toUpperCase()}
        </div>
        <div
          style={{
            color: "#ffffff",
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: width * 0.085,
            lineHeight: 1.05,
          }}
        >
          {productName}
        </div>
        <div
          style={{
            color: "rgba(255, 255, 255, 0.85)",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: width * 0.04,
            marginTop: width * 0.015,
          }}
        >
          {tagline}
        </div>
      </div>
    </div>,
    { fonts },
  );

  return backgroundImageUrl ? canvas.encode("jpeg") : canvas.encode("png");
}
