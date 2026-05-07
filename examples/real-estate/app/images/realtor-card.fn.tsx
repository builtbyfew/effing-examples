import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { ImageRunnerReturn, RunnerArgs } from "@effing/fn";
import { easeOutBack } from "@effing/tween";
import {
  frauncesBold,
  loadFonts,
  manropeMedium,
  manropeSemiBold,
} from "~/fonts";
import { fontFamily } from "~/theme";

export const luxe = {
  bone: "#f5efe5",
  ink: "#1c1817",
  inkSoft: "#7a7068",
  brass: "#a48854",
  brassDeep: "#7b6238",
  brassSoft: "#c6a97a",
} as const;

const PHOTO_BLOOM_GRADIENT =
  "radial-gradient(circle at 50% 50%, rgba(198,169,122,0.28), rgba(245,239,229,0) 65%)";
const CARDINAL_GLOW = "rgba(164,136,84,0.35)";
const FLOURISH_GLOW = "rgba(164,136,84,0.45)";

export const propsSchema = z.object({
  photoUrl: z.string().url(),
  name: z.string(),
  company: z.string(),
  phone: z.string(),
  email: z.string(),
  part: z
    .enum(["full", "background", "photo", "identity", "contact"])
    .optional(),
});

export type RealtorCardImageProps = z.infer<typeof propsSchema>;

export const previewProps: RealtorCardImageProps = {
  photoUrl: "https://i.pravatar.cc/600?img=44",
  name: "Margaret Beaumont",
  company: "Capitop Realty Group",
  phone: "+1 (202) 555-0100",
  email: "margaret@capitop.estate",
};

export type Layout = ReturnType<typeof computeLayout>;

export function computeLayout(width: number, height: number) {
  const min = Math.min(width, height);
  const isTight = height / width <= 1.2;

  const photoSize = Math.round(min * (isTight ? 0.26 : 0.32));
  const photoTop = Math.round(height * (isTight ? 0.12 : 0.2));
  const photoLeft = Math.round((width - photoSize) / 2);
  const photoCx = photoLeft + photoSize / 2;
  const photoCy = photoTop + photoSize / 2;
  const ringHairline = Math.max(1, Math.round(photoSize * 0.008));
  const ringGap = Math.max(2, Math.round(photoSize * 0.05));
  const ringOuterRadius = photoSize / 2 + ringGap + ringHairline;
  const cardinalDiamondSize = Math.max(5, Math.round(photoSize * 0.025));
  const cardinalDiamondGap = Math.round(photoSize * 0.06);
  const cardinalRadius = ringOuterRadius + cardinalDiamondGap;
  const cardinalCenters: { x: number; y: number }[] = [
    { x: photoCx, y: photoCy - cardinalRadius },
    { x: photoCx + cardinalRadius, y: photoCy },
    { x: photoCx, y: photoCy + cardinalRadius },
    { x: photoCx - cardinalRadius, y: photoCy },
  ];

  const nameSize = Math.round(min * (isTight ? 0.066 : 0.072));
  const flourishHeight = Math.max(8, Math.round(min * 0.022));
  const wordmarkSize = Math.round(min * (isTight ? 0.03 : 0.034));
  const subWordmarkSize = Math.round(min * (isTight ? 0.016 : 0.018));
  const contactSize = Math.round(min * (isTight ? 0.03 : 0.034));

  const blockTop =
    photoTop + photoSize + Math.round(min * (isTight ? 0.06 : 0.085));
  const flourishTop =
    blockTop + nameSize + Math.round(min * (isTight ? 0.032 : 0.04));
  const wordmarkTop =
    flourishTop + flourishHeight + Math.round(min * (isTight ? 0.026 : 0.035));
  const subWordmarkTop =
    wordmarkTop + wordmarkSize + Math.round(min * (isTight ? 0.011 : 0.014));
  const contactTop =
    subWordmarkTop +
    subWordmarkSize +
    Math.round(min * (isTight ? 0.05 : 0.07));

  const estLabelSize = Math.round(min * (isTight ? 0.014 : 0.016));
  const estInset = Math.round(min * (isTight ? 0.045 : 0.05));

  return {
    width,
    height,
    min,
    isTight,
    photo: {
      size: photoSize,
      top: photoTop,
      left: photoLeft,
      cx: photoCx,
      cy: photoCy,
      ringGap,
      ringHairline,
      ringOuterRadius,
      cardinalDiamondSize,
      cardinalCenters,
    },
    text: {
      blockTop,
      nameSize,
      flourishHeight,
      wordmarkSize,
      subWordmarkSize,
      contactSize,
      flourishTop,
      wordmarkTop,
      subWordmarkTop,
      contactTop,
    },
    est: {
      labelSize: estLabelSize,
      inset: estInset,
    },
  };
}

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

export async function runner({
  props: { photoUrl, name, company, phone, email, part = "full" },
  bounds: { width, height },
}: RunnerArgs<RealtorCardImageProps>): ImageRunnerReturn {
  const fonts = await loadFonts([
    frauncesBold,
    manropeMedium,
    manropeSemiBold,
  ]);
  const layout = computeLayout(width, height);

  const showBackground = part === "full" || part === "background";
  const showPhoto = part === "full" || part === "photo";
  const showIdentity = part === "full" || part === "identity";
  const showContact = part === "full" || part === "contact";

  const canvas = createCanvas(width, height);
  await renderReactElement(
    canvas.getContext("2d"),
    <div
      style={{
        position: "relative",
        width,
        height,
        display: "flex",
        backgroundColor: showBackground ? luxe.bone : undefined,
        color: luxe.ink,
        fontFamily: fontFamily.body,
        overflow: "hidden",
      }}
    >
      {showBackground && <Decorations layout={layout} />}
      {showBackground && <EstMark layout={layout} />}
      {showPhoto && <PhotoBloom layout={layout} />}
      {showPhoto && <Photo layout={layout} photoUrl={photoUrl} />}
      {showIdentity && <Identity layout={layout} name={name} company={company} />}
      {showContact && <Contact layout={layout} phone={phone} email={email} />}
    </div>,
    { fonts },
  );

  if (showBackground) {
    return canvas.encode("jpeg");
  }
  return canvas.encode("png");
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

type Shape =
  | { kind: "ring"; sizeFactor: number; strokeFactor: number }
  | { kind: "dot"; sizeFactor: number }
  | {
      kind: "arc";
      sizeFactor: number;
      strokeFactor: number;
      startDeg: number;
      sweepDeg: number;
    };

type DecorationSpec = {
  shape: Shape;
  cxFrac: number;
  cyFrac: number;
  fromXFactor: number;
  fromYFactor: number;
  // Distinct phases per shape so the constellation breathes out of sync.
  driftPhase: number;
  driftAmpFactor: number;
  opacity: number;
  color: keyof typeof luxe;
};

const DECORATIONS: DecorationSpec[] = [
  {
    shape: { kind: "ring", sizeFactor: 0.34, strokeFactor: 0.0018 },
    cxFrac: 1.02,
    cyFrac: 0.13,
    fromXFactor: 0.06,
    fromYFactor: 0,
    driftPhase: 0,
    driftAmpFactor: 0.005,
    opacity: 0.55,
    color: "brass",
  },
  {
    shape: { kind: "dot", sizeFactor: 0.018 },
    cxFrac: 0.16,
    cyFrac: 0.27,
    fromXFactor: -0.04,
    fromYFactor: 0,
    driftPhase: 1.2,
    driftAmpFactor: 0.008,
    opacity: 0.85,
    color: "brassDeep",
  },
  {
    shape: { kind: "dot", sizeFactor: 0.013 },
    cxFrac: 0.86,
    cyFrac: 0.4,
    fromXFactor: 0.04,
    fromYFactor: 0,
    driftPhase: 2.4,
    driftAmpFactor: 0.008,
    opacity: 0.85,
    color: "brass",
  },
  {
    shape: {
      kind: "arc",
      sizeFactor: 0.42,
      strokeFactor: 0.0017,
      startDeg: -130,
      sweepDeg: 75,
    },
    cxFrac: -0.05,
    cyFrac: 0.56,
    fromXFactor: -0.06,
    fromYFactor: 0,
    driftPhase: 0.8,
    driftAmpFactor: 0.004,
    opacity: 0.5,
    color: "brassSoft",
  },
  {
    shape: { kind: "ring", sizeFactor: 0.18, strokeFactor: 0.002 },
    cxFrac: 0.1,
    cyFrac: 0.78,
    fromXFactor: -0.05,
    fromYFactor: 0,
    driftPhase: 3.0,
    driftAmpFactor: 0.006,
    opacity: 0.6,
    color: "brass",
  },
  {
    shape: { kind: "dot", sizeFactor: 0.012 },
    cxFrac: 0.9,
    cyFrac: 0.74,
    fromXFactor: 0,
    fromYFactor: 0.03,
    driftPhase: 4.2,
    driftAmpFactor: 0.008,
    opacity: 0.85,
    color: "brassDeep",
  },
  {
    shape: { kind: "ring", sizeFactor: 0.075, strokeFactor: 0.0022 },
    cxFrac: 0.86,
    cyFrac: 0.88,
    fromXFactor: 0,
    fromYFactor: 0.04,
    driftPhase: 1.8,
    driftAmpFactor: 0.005,
    opacity: 0.7,
    color: "brass",
  },
  {
    shape: { kind: "dot", sizeFactor: 0.009 },
    cxFrac: 0.13,
    cyFrac: 0.05,
    fromXFactor: -0.04,
    fromYFactor: -0.02,
    driftPhase: 5.5,
    driftAmpFactor: 0.01,
    opacity: 0.7,
    color: "brassSoft",
  },
];

const DRIFT_RATE = 0.025;
const DRIFT_Y_PHASE_FACTOR = 0.7;

type PreparedDecoration = {
  spec: DecorationSpec;
  size: number;
  cx: number;
  cy: number;
  fromX: number;
  fromY: number;
  left: number;
  top: number;
  stroke: number;
  arcPath: string;
  driftAmp: number;
};

// Cached by layout reference so the annie's per-frame Decorations call
// only computes the arc paths and per-shape geometry once.
const preparedCache = new WeakMap<Layout, PreparedDecoration[]>();

function prepareDecorations(layout: Layout): PreparedDecoration[] {
  const cached = preparedCache.get(layout);
  if (cached) return cached;
  const { width, height, min } = layout;
  const prepared = DECORATIONS.map((spec) => {
    const size = Math.round(min * spec.shape.sizeFactor);
    const cx = spec.cxFrac * width;
    const cy = spec.cyFrac * height;
    const stroke =
      spec.shape.kind === "dot"
        ? 0
        : Math.max(1, Math.round(min * spec.shape.strokeFactor));
    const arcPath =
      spec.shape.kind === "arc"
        ? donutSectorPath(
            size / 2,
            size / 2,
            size / 2,
            size / 2 - stroke,
            (spec.shape.startDeg * Math.PI) / 180,
            (spec.shape.sweepDeg * Math.PI) / 180,
          )
        : "";
    return {
      spec,
      size,
      cx,
      cy,
      fromX: spec.fromXFactor * min,
      fromY: spec.fromYFactor * min,
      left: Math.round(cx - size / 2),
      top: Math.round(cy - size / 2),
      stroke,
      arcPath,
      driftAmp: min * spec.driftAmpFactor,
    };
  });
  preparedCache.set(layout, prepared);
  return prepared;
}

export function Decorations({
  layout,
  reveals,
  drift,
}: {
  layout: Layout;
  // 0..1 per shape; defaults to all-1 (used by the static image).
  reveals?: number[];
  // Frame index for the continuous drift; null/undefined disables it
  // (used by the static image).
  drift?: number | null;
}) {
  const prepared = prepareDecorations(layout);
  return (
    <>
      {prepared.map((d, i) => {
        const reveal = clamp01(reveals?.[i] ?? 1);
        const driftDx =
          drift == null
            ? 0
            : Math.sin(drift * DRIFT_RATE + d.spec.driftPhase) * d.driftAmp;
        const driftDy =
          drift == null
            ? 0
            : Math.cos(
                drift * DRIFT_RATE + d.spec.driftPhase * DRIFT_Y_PHASE_FACTOR,
              ) * d.driftAmp;
        const tx = (1 - reveal) * d.fromX + driftDx * reveal;
        const ty = (1 - reveal) * d.fromY + driftDy * reveal;
        const color = luxe[d.spec.color];
        const opacity = d.spec.opacity * reveal;
        const transform = `translate(${tx}px, ${ty}px)`;

        switch (d.spec.shape.kind) {
          case "ring":
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: d.top,
                  left: d.left,
                  width: d.size,
                  height: d.size,
                  borderRadius: d.size,
                  border: `${d.stroke}px solid ${color}`,
                  opacity,
                  transform,
                  display: "flex",
                }}
              />
            );
          case "dot":
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: d.top,
                  left: d.left,
                  width: d.size,
                  height: d.size,
                  borderRadius: d.size,
                  backgroundColor: color,
                  opacity,
                  transform,
                  display: "flex",
                }}
              />
            );
          case "arc":
            return (
              <svg
                key={i}
                width={d.size}
                height={d.size}
                viewBox={`0 0 ${d.size} ${d.size}`}
                style={{
                  position: "absolute",
                  top: d.top,
                  left: d.left,
                  width: d.size,
                  height: d.size,
                  opacity,
                  transform,
                }}
              >
                <path d={d.arcPath} fill={color} />
              </svg>
            );
        }
      })}
    </>
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
  const gap = Math.round(min * 0.014);
  const r = clamp01(reveal);
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
          gap,
        }}
      >
        <div
          style={{
            display: "flex",
            width: Math.round(flankWidth * r),
            height: flankHeight,
            backgroundColor: luxe.brass,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: fontFamily.body,
            fontWeight: 600,
            fontSize: est.labelSize,
            letterSpacing: est.labelSize * 0.6,
            color: luxe.brassDeep,
            whiteSpace: "nowrap",
          }}
        >
          EST · MMXIV
        </div>
        <div
          style={{
            display: "flex",
            width: Math.round(flankWidth * r),
            height: flankHeight,
            backgroundColor: luxe.brass,
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}

export function PhotoBloom({
  layout,
  opacity = 1,
}: {
  layout: Layout;
  opacity?: number;
}) {
  const { photo } = layout;
  const haloSize = Math.round(photo.size * 1.85);
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
        backgroundImage: PHOTO_BLOOM_GRADIENT,
      }}
    />
  );
}

export function Photo({
  layout,
  photoUrl,
  ringSweep = 1,
  cardinalReveals,
  imageScale = 1,
  imageOpacity = 1,
  liftY = 0,
}: {
  layout: Layout;
  photoUrl: string;
  ringSweep?: number;
  // 4 reveals for N, E, S, W diamonds (in that order). Defaults to all-1.
  cardinalReveals?: number[];
  imageScale?: number;
  imageOpacity?: number;
  liftY?: number;
}) {
  const { photo } = layout;
  const {
    size,
    top,
    left,
    ringGap,
    ringHairline,
    ringOuterRadius,
    cardinalDiamondSize,
    cardinalCenters,
  } = photo;

  const ringInnerRadius = ringOuterRadius - ringHairline;
  const sweep = clamp01(ringSweep) * Math.PI * 2;
  const ringPath = donutSectorPath(
    ringOuterRadius,
    ringOuterRadius,
    ringOuterRadius,
    ringInnerRadius,
    -Math.PI / 2,
    sweep,
  );
  const ringSvgSize = ringOuterRadius * 2;
  const ringSvgTop = top + size / 2 - ringOuterRadius;
  const ringSvgLeft = left + size / 2 - ringOuterRadius;
  const cardinalGlow = `0 0 ${Math.round(cardinalDiamondSize * 0.6)}px ${CARDINAL_GLOW}`;

  return (
    <>
      <svg
        width={ringSvgSize}
        height={ringSvgSize}
        viewBox={`0 0 ${ringSvgSize} ${ringSvgSize}`}
        style={{
          position: "absolute",
          top: ringSvgTop,
          left: ringSvgLeft,
          width: ringSvgSize,
          height: ringSvgSize,
          opacity: 0.85,
          transform: `translateY(${liftY}px)`,
        }}
      >
        <path d={ringPath} fill={luxe.brass} />
      </svg>
      <div
        style={{
          position: "absolute",
          top,
          left,
          width: size,
          height: size,
          borderRadius: size,
          overflow: "hidden",
          backgroundColor: luxe.bone,
          opacity: imageOpacity,
          transform: `translateY(${liftY}px) scale(${imageScale})`,
          display: "flex",
        }}
      >
        <img
          src={photoUrl}
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: "cover" }}
        />
      </div>
      {cardinalCenters.map((c, i) => {
        const r = clamp01(cardinalReveals?.[i] ?? 1);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: c.y - cardinalDiamondSize / 2,
              left: c.x - cardinalDiamondSize / 2,
              width: cardinalDiamondSize,
              height: cardinalDiamondSize,
              backgroundColor: luxe.brassDeep,
              transform: `translateY(${liftY}px) rotate(45deg) scale(${r})`,
              boxShadow: cardinalGlow,
              opacity: r,
              display: "flex",
            }}
          />
        );
      })}
    </>
  );
}

function Identity({
  layout,
  name,
  company,
}: {
  layout: Layout;
  name: string;
  company: string;
}) {
  const { width, text } = layout;
  const { head, tail } = splitWordmark(company);

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: text.blockTop,
          left: 0,
          width,
          display: "flex",
          justifyContent: "center",
          fontFamily: fontFamily.display,
          fontWeight: 700,
          fontSize: text.nameSize,
          letterSpacing: -text.nameSize * 0.018,
          color: luxe.ink,
        }}
      >
        {name}
      </div>
      <Flourish layout={layout} />
      <div
        style={{
          position: "absolute",
          top: text.wordmarkTop,
          left: 0,
          width,
          display: "flex",
          justifyContent: "center",
          fontFamily: fontFamily.display,
          fontWeight: 700,
          fontSize: text.wordmarkSize,
          letterSpacing: text.wordmarkSize * 0.32,
          color: luxe.brass,
        }}
      >
        {head}
      </div>
      {tail && <SubWordmark layout={layout} text={tail} />}
    </>
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
        <div
          style={{
            display: "flex",
            width: Math.round(flankWidth * r),
            height: flankHeight,
            backgroundColor: luxe.brass,
            opacity: 0.7,
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: fontFamily.body,
            fontWeight: 600,
            fontSize: t.subWordmarkSize,
            letterSpacing: t.subWordmarkSize * 0.55,
            color: luxe.brass,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </div>
        <div
          style={{
            display: "flex",
            width: Math.round(flankWidth * r),
            height: flankHeight,
            backgroundColor: luxe.brass,
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
}

// Three-diamond flourish, staggered: center diamond first, hairlines extend
// outward, then the side diamonds. `reveal` (0..1) drives the whole sequence.
export function Flourish({
  layout,
  reveal = 1,
}: {
  layout: Layout;
  reveal?: number;
}) {
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
    backgroundColor: luxe.brass,
    transform: `rotate(45deg) scale(${sideScale})`,
    boxShadow: glow(sideDiamond),
  } as const;
  const lineStyle = {
    display: "flex",
    width: Math.round(lineWidth * lineScale),
    height: lineHeight,
    backgroundColor: luxe.brass,
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
            backgroundColor: luxe.brass,
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

function Contact({
  layout,
  phone,
  email,
}: {
  layout: Layout;
  phone: string;
  email: string;
}) {
  const { width, min, text } = layout;
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
        gap: Math.round(min * 0.022),
        fontFamily: fontFamily.body,
        fontWeight: 500,
        fontSize: text.contactSize,
        letterSpacing: text.contactSize * 0.04,
        color: luxe.inkSoft,
      }}
    >
      <div style={{ display: "flex" }}>{phone}</div>
      <div style={{ display: "flex" }}>{email}</div>
    </div>
  );
}

export const DECORATION_TIMING: { startFrame: number; durationFrames: number }[] =
  [
    { startFrame: 4, durationFrames: 22 },
    { startFrame: 8, durationFrames: 22 },
    { startFrame: 12, durationFrames: 22 },
    { startFrame: 16, durationFrames: 24 },
    { startFrame: 20, durationFrames: 22 },
    { startFrame: 24, durationFrames: 22 },
    { startFrame: 28, durationFrames: 22 },
    { startFrame: 32, durationFrames: 22 },
  ];

export const DECORATION_COUNT = DECORATIONS.length;
