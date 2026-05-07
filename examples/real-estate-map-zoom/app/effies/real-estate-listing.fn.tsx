import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { MapZoomProps } from "~/annies/map-zoom.fn";
import type { AddressSlideProps } from "~/annies/address-slide.fn";
import type { SimpleSlideshowCoverProps } from "~/images/simple-slideshow-cover.fn";

export const propsSchema = z.object({
  address: z.string(),
  imageUrl: z.string().url(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  zoom: z.number().int().min(1).max(19).optional(),
  photoDuration: z.number().positive().optional(),
  mapDuration: z.number().positive().optional(),
});

type RealEstateListingProps = z.infer<typeof propsSchema>;

export const previewProps: RealEstateListingProps = {
  address: "Grote Markt 1, Brussels",
  imageUrl: "https://item-assets.itemwise.supplies/realestate/house/3.jpg",
  lat: 50.8503,
  lon: 4.3517,
  zoom: 16,
  photoDuration: 5,
  mapDuration: 8,
};

export async function runner({
  props: { address, imageUrl, lat, lon, zoom = 16, mapDuration = 8 },
  bounds: { width, height },
}: RunnerArgs<RealEstateListingProps>): EffieRunnerReturn {
  const mapFrameCount = Math.round(mapDuration * 30);
  const slideFrames = 45;

  const [coverSource, mapSource, addressSlideSource] = await Promise.all([
    fnUrl(
      "image",
      "simple-slideshow-cover",
      {
        imageUrl,
        text: "",
        fontSize: Math.round(width * 0.05),
        fontColor: "#ffffff",
      } satisfies SimpleSlideshowCoverProps,
      { width, height },
    ),
    fnUrl(
      "annie",
      "map-zoom",
      {
        lat,
        lon,
        address,
        zoom,
        frameCount: mapFrameCount,
      } satisfies MapZoomProps,
      { width, height },
    ),
    fnUrl(
      "annie",
      "address-slide",
      {
        address,
        slideFrames,
        holdFrames: 60,
      } satisfies AddressSlideProps,
      { width, height },
    ),
  ]);

  return effieData({
    width,
    height,
    fps: 30,
    cover: coverSource,
    background: { type: "color", color: "#111111" },
    segments: [
      effieSegment({
        duration: mapDuration,
        layers: [
          {
            type: "animation",
            source: mapSource,
          },
          {
            type: "animation",
            source: addressSlideSource,
            delay: mapDuration - 0.5,
          },
        ],
      }),
    ],
  });
}
