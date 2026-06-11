import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { AnnieRunnerReturn, RunnerArgs } from "@effing/fn";
import {
  tween,
  easeOutBack,
  easeOutCubic,
  easeOutQuad,
  easeOutQuint,
} from "@effing/tween";
import {
  loadFonts,
  poppinsSemiBold,
  poppinsBold,
  dmSansMedium,
  dmSansBold,
} from "~/fonts";
import { palette, fontFamily } from "~/theme";
import { starPath } from "~/components/stars";
import { AnimatedGlyph } from "~/components/animated-icons";
import { designUnit } from "~/components/design-unit";
import { SAMPLE_LISTING } from "~/sample-listing";

// The "loved by guests" beat, in a bright booking-app register: a clean warm-white
// field with a soft coral bloom, a friendly oversized Poppins score as the hero
// (ink integer, coral decimals), and coral stars that fly up into a quiet caption.
// Motion is one orchestrated load — the pill fades in, the score counts up and
// settles, the stars fly in on a tight stagger, a coral underline sweeps, and the
// review count rises alongside.

export const propsSchema = z.object({
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0),
  eyebrow: z.string().optional(),
  frameCount: z.number().int().min(1),
});

export type RatingStarsProps = z.infer<typeof propsSchema>;

export const previewProps: RatingStarsProps = {
  rating: SAMPLE_LISTING.rating,
  reviewCount: SAMPLE_LISTING.reviewCount,
  eyebrow: "Loved by guests",
  frameCount: 135,
};

const STAR_COUNT = 5;

// Timeline (normalised 0..1 over the clip).
const KICKER_IN = 0.14;
const COUNT_START = 0.06;
const COUNT_END = 0.42;
const UNDERLINE_START = 0.42;
const UNDERLINE_DUR = 0.22;
const STAR_FLY_START = 0.4;
const STAR_STAGGER = 0.04;
const STAR_FLY_DUR = 0.2;
const CAP_TEXT_START = 0.5;
const CAP_TEXT_DUR = 0.2;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function SmallStar({
  size,
  fraction,
}: {
  size: number;
  fraction: number;
}) {
  const d = starPath(size);
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path
          d={d}
          fill="none"
          stroke="rgba(34,34,34,0.16)"
          strokeWidth={Math.max(1, size * 0.08)}
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: clamp01(fraction) * size,
          height: size,
          overflow: "hidden",
          display: "flex",
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Match the outline's stroke extent so no gray halo rings the fill. */}
          <path
            d={d}
            fill={palette.rausch}
            stroke={palette.rausch}
            strokeWidth={Math.max(1, size * 0.08)}
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export async function* runner({
  props: { rating, reviewCount, eyebrow = "Loved by guests", frameCount },
  bounds: { width, height },
}: RunnerArgs<RatingStarsProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([
    poppinsSemiBold,
    poppinsBold,
    dmSansMedium,
    dmSansBold,
  ]);
  const u = designUnit(width, height);

  const kickerFont = Math.round(u * 0.036);
  const kickerPadY = Math.round(kickerFont * 0.6);
  const scoreFont = Math.round(u * 0.34);
  const starSize = Math.round(u * 0.058);
  const reviewFont = Math.round(u * 0.044);
  const underlineMax = Math.round(u * 0.26);

  yield* tween(frameCount, async ({ lower: t }) => {
    const containerOpacity = easeOutQuad(clamp01(t / 0.05));

    // Kicker pill.
    const kickerT = easeOutQuad(clamp01(t / KICKER_IN));
    const kickerRise = (1 - kickerT) * u * 0.03;

    // Score count-up, decelerating to a settle (no bounce).
    const countT = clamp01((t - COUNT_START) / (COUNT_END - COUNT_START));
    const value = rating * easeOutQuint(countT);
    const numOpacity = easeOutQuad(clamp01((t - COUNT_START) / 0.1));
    const numScale = 1 + 0.04 * (1 - easeOutCubic(countT));
    const [intPart, decPart] = value.toFixed(2).split(".");

    // Soft coral bloom grows with the count and gives a gentle "ding" on settle.
    const settlePulse = Math.max(0, 1 - Math.abs(t - COUNT_END) / 0.16);
    const bloomOpacity = 0.16 + 0.16 * easeOutQuint(countT) + 0.1 * settlePulse;

    // Stars fly up into the caption — staggered, each with an overshoot landing
    // and an alternating twist, so the entrance shows off real motion.
    const stars = Array.from({ length: STAR_COUNT }, (_, i) => {
      const start = STAR_FLY_START + i * STAR_STAGGER;
      const local = clamp01((t - start) / STAR_FLY_DUR);
      const settled = easeOutCubic(local);
      const rise = (1 - easeOutBack(local)) * u * 0.13;
      const scale = lerp(0.4, 1, settled);
      const rot = (1 - settled) * (i % 2 === 0 ? -32 : 32);
      const opacity = clamp01(local / 0.22);
      const fraction = clamp01(rating - i);
      return { rise, scale, rot, opacity, fraction };
    });

    // Single coral underline sweep beneath the score.
    const underlineT = clamp01((t - UNDERLINE_START) / UNDERLINE_DUR);
    const underlineW = underlineMax * easeOutCubic(underlineT);

    // Caption text (divider + review count) settles as the stars land.
    const capTextT = easeOutQuad(clamp01((t - CAP_TEXT_START) / CAP_TEXT_DUR));
    const capTextRise = (1 - capTextT) * u * 0.025;

    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <div
        style={{
          position: "relative",
          width,
          height,
          display: "flex",
          opacity: containerOpacity,
        }}
      >
        {/* Warm-white field */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            display: "flex",
            backgroundImage:
              "linear-gradient(165deg, #ffffff 0%, #fdf6f4 58%, #fbeeed 100%)",
          }}
        />
        {/* Soft coral bloom behind the score */}
        <div
          style={{
            position: "absolute",
            left: width * 0.5 - u * 1.0,
            top: height * 0.44 - u * 1.0,
            width: u * 2.0,
            height: u * 2.0,
            display: "flex",
            opacity: bloomOpacity,
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(255,56,92,0.34) 0%, rgba(252,100,45,0.12) 38%, rgba(255,56,92,0) 70%)",
          }}
        />

        {/* Centred editorial stack */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Kicker pill */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: Math.round(kickerFont * 0.45),
              paddingLeft: Math.round(kickerFont * 0.85),
              paddingRight: Math.round(kickerFont * 1.0),
              paddingTop: kickerPadY,
              paddingBottom: kickerPadY,
              backgroundColor: "rgba(255,56,92,0.1)",
              borderRadius: 999,
              opacity: kickerT,
              transform: `translateY(${kickerRise}px)`,
            }}
          >
            {/* The heart beats — thump and echo from the animated icon set. */}
            <AnimatedGlyph
              icon="heart"
              size={Math.round(kickerFont * 1.1)}
              color={palette.rausch}
              phase={Math.max(0, t - KICKER_IN) * 3}
            />
            <div
              style={{
                display: "flex",
                fontFamily: fontFamily.body,
                fontWeight: 700,
                fontSize: kickerFont,
                letterSpacing: kickerFont * 0.02,
                color: palette.rausch,
              }}
            >
              {eyebrow}
            </div>
          </div>

          {/* Score — the hero. Friendly Poppins, ink integer with coral decimals. */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "baseline",
              marginTop: Math.round(u * 0.07),
              opacity: numOpacity,
              transform: `scale(${numScale})`,
              transformOrigin: "center center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: fontFamily.display,
                fontWeight: 700,
                fontSize: scoreFont,
                lineHeight: 1,
                color: palette.ink,
                letterSpacing: -scoreFont * 0.02,
              }}
            >
              {intPart}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: fontFamily.display,
                fontWeight: 700,
                fontSize: scoreFont,
                lineHeight: 1,
                color: palette.rausch,
                letterSpacing: -scoreFont * 0.02,
              }}
            >
              .{decPart}
            </div>
          </div>

          {/* Coral underline sweep */}
          <div
            style={{
              display: "flex",
              marginTop: Math.round(u * 0.05),
              width: Math.round(underlineW),
              height: Math.max(2, Math.round(u * 0.0042)),
              backgroundColor: palette.rausch,
              borderRadius: 999,
            }}
          />

          {/* Caption: stars fly up into place, review count settles alongside */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: Math.round(u * 0.026),
              marginTop: Math.round(u * 0.065),
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: Math.round(starSize * 0.28),
              }}
            >
              {stars.map((s, i) => (
                <div
                  key={i}
                  style={{
                    width: starSize,
                    height: starSize,
                    display: "flex",
                    opacity: s.opacity,
                    transform: `translateY(${s.rise}px) scale(${s.scale}) rotate(${s.rot}deg)`,
                    transformOrigin: "center center",
                  }}
                >
                  <SmallStar size={starSize} fraction={s.fraction} />
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                width: Math.max(1, Math.round(u * 0.0022)),
                height: Math.round(starSize * 0.9),
                backgroundColor: "rgba(34,34,34,0.16)",
                opacity: capTextT,
              }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: fontFamily.body,
                fontWeight: 500,
                fontSize: reviewFont,
                letterSpacing: reviewFont * 0.01,
                color: palette.inkSoft,
                opacity: capTextT,
                transform: `translateY(${capTextRise}px)`,
              }}
            >
              {reviewCount} verified reviews
            </div>
          </div>
        </div>
      </div>,
      { fonts },
    );
    // Flat vector graphics + text: PNG keeps the stars and score crisp — JPEG's
    // chroma subsampling fringes saturated coral edges on the pale field.
    return canvas.encode("png");
  });
}
