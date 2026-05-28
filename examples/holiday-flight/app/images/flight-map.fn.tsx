import { z } from "zod";
import { createCanvas } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
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
});

export type FlightMapProps = z.infer<typeof propsSchema>;

export const previewProps: FlightMapProps = {
  origin: { name: "Brussels", country: "Belgium", lon: 4.35, lat: 50.85 },
  destination: { name: "Santorini", country: "Greece", lon: 25.43, lat: 36.39 },
};

export async function runner({
  props: { origin, destination },
  bounds: { width, height },
}: RunnerArgs<FlightMapProps>): ImageRunnerReturn {
  const landData = await fetch(
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson",
  ).then((r) => r.json()) as { features: GeoFeature[] };

  const { project, vpMinLon, vpMaxLon, vpMinLat, vpMaxLat } = buildProjection(
    origin,
    destination,
    width,
    height,
  );

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Ocean
  ctx.fillStyle = "#161c28";
  ctx.fillRect(0, 0, width, height);

  // Land polygons
  ctx.fillStyle = "#252d3d";
  ctx.strokeStyle = "rgba(120,140,175,0.12)";
  ctx.lineWidth = 0.5;
  for (const { geometry } of landData.features) {
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
            if (Math.abs(lon - ring[j - 1][0]) > 180) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
    }
  }

  // Grid lines
  const lonSpan = vpMaxLon - vpMinLon;
  const latSpan = vpMaxLat - vpMinLat;
  const lonStep = lonSpan > 90 ? 30 : lonSpan > 30 ? 10 : 5;
  const latStep = latSpan > 60 ? 30 : latSpan > 20 ? 10 : 5;
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let lat = Math.ceil(vpMinLat / latStep) * latStep; lat <= vpMaxLat; lat += latStep) {
    const { y } = project(vpMinLon, lat);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  for (let lon = Math.ceil(vpMinLon / lonStep) * lonStep; lon <= vpMaxLon; lon += lonStep) {
    const { x } = project(lon, vpMinLat);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  // Equator
  if (vpMinLat <= 0 && vpMaxLat >= 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    const { y: eqY } = project(0, 0);
    ctx.beginPath(); ctx.moveTo(0, eqY); ctx.lineTo(width, eqY); ctx.stroke();
  }

  return canvas.encode("png");
}
