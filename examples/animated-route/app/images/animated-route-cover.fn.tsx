import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { interBold, interSemiBold, loadFonts } from "~/fonts";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import {
  DEFAULT_HIGHLIGHTS,
  DEFAULT_ROUTE,
  Header,
  computeLayout,
  drawElevationLine,
  drawHighlight,
  drawMap,
  drawMarker,
  drawProgressiveRoute,
  drawSparklineBackdrop,
  loadGpx,
  positionAlongRoute,
  prepareMap,
} from "~/annies/animated-route.fn";

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
  gpxUrl: z.string().url().optional(),
  highlights: z.array(highlightSchema).optional(),
  zoom: z.number().int().min(0).max(19).optional(),
  tileUrl: z.string().optional(),
  routeColor: z.string().optional(),
});

export type AnimatedRouteCoverProps = z.infer<typeof propsSchema>;

export const previewProps: AnimatedRouteCoverProps = {
  title: "Mist Trail",
  subtitle: "Yosemite · Vernal Fall to Nevada Fall · ~1.4 km · 305 m gain",
  route: DEFAULT_ROUTE,
  highlights: DEFAULT_HIGHLIGHTS,
  zoom: 16,
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  routeColor: "#ff385c",
};

export async function runner({
  props: {
    title = "Mist Trail",
    subtitle = "Yosemite · Vernal Fall to Nevada Fall · ~1.4 km · 305 m gain",
    route: routeProp,
    gpxUrl,
    highlights = DEFAULT_HIGHLIGHTS,
    zoom = 16,
    tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    routeColor = "#ff385c",
  },
  bounds: { width, height },
}: RunnerArgs<AnimatedRouteCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);
  const layout = computeLayout(width, height);
  const route = gpxUrl ? await loadGpx(gpxUrl) : (routeProp ?? DEFAULT_ROUTE);
  const map = await prepareMap(route, zoom, tileUrl, layout, highlights);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
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
  drawMap(ctx, map, layout);
  drawSparklineBackdrop(ctx, layout, map.canvasRoute);

  drawProgressiveRoute(ctx, map.canvasRoute, map.cumLength, 1, routeColor);
  const pos = positionAlongRoute(map.canvasRoute, map.cumLength, 1);
  drawMarker(ctx, pos.x, pos.y, routeColor);
  drawElevationLine(ctx, map.canvasRoute, map.cumLength, 1, layout, routeColor);

  // Show all highlights at full visibility for an informative cover thumbnail.
  for (const h of map.highlights) {
    drawHighlight(ctx, h, 1, layout, routeColor);
  }

  return canvas.encode("png");
}
