import { palette, fontFamily } from "~/theme";
import { designUnit } from "~/components/design-unit";
import { RatingStars } from "~/components/stars";
import { PinIcon, GuestsIcon, BedIcon, BathIcon, HeartIcon } from "~/components/icons";

// The closing summary card, in a friendly booking-app language: a crisp white
// card floats on warm off-white with a soft shadow, the property name set in
// friendly Poppins, a coral "Guest favourite" pill up top, near-black rating
// stars, and a full-width coral-gradient "Reserve" button to close. Laid out with
// absolute tops (not flow) so each `part` renders on its own transparent layer
// and still lines up pixel-for-pixel when the effie stacks them for the staged
// reveal.

export type StayCardData = {
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  guests: number;
  bedrooms: number;
  baths: number;
  pricePerNight: number;
  currency: string;
  badge: string;
};

export type CardPart =
  | "full"
  | "background"
  | "header"
  | "rating"
  | "specs"
  | "price";

export type CardLayout = ReturnType<typeof computeCardLayout>;

const round = Math.round;

// The "Reserve" button gradient.
const CTA_GRADIENT =
  "linear-gradient(to right, #e61e4d 0%, #e31c5f 50%, #bd1e59 100%)";

export function computeCardLayout(width: number, height: number) {
  const u = designUnit(width, height);

  const cardInset = round(u * 0.078);
  const cardPadX = round(u * 0.07);
  const cardPadV = round(u * 0.078);
  const cardW = width - cardInset * 2;
  const innerW = cardW - cardPadX * 2;

  const eyebrowFont = round(u * 0.03);
  const eyebrowPadY = round(eyebrowFont * 0.62);
  const eyebrowRowH = round(eyebrowFont * 1.2 + eyebrowPadY * 2);
  const titleFont = round(u * 0.092);
  const titleRowH = round(titleFont * 1.04);
  const locFont = round(u * 0.036);
  const locRowH = round(locFont * 1.4);
  const starSize = round(u * 0.046);
  const ratingFont = round(u * 0.042);
  const ratingRowH = round(Math.max(starSize, ratingFont) * 1.1);
  const dividerRowH = round(Math.max(1, u * 0.0022));
  const specIcon = round(u * 0.056);
  const specNumFont = round(u * 0.046);
  const specLabelFont = round(u * 0.028);
  const specRowH = round(specIcon + specNumFont * 1.15 + specLabelFont * 1.55);
  // A bold price with a smaller "/night" unit, vertically centred on the price.
  // We deliberately avoid `align-items: baseline` for differently-sized text here:
  // @effing/canvas drives yoga-layout directly and registers no baseline function
  // on text nodes (and yoga-layout 3.x's JS API exposes none), so "baseline"
  // collapses to the line-box bottom — effectively flex-end — and won't line up
  // text on its typographic baseline. Centring stays stable across sizes.
  const priceFont = round(u * 0.076);
  const priceUnitFont = round(u * 0.042);
  const priceRowH = round(priceFont * 1.02);
  const buttonFont = round(u * 0.042);
  const buttonH = round(buttonFont * 2.6);

  // A clear three-beat rhythm: the header group sits tight (title over its
  // location), the rating/divider/specs breathe evenly, and the price+button
  // close as a CTA group with a little extra air above it.
  const gap = {
    afterEyebrow: round(u * 0.044),
    afterTitle: round(u * 0.024),
    afterLoc: round(u * 0.044),
    afterRating: round(u * 0.044),
    afterDivider: round(u * 0.044),
    afterSpecs: round(u * 0.075),
    afterPrice: round(u * 0.045),
  };

  const blockH =
    eyebrowRowH +
    gap.afterEyebrow +
    titleRowH +
    gap.afterTitle +
    locRowH +
    gap.afterLoc +
    ratingRowH +
    gap.afterRating +
    dividerRowH +
    gap.afterDivider +
    specRowH +
    gap.afterSpecs +
    priceRowH +
    gap.afterPrice +
    buttonH;

  let y = round((height - blockH) / 2);
  const eyebrowTop = y;
  y += eyebrowRowH + gap.afterEyebrow;
  const titleTop = y;
  y += titleRowH + gap.afterTitle;
  const locTop = y;
  y += locRowH + gap.afterLoc;
  const ratingTop = y;
  y += ratingRowH + gap.afterRating;
  const dividerTop = y;
  y += dividerRowH + gap.afterDivider;
  const specsTop = y;
  y += specRowH + gap.afterSpecs;
  const priceTop = y;
  y += priceRowH + gap.afterPrice;
  const buttonTop = y;

  return {
    width,
    height,
    u,
    card: {
      left: cardInset,
      top: eyebrowTop - cardPadV,
      width: cardW,
      height: blockH + cardPadV * 2,
      innerWidth: innerW,
      radius: round(u * 0.05),
    },
    eyebrow: { top: eyebrowTop, font: eyebrowFont, padY: eyebrowPadY },
    title: { top: titleTop, font: titleFont },
    location: { top: locTop, font: locFont },
    rating: { top: ratingTop, starSize, font: ratingFont },
    divider: { top: dividerTop, width: innerW, height: dividerRowH },
    specs: {
      top: specsTop,
      icon: specIcon,
      numFont: specNumFont,
      labelFont: specLabelFont,
      height: specRowH,
    },
    price: { top: priceTop, font: priceFont, unitFont: priceUnitFont },
    button: { top: buttonTop, font: buttonFont, height: buttonH, width: innerW },
  };
}

function Row({
  top,
  width,
  children,
}: {
  top: number;
  width: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        width,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function CardBackground({ layout }: { layout: CardLayout }) {
  const { width, height, card } = layout;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        backgroundColor: palette.cloud,
      }}
    >
      {/* The white listing card, floating with a soft shadow. */}
      <div
        style={{
          position: "absolute",
          left: card.left,
          top: card.top,
          width: card.width,
          height: card.height,
          display: "flex",
          backgroundColor: palette.paper,
          borderRadius: card.radius,
          boxShadow: "0 28px 64px rgba(34,34,34,0.14)",
        }}
      />
    </div>
  );
}

function Eyebrow({ layout, badge }: { layout: CardLayout; badge: string }) {
  const { eyebrow } = layout;
  return (
    <Row top={eyebrow.top} width={layout.width}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: round(eyebrow.font * 0.45),
          paddingLeft: round(eyebrow.font * 0.85),
          paddingRight: round(eyebrow.font * 1.0),
          paddingTop: eyebrow.padY,
          paddingBottom: eyebrow.padY,
          backgroundColor: "rgba(255,56,92,0.1)",
          borderRadius: 999,
        }}
      >
        <HeartIcon size={round(eyebrow.font * 1.1)} color={palette.rausch} />
        <div
          style={{
            display: "flex",
            fontFamily: fontFamily.body,
            fontWeight: 700,
            fontSize: eyebrow.font,
            letterSpacing: eyebrow.font * 0.02,
            color: palette.rausch,
          }}
        >
          {badge}
        </div>
      </div>
    </Row>
  );
}

function Title({ layout, title }: { layout: CardLayout; title: string }) {
  return (
    <Row top={layout.title.top} width={layout.width}>
      <div
        style={{
          display: "flex",
          fontFamily: fontFamily.display,
          fontWeight: 600,
          fontSize: layout.title.font,
          color: palette.ink,
          letterSpacing: -layout.title.font * 0.01,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>
    </Row>
  );
}

function Location({ layout, location }: { layout: CardLayout; location: string }) {
  const { location: l } = layout;
  return (
    <Row top={l.top} width={layout.width}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: round(l.font * 0.34),
          color: palette.inkSoft,
          fontFamily: fontFamily.body,
          fontWeight: 500,
          fontSize: l.font,
        }}
      >
        <PinIcon size={round(l.font * 1.15)} color={palette.rausch} strokeWidth={2.2} />
        <div style={{ display: "flex", whiteSpace: "nowrap" }}>{location}</div>
      </div>
    </Row>
  );
}

function Rating({
  layout,
  rating,
  reviewCount,
  fill,
}: {
  layout: CardLayout;
  rating: number;
  reviewCount: number;
  fill?: number;
}) {
  const { rating: r } = layout;
  return (
    <Row top={r.top} width={layout.width}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: round(r.font * 0.6),
        }}
      >
        <RatingStars
          size={r.starSize}
          fill={fill ?? rating}
          filledColor={palette.star}
          outlineColor="rgba(0,0,0,0.14)"
        />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: round(r.font * 0.4),
            fontFamily: fontFamily.body,
            fontSize: r.font,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: fontFamily.display,
              fontWeight: 600,
              color: palette.ink,
              whiteSpace: "nowrap",
            }}
          >
            {rating.toFixed(2)}
          </div>
          <div style={{ display: "flex", color: palette.inkSoft, fontWeight: 500, whiteSpace: "nowrap" }}>
            · {reviewCount} reviews
          </div>
        </div>
      </div>
    </Row>
  );
}

function Divider({ layout }: { layout: CardLayout }) {
  const { divider } = layout;
  return (
    <Row top={divider.top} width={layout.width}>
      <div
        style={{
          display: "flex",
          width: divider.width,
          height: Math.max(1, round(layout.u * 0.0022)),
          backgroundColor: palette.mist,
        }}
      />
    </Row>
  );
}

function Spec({
  icon,
  value,
  label,
  layout,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  layout: CardLayout;
}) {
  const { specs } = layout;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: round(specs.labelFont * 0.4),
      }}
    >
      {icon}
      <div
        style={{
          display: "flex",
          fontFamily: fontFamily.display,
          fontWeight: 600,
          fontSize: specs.numFont,
          color: palette.ink,
        }}
      >
        {value}
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: fontFamily.body,
          fontWeight: 500,
          fontSize: specs.labelFont,
          color: palette.inkSoft,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Specs({
  layout,
  guests,
  bedrooms,
  baths,
}: {
  layout: CardLayout;
  guests: number;
  bedrooms: number;
  baths: number;
}) {
  const { specs } = layout;
  const iconSize = specs.icon;
  return (
    <Row top={specs.top} width={layout.width}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: round(layout.u * 0.13),
        }}
      >
        <Spec
          layout={layout}
          icon={<GuestsIcon size={iconSize} color={palette.ink} strokeWidth={1.9} />}
          value={`${guests}`}
          label="Guests"
        />
        <Spec
          layout={layout}
          icon={<BedIcon size={iconSize} color={palette.ink} strokeWidth={1.9} />}
          value={`${bedrooms}`}
          label="Bedrooms"
        />
        <Spec
          layout={layout}
          icon={<BathIcon size={iconSize} color={palette.ink} strokeWidth={1.9} />}
          value={`${baths}`}
          label="Baths"
        />
      </div>
    </Row>
  );
}

function Price({
  layout,
  currency,
  pricePerNight,
}: {
  layout: CardLayout;
  currency: string;
  pricePerNight: number;
}) {
  const { price, button } = layout;
  return (
    <>
      <Row top={price.top} width={layout.width}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: round(price.unitFont * 0.5),
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: fontFamily.display,
              fontWeight: 700,
              fontSize: price.font,
              lineHeight: 1,
              color: palette.ink,
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
              fontSize: price.unitFont,
              lineHeight: 1,
              color: palette.inkSoft,
            }}
          >
            /night
          </div>
        </div>
      </Row>
      <Row top={button.top} width={layout.width}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: button.width,
            height: button.height,
            backgroundImage: CTA_GRADIENT,
            borderRadius: round(button.height * 0.32),
            color: palette.paper,
            fontFamily: fontFamily.display,
            fontWeight: 600,
            fontSize: button.font,
            boxShadow: "0 16px 32px rgba(189,30,89,0.32)",
          }}
        >
          Reserve
        </div>
      </Row>
    </>
  );
}

export function StayCard({
  data,
  layout,
  part = "full",
  ratingFill,
}: {
  data: StayCardData;
  layout: CardLayout;
  part?: CardPart;
  // Overrides how many star-units are lit (for an animated rating reveal).
  ratingFill?: number;
}) {
  const show = {
    background: part === "full" || part === "background",
    header: part === "full" || part === "header",
    rating: part === "full" || part === "rating",
    specs: part === "full" || part === "specs",
    price: part === "full" || part === "price",
  };
  return (
    <div
      style={{
        position: "relative",
        width: layout.width,
        height: layout.height,
        display: "flex",
        fontFamily: fontFamily.body,
      }}
    >
      {show.background && <CardBackground layout={layout} />}
      {show.header && <Eyebrow layout={layout} badge={data.badge} />}
      {show.header && <Title layout={layout} title={data.title} />}
      {show.header && <Location layout={layout} location={data.location} />}
      {show.rating && (
        <Rating
          layout={layout}
          rating={data.rating}
          reviewCount={data.reviewCount}
          fill={ratingFill}
        />
      )}
      {show.specs && <Divider layout={layout} />}
      {show.specs && (
        <Specs
          layout={layout}
          guests={data.guests}
          bedrooms={data.bedrooms}
          baths={data.baths}
        />
      )}
      {show.price && (
        <Price
          layout={layout}
          currency={data.currency}
          pricePerNight={data.pricePerNight}
        />
      )}
    </div>
  );
}
