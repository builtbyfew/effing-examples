import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { ImageRunnerReturn, RunnerArgs } from "@effing/fn";
import { loadFonts, caveatSemiBold, caveatBold, dmSansBold } from "~/fonts";
import { Postcard } from "~/components/postcard";
import { PHOTOS, SAMPLE_LISTING } from "~/sample-listing";

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  destination: z.string(),
  greeting: z.string().optional(),
  tagline: z.string().optional(),
});

export type PostcardPhotoProps = z.infer<typeof propsSchema>;

export const previewProps: PostcardPhotoProps = {
  imageUrl: PHOTOS.pool,
  destination: "Bali",
  greeting: "greetings from",
  tagline: `${SAMPLE_LISTING.title} · your island escape`,
};

export async function runner({
  props: { imageUrl, destination, greeting, tagline },
  bounds: { width, height },
}: RunnerArgs<PostcardPhotoProps>): ImageRunnerReturn {
  const fonts = await loadFonts([caveatSemiBold, caveatBold, dmSansBold]);

  const canvas = createCanvas(width, height);
  await renderReactElement(
    canvas.getContext("2d"),
    <Postcard
      imageUrl={imageUrl}
      destination={destination}
      greeting={greeting}
      tagline={tagline}
      width={width}
      height={height}
    />,
    { fonts },
  );
  return canvas.encode("jpeg");
}
