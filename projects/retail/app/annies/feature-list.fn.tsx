import { z } from "zod";
import { tween, easeOutCubic } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { interSemiBold, loadFonts } from "~/fonts";

export const propsSchema = z.object({
  features: z.array(z.string()).min(1),
  accentColor: z.string().optional(),
  revealFrames: z.number().int().min(1).optional(),
  staggerFrames: z.number().int().min(1).optional(),
  holdFrames: z.number().int().min(0).optional(),
});

export type FeatureListProps = z.infer<typeof propsSchema>;

export const previewProps: FeatureListProps = {
  features: [
    "Featherlight bubble sole",
    "Breathable knit upper",
    "Zero break-in comfort",
  ],
  holdFrames: 45,
};

export async function* runner({
  props: {
    features,
    accentColor = "#7c5cd6",
    revealFrames = 15,
    staggerFrames = 24,
    holdFrames = 30,
  },
  bounds: { width, height },
}: RunnerArgs<FeatureListProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interSemiBold]);

  const totalFrames =
    (features.length - 1) * staggerFrames + revealFrames + holdFrames;
  const slideDistance = height * 0.04;

  yield* tween(totalFrames, async ({ lower: p }) => {
    const frame = p * totalFrames;

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
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: width * 0.07,
          paddingBottom: height * 0.12,
        }}
      >
        {features.map((feature, i) => {
          const reveal = Math.min(
            Math.max((frame - i * staggerFrames) / revealFrames, 0),
            1,
          );
          const eased = easeOutCubic(reveal);

          return (
            <div
              key={feature}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(26, 18, 48, 0.72)",
                borderRadius: width * 0.05,
                padding: `${width * 0.018}px ${width * 0.032}px`,
                marginTop: width * 0.018,
                opacity: eased,
                transform: `translateY(${(1 - eased) * slideDistance}px)`,
              }}
            >
              <div
                style={{
                  width: width * 0.02,
                  height: width * 0.02,
                  borderRadius: width * 0.01,
                  backgroundColor: accentColor,
                  marginRight: width * 0.022,
                  display: "block",
                }}
              />
              <div
                style={{
                  color: "#ffffff",
                  fontFamily: "Inter",
                  fontWeight: 600,
                  fontSize: width * 0.04,
                }}
              >
                {feature}
              </div>
            </div>
          );
        })}
      </div>,
      { fonts },
    );
    return canvas.encode("png");
  });
}
