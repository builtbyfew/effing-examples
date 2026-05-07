import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { tween, easeInOutCubic } from "@effing/tween";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { interSemiBold, loadFonts } from "~/fonts";
import { AddressCardOverlay, getCardMetrics } from "~/images/address-card.fn";

export const propsSchema = z.object({
  address: z.string(),
  slideFrames: z.number().int().min(1).optional(),
  holdFrames: z.number().int().min(0).optional(),
});

export type AddressSlideProps = z.infer<typeof propsSchema>;

export const previewProps: AddressSlideProps = {
  address: "Grote Markt 1, Brussels",
  slideFrames: 45,
  holdFrames: 105,
};

export async function* runner({
  props: { address, slideFrames = 45, holdFrames = 60 },
  bounds: { width, height },
}: RunnerArgs<AddressSlideProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interSemiBold]);
  const { centerY, bottomY } = getCardMetrics(width, height);

  const renderFrame = async (cardY: number) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    await renderReactElement(
      ctx,
      <AddressCardOverlay address={address} width={width} height={height} cardY={cardY} />,
      { fonts },
    );
    return canvas.encode("png");
  };

  // Phase 1: slide from map position (center) down to bottom of frame
  yield* tween(slideFrames, async ({ lower: p }) =>
    renderFrame(Math.round(centerY + (bottomY - centerY) * easeInOutCubic(p))),
  );

  // Phase 2: hold at bottom — pre-render once and reuse
  if (holdFrames > 0) {
    const holdBuffer = await renderFrame(bottomY);
    yield* tween(holdFrames, async () => holdBuffer);
  }
}
