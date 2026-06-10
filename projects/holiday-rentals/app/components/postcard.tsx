import { palette, fontFamily } from "~/theme";
import { designUnit } from "~/components/design-unit";
import { AmenityGlyph } from "~/components/icons";

// A vintage "Greetings from …" travel postcard: the destination photo set in a
// white card with an air-mail dash border, a handwritten greeting across the
// foot, and a rotated stamp in the corner. Used standalone (postcard-photo) and
// as the promo's opening beat.

function AirmailStripe({
  width,
  thickness,
  dash,
}: {
  width: number;
  thickness: number;
  dash: number;
}) {
  const count = Math.ceil(width / dash);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width,
        height: thickness,
        overflow: "hidden",
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            width: dash,
            height: thickness,
            backgroundColor:
              i % 2 === 0 ? palette.rausch : palette.babu,
            transform: "skewX(-22deg)",
          }}
        />
      ))}
    </div>
  );
}

function Stamp({
  destination,
  size,
}: {
  destination: string;
  size: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: size * 0.32,
        right: size * 0.32,
        width: size,
        height: size * 1.18,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: size * 0.1,
        paddingBottom: size * 0.09,
        backgroundColor: palette.paper,
        border: `${Math.max(2, size * 0.03)}px solid ${palette.rausch}`,
        borderRadius: size * 0.05,
        transform: "rotate(7deg)",
        boxShadow: "0 10px 24px rgba(35,32,29,0.22)",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: fontFamily.body,
          fontWeight: 700,
          fontSize: size * 0.1,
          letterSpacing: size * 0.02,
          color: palette.rauschDeep,
        }}
      >
        PAR AVION
      </div>
      <div style={{ display: "flex", color: palette.babu }}>
        <AmenityGlyph icon="beach" size={size * 0.46} color={palette.babu} />
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: fontFamily.body,
          fontWeight: 700,
          fontSize: size * 0.092,
          letterSpacing: size * 0.04,
          color: palette.ink,
          textTransform: "uppercase",
        }}
      >
        {destination}
      </div>
    </div>
  );
}

export function Postcard({
  imageUrl,
  destination,
  greeting = "greetings from",
  tagline,
  width,
  height,
}: {
  imageUrl: string;
  destination: string;
  greeting?: string;
  tagline?: string;
  width: number;
  height: number;
}) {
  const u = designUnit(width, height);
  const frame = Math.round(u * 0.045);
  const photoW = width - frame * 2;
  const photoH = height - frame * 2;
  const stripeThickness = Math.round(frame * 0.5);
  const dash = Math.round(u * 0.05);
  const stampSize = Math.round(u * 0.2);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        display: "flex",
        backgroundColor: palette.paper,
      }}
    >
      {/* Photo inset within the white card. */}
      <div
        style={{
          position: "absolute",
          top: frame,
          left: frame,
          width: photoW,
          height: photoH,
          display: "flex",
          backgroundColor: palette.babu,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Legibility scrim along the foot. */}
      <div
        style={{
          position: "absolute",
          left: frame,
          bottom: frame,
          width: photoW,
          height: Math.round(photoH * 0.5),
          display: "flex",
          backgroundImage:
            "linear-gradient(to top, rgba(20,18,16,0.62) 0%, rgba(20,18,16,0.18) 45%, rgba(20,18,16,0) 100%)",
        }}
      />

      {/* Air-mail dash border, top and bottom of the photo. */}
      <div
        style={{
          position: "absolute",
          top: frame + Math.round(frame * 0.4),
          left: frame + Math.round(frame * 0.4),
          display: "flex",
        }}
      >
        <AirmailStripe
          width={photoW - Math.round(frame * 0.8)}
          thickness={stripeThickness}
          dash={dash}
        />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: frame + Math.round(frame * 0.4),
          left: frame + Math.round(frame * 0.4),
          display: "flex",
        }}
      >
        <AirmailStripe
          width={photoW - Math.round(frame * 0.8)}
          thickness={stripeThickness}
          dash={dash}
        />
      </div>

      {/* Handwritten greeting across the foot. */}
      <div
        style={{
          position: "absolute",
          left: frame + Math.round(u * 0.06),
          bottom: frame + Math.round(u * 0.07),
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: fontFamily.script,
            fontWeight: 600,
            fontSize: Math.round(u * 0.07),
            color: palette.arches,
            transform: "rotate(-3deg)",
            marginBottom: -Math.round(u * 0.01),
          }}
        >
          {greeting}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: fontFamily.script,
            fontWeight: 700,
            fontSize: Math.round(u * 0.2),
            lineHeight: 1,
            color: palette.paper,
            textShadow: "0 6px 22px rgba(0,0,0,0.45)",
          }}
        >
          {destination}
        </div>
        {tagline && (
          <div
            style={{
              display: "flex",
              fontFamily: fontFamily.body,
              fontWeight: 500,
              fontSize: Math.round(u * 0.032),
              letterSpacing: Math.round(u * 0.032) * 0.18,
              color: "rgba(255,246,236,0.92)",
              textTransform: "uppercase",
              marginTop: Math.round(u * 0.02),
            }}
          >
            {tagline}
          </div>
        )}
      </div>

      <Stamp destination={destination} size={stampSize} />
    </div>
  );
}
