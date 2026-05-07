import { z } from "zod";
import { interSemiBold, interBold, loadFonts } from "~/fonts";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { tween, easeInOutCubic, easeOutQuad, easeOutCubic } from "@effing/tween";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";

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
});

export type FlightAnimationProps = z.infer<typeof propsSchema>;

export const previewProps: FlightAnimationProps = {
  origin: { name: "Brussels", country: "Belgium", lon: 4.35, lat: 50.85 },
  // destination: { name: "Barcelona", country: "Spain", lon: 2.06, lat: 41.39 },
  // destination: { name: "Lima", country: "Peru", lon: -77.04, lat: -12.05 },
  destination: {name: "Tokyo", country: "Japan", lat: 35.50, lon: 138.45 },
  totalFrameCount: 270,
  introFrameCount: 30,
  flightFrameCount: 210,
};

type GeoRing = number[][];
type GeoPolygon = GeoRing[];
type GeoFeature = {
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: GeoPolygon | GeoPolygon[] };
};
type Project = (lon: number, lat: number) => { x: number; y: number };

function makeProject(
  minLon: number, maxLon: number,
  minLat: number, maxLat: number,
  w: number, h: number,
): Project {
  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;
  return (lon, lat) => ({
    x: ((lon - minLon) / lonSpan) * w,
    y: ((maxLat - lat) / latSpan) * h,
  });
}

function drawLand(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  features: GeoFeature[],
  project: Project,
) {
  ctx.fillStyle = "#252d3d";
  ctx.strokeStyle = "rgba(120,140,175,0.12)";
  ctx.lineWidth = 0.5;

  for (const { geometry } of features) {
    const polys: GeoPolygon[] =
      geometry.type === "Polygon"
        ? [geometry.coordinates as GeoPolygon]
        : (geometry.coordinates as GeoPolygon[]);

    for (const poly of polys) {
      ctx.beginPath();
      for (const ring of poly) {
        for (let j = 0; j < ring.length; j++) {
          const [lon, lat] = ring[j];
          const { x, y } = project(lon, lat);
          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            // Skip segments that cross the antimeridian to avoid wrap-around lines
            const prevLon = ring[j - 1][0];
            if (Math.abs(lon - prevLon) > 180) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
    }
  }
}

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
    flightFrameCount = 210,
  },
  bounds: { width, height },
}: RunnerArgs<FlightAnimationProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);

  // Fetch simplified land polygons once — Natural Earth 1:110M (very coarse, fast to draw)
  const landData = await fetch(
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson",
  ).then((r) => r.json()) as { features: GeoFeature[] };

  // Bezier control point in geographic space — midpoint pushed toward the nearest
  // pole to approximate a great-circle arc. Scale with route length so short
  // flights get a gentle arc rather than an oversized detour.
  const midLon = (origin.lon + destination.lon) / 2;
  const midLat = (origin.lat + destination.lat) / 2;
  const routeDist = Math.hypot(destination.lon - origin.lon, destination.lat - origin.lat);
  const poleOffset = Math.max(routeDist * 0.4, Math.abs(origin.lat - destination.lat) * 0.67);
  const ctrlLon = midLon;
  const ctrlLat = midLat >= 0
    ? Math.min(85, midLat + poleOffset)
    : Math.max(-85, midLat - poleOffset);

  // Viewport: tight bounding box of the route + 25% padding on every side.
  const routeMinLon = Math.min(origin.lon, destination.lon, ctrlLon);
  const routeMaxLon = Math.max(origin.lon, destination.lon, ctrlLon);
  const routeMinLat = Math.min(origin.lat, destination.lat, ctrlLat);
  const routeMaxLat = Math.max(origin.lat, destination.lat, ctrlLat);
  const lonPad = (routeMaxLon - routeMinLon) * 0.25;
  const latPad = (routeMaxLat - routeMinLat) * 0.25;
  let vpMinLon = Math.max(-180, routeMinLon - lonPad);
  let vpMaxLon = Math.min(180, routeMaxLon + lonPad);
  let vpMinLat = Math.max(-90, routeMinLat - latPad);
  let vpMaxLat = Math.min(90, routeMaxLat + latPad);

  // Enforce the canvas aspect ratio to avoid badly distorted maps.
  const canvasAR = width / height;
  const vpLonSpan = vpMaxLon - vpMinLon;
  const vpLatSpan = vpMaxLat - vpMinLat;
  const vpAR = vpLonSpan / vpLatSpan;
  if (vpAR < canvasAR) {
    // Too portrait (e.g. Brussels→Barcelona): expand longitude.
    const targetLonSpan = Math.min(vpLatSpan * canvasAR, 150);
    const vpCenterLon = (vpMinLon + vpMaxLon) / 2;
    vpMinLon = Math.max(-180, vpCenterLon - targetLonSpan / 2);
    vpMaxLon = Math.min(180, vpCenterLon + targetLonSpan / 2);
  } else if (vpAR > canvasAR * 1.5) {
    // Too landscape (e.g. Brussels→Tokyo): expand latitude to reduce distortion.
    const targetLatSpan = Math.min(vpLonSpan / canvasAR, 140);
    const vpCenterLat = (vpMinLat + vpMaxLat) / 2;
    vpMinLat = Math.max(-90, vpCenterLat - targetLatSpan / 2);
    vpMaxLat = Math.min(90, vpCenterLat + targetLatSpan / 2);
  }

  const project = makeProject(vpMinLon, vpMaxLon, vpMinLat, vpMaxLat, width, height);

  const originXY = project(origin.lon, origin.lat);
  const destinationXY = project(destination.lon, destination.lat);
  const ctrl = project(ctrlLon, ctrlLat);

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

    // Ocean background
    ctx.fillStyle = "#161c28";
    ctx.fillRect(0, 0, width, height);

    // Land polygons (greyed-out map)
    drawLand(ctx, landData.features, project);

    // Grid lines at an interval appropriate for the zoomed viewport
    const lonSpan = vpMaxLon - vpMinLon;
    const latSpan = vpMaxLat - vpMinLat;
    const lonStep = lonSpan > 90 ? 30 : lonSpan > 30 ? 10 : 5;
    const latStep = latSpan > 60 ? 30 : latSpan > 20 ? 10 : 5;
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const gridMinLat = Math.ceil(vpMinLat / latStep) * latStep;
    for (let lat = gridMinLat; lat <= vpMaxLat; lat += latStep) {
      const { y } = project(vpMinLon, lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    const gridMinLon = Math.ceil(vpMinLon / lonStep) * lonStep;
    for (let lon = gridMinLon; lon <= vpMaxLon; lon += lonStep) {
      const { x } = project(lon, vpMinLat);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    // Equator — only if it falls within the viewport
    if (vpMinLat <= 0 && vpMaxLat >= 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      const { y: eqY } = project(vpMinLon, 0);
      ctx.beginPath();
      ctx.moveTo(0, eqY);
      ctx.lineTo(width, eqY);
      ctx.stroke();
    }

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
      // Glow layer
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
      // Bright core
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
    ctx.beginPath();
    ctx.arc(originXY.x, originXY.y, dotR * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FBBF24";
    ctx.beginPath();
    ctx.arc(originXY.x, originXY.y, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Destination dot + glow (faint initially, pulses bright on arrival)
    const destinationXYArrival = easeOutCubic(clamp01((flightT - 0.88) / 0.12));
    const destinationXYDotAlpha = introAlpha * 0.28 + destinationXYArrival * 0.72;
    ctx.save();
    ctx.globalAlpha = destinationXYDotAlpha;
    if (destinationXYArrival > 0) {
      const liGlow = ctx.createRadialGradient(destinationXY.x, destinationXY.y, 0, destinationXY.x, destinationXY.y, dotR * 4);
      liGlow.addColorStop(0, `rgba(251,191,36,${destinationXYArrival * 0.5})`);
      liGlow.addColorStop(1, "rgba(251,191,36,0)");
      ctx.fillStyle = liGlow;
      ctx.beginPath();
      ctx.arc(destinationXY.x, destinationXY.y, dotR * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#FBBF24";
    ctx.beginPath();
    ctx.arc(destinationXY.x, destinationXY.y, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Plane position and heading
    const safeT = Math.max(0.001, Math.min(0.999, t));
    const planePos = quadBezier(originXY, ctrl, destinationXY, t);
    const deriv = quadBezierDeriv(originXY, ctrl, destinationXY, safeT);
    const angleRad = Math.atan2(deriv.y, deriv.x);

    // Draw plane with canvas API — silhouette points right (0 rad), rotated to travel direction
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
    // Wings (symmetric about x-axis)
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.15, 0);
      ctx.lineTo(-s * 0.18, sign * s * 0.72);
      ctx.lineTo(-s * 0.48, sign * s * 0.72);
      ctx.lineTo(-s * 0.32, 0);
      ctx.closePath();
      ctx.fill();
      // Tail fin
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, 0);
      ctx.lineTo(-s * 0.88, sign * s * 0.36);
      ctx.lineTo(-s, sign * s * 0.33);
      ctx.lineTo(-s * 0.78, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const destinationXYLabelAlpha = introAlpha * 0.35 + destinationXYArrival * 0.65;

    // Place the origin label on whichever horizontal side has more room.
    const originLabelOnLeft = originXY.x > width / 2;
    const originLabelX = originLabelOnLeft
      ? { right: Math.round(width - originXY.x) + dotR * 2 }
      : { left: Math.round(originXY.x) + dotR * 2 };
    // Place above or below depending on vertical room.
    const originLabelTop = originXY.y < fontSize * 3.5
      ? Math.round(originXY.y) + dotR * 2
      : Math.round(originXY.y) - Math.round(fontSize * 2.8);

    await renderReactElement(
      ctx,
      <div style={{ position: "absolute", top: 0, left: 0, width, height, display: "flex" }}>

        {/* Origin label */}
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
          <span
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize,
              color: "#F1F5F9",
              letterSpacing: fontSize * 0.05,
            }}
          >
            {origin.name}
          </span>
          <span
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: Math.round(fontSize * 0.7),
              color: "rgba(203,213,225,0.65)",
            }}
          >
            {origin.country}
          </span>
        </div>

        {/* Lima label */}
        <div
          style={{
            position: "absolute",
            top: Math.round(destinationXY.y) + dotR * 2,
            left: Math.round(destinationXY.x) + dotR * 2,
            display: "flex",
            flexDirection: "column",
            opacity: destinationXYLabelAlpha,
          }}
        >
          <span
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize,
              color: "#F1F5F9",
              letterSpacing: fontSize * 0.05,
            }}
          >
            {destination.name}
          </span>
          <span
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: Math.round(fontSize * 0.7),
              color: "rgba(203,213,225,0.65)",
            }}
          >
            {destination.country}
          </span>
        </div>
      </div>,
      { fonts },
    );

    return canvas.encode("png");
  });
}
