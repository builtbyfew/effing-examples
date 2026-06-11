import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { ImageRunnerReturn, RunnerArgs } from "@effing/fn";
import {
  loadFonts,
  poppinsSemiBold,
  poppinsBold,
  dmSansRegular,
  dmSansMedium,
  dmSansBold,
} from "~/fonts";
import { StayCard, computeCardLayout } from "~/components/stay-card";
import { SAMPLE_LISTING } from "~/sample-listing";

export const propsSchema = z.object({
  title: z.string(),
  location: z.string(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0),
  guests: z.number().int().min(1),
  bedrooms: z.number().int().min(0),
  baths: z.number().int().min(0),
  pricePerNight: z.number().min(0),
  currency: z.string(),
  badge: z.string(),
  part: z
    .enum(["full", "background", "header", "rating", "specs", "price"])
    .optional(),
  // Star-units lit on the rating row (0..5); defaults to `rating`.
  ratingFill: z.number().min(0).max(5).optional(),
});

export type StayCardImageProps = z.infer<typeof propsSchema>;

export const previewProps: StayCardImageProps = {
  title: SAMPLE_LISTING.title,
  location: SAMPLE_LISTING.location,
  rating: SAMPLE_LISTING.rating,
  reviewCount: SAMPLE_LISTING.reviewCount,
  guests: SAMPLE_LISTING.guests,
  bedrooms: SAMPLE_LISTING.bedrooms,
  baths: SAMPLE_LISTING.baths,
  pricePerNight: SAMPLE_LISTING.pricePerNight,
  currency: SAMPLE_LISTING.currency,
  badge: SAMPLE_LISTING.badge,
};

export async function runner({
  props: { part = "full", ratingFill, ...data },
  bounds: { width, height },
}: RunnerArgs<StayCardImageProps>): ImageRunnerReturn {
  const fonts = await loadFonts([
    poppinsSemiBold,
    poppinsBold,
    dmSansRegular,
    dmSansMedium,
    dmSansBold,
  ]);
  const layout = computeCardLayout(width, height);

  const canvas = createCanvas(width, height);
  await renderReactElement(
    canvas.getContext("2d"),
    <StayCard
      data={data}
      layout={layout}
      part={part}
      ratingFill={ratingFill}
    />,
    { fonts },
  );

  // The opaque card surface is JPEG; the transparent content parts are PNG.
  return part === "full" || part === "background"
    ? canvas.encode("jpeg")
    : canvas.encode("png");
}
