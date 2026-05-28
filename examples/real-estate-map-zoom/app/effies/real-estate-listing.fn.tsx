import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { PhotoZoomProps } from "~/annies/photo-zoom.fn";
import type { MapZoomProps } from "~/annies/map-zoom.fn";
import type { SimpleSlideshowCoverProps } from "~/images/simple-slideshow-cover.fn";
import type { AddressCardProps } from "~/images/address-card.fn";
import type { PropertyInfoCardProps } from "~/images/property-info-card.fn";

export const propsSchema = z.object({
  address: z.string(),
  imageUrls: z.array(z.string().url()).min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  zoom: z.number().int().min(1).max(19).optional(),
  mapDuration: z.number().positive().optional(),
  slideDuration: z.number().positive().optional(),
  liveableArea: z.number().positive(),
  bedrooms: z.number().int().positive(),
  bathrooms: z.number().int().positive(),
  price: z.string(),
});

type RealEstateListingProps = z.infer<typeof propsSchema>;

export const previewProps: RealEstateListingProps = {
  address: "Grote Markt 1, Brussels",
  imageUrls: [
    "https://static.effing.dev/unsplash/white-villa/portrait.jpg",
    "https://static.effing.dev/unsplash/white-villa/bedroom.jpg",
    "https://static.effing.dev/unsplash/white-villa/bathroom.jpg",
  ],
  lat: 50.8503,
  lon: 4.3517,
  zoom: 16,
  mapDuration: 8,
  slideDuration: 4,
  liveableArea: 240,
  bedrooms: 4,
  bathrooms: 2,
  price: "€ 1 250 000",
};

export async function runner({
  props: {
    address,
    imageUrls,
    lat,
    lon,
    zoom = 16,
    mapDuration = 8,
    slideDuration = 4,
    liveableArea,
    bedrooms,
    bathrooms,
    price,
  },
  bounds: { width, height },
}: RunnerArgs<RealEstateListingProps>): EffieRunnerReturn {
  const mapFrameCount = Math.round(mapDuration * 30);
  const slideFrameCount = Math.round(slideDuration * 30);

  const [addressCardSource, propertyInfoSource, coverSource, mapSource, ...uniquePhotoSources] =
    await Promise.all([
      fnUrl(
        "image",
        "address-card",
        { address, verticalAlignment: "bottom" } satisfies AddressCardProps,
        { width, height },
      ),
      fnUrl(
        "image",
        "property-info-card",
        { liveableArea, bedrooms, bathrooms, price } satisfies PropertyInfoCardProps,
        { width, height },
      ),
      fnUrl(
        "image",
        "simple-slideshow-cover",
        {
          imageUrl: imageUrls[0],
          text: address,
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
      ...imageUrls.map((imageUrl) =>
        fnUrl(
          "annie",
          "photo-zoom",
          {
            imageUrl,
            frameCount: slideFrameCount,
            zoomLevel: 0.1,
          } satisfies PhotoZoomProps,
          { width, height },
        ),
      ),
    ]);

  // Slideshow: all provided images, then back to the first with property details
  const photoSources = [...uniquePhotoSources, uniquePhotoSources[0]];

  const photoSegments = photoSources.map((source, i) => {
    const isLast = i === photoSources.length - 1;
    return effieSegment({
      duration: slideDuration,
      transition: {
        type: "wipe",
        direction: "left",
        duration: 0.8,
      },
      layers: [
        {
          type: "animation",
          source,
        },
        {
          // Last slide shows property details; all others show address for visual continuity
          type: "image",
          source: isLast ? propertyInfoSource : addressCardSource,
        },
      ],
    });
  });

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
        ],
      }),
      ...photoSegments,
    ],
  });
}
