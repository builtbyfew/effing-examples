import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import {
  DEFAULT_HIGHLIGHTS,
  DEFAULT_ROUTE,
  type AnimatedRouteProps,
} from "~/annies/animated-route.fn";
import type { AnimatedRouteCoverProps } from "~/images/animated-route-cover.fn";

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
  drawDuration: z.number().positive().optional(),
  holdDuration: z.number().nonnegative().optional(),
  highlightInDuration: z.number().nonnegative().optional(),
  highlightHoldDuration: z.number().nonnegative().optional(),
  highlightOutDuration: z.number().nonnegative().optional(),
  tileUrl: z.string().optional(),
  routeColor: z.string().optional(),
});

type AnimatedRouteEffieProps = z.infer<typeof propsSchema>;

export const previewProps: AnimatedRouteEffieProps = {
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
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  routeColor: "#ff385c",
};

export async function runner({
  props: {
    title = "Mist Trail",
    subtitle = "Yosemite · Vernal Fall to Nevada Fall · ~1.4 km · 305 m gain",
    route = DEFAULT_ROUTE,
    gpxUrl,
    highlights = DEFAULT_HIGHLIGHTS,
    zoom = 16,
    drawDuration = 5,
    holdDuration = 1.5,
    highlightInDuration = 0.5,
    highlightHoldDuration = 1.6,
    highlightOutDuration = 0.5,
    tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    routeColor = "#ff385c",
  },
  bounds: { width, height },
}: RunnerArgs<AnimatedRouteEffieProps>): EffieRunnerReturn {
  const fps = 30;
  const perHighlight =
    highlightInDuration + highlightHoldDuration + highlightOutDuration;
  const duration =
    drawDuration + highlights.length * perHighlight + holdDuration;

  const cover = await fnUrl(
    "image",
    "animated-route-cover",
    {
      title,
      subtitle,
      route,
      gpxUrl,
      highlights,
      zoom,
      tileUrl,
      routeColor,
    } satisfies AnimatedRouteCoverProps,
    { width, height },
  );

  const animation = await fnUrl(
    "annie",
    "animated-route",
    {
      title,
      subtitle,
      route,
      gpxUrl,
      highlights,
      zoom,
      drawDuration,
      holdDuration,
      highlightInDuration,
      highlightHoldDuration,
      highlightOutDuration,
      fps,
      tileUrl,
      routeColor,
    } satisfies AnimatedRouteProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps,
    cover,
    background: { type: "color", color: "white" },
    segments: [
      effieSegment({
        duration,
        layers: [{ type: "animation", source: animation }],
      }),
    ],
  });
}
