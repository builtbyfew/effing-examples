import { z } from "zod";
import { tween } from "@effing/tween";
import {
  createCanvas,
  loadImage,
  renderReactElement,
  type Canvas,
  type Image,
  type SKRSContext2D,
} from "@effing/canvas";
import { interBold, interSemiBold, loadFonts } from "~/fonts";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { MIST_TRAIL } from "~/data/mist-trail";

const TILE_SIZE = 256;

const pointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  elevation: z.number().optional(),
});

const highlightSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  imageUrl: z.string().url(),
  label: z.string().optional(),
});

export const propsSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  route: z.array(pointSchema).min(2).optional(),
  /** When set, fetches and parses GPX from this URL — overrides `route`. */
  gpxUrl: z.string().url().optional(),
  /** Locations of interest along the trail; rendered as connected image callouts. */
  highlights: z.array(highlightSchema).optional(),
  zoom: z.number().int().min(0).max(19).optional(),
  drawDuration: z.number().positive().optional(),
  holdDuration: z.number().nonnegative().optional(),
  highlightInDuration: z.number().nonnegative().optional(),
  highlightHoldDuration: z.number().nonnegative().optional(),
  highlightOutDuration: z.number().nonnegative().optional(),
  fps: z.number().int().min(1).optional(),
  tileUrl: z.string().optional(),
  routeColor: z.string().optional(),
});

type RoutePoint = z.infer<typeof pointSchema>;
type HighlightDef = z.infer<typeof highlightSchema>;
export type AnimatedRouteProps = z.infer<typeof propsSchema>;

export const DEFAULT_ROUTE: RoutePoint[] = MIST_TRAIL.map(([lat, lng, elevation]) => ({
  lat,
  lng,
  elevation,
}));

export const DEFAULT_HIGHLIGHTS: HighlightDef[] = [
  {
    lat: 37.7266,
    lng: -119.5395,
    imageUrl: "https://picsum.photos/seed/vernal-fall/640/640",
    label: "Vernal Fall",
  },
  {
    lat: 37.7263,
    lng: -119.5355,
    imageUrl: "https://picsum.photos/seed/liberty-cap/640/640",
    label: "Liberty Cap",
  },
  {
    lat: 37.7261,
    lng: -119.5310,
    imageUrl: "https://picsum.photos/seed/nevada-fall/640/640",
    label: "Nevada Fall",
  },
];

export const previewProps: AnimatedRouteProps = {
  title: "Mist Trail",
  subtitle: "Yosemite · Vernal Fall to Nevada Fall · ~1.4 km · 305 m gain",
  route: DEFAULT_ROUTE,
  highlights: DEFAULT_HIGHLIGHTS,
  zoom: 16,
  drawDuration: 5,
  holdDuration: 1.5,
  highlightInDuration: 0.5,
  highlightHoldDuration: 1.6,
  highlightOutDuration: 0.5,
  fps: 30,
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  routeColor: "#ff385c",
};

export async function* runner({
  props: {
    title = "Mist Trail",
    subtitle = "Yosemite · Vernal Fall to Nevada Fall · ~1.4 km · 305 m gain",
    route: routeProp,
    gpxUrl,
    highlights: highlightsProp,
    zoom = 16,
    drawDuration = 5,
    holdDuration = 1.5,
    highlightInDuration = 0.5,
    highlightHoldDuration = 1.6,
    highlightOutDuration = 0.5,
    fps = 30,
    tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    routeColor = "#ff385c",
  },
  bounds: { width, height },
}: RunnerArgs<AnimatedRouteProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);
  const layout = computeLayout(width, height);

  const route = gpxUrl ? await loadGpx(gpxUrl) : (routeProp ?? DEFAULT_ROUTE);
  const highlightDefs = highlightsProp ?? DEFAULT_HIGHLIGHTS;

  const map = await prepareMap(route, zoom, tileUrl, layout, highlightDefs);
  const phases = buildPhases(
    map.cumLength,
    map.highlights.map((h) => h.arcLength),
    drawDuration,
    highlightInDuration,
    highlightHoldDuration,
    highlightOutDuration,
    holdDuration,
  );
  const totalDuration = phases.reduce((s, p) => s + p.duration, 0);

  const baseCanvas = createCanvas(width, height);
  const baseCtx = baseCanvas.getContext("2d");
  await renderReactElement(
    baseCtx,
    <Header
      width={width}
      height={height}
      padding={layout.padding}
      title={title}
      subtitle={subtitle}
      titleSize={layout.titleSize}
      subtitleSize={layout.subtitleSize}
    />,
    { fonts },
  );
  drawMap(baseCtx, map, layout);
  drawSparklineBackdrop(baseCtx, layout, map.canvasRoute);

  const frameCount = Math.max(1, Math.round(totalDuration * fps));
  const totalArc = map.cumLength[map.cumLength.length - 1];

  yield* tween(frameCount, async ({ lower: t }) => {
    const seconds = t * totalDuration;
    const state = computeState(phases, seconds);
    const routeArc =
      state.phase.kind === "draw"
        ? state.phase.arcStart +
          (state.phase.arcEnd - state.phase.arcStart) * state.local
        : state.phase.arcEnd;
    const routeProgress = totalArc > 0 ? routeArc / totalArc : 0;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseCanvas, 0, 0);

    drawProgressiveRoute(ctx, map.canvasRoute, map.cumLength, routeProgress, routeColor);
    const pos = positionAlongRoute(map.canvasRoute, map.cumLength, routeProgress);
    drawMarker(ctx, pos.x, pos.y, routeColor);
    drawElevationLine(ctx, map.canvasRoute, map.cumLength, routeProgress, layout, routeColor);

    if (
      state.phase.kind === "in" ||
      state.phase.kind === "hold" ||
      state.phase.kind === "out"
    ) {
      const visibility =
        state.phase.kind === "in"
          ? state.local
          : state.phase.kind === "out"
            ? 1 - state.local
            : 1;
      drawHighlight(
        ctx,
        map.highlights[state.phase.idx],
        visibility,
        layout,
        routeColor,
      );
    }

    return canvas.encode("png");
  });
}

// ---------- Layout ----------

export type Layout = ReturnType<typeof computeLayout>;

export function computeLayout(width: number, height: number) {
  const padding = Math.round(width * 0.035);
  const titleSize = Math.round(height * 0.045);
  const subtitleSize = Math.round(height * 0.022);
  const sparkHeight = Math.round(height * 0.13);
  const sparkGap = Math.round(height * 0.025);
  const sparkLabelSize = Math.round(height * 0.022);
  // Gutter for the elevation labels — sized from font size (which scales with
  // height) plus margins, so portrait aspects don't crowd the canvas edge.
  const sparkLabelWidth =
    Math.ceil(sparkLabelSize * 3.6) + Math.round(width * 0.022);

  const headerHeight =
    padding + titleSize + Math.round(height * 0.012) + subtitleSize;
  const mapTop = headerHeight + Math.round(height * 0.04);
  const mapBottom = height - padding - sparkHeight - sparkGap;
  const mapLeft = padding;
  const mapRight = width - padding;

  const sparkLeft = padding;
  const sparkPlotLeft = sparkLeft + sparkLabelWidth;
  const sparkRight = width - padding;
  const sparkTop = mapBottom + sparkGap;
  const sparkBottom = height - padding;

  return {
    width,
    height,
    padding,
    titleSize,
    subtitleSize,
    sparkLabelSize,
    mapLeft,
    mapRight,
    mapTop,
    mapBottom,
    mapWidth: mapRight - mapLeft,
    mapHeight: mapBottom - mapTop,
    sparkLeft,
    sparkPlotLeft,
    sparkRight,
    sparkTop,
    sparkBottom,
    sparkHeight,
    sparkWidth: sparkRight - sparkPlotLeft,
  };
}

// ---------- Map preparation ----------

type CanvasPoint = { x: number; y: number; elevation: number };

type ResolvedHighlight = HighlightDef & {
  position: { x: number; y: number };
  anchor: { x: number; y: number };
  arcLength: number;
  image: Image | null;
};

type PreparedMap = {
  stitched: Canvas;
  src: { x: number; y: number; w: number; h: number };
  canvasRoute: CanvasPoint[];
  cumLength: number[];
  highlights: ResolvedHighlight[];
};

export type { CanvasPoint, PreparedMap, ResolvedHighlight };

export async function prepareMap(
  route: RoutePoint[],
  zoom: number,
  tileUrl: string,
  layout: Layout,
  highlights: HighlightDef[],
): Promise<PreparedMap> {
  const tilePoints = route.map((p) => latLngToTilePrecise(p.lat, p.lng, zoom));
  const minTx = Math.min(...tilePoints.map((t) => t.x));
  const maxTx = Math.max(...tilePoints.map((t) => t.x));
  const minTy = Math.min(...tilePoints.map((t) => t.y));
  const maxTy = Math.max(...tilePoints.map((t) => t.y));

  const padTiles = 1;
  const tx0 = Math.floor(minTx) - padTiles;
  const tx1 = Math.ceil(maxTx) + padTiles;
  const ty0 = Math.floor(minTy) - padTiles;
  const ty1 = Math.ceil(maxTy) + padTiles;

  const stitchedW = (tx1 - tx0 + 1) * TILE_SIZE;
  const stitchedH = (ty1 - ty0 + 1) * TILE_SIZE;
  const stitched = createCanvas(stitchedW, stitchedH);
  const sCtx = stitched.getContext("2d");
  sCtx.fillStyle = "#e6ebef";
  sCtx.fillRect(0, 0, stitchedW, stitchedH);

  const fetches: Promise<{ tx: number; ty: number; img: Image | null }>[] = [];
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      fetches.push(fetchTile(tileUrl, zoom, tx, ty));
    }
  }
  const fetched = await Promise.all(fetches);
  for (const { tx, ty, img } of fetched) {
    if (img) sCtx.drawImage(img, (tx - tx0) * TILE_SIZE, (ty - ty0) * TILE_SIZE);
  }

  const stitchedPx = tilePoints.map((t, i) => ({
    x: (t.x - tx0) * TILE_SIZE,
    y: (t.y - ty0) * TILE_SIZE,
    elevation: route[i].elevation ?? 0,
  }));

  const minX = Math.min(...stitchedPx.map((p) => p.x));
  const maxX = Math.max(...stitchedPx.map((p) => p.x));
  const minY = Math.min(...stitchedPx.map((p) => p.y));
  const maxY = Math.max(...stitchedPx.map((p) => p.y));
  const bboxW = maxX - minX || 1;
  const bboxH = maxY - minY || 1;
  const pad = 0.18;
  const scale = Math.min(
    layout.mapWidth / (bboxW * (1 + 2 * pad)),
    layout.mapHeight / (bboxH * (1 + 2 * pad)),
  );

  const routeCx = (minX + maxX) / 2;
  const routeCy = (minY + maxY) / 2;
  const mapCx = layout.mapLeft + layout.mapWidth / 2;
  const mapCy = layout.mapTop + layout.mapHeight / 2;

  const stitchedToCanvas = (x: number, y: number) => ({
    x: mapCx + (x - routeCx) * scale,
    y: mapCy + (y - routeCy) * scale,
  });

  const rawCanvasRoute: CanvasPoint[] = stitchedPx.map((p) => ({
    ...stitchedToCanvas(p.x, p.y),
    elevation: p.elevation,
  }));

  // Smooth more aggressively for sparse hand-crafted routes; lighter or skip
  // for dense GPX data.
  const subdivisions = rawCanvasRoute.length < 60 ? 16 : 2;
  const canvasRoute = smoothPolyline(rawCanvasRoute, subdivisions);

  const cumLength = [0];
  for (let i = 1; i < canvasRoute.length; i++) {
    const dx = canvasRoute[i].x - canvasRoute[i - 1].x;
    const dy = canvasRoute[i].y - canvasRoute[i - 1].y;
    cumLength.push(cumLength[i - 1] + Math.hypot(dx, dy));
  }

  // Resolve highlights: project lat/lng → canvas pixel, snap to closest point
  // on the smoothed route, fetch images.
  const resolvedHighlights: ResolvedHighlight[] = await Promise.all(
    highlights.map(async (h) => {
      const t = latLngToTilePrecise(h.lat, h.lng, zoom);
      const stitchedPos = {
        x: (t.x - tx0) * TILE_SIZE,
        y: (t.y - ty0) * TILE_SIZE,
      };
      const position = stitchedToCanvas(stitchedPos.x, stitchedPos.y);
      const closestIdx = findClosestPointIndex(position, canvasRoute);
      const anchor = {
        x: canvasRoute[closestIdx].x,
        y: canvasRoute[closestIdx].y,
      };
      const image = await loadHighlightImage(h.imageUrl);
      return {
        ...h,
        position,
        anchor,
        arcLength: cumLength[closestIdx],
        image,
      };
    }),
  );

  // Sort highlights by their arc position so the timeline visits them in order.
  resolvedHighlights.sort((a, b) => a.arcLength - b.arcLength);

  const srcW = layout.mapWidth / scale;
  const srcH = layout.mapHeight / scale;
  const srcX = routeCx - srcW / 2;
  const srcY = routeCy - srcH / 2;

  return {
    stitched,
    src: { x: srcX, y: srcY, w: srcW, h: srcH },
    canvasRoute,
    cumLength,
    highlights: resolvedHighlights,
  };
}

function findClosestPointIndex(
  p: { x: number; y: number },
  pts: { x: number; y: number }[],
) {
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i].x - p.x;
    const dy = pts[i].y - p.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function smoothPolyline(pts: CanvasPoint[], subdivisions: number): CanvasPoint[] {
  if (pts.length < 2 || subdivisions <= 1) return pts;
  const out: CanvasPoint[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < subdivisions; j++) {
      const t = j / subdivisions;
      out.push({
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
        y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
        elevation: catmullRom(
          p0.elevation,
          p1.elevation,
          p2.elevation,
          p3.elevation,
          t,
        ),
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

// ---------- GPX ----------

const gpxCache = new Map<string, Promise<RoutePoint[]>>();

export async function loadGpx(url: string): Promise<RoutePoint[]> {
  let p = gpxCache.get(url);
  if (!p) {
    p = (async () => {
      const res = await fetch(url, {
        headers: { "User-Agent": "Effing-Examples/1.0 (+https://effing.dev)" },
      });
      if (!res.ok) throw new Error(`Failed to fetch GPX (${res.status}): ${url}`);
      return parseGpx(await res.text());
    })();
    gpxCache.set(url, p);
  }
  return p;
}

export function parseGpx(text: string): RoutePoint[] {
  const re =
    /<(?:trkpt|rtept|wpt)\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:trkpt|rtept|wpt)>)/g;
  const pts: RoutePoint[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const attrs = m[1];
    const inner = m[2] ?? "";
    const latM = attrs.match(/\blat\s*=\s*["']([^"']+)["']/);
    const lonM = attrs.match(/\blon\s*=\s*["']([^"']+)["']/);
    if (!latM || !lonM) continue;
    const eleM = inner.match(/<ele\s*>\s*([^<]+?)\s*<\/ele\s*>/);
    pts.push({
      lat: parseFloat(latM[1]),
      lng: parseFloat(lonM[1]),
      elevation: eleM ? parseFloat(eleM[1]) : 0,
    });
  }
  return pts;
}

// ---------- Tile and image fetching ----------

const tileCache = new Map<string, Promise<Image | null>>();

async function fetchTile(
  template: string,
  z: number,
  x: number,
  y: number,
): Promise<{ tx: number; ty: number; img: Image | null }> {
  const url = template
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
  let promise = tileCache.get(url);
  if (!promise) {
    promise = (async () => {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Effing-Examples/1.0 (+https://effing.dev)" },
        });
        if (!res.ok) return null;
        return await loadImage(Buffer.from(await res.arrayBuffer()));
      } catch {
        return null;
      }
    })();
    tileCache.set(url, promise);
  }
  return { tx: x, ty: y, img: await promise };
}

const imageCache = new Map<string, Promise<Image | null>>();

async function loadHighlightImage(url: string): Promise<Image | null> {
  let p = imageCache.get(url);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Effing-Examples/1.0 (+https://effing.dev)" },
          redirect: "follow",
        });
        if (!res.ok) return null;
        return await loadImage(Buffer.from(await res.arrayBuffer()));
      } catch {
        return null;
      }
    })();
    imageCache.set(url, p);
  }
  return p;
}

function latLngToTilePrecise(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

// ---------- Phase timeline ----------

type Phase =
  | { kind: "draw"; arcStart: number; arcEnd: number; duration: number }
  | { kind: "in"; idx: number; arcEnd: number; duration: number }
  | { kind: "hold"; idx: number; arcEnd: number; duration: number }
  | { kind: "out"; idx: number; arcEnd: number; duration: number };

function buildPhases(
  cumLength: number[],
  highlightArcs: number[],
  drawDuration: number,
  inDur: number,
  holdDur: number,
  outDur: number,
  finalHoldDur: number,
): Phase[] {
  const total = cumLength[cumLength.length - 1];
  const phases: Phase[] = [];
  let prev = 0;
  highlightArcs.forEach((arc, i) => {
    const segLen = arc - prev;
    const segDur = total > 0 ? drawDuration * (segLen / total) : 0;
    phases.push({ kind: "draw", arcStart: prev, arcEnd: arc, duration: segDur });
    phases.push({ kind: "in", idx: i, arcEnd: arc, duration: inDur });
    phases.push({ kind: "hold", idx: i, arcEnd: arc, duration: holdDur });
    phases.push({ kind: "out", idx: i, arcEnd: arc, duration: outDur });
    prev = arc;
  });
  if (prev < total) {
    const segLen = total - prev;
    const segDur = total > 0 ? drawDuration * (segLen / total) : 0;
    phases.push({ kind: "draw", arcStart: prev, arcEnd: total, duration: segDur });
  }
  if (finalHoldDur > 0) {
    phases.push({
      kind: "draw",
      arcStart: total,
      arcEnd: total,
      duration: finalHoldDur,
    });
  }
  return phases;
}

function computeState(phases: Phase[], t: number): { phase: Phase; local: number } {
  let elapsed = 0;
  for (const phase of phases) {
    if (t < elapsed + phase.duration) {
      const local =
        phase.duration > 0
          ? Math.min(1, Math.max(0, (t - elapsed) / phase.duration))
          : 1;
      return { phase, local };
    }
    elapsed += phase.duration;
  }
  return { phase: phases[phases.length - 1], local: 1 };
}

// ---------- Drawing ----------

export function drawMap(ctx: SKRSContext2D, map: PreparedMap, layout: Layout) {
  ctx.save();
  const r = Math.round(layout.height * 0.018);
  roundedRect(
    ctx,
    layout.mapLeft,
    layout.mapTop,
    layout.mapWidth,
    layout.mapHeight,
    r,
  );
  ctx.clip();
  ctx.drawImage(
    map.stitched,
    map.src.x,
    map.src.y,
    map.src.w,
    map.src.h,
    layout.mapLeft,
    layout.mapTop,
    layout.mapWidth,
    layout.mapHeight,
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillRect(layout.mapLeft, layout.mapTop, layout.mapWidth, layout.mapHeight);
  ctx.restore();
}

export function drawSparklineBackdrop(
  ctx: SKRSContext2D,
  layout: Layout,
  pts: CanvasPoint[],
) {
  const elevations = pts.map((p) => p.elevation);
  const minE = Math.min(...elevations);
  const maxE = Math.max(...elevations);
  const sparkPlotTop = layout.sparkBottom - layout.sparkHeight + 2;

  ctx.save();
  ctx.strokeStyle = "#dde1e6";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(layout.sparkPlotLeft, layout.sparkBottom);
  ctx.lineTo(layout.sparkRight, layout.sparkBottom);
  ctx.stroke();

  ctx.strokeStyle = "#eef0f3";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(layout.sparkPlotLeft, sparkPlotTop);
  ctx.lineTo(layout.sparkRight, sparkPlotTop);
  ctx.stroke();

  ctx.fillStyle = "#9aa0a6";
  ctx.font = `400 ${layout.sparkLabelSize}px Inter`;
  ctx.textAlign = "right";
  const labelX = layout.sparkPlotLeft - Math.round(layout.width * 0.008);
  ctx.textBaseline = "top";
  ctx.fillText(formatMeters(maxE), labelX, sparkPlotTop - 2);
  ctx.textBaseline = "bottom";
  ctx.fillText(formatMeters(minE), labelX, layout.sparkBottom + 2);
  ctx.restore();
}

function formatMeters(v: number) {
  return `${Math.round(v).toLocaleString("en-US")} m`;
}

export function drawProgressiveRoute(
  ctx: SKRSContext2D,
  pts: CanvasPoint[],
  cum: number[],
  progress: number,
  color: string,
) {
  if (progress <= 0) return;
  const totalLen = cum[cum.length - 1];
  const targetLen = totalLen * progress;

  for (const stroke of [
    { width: 11, color: "rgba(255, 255, 255, 0.85)" },
    { width: 7, color },
  ]) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.width;
    ctx.strokeStyle = stroke.color;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      if (cum[i] <= targetLen) {
        ctx.lineTo(pts[i].x, pts[i].y);
        continue;
      }
      const segLen = cum[i] - cum[i - 1];
      const f = segLen > 0 ? (targetLen - cum[i - 1]) / segLen : 0;
      ctx.lineTo(
        pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f,
        pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f,
      );
      break;
    }
    ctx.stroke();
    ctx.restore();
  }
}

export function positionAlongRoute(
  pts: CanvasPoint[],
  cum: number[],
  progress: number,
) {
  const totalLen = cum[cum.length - 1];
  const target = totalLen * progress;
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] >= target) {
      const segLen = cum[i] - cum[i - 1];
      const f = segLen > 0 ? (target - cum[i - 1]) / segLen : 0;
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f,
      };
    }
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y };
}

export function drawMarker(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  color: string,
) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawElevationLine(
  ctx: SKRSContext2D,
  pts: CanvasPoint[],
  cum: number[],
  progress: number,
  layout: Layout,
  color: string,
) {
  if (pts.length < 2) return;
  const totalLen = cum[cum.length - 1];
  const minE = Math.min(...pts.map((p) => p.elevation));
  const maxE = Math.max(...pts.map((p) => p.elevation));
  const eRange = Math.max(1, maxE - minE);

  const x = (frac: number) => layout.sparkPlotLeft + frac * layout.sparkWidth;
  const yFor = (e: number) =>
    layout.sparkBottom -
    ((e - minE) / eRange) * (layout.sparkHeight - 4) -
    2;

  const targetLen = totalLen * progress;
  const sparkPts: { x: number; y: number; elevation: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (cum[i] <= targetLen) {
      sparkPts.push({
        x: x(totalLen > 0 ? cum[i] / totalLen : 0),
        y: yFor(pts[i].elevation),
        elevation: pts[i].elevation,
      });
    } else {
      const segLen = cum[i] - cum[i - 1];
      const f = segLen > 0 ? (targetLen - cum[i - 1]) / segLen : 0;
      const e =
        pts[i - 1].elevation + (pts[i].elevation - pts[i - 1].elevation) * f;
      sparkPts.push({
        x: x(targetLen / totalLen),
        y: yFor(e),
        elevation: e,
      });
      break;
    }
  }
  if (sparkPts.length < 2) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sparkPts[0].x, layout.sparkBottom);
  for (const p of sparkPts) ctx.lineTo(p.x, p.y);
  ctx.lineTo(sparkPts[sparkPts.length - 1].x, layout.sparkBottom);
  ctx.closePath();
  ctx.fillStyle = withAlpha(color, 0.18);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(sparkPts[0].x, sparkPts[0].y);
  for (const p of sparkPts) ctx.lineTo(p.x, p.y);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.stroke();

  const tip = sparkPts[sparkPts.length - 1];
  const tipText = formatMeters(tip.elevation);
  ctx.font = `600 ${layout.sparkLabelSize}px Inter`;
  const padX = Math.round(layout.width * 0.006);
  const padY = Math.round(layout.height * 0.005);
  const textW = ctx.measureText(tipText).width;
  const badgeW = textW + padX * 2;
  const badgeH = layout.sparkLabelSize + padY * 2;
  const desiredX = tip.x + 8;
  const badgeX = Math.min(layout.sparkRight - badgeW, desiredX);
  const badgeY = Math.max(
    layout.sparkBottom - layout.sparkHeight + 2,
    tip.y - badgeH / 2,
  );
  ctx.fillStyle = color;
  roundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(tipText, badgeX + padX, badgeY + badgeH / 2);

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHighlight(
  ctx: SKRSContext2D,
  highlight: ResolvedHighlight,
  visibility: number,
  layout: Layout,
  color: string,
) {
  if (visibility <= 0) return;

  // Line draws from anchor toward icon center over the first 60% of visibility;
  // icon scales in from 40%→100%. Reverse for out animations.
  const lineProgress = Math.min(1, visibility / 0.6);
  const iconProgress = Math.max(0, (visibility - 0.4) / 0.6);

  const iconR = Math.round(layout.height * 0.07);
  const ringW = Math.max(3, Math.round(iconR * 0.07));
  const offsetSign =
    highlight.anchor.x > layout.mapLeft + layout.mapWidth * 0.5 ? -1 : 1;
  const desiredCx = highlight.anchor.x + offsetSign * iconR * 1.4;
  const desiredCy = highlight.anchor.y - iconR * 2.0;
  const iconCx = clamp(
    desiredCx,
    layout.mapLeft + iconR + ringW + 8,
    layout.mapRight - iconR - ringW - 8,
  );
  const iconCy = clamp(
    desiredCy,
    layout.mapTop + iconR + ringW + 8,
    layout.mapBottom - iconR - ringW - 8,
  );

  // Connector line from anchor on route → icon center, length proportional to lineProgress.
  const dx = iconCx - highlight.anchor.x;
  const dy = iconCy - highlight.anchor.y;
  const lineX = highlight.anchor.x + dx * lineProgress;
  const lineY = highlight.anchor.y + dy * lineProgress;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(highlight.anchor.x, highlight.anchor.y);
  ctx.lineTo(lineX, lineY);
  ctx.stroke();

  // Tiny dot at the anchor on the route for the connection.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(highlight.anchor.x, highlight.anchor.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (iconProgress <= 0) return;
  const scale = popScale(iconProgress);

  ctx.save();
  ctx.translate(iconCx, iconCy);
  ctx.scale(scale, scale);

  // Outer ring with shadow.
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(0, 0, iconR + ringW, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Image clipped to the inner circle (cover-style fit).
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, iconR, 0, Math.PI * 2);
  ctx.clip();
  if (highlight.image) {
    const ratio = highlight.image.width / highlight.image.height;
    let drawW: number, drawH: number, drawX: number, drawY: number;
    if (ratio > 1) {
      drawH = iconR * 2;
      drawW = drawH * ratio;
      drawX = -drawW / 2;
      drawY = -iconR;
    } else {
      drawW = iconR * 2;
      drawH = drawW / ratio;
      drawX = -iconR;
      drawY = -drawH / 2;
    }
    ctx.drawImage(highlight.image, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = "#cfd2d6";
    ctx.fillRect(-iconR, -iconR, iconR * 2, iconR * 2);
  }
  ctx.restore();

  // Colored ring outside the image.
  ctx.strokeStyle = color;
  ctx.lineWidth = ringW;
  ctx.beginPath();
  ctx.arc(0, 0, iconR + ringW / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Label below the icon (in unscaled space so the text doesn't grow with the pop).
  if (highlight.label && iconProgress > 0.4) {
    const labelOpacity = Math.min(1, (iconProgress - 0.4) / 0.6);
    const labelSize = Math.max(14, Math.round(iconR * 0.32));
    ctx.save();
    ctx.font = `600 ${labelSize}px Inter`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const padX = Math.round(labelSize * 0.55);
    const padY = Math.round(labelSize * 0.3);
    const labelText = highlight.label;
    const labelW = ctx.measureText(labelText).width + padX * 2;
    const labelH = labelSize + padY * 2;
    const labelX = iconCx - labelW / 2;
    const labelY = iconCy + iconR + ringW + 8;
    ctx.globalAlpha = labelOpacity;
    ctx.fillStyle = "rgba(20, 20, 22, 0.88)";
    roundedRect(ctx, labelX, labelY, labelW, labelH, labelH / 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.fillText(labelText, iconCx, labelY + padY);
    ctx.restore();
  }
}

function popScale(t: number) {
  const peak = 1.08;
  if (t < 0.7) {
    const u = t / 0.7;
    return peak * (3 * u * u - 2 * u * u * u);
  }
  const u = (t - 0.7) / 0.3;
  return peak + (1 - peak) * (3 * u * u - 2 * u * u * u);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function withAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

// ---------- Header ----------

export function Header({
  width,
  height,
  padding,
  title,
  subtitle,
  titleSize,
  subtitleSize,
}: {
  width: number;
  height: number;
  padding: number;
  title: string;
  subtitle: string;
  titleSize: number;
  subtitleSize: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: "white",
        display: "flex",
        flexDirection: "column",
        padding,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          fontSize: titleSize,
          fontWeight: 700,
          color: "#1a1a1a",
          lineHeight: 1.1,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: subtitleSize,
          color: "#888",
          marginTop: Math.round(height * 0.008),
          fontWeight: 400,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}
