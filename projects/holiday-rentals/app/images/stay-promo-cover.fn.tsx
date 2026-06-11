import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { ImageRunnerReturn, RunnerArgs } from "@effing/fn";
import {
  loadFonts,
  poppinsSemiBold,
  dmSansMedium,
  dmSansBold,
} from "~/fonts";
import { palette, fontFamily } from "~/theme";
import { RatingStars } from "~/components/stars";
import { PinIcon, HeartIcon } from "~/components/icons";
import { designUnit } from "~/components/design-unit";
import { PHOTOS, SAMPLE_LISTING } from "~/sample-listing";

// The promo's cover thumbnail: the hero photo with the headline facts laid over
// a foot-scrim — title, location, rating — plus a favourite chip and a price
// tag. Doubles as a standalone listing hero.

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  title: z.string(),
  location: z.string(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0),
  pricePerNight: z.number().min(0),
  currency: z.string(),
  badge: z.string(),
});

export type StayPromoCoverProps = z.infer<typeof propsSchema>;

export const previewProps: StayPromoCoverProps = {
  imageUrl: PHOTOS.villa,
  title: SAMPLE_LISTING.title,
  location: SAMPLE_LISTING.location,
  rating: SAMPLE_LISTING.rating,
  reviewCount: SAMPLE_LISTING.reviewCount,
  pricePerNight: SAMPLE_LISTING.pricePerNight,
  currency: SAMPLE_LISTING.currency,
  badge: SAMPLE_LISTING.badge,
};

export async function runner({
  props: {
    imageUrl,
    title,
    location,
    rating,
    reviewCount,
    pricePerNight,
    currency,
    badge,
  },
  bounds: { width, height },
}: RunnerArgs<StayPromoCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([poppinsSemiBold, dmSansMedium, dmSansBold]);
  const u = designUnit(width, height);
  const inset = Math.round(u * 0.075);
  const titleFont = Math.round(u * 0.13);
  const locFont = Math.round(u * 0.042);
  const metaFont = Math.round(u * 0.04);
  const chipFont = Math.round(u * 0.036);
  const starSize = Math.round(u * 0.05);

  const canvas = createCanvas(width, height);
  await renderReactElement(
    canvas.getContext("2d"),
    <div
      style={{
        position: "relative",
        width,
        height,
        display: "flex",
        backgroundColor: palette.cloud,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Foot scrim. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width,
          height: Math.round(height * 0.62),
          display: "flex",
          backgroundImage:
            "linear-gradient(to top, rgba(16,14,12,0.82) 0%, rgba(16,14,12,0.38) 42%, rgba(16,14,12,0) 100%)",
        }}
      />

      {/* Favourite chip, top-left. */}
      <div
        style={{
          position: "absolute",
          top: inset,
          left: inset,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: Math.round(chipFont * 0.4),
          paddingLeft: Math.round(chipFont * 0.7),
          paddingRight: Math.round(chipFont * 0.95),
          paddingTop: Math.round(chipFont * 0.5),
          paddingBottom: Math.round(chipFont * 0.5),
          backgroundColor: "rgba(255,255,255,0.96)",
          borderRadius: chipFont * 3,
          color: palette.rausch,
          fontFamily: fontFamily.body,
          fontWeight: 700,
          fontSize: chipFont,
          boxShadow: "0 10px 24px rgba(34,34,34,0.26)",
        }}
      >
        <HeartIcon size={Math.round(chipFont * 1.1)} color={palette.rausch} />
        <div style={{ display: "flex" }}>{badge}</div>
      </div>

      {/* Price tag, top-right. */}
      <div
        style={{
          position: "absolute",
          top: inset,
          right: inset,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: Math.round(chipFont * 0.42),
          paddingLeft: Math.round(chipFont * 1.0),
          paddingRight: Math.round(chipFont * 1.0),
          paddingTop: Math.round(chipFont * 0.55),
          paddingBottom: Math.round(chipFont * 0.55),
          backgroundColor: palette.rausch,
          borderRadius: chipFont * 3,
          color: palette.paper,
          boxShadow: "0 12px 26px rgba(189,30,89,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: fontFamily.display,
            fontWeight: 600,
            fontSize: Math.round(chipFont * 1.25),
          }}
        >
          {currency}
          {pricePerNight}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: fontFamily.body,
            fontWeight: 500,
            fontSize: Math.round(chipFont * 0.85),
            opacity: 0.92,
          }}
        >
          /night
        </div>
      </div>

      {/* Headline block, bottom-left. */}
      <div
        style={{
          position: "absolute",
          left: inset,
          bottom: Math.round(inset + Math.max(0, height - 1350) * 0.16),
          right: inset,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: Math.round(locFont * 0.35),
            color: palette.paper,
            fontFamily: fontFamily.body,
            fontWeight: 700,
            fontSize: locFont,
            letterSpacing: locFont * 0.14,
            textTransform: "uppercase",
            marginBottom: Math.round(u * 0.018),
          }}
        >
          <PinIcon size={Math.round(locFont * 1.2)} color={palette.paper} strokeWidth={2.4} />
          {/* White pin + text for legibility over the bright pool. */}
          <div style={{ display: "flex", textShadow: "0 2px 12px rgba(0,0,0,0.55)" }}>
            {location}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: fontFamily.display,
            fontWeight: 600,
            fontSize: titleFont,
            lineHeight: 1.04,
            color: palette.paper,
            letterSpacing: -titleFont * 0.01,
            textShadow: "0 8px 26px rgba(0,0,0,0.4)",
            marginBottom: Math.round(u * 0.03),
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: Math.round(metaFont * 0.5),
          }}
        >
          <RatingStars
            size={starSize}
            fill={rating}
            filledColor={palette.paper}
            outlineColor="rgba(255,255,255,0.5)"
          />
          <div
            style={{
              display: "flex",
              fontFamily: fontFamily.display,
              fontWeight: 600,
              fontSize: metaFont,
              color: palette.paper,
            }}
          >
            {rating.toFixed(2)}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: fontFamily.body,
              fontWeight: 500,
              fontSize: metaFont,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            · {reviewCount} reviews
          </div>
        </div>
      </div>
    </div>,
    { fonts },
  );
  return canvas.encode("jpeg");
}
