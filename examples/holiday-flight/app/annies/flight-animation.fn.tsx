import { z } from "zod";
import { interSemiBold, interBold, loadFonts } from "~/fonts";
import { createCanvas, loadImage, renderReactElement } from "@effing/canvas";
import { tween, easeInOutCubic, easeOutQuad, easeOutCubic } from "@effing/tween";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { buildProjection, type GeoFeature, type GeoPolygon } from "~/map-utils";

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
  origin: { name: "Brussels", country: "Belgium", lon: 4.35, lat: 50.85 },
  destination: { name: "Santorini", country: "Greece", lon: 25.43, lat: 36.39 },
  totalFrameCount: 300,
  introFrameCount: 30,
  flightFrameCount: 180,
  landingRippleFrameCount: 90,
  coverImageUrl: "https://static.effing.dev/unsplash/white-villa/wide.jpg",
};

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
    totalFrameCount = 270,
    introFrameCount = 30,
    flightFrameCount = 180,
    landingRippleFrameCount = 90,
    coverImageUrl,
  },
  bounds: { width, height },
}: RunnerArgs<FlightAnimationProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);
  const { project, ctrl, vpMinLon, vpMaxLon, vpMinLat, vpMaxLat } = buildProjection(origin, destination, width, height);

  // Pre-render the static map once so both map and overlay use the exact same projection
  const landData = await fetch(
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson",
  ).then((r) => r.json()) as { features: GeoFeature[] };

  const mapCanvas = createCanvas(width, height);
  const mapCtx = mapCanvas.getContext("2d");
  mapCtx.fillStyle = "#161c28";
  mapCtx.fillRect(0, 0, width, height);
  mapCtx.fillStyle = "#252d3d";
  mapCtx.strokeStyle = "rgba(120,140,175,0.12)";
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
  const lonSpan = vpMaxLon - vpMinLon;
  const latSpan = vpMaxLat - vpMinLat;
  const lonStep = lonSpan > 90 ? 30 : lonSpan > 30 ? 10 : 5;
  const latStep = latSpan > 60 ? 30 : latSpan > 20 ? 10 : 5;
  mapCtx.strokeStyle = "rgba(255,255,255,0.04)";
  mapCtx.lineWidth = 1;
  for (let lat = Math.ceil(vpMinLat / latStep) * latStep; lat <= vpMaxLat; lat += latStep) {
    const { y } = project(vpMinLon, lat);
    mapCtx.beginPath(); mapCtx.moveTo(0, y); mapCtx.lineTo(width, y); mapCtx.stroke();
  }
  for (let lon = Math.ceil(vpMinLon / lonStep) * lonStep; lon <= vpMaxLon; lon += lonStep) {
    const { x } = project(lon, vpMinLat);
    mapCtx.beginPath(); mapCtx.moveTo(x, 0); mapCtx.lineTo(x, height); mapCtx.stroke();
  }
  if (vpMinLat <= 0 && vpMaxLat >= 0) {
    mapCtx.strokeStyle = "rgba(255,255,255,0.08)";
    const { y: eqY } = project(0, 0);
    mapCtx.beginPath(); mapCtx.moveTo(0, eqY); mapCtx.lineTo(width, eqY); mapCtx.stroke();
  }
  const mapImage = await loadImage(await mapCanvas.encode("png"));

  let coverImage: Awaited<ReturnType<typeof loadImage>> | null = null;
  if (coverImageUrl) {
    const ab: ArrayBuffer = await fetch(coverImageUrl).then((r) => r.arrayBuffer());
    coverImage = await loadImage(new Uint8Array(ab));
  }

  let coverSx = 0, coverSy = 0, coverSw = width, coverSh = height;
  if (coverImage) {
    const imgAR = (coverImage as any).width / (coverImage as any).height;
    const canvasAR = width / height;
    if (imgAR > canvasAR) {
      coverSh = (coverImage as any).height;
      coverSw = coverSh * canvasAR;
      coverSx = ((coverImage as any).width - coverSw) / 2;
    } else {
      coverSw = (coverImage as any).width;
      coverSh = coverSw / canvasAR;
      coverSy = ((coverImage as any).height - coverSh) / 2;
    }
  }

  const originXY = project(origin.lon, origin.lat);
  const destinationXY = project(destination.lon, destination.lat);

  const dotR = Math.round(Math.min(width, height) * 0.013);
  const lineW = Math.max(1, Math.round(width * 0.0025));
  const planeSize = Math.round(Math.min(width, height) * 0.07);
  const fontSize = Math.round(Math.min(width, height) * 0.034);

  yield* tween(totalFrameCount, async (_interval, frame) => {
    const introT = clamp01(frame / introFrameCount);
    const flightT = clamp01((frame - introFrameCount) / flightFrameCount);
    const t = easeInOutCubic(flightT);
    const introAlpha = easeOutQuad(introT);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(mapImage, 0, 0, width, height);

    // Full dashed arc (faint, reveals during intro)
    ctx.save();
    ctx.globalAlpha = introAlpha * 0.25;
    ctx.strokeStyle = "#60A5FA";
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
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = "#93C5FD";
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
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "#BFDBFE";
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
    const brGlow = ctx.createRadialGradient(originXY.x, originXY.y, 0, originXY.x, originXY.y, dotR * 4);
    brGlow.addColorStop(0, "rgba(251,191,36,0.45)");
    brGlow.addColorStop(1, "rgba(251,191,36,0)");
    ctx.fillStyle = brGlow;
    ctx.beginPath(); ctx.arc(originXY.x, originXY.y, dotR * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FBBF24";
    ctx.beginPath(); ctx.arc(originXY.x, originXY.y, dotR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Destination dot + glow (pulses bright on arrival)
    const destinationArrival = easeOutCubic(clamp01((flightT - 0.88) / 0.12));
    const destinationDotAlpha = introAlpha * 0.28 + destinationArrival * 0.72;
    ctx.save();
    ctx.globalAlpha = destinationDotAlpha;
    if (destinationArrival > 0) {
      const liGlow = ctx.createRadialGradient(destinationXY.x, destinationXY.y, 0, destinationXY.x, destinationXY.y, dotR * 4);
      liGlow.addColorStop(0, `rgba(251,191,36,${destinationArrival * 0.5})`);
      liGlow.addColorStop(1, "rgba(251,191,36,0)");
      ctx.fillStyle = liGlow;
      ctx.beginPath(); ctx.arc(destinationXY.x, destinationXY.y, dotR * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#FBBF24";
    ctx.beginPath(); ctx.arc(destinationXY.x, destinationXY.y, dotR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Plane
    const safeT = Math.max(0.001, Math.min(0.999, t));
    const planePos = quadBezier(originXY, ctrl, destinationXY, t);
    const deriv = quadBezierDeriv(originXY, ctrl, destinationXY, safeT);
    const angleRad = Math.atan2(deriv.y, deriv.x);
    const s = planeSize / 2;
    ctx.save();
    ctx.globalAlpha = introAlpha;
    ctx.translate(planePos.x, planePos.y);
    ctx.rotate(angleRad);
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(147,197,253,0.85)";
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
      ctx.moveTo(s * 0.15, 0); ctx.lineTo(-s * 0.18, sign * s * 0.72);
      ctx.lineTo(-s * 0.48, sign * s * 0.72); ctx.lineTo(-s * 0.32, 0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, 0); ctx.lineTo(-s * 0.88, sign * s * 0.36);
      ctx.lineTo(-s, sign * s * 0.33); ctx.lineTo(-s * 0.78, 0);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // City labels
    const destinationLabelAlpha = introAlpha * 0.35 + destinationArrival * 0.65;

    const originLabelOnLeft = originXY.x > width / 2;
    const originLabelX = originLabelOnLeft
      ? { right: Math.round(width - originXY.x) + dotR * 2 }
      : { left: Math.round(originXY.x) + dotR * 2 };
    const originLabelTop = originXY.y < fontSize * 3.5
      ? Math.round(originXY.y) + dotR * 2
      : Math.round(originXY.y) - Math.round(fontSize * 2.8);

    const destLabelOnLeft = destinationXY.x > width / 2;
    const destLabelX = destLabelOnLeft
      ? { right: Math.round(width - destinationXY.x) + dotR * 2 }
      : { left: Math.round(destinationXY.x) + dotR * 2 };
    const destLabelTop = destinationXY.y > height * 0.8
      ? Math.round(destinationXY.y) - Math.round(fontSize * 2.8)
      : Math.round(destinationXY.y) + dotR * 2;

    await renderReactElement(
      ctx,
      <div style={{ position: "absolute", top: 0, left: 0, width, height, display: "flex" }}>
        <div
          style={{
            position: "absolute",
            top: originLabelTop,
            ...originLabelX,
            display: "flex",
            flexDirection: "column",
            alignItems: originLabelOnLeft ? "flex-end" : "flex-start",
            opacity: introAlpha,
          }}
        >
          <span style={{ display: "flex", fontFamily: "Inter", fontWeight: 700, fontSize, color: "#F1F5F9", letterSpacing: fontSize * 0.05 }}>
            {origin.name}
          </span>
          <span style={{ display: "flex", fontFamily: "Inter", fontWeight: 600, fontSize: Math.round(fontSize * 0.7), color: "rgba(203,213,225,0.65)" }}>
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
            alignItems: destLabelOnLeft ? "flex-end" : "flex-start",
            opacity: destinationLabelAlpha,
          }}
        >
          <span style={{ display: "flex", fontFamily: "Inter", fontWeight: 700, fontSize, color: "#F1F5F9", letterSpacing: fontSize * 0.05 }}>
            {destination.name}
          </span>
          <span style={{ display: "flex", fontFamily: "Inter", fontWeight: 600, fontSize: Math.round(fontSize * 0.7), color: "rgba(203,213,225,0.65)" }}>
            {destination.country}
          </span>
        </div>
      </div>,
      { fonts },
    );

    // Ripple reveal: photo floods in from landing point
    const rippleFrameStart = introFrameCount + flightFrameCount;
    const rippleT = landingRippleFrameCount > 0
      ? clamp01((frame - rippleFrameStart) / landingRippleFrameCount)
      : 0;

    if (rippleT > 0 && coverImage) {
      const maxR = Math.hypot(width, height);
      const r = easeInOutCubic(rippleT) * maxR;

      // Photo fills the expanding circle immediately
      ctx.save();
      ctx.beginPath();
      ctx.arc(destinationXY.x, destinationXY.y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(coverImage as any, coverSx, coverSy, coverSw, coverSh, 0, 0, width, height);
      ctx.restore();

      // Hazy white ring straddles the expanding boundary
      const hazeWidth = Math.min(width, height) * 0.12;
      const edgeGrad = ctx.createRadialGradient(
        destinationXY.x, destinationXY.y, Math.max(0, r - hazeWidth),
        destinationXY.x, destinationXY.y, r + hazeWidth * 0.5,
      );
      edgeGrad.addColorStop(0, "rgba(255,255,255,0)");
      edgeGrad.addColorStop(0.6, "rgba(255,255,255,1)");
      edgeGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.beginPath();
      ctx.arc(destinationXY.x, destinationXY.y, r + hazeWidth * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = edgeGrad;
      ctx.fill();
      ctx.restore();
    }

    return canvas.encode("png");
  });
}
