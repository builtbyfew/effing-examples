import { z } from "zod";
import { createCanvas, loadImage, renderReactElement } from "@effing/canvas";
import type { Canvas, SKRSContext2D } from "@effing/canvas";
import { Path2D } from "@napi-rs/canvas";
import { tween, easeInOutCubic, easeOutBack } from "@effing/tween";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";

export const propsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  address: z.string(),
  zoom: z.number().int().min(1).max(19).optional(),
  frameCount: z.number().int().min(1).optional(),
});

export type MapZoomProps = z.infer<typeof propsSchema>;

export const previewProps: MapZoomProps = {
  lat: 50.8503,
  lon: 4.3517,
  address: "Grote Markt 1, Brussels",
  zoom: 16,
  frameCount: 240,
};

function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const TILE_PX = 512; // @2x tiles: 2× pixel density, same geographic coverage

type CompositeResult = {
  canvas: ReturnType<typeof createCanvas>;
  targetPx: number;
  targetPy: number;
  size: number;
};

async function buildComposite(
  lat: number,
  lon: number,
  zoom: number,
  gridRadius: number,
  style = "light_nolabels",
): Promise<CompositeResult> {
  const { x: fx, y: fy } = latLonToTile(lat, lon, zoom);
  const cx = Math.floor(fx);
  const cy = Math.floor(fy);
  const gridSize = gridRadius * 2 + 1;
  const size = gridSize * TILE_PX;
  const maxTile = Math.pow(2, zoom);

  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e8e8e8";
  ctx.fillRect(0, 0, size, size);

  const fetches: Promise<{ dx: number; dy: number; img: Awaited<ReturnType<typeof loadImage>> | null }>[] = [];
  for (let dy = -gridRadius; dy <= gridRadius; dy++) {
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      const tx = ((cx + dx) % maxTile + maxTile) % maxTile;
      const ty = cy + dy;
      if (ty < 0 || ty >= maxTile) continue;
      const url = `https://basemaps.cartocdn.com/${style}/${zoom}/${tx}/${ty}@2x.png`;
      fetches.push(
        fetch(url)
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .then(async (buf) => {
            const img = buf ? await loadImage(Buffer.from(buf)) : null;
            return { dx, dy, img };
          }),
      );
    }
  }

  const results = await Promise.all(fetches);
  for (const { dx, dy, img } of results) {
    if (!img) continue;
    const px = (dx + gridRadius) * TILE_PX;
    const py = (dy + gridRadius) * TILE_PX;
    ctx.drawImage(img, px, py, TILE_PX, TILE_PX);
  }

  return {
    canvas,
    targetPx: (fx - cx + gridRadius) * TILE_PX,
    targetPy: (fy - cy + gridRadius) * TILE_PX,
    size,
  };
}

function drawMapCrop(
  outCtx: SKRSContext2D,
  comp: CompositeResult,
  cropSize: number,
  canvasW: number,
  canvasH: number,
  alpha: number,
) {
  const srcX = Math.max(0, Math.min(comp.size - cropSize, comp.targetPx - cropSize / 2));
  const srcY = Math.max(0, Math.min(comp.size - cropSize, comp.targetPy - cropSize / 2));
  outCtx.globalAlpha = alpha;
  outCtx.drawImage(
    comp.canvas as Canvas,
    srcX,
    srcY,
    cropSize,
    cropSize,
    0,
    0,
    canvasW,
    canvasH,
  );
  outCtx.globalAlpha = 1;
}

// FA 6 Free "fa-house" solid — viewBox 0 0 576 512
const FA_HOUSE =
  "M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c.2 35.5-28.5 64.3-64 64.3H128.1c-35.3 0-64-28.7-64-64V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7.2 17-11 27-11s20 3.8 27 11l255.4 263.5c6.7 7 10 15 10 24zM352 224c0-35.3-28.7-64-64-64s-64 28.7-64 64v96h128V224z";

function drawHouseIcon(ctx: SKRSContext2D, x: number, y: number, displaySize: number) {
  if (displaySize <= 0) return;
  const s = displaySize / 512;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = displaySize * 0.25;
  ctx.shadowOffsetY = displaySize * 0.06;
  ctx.scale(s, s);
  ctx.translate(-288, -512); // center horizontally (576/2), bottom-align
  ctx.fillStyle = "#B71C1C";
  ctx.fill(new Path2D(FA_HOUSE));
  ctx.restore();
}

function drawDot(ctx: SKRSContext2D, x: number, y: number) {
  ctx.save();
  ctx.shadowColor = "rgba(183, 28, 28, 0.65)";
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fillStyle = "#B71C1C";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();
  ctx.restore();
}

export async function* runner({
  props: { lat, lon, address, zoom = 16, frameCount = 240 },
  bounds: { width, height },
}: RunnerArgs<MapZoomProps>): AnnieRunnerReturn {
  const zoomLevels = [zoom - 8, zoom - 4, zoom];
  const comps = await Promise.all([
    buildComposite(lat, lon, zoomLevels[0], 3, "light_all"),
    buildComposite(lat, lon, zoomLevels[1], 3, "light_nolabels"),
    buildComposite(lat, lon, zoomLevels[2], 3, "light_nolabels"),
  ]);

  const startCrops = comps.map((c) =>
    2 * Math.min(c.targetPx, c.size - c.targetPx, c.targetPy, c.size - c.targetPy),
  );

  const endCrops = [
    startCrops[1] / Math.pow(2, zoomLevels[1] - zoomLevels[0]),
    startCrops[2] / Math.pow(2, zoomLevels[2] - zoomLevels[1]),
    Math.round(Math.max(width, height) * 0.4 * (TILE_PX / 256)),
  ];

  const scales = zoomLevels.map((z) => Math.pow(2, zoomLevels[2] - z));
  const logUnifStart = Math.log(startCrops[0] * scales[0]);
  const logUnifEnd = Math.log(endCrops[2]);
  const logThresh1 = Math.log(startCrops[1] * scales[1]);
  const logThresh2 = Math.log(startCrops[2]);
  const fadeHalf = (logUnifStart - logUnifEnd) * 0.06;

  const zoomFrames = Math.round(frameCount * 0.55);
  const pinFrames = Math.round(frameCount * 0.15);
  const holdFrames = frameCount - zoomFrames - pinFrames;

  const houseSize = Math.round(width / 10);
  const gap = 24;

  // Phase 1: smooth zoom from country level to street level
  yield* tween(zoomFrames, async ({ lower: p }) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const logCrop = lerp(logUnifStart, logUnifEnd, easeInOutCubic(p));
    const unifCrop = Math.exp(logCrop);

    if (logCrop > logThresh1 + fadeHalf) {
      drawMapCrop(ctx, comps[0], unifCrop / scales[0], width, height, 1);
    } else if (logCrop > logThresh1 - fadeHalf) {
      const t = easeInOutCubic((logThresh1 + fadeHalf - logCrop) / (2 * fadeHalf));
      drawMapCrop(ctx, comps[0], unifCrop / scales[0], width, height, 1);
      drawMapCrop(ctx, comps[1], unifCrop / scales[1], width, height, t);
    } else if (logCrop > logThresh2 + fadeHalf) {
      drawMapCrop(ctx, comps[1], unifCrop / scales[1], width, height, 1);
    } else if (logCrop > logThresh2 - fadeHalf) {
      const t = easeInOutCubic((logThresh2 + fadeHalf - logCrop) / (2 * fadeHalf));
      drawMapCrop(ctx, comps[1], unifCrop / scales[1], width, height, 1);
      drawMapCrop(ctx, comps[2], unifCrop / scales[2], width, height, t);
    } else {
      drawMapCrop(ctx, comps[2], unifCrop / scales[2], width, height, 1);
    }

    drawDot(ctx, width / 2, height / 2);
    return canvas.encode("jpeg");
  });

  // Phase 2: pin drop — house icon pops up with ripple ring
  yield* tween(pinFrames, async ({ lower: p }) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    drawMapCrop(ctx, comps[2], endCrops[2], width, height, 1);

    if (p < 0.85) {
      const rt = p / 0.85;
      const rippleR = lerp(12, 60, rt);
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, rippleR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(183, 28, 28, ${(1 - rt) * 0.7})`;
      ctx.lineWidth = lerp(4, 1, rt);
      ctx.stroke();
      ctx.restore();
    }

    drawDot(ctx, width / 2, height / 2);
    const displaySize = Math.max(1, Math.round(houseSize * easeOutBack(p)));
    drawHouseIcon(ctx, width / 2, height / 2 - gap, displaySize);
    return canvas.encode("jpeg");
  });

  // Pre-render hold frame once — map + pin + address card, reused for every hold frame
  const holdCanvas = createCanvas(width, height);
  const holdCtx = holdCanvas.getContext("2d");
  drawMapCrop(holdCtx, comps[2], endCrops[2], width, height, 1);
  drawDot(holdCtx, width / 2, height / 2);
  drawHouseIcon(holdCtx, width / 2, height / 2 - gap, houseSize);
  const holdBuffer = await holdCanvas.encode("jpeg");

  // Phase 3: hold — yield the same pre-rendered buffer every frame
  yield* tween(holdFrames, async () => holdBuffer);
}
