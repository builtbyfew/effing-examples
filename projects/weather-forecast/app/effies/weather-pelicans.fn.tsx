import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { PelicanOnBikeProps } from "~/annies/pelican-on-bike.fn";
import type { WeatherBackgroundProps } from "~/annies/weather-background.fn";
import type { TemperatureDisplayAnnieProps } from "~/annies/temperature-display.fn";
import type { DayBadgeImageProps } from "~/images/day-badge.fn";
import type { WeatherPelicansCoverProps } from "~/images/weather-pelicans-cover.fn";

export const propsSchema = z.object({
  city: z.string().min(1),
  days: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        maxTemperature: z.number(),
        wmoCode: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

type WeatherPelicansProps = z.infer<typeof propsSchema>;

export const previewProps: WeatherPelicansProps = {
  city: "Ghent",
  days: [
    { date: "2026-05-04", maxTemperature: 21, wmoCode: 0 },
    { date: "2026-05-05", maxTemperature: 18, wmoCode: 2 },
    { date: "2026-05-06", maxTemperature: 15, wmoCode: 3 },
    { date: "2026-05-07", maxTemperature: 11, wmoCode: 45 },
    { date: "2026-05-08", maxTemperature: 13, wmoCode: 53 },
    { date: "2026-05-09", maxTemperature: 14, wmoCode: 63 },
    { date: "2026-05-10", maxTemperature: -6, wmoCode: 73 },
    { date: "2026-05-11", maxTemperature: 16, wmoCode: 95 },
  ],
};

const SEGMENT_DURATION = 3.5;
const FPS = 30;
const TRANSITION_DURATION = 0.5;

const dateLabelFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function formatDateLabel(date: string): string {
  return dateLabelFormatter
    .format(new Date(`${date}T00:00:00Z`))
    .toUpperCase();
}

export async function runner({
  props: { city, days },
  bounds: { width, height },
}: RunnerArgs<WeatherPelicansProps>): EffieRunnerReturn {
  const cover = await fnUrl(
    "image",
    "weather-pelicans-cover",
    {
      city,
      dateLabel: formatDateLabel(days[0].date),
      maxTemperature: days[0].maxTemperature,
      wmoCode: days[0].wmoCode,
    } satisfies WeatherPelicansCoverProps,
    { width, height },
  );

  const pelicanUrl = await fnUrl(
    "annie",
    "pelican-on-bike",
    {
      frameCount: SEGMENT_DURATION * FPS,
      wheelTurns: 7 / 3,
      bobAmplitude: 8,
    } satisfies PelicanOnBikeProps,
    { width, height },
  );

  const segments = await Promise.all(
    days.map(async (day, i) => {
      const transitionLeadIn = i > 0 ? TRANSITION_DURATION : 0;
      const overlayDuration = SEGMENT_DURATION - transitionLeadIn;
      const [weatherUrl, tempUrl, badgeUrl] = await Promise.all([
        fnUrl(
          "annie",
          "weather-background",
          {
            wmoCode: day.wmoCode,
            frameCount: SEGMENT_DURATION * FPS,
          } satisfies WeatherBackgroundProps,
          { width, height },
        ),
        fnUrl(
          "annie",
          "temperature-display",
          {
            city,
            maxTemperature: day.maxTemperature,
            frameCount: Math.round(overlayDuration * FPS),
          } satisfies TemperatureDisplayAnnieProps,
          { width, height },
        ),
        fnUrl(
          "image",
          "day-badge",
          {
            dateLabel: formatDateLabel(day.date),
          } satisfies DayBadgeImageProps,
          { width, height },
        ),
      ]);

      return effieSegment({
        duration: SEGMENT_DURATION,
        transition:
          i > 0
            ? {
                type: "wipe",
                direction: "left",
                duration: TRANSITION_DURATION,
              }
            : undefined,
        layers: [
          { type: "animation", source: weatherUrl },
          { type: "animation", source: "#pelican" },
          {
            type: "image",
            source: badgeUrl,
            delay: transitionLeadIn,
            effects: [{ type: "fade-in", start: 0, duration: 0.4 }],
          },
          {
            type: "animation",
            source: tempUrl,
            delay: transitionLeadIn,
            effects: [{ type: "fade-in", start: 0.2, duration: 0.4 }],
          },
        ],
      });
    }),
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "color", color: "black" },
    sources: {
      pelican: pelicanUrl,
    },
    segments,
  });
}
