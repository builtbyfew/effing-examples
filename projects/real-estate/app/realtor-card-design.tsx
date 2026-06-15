import { easeOutBack } from "@effing/tween";
import type { Image, SKRSContext2D } from "@effing/canvas";
import { fontFamily } from "~/theme";
import { computePanCrop } from "~/photo-pan";

// Shared design system for the realtor sign-off card, used by both the
// static image fn (app/images/realtor-card.fn.tsx, composed part-by-part by
// the basic promo) and the animated annie (app/annies/realtor-card.fn.tsx,
// used by the fancy promo). Every reveal/opacity prop defaults to the fully
// revealed state, so the static image renders the components bare while the
// annie drives them frame-by-frame.

// Dark, cinematic palette — the sign-off slide carries the listing photo
// into a near-black backdrop with gold accents on top.
export const noir = {
  night: "#161210",
  ivory: "#f5eee2",
  ivorySoft: "rgba(245,238,226,0.82)",
  gold: "#c9a96b",
  goldSoft: "#e6cf9d",
  goldFaint: "rgba(201,169,107,0.38)",
} as const;

export const NIGHT_RGB = "22,18,16";
const PORTRAIT_GLOW_GRADIENT =
  "radial-gradient(circle at 50% 50%, rgba(201,169,107,0.22), rgba(201,169,107,0) 65%)";
const AMBIENT_GLOW_GRADIENT =
  "radial-gradient(circle at 50% 18%, rgba(201,169,107,0.14), rgba(201,169,107,0) 60%)";
const SCRIM_STOPS: [number, number][] = [
  [0, 0.45],
  [0.22, 0.68],
  [0.42, 0.92],
  [0.58, 1],
];
const FLOURISH_GLOW = "rgba(201,169,107,0.55)";

export const DEFAULT_EYEBROW = "Listed exclusively by";

export function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function splitWordmark(company: string) {
  const words = company.trim().split(/\s+/);
  return {
    head: (words[0] ?? company).toUpperCase(),
    tail: words.slice(1).join(" ").toUpperCase(),
  };
}

// Filled annular sector swept clockwise from `startAngle` for `sweep` radians.
// We use fill instead of stroke because the renderer's stroke handling is
// unreliable. The sweep is clamped just below 2π so a single arc command
// still resolves — full-circle paths with one arc segment can degenerate.
export function donutSectorPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  sweep: number,
) {
  if (sweep <= 0) return "";
  const clamped = Math.min(sweep, Math.PI * 2 - 1e-3);
  const a0 = startAngle;
  const a1 = startAngle + clamped;
  const x0o = cx + rOuter * Math.cos(a0);
  const y0o = cy + rOuter * Math.sin(a0);
  const x1o = cx + rOuter * Math.cos(a1);
  const y1o = cy + rOuter * Math.sin(a1);
  const x0i = cx + rInner * Math.cos(a0);
  const y0i = cy + rInner * Math.sin(a0);
  const x1i = cx + rInner * Math.cos(a1);
  const y1i = cy + rInner * Math.sin(a1);
  const largeArc = clamped > Math.PI ? 1 : 0;
  return (
    `M ${x0o} ${y0o} ` +
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x1o} ${y1o} ` +
    `L ${x1i} ${y1i} ` +
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x0i} ${y0i} Z`
  );
}

export type Layout = ReturnType<typeof computeLayout>;

export function computeLayout(width: number, height: number) {
  const min = Math.min(width, height);
  const isTight = height / width <= 1.2;

  const frameInset = Math.round(min * 0.04);

  const eyebrowSize = Math.round(min * (isTight ? 0.015 : 0.017));
  const photoSize = Math.round(min * (isTight ? 0.235 : 0.285));
  const nameSize = Math.round(min * (isTight ? 0.064 : 0.072));
  const flourishHeight = Math.max(8, Math.round(min * 0.022));
  const wordmarkSize = Math.round(min * (isTight ? 0.029 : 0.033));
  const subWordmarkSize = Math.round(min * (isTight ? 0.016 : 0.018));
  const contactSize = Math.round(min * (isTight ? 0.027 : 0.03));

  // Vertical gaps between the stacked sections, in reading order. The
  // eyebrow gap is generous because the sweep ring reaches ~0.1 photoSize
  // above the photo itself.
  const eyebrowGap = Math.round(min * (isTight ? 0.055 : 0.075));
  const nameGap = Math.round(min * (isTight ? 0.055 : 0.08));
  const flourishGap = Math.round(min * (isTight ? 0.03 : 0.04));
  const wordmarkGap = Math.round(min * (isTight ? 0.026 : 0.034));
  const subWordmarkGap = Math.round(min * 0.013);
  const contactGap = Math.round(min * (isTight ? 0.05 : 0.07));
  const contactRowGap = Math.round(min * 0.022);
  // Two text rows with their leading, plus the gap between them.
  const contactBlockHeight = Math.round(contactSize * 2.7) + contactRowGap;

  const stackHeight =
    eyebrowSize +
    eyebrowGap +
    photoSize +
    nameGap +
    nameSize +
    flourishGap +
    flourishHeight +
    wordmarkGap +
    wordmarkSize +
    subWordmarkGap +
    subWordmarkSize +
    contactGap +
    contactBlockHeight;

  // Center the stack with a slight upward bias so margins stay balanced at
  // every aspect ratio — anchoring at a fixed height fraction left 4:5
  // crowded at the bottom while 9:16 looked right. The cap keeps the card
  // from sinking below the eye line on very tall canvases.
  const eyebrowTop = Math.min(
    Math.round((height - stackHeight) * 0.42),
    Math.round(height * 0.22),
  );

  const photoTop = eyebrowTop + eyebrowSize + eyebrowGap;
  const photoLeft = Math.round((width - photoSize) / 2);
  const photoCx = photoLeft + photoSize / 2;
  const photoCy = photoTop + photoSize / 2;

  const ringHairline = Math.max(1, Math.round(photoSize * 0.007));
  const innerRingRadius =
    photoSize / 2 + Math.max(2, Math.round(photoSize * 0.045));
  const sweepThickness = Math.max(2, Math.round(photoSize * 0.012));
  const sweepOuterRadius =
    photoSize / 2 + Math.round(photoSize * 0.085) + sweepThickness;

  const blockTop = photoTop + photoSize + nameGap;
  const flourishTop = blockTop + nameSize + flourishGap;
  const wordmarkTop = flourishTop + flourishHeight + wordmarkGap;
  const subWordmarkTop = wordmarkTop + wordmarkSize + subWordmarkGap;
  const contactTop = subWordmarkTop + subWordmarkSize + contactGap;

  const estLabelSize = Math.round(min * (isTight ? 0.014 : 0.016));
  const estInset = frameInset + Math.round(min * (isTight ? 0.022 : 0.028));

  return {
    width,
    height,
    min,
    isTight,
    frameInset,
    eyebrow: { top: eyebrowTop, size: eyebrowSize },
    photo: {
      size: photoSize,
      top: photoTop,
      left: photoLeft,
      cx: photoCx,
      cy: photoCy,
      ringHairline,
      innerRingRadius,
      sweepThickness,
      sweepOuterRadius,
    },
    text: {
      blockTop,
      nameSize,
      flourishHeight,
      flourishTop,
      wordmarkSize,
      wordmarkTop,
      subWordmarkSize,
      subWordmarkTop,
      contactSize,
      contactTop,
      contactRowGap,
    },
    est: { labelSize: estLabelSize, inset: estInset },
  };
}

// When the card follows a panned listing photo, the backdrop can start from
// that photo's exact final crop so a crossfade from it is seamless. Matches
// the parameters of the panning-photo annie (direction "left", progress 1).
export type BackdropPan = { distance: number; oversize: number };

// Opaque base of the card: night fill, then the backdrop crop with its scrim
// and vignette. Raw canvas ops on a pre-loaded image — an <img> in a React
// tree would be re-fetched on every renderReactElement call.
export function drawBase(
  ctx: SKRSContext2D,
  layout: Layout,
  backdropImage: Image | null,
  zoom: number,
  fade: number,
  pan?: BackdropPan,
) {
  const { width, height } = layout;
  ctx.fillStyle = noir.night;
  ctx.fillRect(0, 0, width, height);
  if (!backdropImage || fade <= 0) return;

  const iw = backdropImage.width;
  const ih = backdropImage.height;
  ctx.globalAlpha = fade;
  if (pan) {
    // Base crop = where the preceding pan ended; the ken-burns zoom scales
    // that crop in place (upper-biased like the default branch below), so
    // zoom=1 reproduces the pan's final frame pixel-for-pixel.
    const { sx, sy, sw, sh } = computePanCrop({
      imageWidth: iw,
      imageHeight: ih,
      width,
      height,
      direction: "left",
      distance: pan.distance,
      oversize: pan.oversize,
      progress: 1,
    });
    const zw = sw / zoom;
    const zh = sh / zoom;
    ctx.drawImage(
      backdropImage,
      sx + (sw - zw) * 0.5,
      sy + (sh - zh) * 0.3,
      zw,
      zh,
      0,
      0,
      width,
      height,
    );
  } else {
    // Cover crop scaled around a 50%/30% origin, so a ken-burns zoom drifts
    // around the upper part of the photo where it stays visible longest.
    const cover = Math.max(width / iw, height / ih);
    const scale = cover * zoom;
    const sw = width / scale;
    const sh = height / scale;
    const originX = (iw - width / cover) / 2 + (0.5 * width) / cover;
    const originY = (ih - height / cover) / 2 + (0.3 * height) / cover;
    ctx.drawImage(
      backdropImage,
      originX - 0.5 * sw,
      originY - 0.3 * sh,
      sw,
      sh,
      0,
      0,
      width,
      height,
    );
  }
  ctx.globalAlpha = 1;

  const scrim = ctx.createLinearGradient(0, 0, 0, height);
  for (const [offset, alpha] of SCRIM_STOPS) {
    scrim.addColorStop(offset, `rgba(${NIGHT_RGB},${alpha})`);
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);

  const vignetteCx = 0.5 * width;
  const vignetteCy = 0.32 * height;
  const vignetteRadius = Math.hypot(
    Math.max(vignetteCx, width - vignetteCx),
    Math.max(vignetteCy, height - vignetteCy),
  );
  const vignette = ctx.createRadialGradient(
    vignetteCx,
    vignetteCy,
    0,
    vignetteCx,
    vignetteCy,
    vignetteRadius,
  );
  vignette.addColorStop(0.45, `rgba(${NIGHT_RGB},0)`);
  vignette.addColorStop(1, `rgba(${NIGHT_RGB},0.55)`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

// The portrait photo, clipped to its circle. Drawn after the React overlay,
// which is safe z-order-wise: the rings sit outside the photo circle, and
// everything else keeps clear of it.
export function drawPortraitPhoto(
  ctx: SKRSContext2D,
  image: Image,
  layout: Layout,
  imageScale = 1,
  opacity = 1,
  liftY = 0,
) {
  if (opacity <= 0) return;
  const { photo } = layout;
  const radius = (photo.size / 2) * imageScale;
  const cx = photo.cx;
  const cy = photo.cy + liftY;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = noir.night;
  ctx.fill();
  ctx.clip();
  const iw = image.width;
  const ih = image.height;
  const cover = Math.max((radius * 2) / iw, (radius * 2) / ih);
  const sw = (radius * 2) / cover;
  const sh = (radius * 2) / cover;
  ctx.drawImage(
    image,
    (iw - sw) / 2,
    (ih - sh) / 2,
    sw,
    sh,
    cx - radius,
    cy - radius,
    radius * 2,
    radius * 2,
  );
  ctx.restore();
}

// Soft gold wash for the backdrop-less variant of the card.
export function AmbientGlow({ layout }: { layout: Layout }) {
  const { width, height } = layout;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        backgroundImage: AMBIENT_GLOW_GRADIENT,
      }}
    />
  );
}

// Thin gold rectangle inset from the canvas edge — invitation-style framing.
export function HairlineFrame({
  layout,
  reveal = 1,
}: {
  layout: Layout;
  reveal?: number;
}) {
  const { width, height, frameInset } = layout;
  return (
    <div
      style={{
        position: "absolute",
        top: frameInset,
        left: frameInset,
        width: width - frameInset * 2,
        height: height - frameInset * 2,
        border: `1px solid ${noir.goldFaint}`,
        opacity: reveal,
        display: "flex",
      }}
    />
  );
}

export function PortraitGlow({
  layout,
  opacity = 1,
}: {
  layout: Layout;
  opacity?: number;
}) {
  const { photo } = layout;
  const haloSize = Math.round(photo.size * 2.3);
  return (
    <div
      style={{
        position: "absolute",
        top: photo.cy - haloSize / 2,
        left: photo.cx - haloSize / 2,
        width: haloSize,
        height: haloSize,
        display: "flex",
        opacity,
        backgroundImage: PORTRAIT_GLOW_GRADIENT,
      }}
    />
  );
}

export function Eyebrow({
  layout,
  text,
  reveal = 1,
  liftY = 0,
}: {
  layout: Layout;
  text: string;
  reveal?: number;
  liftY?: number;
}) {
  const { width, min, eyebrow } = layout;
  const flankWidth = Math.round(min * 0.04);
  const flankHeight = Math.max(1, Math.round(min * 0.0014));
  const r = clamp01(reveal);
  const flankStyle = {
    display: "flex",
    width: Math.round(flankWidth * r),
    height: flankHeight,
    backgroundColor: noir.gold,
    opacity: 0.7,
  } as const;
  return (
    <div
      style={{
        position: "absolute",
        top: eyebrow.top,
        left: 0,
        width,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: r,
        transform: `translateY(${liftY + (1 - r) * eyebrow.size * 0.6}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: Math.round(min * 0.014),
        }}
      >
        <div style={flankStyle} />
        <div
          style={{
            display: "flex",
            fontFamily: fontFamily.body,
            fontWeight: 600,
            fontSize: eyebrow.size,
            letterSpacing: eyebrow.size * 0.55,
            color: noir.gold,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
        <div style={flankStyle} />
      </div>
    </div>
  );
}

// The rings around the portrait — the photo itself is drawn separately with
// drawPortraitPhoto so it never rides through renderReactElement.
export function PortraitFrame({
  layout,
  ringSweep = 1,
  ringOpacity = 1,
  liftY = 0,
}: {
  layout: Layout;
  ringSweep?: number;
  ringOpacity?: number;
  liftY?: number;
}) {
  const { photo } = layout;
  const { ringHairline, innerRingRadius, sweepThickness, sweepOuterRadius } =
    photo;

  const sweep = clamp01(ringSweep) * Math.PI * 2;
  const sweepPath = donutSectorPath(
    sweepOuterRadius,
    sweepOuterRadius,
    sweepOuterRadius,
    sweepOuterRadius - sweepThickness,
    -Math.PI / 2,
    sweep,
  );
  const sweepSvgSize = sweepOuterRadius * 2;

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: photo.cy - innerRingRadius,
          left: photo.cx - innerRingRadius,
          width: innerRingRadius * 2,
          height: innerRingRadius * 2,
          borderRadius: innerRingRadius * 2,
          border: `${ringHairline}px solid ${noir.goldFaint}`,
          opacity: ringOpacity,
          transform: `translateY(${liftY}px)`,
          display: "flex",
        }}
      />
      <svg
        width={sweepSvgSize}
        height={sweepSvgSize}
        viewBox={`0 0 ${sweepSvgSize} ${sweepSvgSize}`}
        style={{
          position: "absolute",
          top: photo.cy - sweepOuterRadius,
          left: photo.cx - sweepOuterRadius,
          width: sweepSvgSize,
          height: sweepSvgSize,
          opacity: 0.9,
          transform: `translateY(${liftY}px)`,
        }}
      >
        <path d={sweepPath} fill={noir.gold} />
      </svg>
    </>
  );
}

export function NameLine({
  layout,
  words,
  reveal = 1,
  liftY = 0,
}: {
  layout: Layout;
  words: string[];
  reveal?: number;
  liftY?: number;
}) {
  const { width, text: t } = layout;
  const perWord = 1 / Math.max(1, words.length);
  return (
    <div
      style={{
        position: "absolute",
        top: t.blockTop,
        left: 0,
        width,
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        fontFamily: fontFamily.display,
        fontSize: t.nameSize,
        fontWeight: 700,
        letterSpacing: -t.nameSize * 0.018,
        color: noir.ivory,
        textShadow: "0 2px 28px rgba(0,0,0,0.45)",
        gap: Math.round(t.nameSize * 0.28),
      }}
    >
      {words.map((word, i) => {
        const local = clamp01(
          (reveal - i * perWord * 0.55) / Math.max(perWord * 0.9, 0.22),
        );
        const eased = 1 - Math.pow(1 - local, 3);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              opacity: eased,
              transform: `translateY(${liftY + (1 - eased) * t.nameSize * 0.32}px)`,
            }}
          >
            {word}
          </div>
        );
      })}
    </div>
  );
}

// Three-diamond flourish, staggered: center diamond first, hairlines extend
// outward, then the side diamonds. `reveal` (0..1) drives the whole sequence.
function Flourish({ layout, reveal = 1 }: { layout: Layout; reveal?: number }) {
  const { min, text } = layout;
  const r = clamp01(reveal);

  const centerDiamond = Math.max(5, Math.round(min * 0.014));
  const sideDiamond = Math.max(3, Math.round(min * 0.0075));
  const lineHeight = Math.max(1, Math.round(min * 0.0018));
  const lineWidth = Math.round(min * 0.04);
  const innerGap = Math.round(min * 0.012);
  const outerGap = Math.round(min * 0.01);

  const centerScale = easeOutBack(clamp01(r / 0.4));
  const lineScale = clamp01((r - 0.3) / 0.6);
  const sideScale = easeOutBack(clamp01((r - 0.6) / 0.4));

  const glow = (size: number) =>
    `0 0 ${Math.round(size * 0.75)}px ${FLOURISH_GLOW}`;

  const sideStyle = {
    display: "flex",
    width: sideDiamond,
    height: sideDiamond,
    backgroundColor: noir.gold,
    transform: `rotate(45deg) scale(${sideScale})`,
    boxShadow: glow(sideDiamond),
  } as const;
  const lineStyle = {
    display: "flex",
    width: Math.round(lineWidth * lineScale),
    height: lineHeight,
    backgroundColor: noir.gold,
    opacity: 0.85,
  } as const;

  return (
    <div
      style={{
        position: "absolute",
        top: text.flourishTop,
        left: 0,
        width: layout.width,
        height: text.flourishHeight,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <div style={{ ...sideStyle, marginRight: outerGap }} />
        <div style={{ ...lineStyle, marginRight: innerGap }} />
        <div
          style={{
            display: "flex",
            width: centerDiamond,
            height: centerDiamond,
            backgroundColor: noir.gold,
            transform: `rotate(45deg) scale(${centerScale})`,
            boxShadow: glow(centerDiamond),
          }}
        />
        <div style={{ ...lineStyle, marginLeft: innerGap }} />
        <div style={{ ...sideStyle, marginLeft: outerGap }} />
      </div>
    </div>
  );
}

export function FlourishWrap({
  layout,
  reveal = 1,
  liftY = 0,
  pulse = 1,
}: {
  layout: Layout;
  reveal?: number;
  liftY?: number;
  pulse?: number;
}) {
  const { width, text } = layout;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height: text.flourishTop + text.flourishHeight + 1,
        display: "flex",
        transform: `translateY(${liftY}px) scale(${pulse})`,
        transformOrigin: `${width / 2}px ${text.flourishTop + text.flourishHeight / 2}px`,
      }}
    >
      <Flourish layout={layout} reveal={reveal} />
    </div>
  );
}

export function Wordmark({
  layout,
  chars,
  reveals,
  liftY = 0,
}: {
  layout: Layout;
  chars: string[];
  // 0..1 per character; defaults to all-1 (used by the static image).
  reveals?: number[];
  liftY?: number;
}) {
  const { width, text } = layout;
  return (
    <div
      style={{
        position: "absolute",
        top: text.wordmarkTop,
        left: 0,
        width,
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        fontFamily: fontFamily.display,
        fontWeight: 700,
        fontSize: text.wordmarkSize,
        letterSpacing: text.wordmarkSize * 0.32,
        color: noir.gold,
      }}
    >
      {chars.map((ch, i) => {
        const r = clamp01(reveals?.[i] ?? 1);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              opacity: r,
              transform: `translateY(${liftY + (1 - r) * text.wordmarkSize * 0.4}px)`,
            }}
          >
            {ch}
          </div>
        );
      })}
    </div>
  );
}

export function SubWordmark({
  layout,
  text,
  reveal = 1,
  liftY = 0,
}: {
  layout: Layout;
  text: string;
  reveal?: number;
  liftY?: number;
}) {
  if (!text) return null;
  const { width, min, text: t } = layout;
  const flankWidth = Math.round(min * 0.025);
  const flankHeight = Math.max(1, Math.round(min * 0.0014));
  const r = clamp01(reveal);
  const flankStyle = {
    display: "flex",
    width: Math.round(flankWidth * r),
    height: flankHeight,
    backgroundColor: noir.gold,
    opacity: 0.7,
  } as const;
  return (
    <div
      style={{
        position: "absolute",
        top: t.subWordmarkTop,
        left: 0,
        width,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: r,
        transform: `translateY(${liftY + (1 - r) * t.subWordmarkSize * 0.5}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: Math.round(min * 0.012),
        }}
      >
        <div style={flankStyle} />
        <div
          style={{
            display: "flex",
            fontFamily: fontFamily.body,
            fontWeight: 600,
            fontSize: t.subWordmarkSize,
            letterSpacing: t.subWordmarkSize * 0.55,
            color: noir.goldSoft,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
        <div style={flankStyle} />
      </div>
    </div>
  );
}

export function ContactPanel({
  layout,
  phone,
  email,
  panelReveal = 1,
  rowReveals = [1, 1],
  liftY = 0,
}: {
  layout: Layout;
  phone: string;
  email: string;
  panelReveal?: number;
  rowReveals?: [number, number];
  liftY?: number;
}) {
  const { width, min, text } = layout;
  const r = clamp01(panelReveal);
  return (
    <div
      style={{
        position: "absolute",
        top: text.contactTop,
        left: 0,
        width,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: text.contactRowGap,
        opacity: r,
        transform: `translateY(${liftY + (1 - r) * min * 0.02}px)`,
        fontFamily: fontFamily.body,
        fontWeight: 500,
        fontSize: text.contactSize,
        letterSpacing: text.contactSize * 0.06,
        color: noir.ivorySoft,
      }}
    >
      <ContactRow text={phone} reveal={rowReveals[0]} size={text.contactSize} />
      <ContactRow text={email} reveal={rowReveals[1]} size={text.contactSize} />
    </div>
  );
}

function ContactRow({
  text,
  reveal,
  size,
}: {
  text: string;
  reveal: number;
  size: number;
}) {
  const r = clamp01(reveal);
  return (
    <div
      style={{
        display: "flex",
        opacity: r,
        transform: `translateY(${(1 - r) * size * 0.5}px)`,
      }}
    >
      {text}
    </div>
  );
}

export function EstMark({
  layout,
  reveal = 1,
}: {
  layout: Layout;
  reveal?: number;
}) {
  const { min, width, est } = layout;
  const flankWidth = Math.round(min * 0.025);
  const flankHeight = Math.max(1, Math.round(min * 0.0014));
  const r = clamp01(reveal);
  const flankStyle = {
    display: "flex",
    width: Math.round(flankWidth * r),
    height: flankHeight,
    backgroundColor: noir.gold,
    opacity: 0.55,
  } as const;
  return (
    <div
      style={{
        position: "absolute",
        bottom: est.inset,
        left: 0,
        width,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: r,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: Math.round(min * 0.014),
        }}
      >
        <div style={flankStyle} />
        <div
          style={{
            display: "flex",
            fontFamily: fontFamily.body,
            fontWeight: 600,
            fontSize: est.labelSize,
            letterSpacing: est.labelSize * 0.6,
            color: "rgba(201,169,107,0.75)",
            whiteSpace: "nowrap",
          }}
        >
          EST · MMXIV
        </div>
        <div style={flankStyle} />
      </div>
    </div>
  );
}
