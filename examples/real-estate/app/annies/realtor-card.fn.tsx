import { z } from "zod";
import { frauncesBold, manropeMedium, loadFonts } from "~/fonts";
import {
  tween,
  easeOutQuad,
  easeOutCubic,
  easeOutQuart,
  easeOutBack,
} from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { palette, fontFamily } from "~/theme";

export const propsSchema = z.object({
  photoUrl: z.string().url(),
  name: z.string(),
  company: z.string(),
  phone: z.string(),
  email: z.string(),
  totalFrameCount: z.number().int().min(1),
  fadeInFrameCount: z.number().int().min(1).optional(),
});

export type RealtorCardProps = z.infer<typeof propsSchema>;

export const previewProps: RealtorCardProps = {
  photoUrl: "https://i.pravatar.cc/600?img=32",
  name: "Sofia Martínez",
  company: "Costa del Sol Properties",
  phone: "+34 952 123 456",
  email: "sofia@costadelsol.es",
  totalFrameCount: 120,
  fadeInFrameCount: 18,
};

type Layout = ReturnType<typeof computeLayout>;
type PhotoGeometry = Layout["photo"];

// Anchor sizes to the shorter dimension so density is consistent across
// aspect ratios (1:1, 4:5, 9:16). photoTop is biased above vertical center
// (×0.4) so the card composes well across ratios; approxTextHeight is a
// calibrated estimate of the text stack since we can't measure rendered
// text from here.
function computeLayout(width: number, height: number) {
  const min = Math.min(width, height);
  const arcSize = Math.round(min * 0.55);
  const photoSize = Math.round(min * 0.34);
  const outerRingGap = Math.round(photoSize * 0.085);
  const photoToTextGap = Math.round(min * 0.04);
  const approxTextHeight = Math.round(min * 0.34);
  const contentHeight =
    photoSize + outerRingGap * 2 + photoToTextGap + approxTextHeight;
  const photoTop = Math.max(
    Math.round(min * 0.1),
    Math.round((height - contentHeight) * 0.4),
  );
  const contactSize = Math.round(min * 0.038);

  return {
    width,
    height,
    min,
    arcSize,
    sunSize: Math.round(arcSize * 0.55),
    sunInset: Math.round(arcSize * 0.05),
    photo: {
      size: photoSize,
      ringWidth: Math.round(photoSize * 0.025),
      outerGap: outerRingGap,
      outerThickness: Math.max(1, Math.round(photoSize * 0.013)),
      top: photoTop,
      left: Math.round((width - photoSize) / 2),
    },
    text: {
      photoToTextGap,
      rowGap: Math.round(min * 0.012),
      dividerSpacing: Math.round(min * 0.022),
      companyMargin: Math.round(min * 0.005),
      nameSize: Math.round(min * 0.075),
      companySize: Math.round(min * 0.032),
      contactSize,
      iconSize: Math.round(contactSize * 1.05),
      dividerHalfWidth: Math.round(min * 0.05),
      dividerHeight: Math.max(1, Math.round(min * 0.0025)),
      diamondSize: Math.max(4, Math.round(min * 0.013)),
    },
  };
}

export async function* runner({
  props: {
    photoUrl,
    name,
    company,
    phone,
    email,
    totalFrameCount,
    fadeInFrameCount = 18,
  },
  bounds: { width, height },
}: RunnerArgs<RealtorCardProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([frauncesBold, manropeMedium]);
  const layout = computeLayout(width, height);

  yield* tween(totalFrameCount, async (_interval, frame) => {
    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <RealtorCard
        layout={layout}
        photoUrl={photoUrl}
        name={name}
        company={company}
        phone={phone}
        email={email}
        frame={frame}
        fadeInFrameCount={fadeInFrameCount}
      />,
      { fonts },
    );
    return canvas.encode("png");
  });
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function progress(frame: number, startFrame: number, durationFrames: number) {
  return clamp01((frame - startFrame) / durationFrames);
}

// Filled annular sector swept clockwise from `startAngle` for `sweep` radians.
function donutSectorPath(
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

function RealtorCard({
  layout,
  photoUrl,
  name,
  company,
  phone,
  email,
  frame,
  fadeInFrameCount,
}: {
  layout: Layout;
  photoUrl: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  frame: number;
  fadeInFrameCount: number;
}) {
  const { width, height, min, arcSize, sunSize, sunInset, photo, text } =
    layout;

  // Container fades fast so the card "is there" within fadeInFrameCount;
  // decorative reveals stagger over a longer ~2s window for editorial pacing.
  const containerFade = easeOutCubic(progress(frame, 0, fadeInFrameCount));
  const liftY = (1 - containerFade) * Math.round(height * 0.04);

  const sunFade = easeOutQuart(progress(frame, 0, 22));
  const sunRise = (1 - sunFade) * Math.round(min * 0.06);

  const arcSwell = easeOutCubic(progress(frame, 4, 28));
  const arcOutlineDraw = easeOutQuart(progress(frame, 16, 36));

  const goldRingScale = easeOutBack(progress(frame, 8, 26));
  const photoFade = easeOutQuad(progress(frame, 14, 24));
  const photoEntranceScale =
    0.94 + 0.06 * easeOutQuart(progress(frame, 12, 30));
  const outerRingDraw = easeOutQuart(progress(frame, 22, 32));

  const nameReveal = progress(frame, 34, 28);
  const companySlide = easeOutCubic(progress(frame, 48, 22));
  const dividerDraw = progress(frame, 58, 24);
  const phoneSlide = easeOutQuart(progress(frame, 66, 22));
  const emailSlide = easeOutQuart(progress(frame, 74, 22));

  // Sun beams sweep ~one revolution every 2.5s.
  const beamPhase = frame * 0.085;
  // Gated on containerFade so the photo stays still during entrance.
  const breath =
    1 + 0.005 * Math.sin(frame * 0.05) * easeOutQuad(containerFade);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        backgroundColor: palette.cream,
      }}
    >
      <Vignette width={width} height={height} opacity={containerFade} />

      <BottomArc
        arcSize={arcSize}
        swell={arcSwell}
        outlineDraw={arcOutlineDraw}
        opacity={containerFade}
      />

      <Sun
        canvasWidth={width}
        canvasHeight={height}
        size={sunSize}
        color={palette.gold}
        opacity={sunFade}
        top={sunInset + sunRise}
        right={sunInset}
        beamPhase={beamPhase}
        bloom={sunFade}
      />

      <Photo
        photoUrl={photoUrl}
        geom={photo}
        ringScale={goldRingScale}
        photoOpacity={photoFade}
        outerRingDraw={outerRingDraw}
        liftY={liftY}
        scale={photoEntranceScale * breath}
      />

      <div
        style={{
          position: "absolute",
          top: photo.top + photo.size + text.photoToTextGap,
          left: 0,
          width,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: containerFade,
          transform: `translateY(${liftY}px)`,
          color: palette.charcoal,
          gap: text.rowGap,
        }}
      >
        <NameLine text={name} fontSize={text.nameSize} reveal={nameReveal} />
        <CompanyLine
          text={company}
          fontSize={text.companySize}
          reveal={companySlide}
          marginTop={text.companyMargin}
        />
        <DividerOrnament
          halfWidth={text.dividerHalfWidth}
          lineHeight={text.dividerHeight}
          diamondSize={text.diamondSize}
          marginTop={text.dividerSpacing}
          marginBottom={text.dividerSpacing}
          draw={dividerDraw}
        />
        <ContactRow
          icon={<PhoneIcon size={text.iconSize} />}
          text={phone}
          fontSize={text.contactSize}
          slide={phoneSlide}
        />
        <ContactRow
          icon={<MailIcon size={text.iconSize} />}
          text={email}
          fontSize={text.contactSize}
          slide={emailSlide}
        />
      </div>
    </div>
  );
}

function Vignette({
  width,
  height,
  opacity,
}: {
  width: number;
  height: number;
  opacity: number;
}) {
  const radius = Math.max(width, height) * 0.65;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -radius * 0.45,
          left: -radius * 0.45,
          width: radius,
          height: radius,
          borderRadius: radius,
          backgroundColor: palette.gold,
          opacity: 0.07,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -radius * 0.45,
          right: -radius * 0.45,
          width: radius,
          height: radius,
          borderRadius: radius,
          backgroundColor: palette.teal,
          opacity: 0.05,
          display: "flex",
        }}
      />
    </div>
  );
}

function BottomArc({
  arcSize,
  swell,
  outlineDraw,
  opacity,
}: {
  arcSize: number;
  swell: number;
  outlineDraw: number;
  opacity: number;
}) {
  const ringPad = Math.max(2, Math.round(arcSize * 0.025));
  const ringOuter = arcSize / 2 + Math.max(2, Math.round(arcSize * 0.014));
  const ringInner = ringOuter - Math.max(1, Math.round(arcSize * 0.0055));
  const svgSize = arcSize + ringPad * 2;
  const sweep = outlineDraw * Math.PI * 2;
  const ringPath = donutSectorPath(
    svgSize / 2,
    svgSize / 2,
    ringOuter,
    ringInner,
    -Math.PI,
    sweep,
  );

  const slideX = (1 - swell) * arcSize * 0.35;
  const slideY = (1 - swell) * arcSize * 0.35;

  return (
    <div
      style={{
        position: "absolute",
        bottom: -arcSize * 0.55,
        left: -arcSize * 0.5,
        width: arcSize,
        height: arcSize,
        display: "flex",
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: arcSize,
          height: arcSize,
          borderRadius: arcSize,
          backgroundColor: palette.teal,
          opacity: 0.85,
          transform: `translate(${-slideX}px, ${slideY}px)`,
          display: "flex",
        }}
      />
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        style={{
          position: "absolute",
          top: -ringPad,
          left: -ringPad,
          width: svgSize,
          height: svgSize,
        }}
      >
        <path d={ringPath} fill={palette.gold} opacity={0.55} />
      </svg>
    </div>
  );
}

function Photo({
  photoUrl,
  geom,
  ringScale,
  photoOpacity,
  outerRingDraw,
  liftY,
  scale,
}: {
  photoUrl: string;
  geom: PhotoGeometry;
  ringScale: number;
  photoOpacity: number;
  outerRingDraw: number;
  liftY: number;
  scale: number;
}) {
  const { size, ringWidth, outerGap, outerThickness, top, left } = geom;
  const outerRadius = size / 2 + outerGap;
  const ringSvgSize = outerRadius * 2;
  const sweep = outerRingDraw * Math.PI * 2;
  const ringPath = donutSectorPath(
    outerRadius,
    outerRadius,
    outerRadius,
    outerRadius - outerThickness,
    -Math.PI / 2,
    sweep,
  );

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: top - ringWidth,
          left: left - ringWidth,
          width: size + ringWidth * 2,
          height: size + ringWidth * 2,
          borderRadius: size,
          backgroundColor: palette.gold,
          opacity: clamp01(ringScale),
          transform: `translateY(${liftY}px) scale(${0.85 + 0.15 * ringScale})`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          top,
          left,
          width: size,
          height: size,
          borderRadius: size,
          opacity: photoOpacity,
          transform: `translateY(${liftY}px) scale(${scale})`,
          display: "flex",
          overflow: "hidden",
        }}
      >
        <img
          src={photoUrl}
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: "cover" }}
        />
      </div>
      <svg
        width={ringSvgSize}
        height={ringSvgSize}
        viewBox={`0 0 ${ringSvgSize} ${ringSvgSize}`}
        style={{
          position: "absolute",
          top: top + size / 2 - outerRadius,
          left: left + size / 2 - outerRadius,
          width: ringSvgSize,
          height: ringSvgSize,
          opacity: 0.85,
          transform: `translateY(${liftY}px)`,
        }}
      >
        <path d={ringPath} fill={palette.gold} />
      </svg>
    </>
  );
}

function NameLine({
  text,
  fontSize,
  reveal,
}: {
  text: string;
  fontSize: number;
  reveal: number;
}) {
  const words = text.split(" ");
  const perWord = 1 / Math.max(1, words.length);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        fontFamily: fontFamily.display,
        fontSize,
        fontWeight: 700,
        letterSpacing: -fontSize * 0.015,
        gap: Math.round(fontSize * 0.28),
      }}
    >
      {words.map((word, i) => {
        const local = clamp01(
          (reveal - i * perWord * 0.6) / Math.max(perWord * 0.9, 0.22),
        );
        const eased = easeOutCubic(local);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              opacity: eased,
              transform: `translateY(${(1 - eased) * fontSize * 0.35}px)`,
            }}
          >
            {word}
          </div>
        );
      })}
    </div>
  );
}

function CompanyLine({
  text,
  fontSize,
  reveal,
  marginTop,
}: {
  text: string;
  fontSize: number;
  reveal: number;
  marginTop: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: fontFamily.body,
        fontSize,
        fontWeight: 500,
        color: palette.stone,
        letterSpacing: fontSize * 0.18,
        marginTop,
        opacity: reveal,
        transform: `translateY(${(1 - reveal) * fontSize * 0.5}px)`,
      }}
    >
      {text.toUpperCase()}
    </div>
  );
}

function DividerOrnament({
  halfWidth,
  lineHeight,
  diamondSize,
  marginTop,
  marginBottom,
  draw,
}: {
  halfWidth: number;
  lineHeight: number;
  diamondSize: number;
  marginTop: number;
  marginBottom: number;
  draw: number;
}) {
  // Animate `width` rather than `scaleX` so the layout pushes the lines
  // outward symmetrically without depending on transform-origin support.
  const diamondProgress = easeOutBack(clamp01(draw / 0.45));
  const lineProgress = easeOutQuart(clamp01((draw - 0.3) / 0.7));
  const linePadding = Math.round(diamondSize * 0.7);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        marginTop,
        marginBottom,
        height: Math.max(diamondSize, lineHeight),
      }}
    >
      <div
        style={{
          display: "flex",
          width: halfWidth * lineProgress,
          height: lineHeight,
          backgroundColor: palette.gold,
          marginRight: linePadding,
        }}
      />
      <div
        style={{
          display: "flex",
          width: diamondSize,
          height: diamondSize,
          backgroundColor: palette.gold,
          transform: `rotate(45deg) scale(${diamondProgress})`,
        }}
      />
      <div
        style={{
          display: "flex",
          width: halfWidth * lineProgress,
          height: lineHeight,
          backgroundColor: palette.gold,
          marginLeft: linePadding,
        }}
      />
    </div>
  );
}

function ContactRow({
  icon,
  text,
  fontSize,
  slide,
}: {
  icon: React.ReactNode;
  text: string;
  fontSize: number;
  slide: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: Math.round(fontSize * 0.55),
        fontFamily: fontFamily.body,
        fontSize,
        fontWeight: 500,
        color: palette.charcoal,
        opacity: slide,
        transform: `translateY(${(1 - slide) * fontSize * 0.7}px)`,
      }}
    >
      {icon}
      <span style={{ display: "flex" }}>{text}</span>
    </div>
  );
}

function Sun({
  canvasWidth,
  canvasHeight,
  size,
  color,
  opacity,
  top,
  right,
  beamPhase,
  bloom,
}: {
  canvasWidth: number;
  canvasHeight: number;
  size: number;
  color: string;
  opacity: number;
  top: number;
  right: number;
  beamPhase: number;
  bloom: number;
}) {
  const bodyRadius = size / 2;
  const containerSize = size * 1.95;
  const rayCount = 14;
  const rayHalfWidth = size * 0.018;
  const rayInner = bodyRadius + size * 0.08;
  const rayOuterMax = containerSize / 2 - size * 0.04;
  // Two long-ray peaks on opposite sides of the disc at any instant; they
  // sweep around as `beamPhase` advances.
  const beamWaves = 2;
  const rayBase = (rayOuterMax - rayInner) * 0.55;
  const rayAmplitude = (rayOuterMax - rayInner) * 0.45;

  const circlePath =
    `M ${-bodyRadius} 0 ` +
    `a ${bodyRadius} ${bodyRadius} 0 1 0 ${bodyRadius * 2} 0 ` +
    `a ${bodyRadius} ${bodyRadius} 0 1 0 ${-bodyRadius * 2} 0 Z`;

  const rayPath = Array.from({ length: rayCount }, (_, i) => {
    const angle = (i * 2 * Math.PI) / rayCount;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const wave = (Math.sin(angle * beamWaves - beamPhase) + 1) / 2;
    const rayOuter = rayInner + (rayBase + rayAmplitude * wave) * bloom;
    const px = -sin * rayHalfWidth;
    const py = cos * rayHalfWidth;
    const ix = cos * rayInner;
    const iy = sin * rayInner;
    const ox = cos * rayOuter;
    const oy = sin * rayOuter;
    return (
      `M ${ix + px} ${iy + py} ` +
      `L ${ox + px} ${oy + py} ` +
      `L ${ox - px} ${oy - py} ` +
      `L ${ix - px} ${iy - py} Z`
    );
  }).join(" ");

  const haloLayers = [
    { scale: 1.7, alpha: 0.05 },
    { scale: 1.4, alpha: 0.08 },
    { scale: 1.15, alpha: 0.13 },
  ];

  // Wrapper is full-canvas so children using `right`-anchoring resolve
  // against the canvas right edge (Fragment children don't anchor correctly
  // in satori's Yoga layout).
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        display: "flex",
      }}
    >
      {haloLayers.map(({ scale, alpha }, i) => {
        const haloSize = size * scale;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: top - haloSize / 2,
              right: right - haloSize / 2,
              width: haloSize,
              height: haloSize,
              borderRadius: haloSize,
              backgroundColor: color,
              opacity: alpha * opacity,
              display: "flex",
            }}
          />
        );
      })}
      <svg
        width={containerSize}
        height={containerSize}
        viewBox={`${-containerSize / 2} ${-containerSize / 2} ${containerSize} ${containerSize}`}
        style={{
          position: "absolute",
          top: top - containerSize / 2,
          right: right - containerSize / 2,
          width: containerSize,
          height: containerSize,
          opacity,
        }}
      >
        <path d={circlePath} fill={color} />
        <path d={rayPath} fill={color} />
      </svg>
    </div>
  );
}

function PhoneIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.05-.24c1.16.39 2.42.6 3.71.6a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.29.21 2.55.6 3.71a1 1 0 0 1-.24 1.05l-2.24 2.03Z"
        fill={palette.teal}
      />
    </svg>
  );
}

function MailIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v.4l8 5 8-5V6H4Zm16 2.6-7.45 4.66a1 1 0 0 1-1.1 0L4 8.6V18h16V8.6Z"
        fill={palette.teal}
      />
    </svg>
  );
}
