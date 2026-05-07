import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interSemiBold, loadFonts } from "~/fonts";

export const propsSchema = z.object({
  address: z.string(),
  verticalAlignment: z.enum(["center", "bottom"]).optional(),
});

export type AddressCardProps = z.infer<typeof propsSchema>;

export const previewProps: AddressCardProps = {
  address: "Grote Markt 1, Brussels",
};

export function getCardMetrics(width: number, height: number) {
  const fs = Math.round(width / 24);
  const cardH = Math.round(fs * 2.2);
  return {
    fs,
    cardW: Math.round(width * 0.62),
    cardH,
    cardX: Math.round((width - Math.round(width * 0.62)) / 2),
    centerY: Math.round(height / 2 + 52),
    bottomY: height - cardH - 40,
  };
}

export function AddressCardOverlay({
  address,
  width,
  height,
  cardY,
}: {
  address: string;
  width: number;
  height: number;
  cardY: number;
}) {
  const { fs, cardW, cardH, cardX } = getCardMetrics(width, height);
  return (
    <div style={{ width, height, position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: cardX,
          top: cardY,
          width: cardW,
          height: cardH,
          backgroundColor: "rgba(255, 255, 255, 0.82)",
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: Math.round(fs * 0.9),
            color: "#B71C1C",
          }}
        >
          {address}
        </div>
      </div>
    </div>
  );
}

export async function runner({
  props: { address, verticalAlignment = "center" },
  bounds: { width, height },
}: RunnerArgs<AddressCardProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interSemiBold]);
  const { centerY, bottomY } = getCardMetrics(width, height);
  const cardY = verticalAlignment === "bottom" ? bottomY : centerY;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <AddressCardOverlay address={address} width={width} height={height} cardY={cardY} />,
    { fonts },
  );
  return canvas.encode("png");
}
