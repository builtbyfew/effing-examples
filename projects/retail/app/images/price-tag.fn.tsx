import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interBold, interSemiBold, loadFonts } from "~/fonts";

export const propsSchema = z.object({
  label: z.string(),
  price: z.string(),
  oldPrice: z.string().optional(),
  accentColor: z.string().optional(),
});

export type PriceTagProps = z.infer<typeof propsSchema>;

export const previewProps: PriceTagProps = {
  label: "Summer sale",
  price: "$129",
  oldPrice: "$159",
};

export async function runner({
  props: { label, price, oldPrice, accentColor = "#7c5cd6" },
  bounds: { width, height },
}: RunnerArgs<PriceTagProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interBold, interSemiBold]);
  const base = Math.min(width, height);

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
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "#ffffff",
          borderRadius: base * 0.04,
          padding: `${base * 0.05}px ${base * 0.08}px`,
          transform: "rotate(-6deg)",
          boxShadow: `0 ${base * 0.02}px ${base * 0.06}px rgba(26, 18, 48, 0.45)`,
        }}
      >
        <div
          style={{
            color: accentColor,
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: base * 0.035,
            letterSpacing: base * 0.006,
          }}
        >
          {label.toUpperCase()}
        </div>
        <div
          style={{
            color: "#1a1230",
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: base * 0.16,
            lineHeight: 1.1,
          }}
        >
          {price}
        </div>
        {oldPrice && (
          <div
            style={{
              color: "#1a1230",
              opacity: 0.5,
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: base * 0.055,
              textDecoration: "line-through",
            }}
          >
            {oldPrice}
          </div>
        )}
      </div>
    </div>,
    { fonts },
  );

  return canvas.encode("png");
}
