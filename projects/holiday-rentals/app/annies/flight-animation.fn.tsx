import { z } from "zod";
import { poppinsSemiBold, dmSansMedium, dmSansBold, loadFonts } from "~/fonts";
import { createCanvas, loadImage, renderReactElement } from "@effing/canvas";
import { tween, easeInOutCubic, easeOutQuad, easeOutCubic } from "@effing/tween";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { fontFamily } from "~/theme";
import { buildProjection, type GeoFeature, type GeoPolygon } from "~/map-utils";
import { PHOTOS } from "~/sample-listing";

// "Pack your bags" opener: a flight-tracker plane arcs from origin to
// destination across a bright minimal map, then the destination photo floods
// in from the landing point via an expanding ripple — handing straight off to the
// property tour. A clean, light map: warm-white water, soft-grey land, the
// signature coral route and pins, and a crisp dark plane.

const locationSchema = z.object({
  name: z.string(),
  country: z.string(),
  lon: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

export const propsSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  totalFrameCount: z.number().int().min(1).optional(),
  introFrameCount: z.number().int().min(1).optional(),
  flightFrameCount: z.number().int().min(1).optional(),
  landingRippleFrameCount: z.number().int().min(0).optional(),
  coverImageUrl: z.string().url().optional(),
});

export type FlightAnimationProps = z.infer<typeof propsSchema>;

export const previewProps: FlightAnimationProps = {
  origin: { name: "Sydney", country: "Australia", lon: 151.21, lat: -33.87 },
  destination: { name: "Bali", country: "Indonesia", lon: 115.14, lat: -8.81 },
  totalFrameCount: 192,
  introFrameCount: 22,
  flightFrameCount: 110,
  landingRippleFrameCount: 60,
  coverImageUrl: PHOTOS.villa,
};

// Bright minimal map palette — warm-white water, soft-grey land, and the
// signature coral for the route, pins and bloom, matching the rest of the promo.
const COLORS = {
  oceanTop: "#f3efea",
  oceanBottom: "#ebe4dc",
  land: "#e0d9cf",
  landStroke: "rgba(34,34,34,0.06)",
  arc: "#ff385c",
  trailGlow: "#ff385c",
  trailCore: "#ff385c",
  node: "#ff385c",
  nodeGlow: "255,56,92",
  plane: "#222222",
  planeGlow: "rgba(34,34,34,0.22)",
  label: "#222222",
  labelSub: "rgba(34,34,34,0.55)",
} as const;

function quadBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number,
) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function quadBezierDeriv(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number,
) {
  const mt = 1 - t;
  return {
    x: 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export async function* runner({
  props: {
    origin,
    destination,
    totalFrameCount = 192,
    introFrameCount = 22,
    flightFrameCount = 110,
    landingRippleFrameCount = 60,
    coverImageUrl,
  },
  bounds: { width, height },
}: RunnerArgs<FlightAnimationProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([poppinsSemiBold, dmSansMedium, dmSansBold]);
  const { project, ctrl } =
    buildProjection(origin, destination, width, height);

  // Pre-render the static map once so map and overlay use the exact same projection.
  const landData = (await fetch(
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson",
  ).then((r) => r.json())) as { features: GeoFeature[] };

  // Rendered above output resolution so the camera can push in without the
  // map going soft (MAP_SS ≥ the camera's maximum zoom).
  const MAP_SS = 1.6;
  const mapCanvas = createCanvas(
    Math.round(width * MAP_SS),
    Math.round(height * MAP_SS),
  );
  const mapCtx = mapCanvas.getContext("2d");
  mapCtx.scale(MAP_SS, MAP_SS);
  const oceanGrad = mapCtx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, COLORS.oceanTop);
  oceanGrad.addColorStop(1, COLORS.oceanBottom);
  mapCtx.fillStyle = oceanGrad;
  mapCtx.fillRect(0, 0, width, height);
  mapCtx.fillStyle = COLORS.land;
  mapCtx.strokeStyle = COLORS.landStroke;
  mapCtx.lineWidth = 0.5;
  for (const { geometry } of landData.features) {
    const polys: GeoPolygon[] =
      geometry.type === "Polygon"
        ? [geometry.coordinates as GeoPolygon]
        : (geometry.coordinates as GeoPolygon[]);
    for (const poly of polys) {
      mapCtx.beginPath();
      for (const ring of poly) {
        for (let j = 0; j < ring.length; j++) {
          const [lon, lat] = ring[j];
          const { x, y } = project(lon, lat);
          if (j === 0) {
            mapCtx.moveTo(x, y);
          } else {
            if (Math.abs(lon - ring[j - 1][0]) > 180) mapCtx.moveTo(x, y);
            else mapCtx.lineTo(x, y);
          }
        }
        mapCtx.closePath();
      }
      mapCtx.fill();
      mapCtx.stroke();
    }
  }
  // No graticule: at typical route zooms only a line or two would cross the
  // frame, reading as stray seams rather than a map grid.
  const mapImage = await loadImage(await mapCanvas.encode("png"));

  let coverImage: Awaited<ReturnType<typeof loadImage>> | null = null;
  if (coverImageUrl) {
    const ab: ArrayBuffer = await fetch(coverImageUrl).then((r) =>
      r.arrayBuffer(),
    );
    coverImage = await loadImage(new Uint8Array(ab));
  }

  let coverSx = 0,
    coverSy = 0,
    coverSw = width,
    coverSh = height;
  if (coverImage) {
    const imgAR = coverImage.width / coverImage.height;
    const canvasAR = width / height;
    if (imgAR > canvasAR) {
      coverSh = coverImage.height;
      coverSw = coverSh * canvasAR;
      coverSx = (coverImage.width - coverSw) / 2;
    } else {
      coverSw = coverImage.width;
      coverSh = coverSw / canvasAR;
      coverSy = (coverImage.height - coverSh) / 2;
    }
  }

  const originXY = project(origin.lon, origin.lat);
  const destinationXY = project(destination.lon, destination.lat);

  const dotR = Math.round(Math.min(width, height) * 0.013);
  const lineW = Math.max(1, Math.round(width * 0.0025));
  const planeSize = Math.round(Math.min(width, height) * 0.07);
  const fontSize = Math.round(Math.min(width, height) * 0.034);
  // Both city labels share one type scale so origin and destination read as a
  // matched pair — the arrival is emphasised by the bloom and pulse, not by size.
  const nameFont = Math.round(fontSize * 1.02);
  const countryFont = Math.round(fontSize * 0.46);
  const countryGap = Math.round(fontSize * 0.1);
  const countryTrack = fontSize * 0.13;
  // Stacked label height (name + gap + caps country), and the offsets used to sit
  // it beside its dot — clear of the parked plane vertically.
  const labelFullH = Math.round(nameFont + countryGap + countryFont * 1.2);
  const labelGap = dotR * 2.0;
  const labelVOffset = Math.round(planeSize * 0.5 + dotR);

  yield* tween(totalFrameCount, async (_interval, frame) => {
    const introT = clamp01(frame / introFrameCount);
    const flightT = clamp01((frame - introFrameCount) / flightFrameCount);
    // A dash of linear keeps the plane visibly moving from its first frame —
    // pure easeInOutCubic parks it at the gate for the first half-second.
    const t = 0.3 * flightT + 0.7 * easeInOutCubic(flightT);
    const introAlpha = easeOutQuad(introT);

    // Camera: the follow strength rises smoothly after takeoff and stays —
    // the camera rides with the plane and finally settles ON the destination
    // (no pull-back out), leaning in a little further as the plane lands. The
    // ripple then blooms from this zoomed framing. `zoomEnv` doubles as the
    // follow strength, so at zoom 1 the camera is exactly the identity.
    const smoothstep01 = (x: number) => x * x * (3 - 2 * x);
    const planePos = quadBezier(originXY, ctrl, destinationXY, t);
    const zoomEnv = smoothstep01(clamp01((flightT - 0.05) / 0.5));
    // The landing lean-in is one long settle spanning touchdown AND the whole
    // ripple — the camera never freezes mid-sequence; it keeps drifting in,
    // reaching stillness exactly as the segment hands off.
    const landStart = introFrameCount + flightFrameCount * 0.7;
    const landT = clamp01((frame - landStart) / (totalFrameCount - landStart));
    const landPush = smoothstep01(landT);
    const zoom = 1 + 0.3 * zoomEnv + 0.22 * landPush;
    // Rather than locking rigidly onto the plane, the camera follows a
    // smoothed blend of where the plane was, is, and (weighted double) where
    // it is heading — the lead keeps the plane a touch behind centre with
    // looking room ahead, like a hand-operated tracking shot.
    const wasPos = quadBezier(originXY, ctrl, destinationXY, Math.max(0, t - 0.08));
    const aheadPos = quadBezier(originXY, ctrl, destinationXY, Math.min(1, t + 0.16));
    const target = {
      x: (planePos.x + wasPos.x + 2 * aheadPos.x) / 4,
      y: (planePos.y + wasPos.y + 2 * aheadPos.y) / 4,
    };
    const viewHalfW = width / (2 * zoom);
    const viewHalfH = height / (2 * zoom);
    const camera = {
      x: Math.min(
        width - viewHalfW,
        Math.max(viewHalfW, width / 2 + (target.x - width / 2) * zoomEnv),
      ),
      y: Math.min(
        height - viewHalfH,
        Math.max(viewHalfH, height / 2 + (target.y - height / 2) * zoomEnv),
      ),
    };
    const toCam = (p: { x: number; y: number }) => ({
      x: (p.x - camera.x) * zoom + width / 2,
      y: (p.y - camera.y) * zoom + height / 2,
    });

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    // Everything up to the labels draws in base map coordinates through the
    // camera transform.
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camera.x, -camera.y);
    ctx.drawImage(mapImage, 0, 0, width, height);

    // Soft coral bloom at the destination — grows as the plane approaches,
    // warming the journey's end and tying back to the coral route and pins.
    const bloomStrength = introAlpha * (0.3 + 0.5 * easeOutQuad(flightT));
    if (bloomStrength > 0.01) {
      const bloomR = Math.min(width, height) * 0.55;
      const bloomGrad = ctx.createRadialGradient(
        destinationXY.x,
        destinationXY.y,
        0,
        destinationXY.x,
        destinationXY.y,
        bloomR,
      );
      bloomGrad.addColorStop(0, `rgba(255,56,92,${0.16 * bloomStrength})`);
      bloomGrad.addColorStop(0.45, `rgba(252,100,45,${0.06 * bloomStrength})`);
      bloomGrad.addColorStop(1, "rgba(255,56,92,0)");
      ctx.save();
      ctx.fillStyle = bloomGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Full dashed arc (faint, reveals during intro)
    ctx.save();
    ctx.globalAlpha = introAlpha * 0.3;
    ctx.strokeStyle = COLORS.arc;
    ctx.lineWidth = lineW;
    ctx.setLineDash([Math.round(width * 0.013), Math.round(width * 0.009)]);
    ctx.beginPath();
    ctx.moveTo(originXY.x, originXY.y);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, destinationXY.x, destinationXY.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Traveled arc trail
    if (t > 0) {
      const steps = 80;
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = COLORS.trailGlow;
      ctx.lineWidth = lineW * 5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(originXY.x, originXY.y);
      for (let i = 1; i <= steps; i++) {
        const pt = quadBezier(originXY, ctrl, destinationXY, (i / steps) * t);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = COLORS.trailCore;
      ctx.lineWidth = lineW * 1.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(originXY.x, originXY.y);
      for (let i = 1; i <= steps; i++) {
        const pt = quadBezier(originXY, ctrl, destinationXY, (i / steps) * t);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Origin dot + glow
    ctx.save();
    ctx.globalAlpha = introAlpha;
    const brGlow = ctx.createRadialGradient(
      originXY.x,
      originXY.y,
      0,
      originXY.x,
      originXY.y,
      dotR * 4,
    );
    brGlow.addColorStop(0, `rgba(${COLORS.nodeGlow},0.45)`);
    brGlow.addColorStop(1, `rgba(${COLORS.nodeGlow},0)`);
    ctx.fillStyle = brGlow;
    ctx.beginPath();
    ctx.arc(originXY.x, originXY.y, dotR * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.node;
    ctx.beginPath();
    ctx.arc(originXY.x, originXY.y, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Destination dot + glow (the glow pulses bright on arrival; the dot
    // itself shows at full strength from the start so it reads early)
    const destinationArrival = easeOutCubic(clamp01((flightT - 0.88) / 0.12));
    const destinationDotAlpha = introAlpha;
    ctx.save();
    ctx.globalAlpha = destinationDotAlpha;
    if (destinationArrival > 0) {
      const liGlow = ctx.createRadialGradient(
        destinationXY.x,
        destinationXY.y,
        0,
        destinationXY.x,
        destinationXY.y,
        dotR * 4,
      );
      liGlow.addColorStop(0, `rgba(${COLORS.nodeGlow},${destinationArrival * 0.5})`);
      liGlow.addColorStop(1, `rgba(${COLORS.nodeGlow},0)`);
      ctx.fillStyle = liGlow;
      ctx.beginPath();
      ctx.arc(destinationXY.x, destinationXY.y, dotR * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.node;
    ctx.beginPath();
    ctx.arc(destinationXY.x, destinationXY.y, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Plane
    const safeT = Math.max(0.001, Math.min(0.999, t));
    const deriv = quadBezierDeriv(originXY, ctrl, destinationXY, safeT);
    const angleRad = Math.atan2(deriv.y, deriv.x);
    const s = planeSize / 2;
    ctx.save();
    ctx.globalAlpha = introAlpha;
    ctx.translate(planePos.x, planePos.y);
    ctx.rotate(angleRad);
    ctx.fillStyle = COLORS.plane;
    ctx.shadowColor = COLORS.planeGlow;
    ctx.shadowBlur = s * 0.9;
    // Fuselage
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.bezierCurveTo(s * 0.55, -s * 0.13, -s * 0.55, -s * 0.13, -s * 0.82, -s * 0.06);
    ctx.lineTo(-s, 0);
    ctx.lineTo(-s * 0.82, s * 0.06);
    ctx.bezierCurveTo(-s * 0.55, s * 0.13, s * 0.55, s * 0.13, s, 0);
    ctx.closePath();
    ctx.fill();
    // Wings + tail fins
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.15, 0);
      ctx.lineTo(-s * 0.18, sign * s * 0.72);
      ctx.lineTo(-s * 0.48, sign * s * 0.72);
      ctx.lineTo(-s * 0.32, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, 0);
      ctx.lineTo(-s * 0.88, sign * s * 0.36);
      ctx.lineTo(-s, sign * s * 0.33);
      ctx.lineTo(-s * 0.78, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // End of camera-space drawing — labels are placed in screen space from the
    // camera-projected city positions.
    ctx.restore(); // camera transform
    const camOrigin = toCam(originXY);
    const camDest = toCam(destinationXY);
    // A label fades away when the camera pushes its city off screen.
    const labelVis = (p: { x: number; y: number }) => {
      const margin = fontSize * 2;
      const overflow = Math.max(
        0,
        -p.x,
        p.x - width,
        -p.y,
        p.y - height,
      );
      return clamp01(1 - overflow / margin);
    };

    // City labels — the destination reads at full strength from the start,
    // giving the viewer the whole flight to take it in.
    const destinationLabelAlpha = introAlpha * labelVis(camDest);
    const originLabelAlpha = introAlpha * labelVis(camOrigin);

    // Identical placement rule for both labels: tuck the stack inboard (toward
    // screen centre, so it never clips an edge) and on the vertical side facing
    // away from the other city — which also keeps it clear of the flight path.
    const clampTop = (v: number) =>
      Math.max(
        Math.round(fontSize * 0.2),
        Math.min(v, height - labelFullH - Math.round(fontSize * 0.2)),
      );
    const labelTopFor = (
      p: { x: number; y: number },
      other: { x: number; y: number },
    ) =>
      clampTop(
        p.y >= other.y ? p.y + labelVOffset : p.y - labelFullH - labelVOffset,
      );
    const labelSideFor = (p: { x: number; y: number }) =>
      p.x > width / 2
        ? { right: Math.round(width - p.x + labelGap) }
        : { left: Math.round(p.x + labelGap) };

    const originOnRight = camOrigin.x > width / 2;
    const originLabelX = labelSideFor(camOrigin);
    const originLabelTop = labelTopFor(camOrigin, camDest);

    const destOnRight = camDest.x > width / 2;
    const destLabelX = labelSideFor(camDest);
    const destLabelTop = labelTopFor(camDest, camOrigin);

    await renderReactElement(
      ctx,
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "flex",
        }}
      >
        {/* Origin and destination get the identical treatment — a Poppins name
            over a tracked-caps country, with a soft white halo for legibility on
            the light map. Same sizes, same stack; only the side flips. */}
        <div
          style={{
            position: "absolute",
            top: originLabelTop,
            ...originLabelX,
            display: "flex",
            flexDirection: "column",
            alignItems: originOnRight ? "flex-end" : "flex-start",
            opacity: originLabelAlpha,
          }}
        >
          <span
            style={{
              display: "flex",
              fontFamily: fontFamily.display,
              fontWeight: 600,
              fontSize: nameFont,
              lineHeight: 1,
              color: COLORS.label,
              letterSpacing: -fontSize * 0.01,
              textShadow: "0 1px 10px rgba(255,255,255,0.95)",
            }}
          >
            {origin.name}
          </span>
          <span
            style={{
              display: "flex",
              marginTop: countryGap,
              fontFamily: fontFamily.body,
              fontWeight: 600,
              fontSize: countryFont,
              color: COLORS.labelSub,
              letterSpacing: countryTrack,
              textTransform: "uppercase",
              textShadow: "0 1px 8px rgba(255,255,255,0.9)",
            }}
          >
            {origin.country}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            top: destLabelTop,
            ...destLabelX,
            display: "flex",
            flexDirection: "column",
            alignItems: destOnRight ? "flex-end" : "flex-start",
            opacity: destinationLabelAlpha,
          }}
        >
          <span
            style={{
              display: "flex",
              fontFamily: fontFamily.display,
              fontWeight: 600,
              fontSize: nameFont,
              lineHeight: 1,
              color: COLORS.label,
              letterSpacing: -fontSize * 0.01,
              textShadow: "0 1px 10px rgba(255,255,255,0.95)",
            }}
          >
            {destination.name}
          </span>
          <span
            style={{
              display: "flex",
              marginTop: countryGap,
              fontFamily: fontFamily.body,
              fontWeight: 600,
              fontSize: countryFont,
              color: COLORS.labelSub,
              letterSpacing: countryTrack,
              textTransform: "uppercase",
              textShadow: "0 1px 8px rgba(255,255,255,0.9)",
            }}
          >
            {destination.country}
          </span>
        </div>
      </div>,
      { fonts },
    );

    // Ripple reveal: photo floods in from the landing point
    const rippleFrameStart = introFrameCount + flightFrameCount;
    const rippleT =
      landingRippleFrameCount > 0
        ? clamp01((frame - rippleFrameStart) / landingRippleFrameCount)
        : 0;

    if (rippleT > 0 && coverImage) {
      const maxR = Math.hypot(width, height);
      const r = easeInOutCubic(rippleT) * maxR;

      // Photo fills the expanding circle immediately
      ctx.save();
      ctx.beginPath();
      ctx.arc(camDest.x, camDest.y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(coverImage, coverSx, coverSy, coverSw, coverSh, 0, 0, width, height);
      ctx.restore();

      // Hazy white ring straddles the expanding boundary
      const hazeWidth = Math.min(width, height) * 0.12;
      const edgeGrad = ctx.createRadialGradient(
        camDest.x,
        camDest.y,
        Math.max(0, r - hazeWidth),
        camDest.x,
        camDest.y,
        r + hazeWidth * 0.5,
      );
      edgeGrad.addColorStop(0, "rgba(255,255,255,0)");
      edgeGrad.addColorStop(0.6, "rgba(255,255,255,1)");
      edgeGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.beginPath();
      ctx.arc(camDest.x, camDest.y, r + hazeWidth * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = edgeGrad;
      ctx.fill();
      ctx.restore();
    }

    return canvas.encode("png");
  });
}
