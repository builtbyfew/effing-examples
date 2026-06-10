import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { EffieRunnerReturn, RunnerArgs } from "@effing/fn";
import { palette } from "~/theme";
import type { AmenityChipsProps } from "~/annies/amenity-chips.fn";

// Review gallery: every amenity-chip glyph on one screen, each running its
// intrinsic animation (see animated-icons.tsx) — pop in once, then idle. Handy
// for checking the whole icon set at a glance after touching any of them.

export const propsSchema = z.object({});

type AmenityChipsPreviewProps = z.infer<typeof propsSchema>;

export const previewProps: AmenityChipsPreviewProps = {};

const FPS = 30;
// Long enough to watch the slowest idle loops (~2.1 s) a couple of times and
// the one-shot Wi-Fi connect settle.
const DURATION = 6;

// One chip per glyph the schema knows, with the accents the promo uses.
const CHIPS: AmenityChipsProps["chips"] = [
  { label: "Guest favourite", icon: "heart", accent: "coral" },
  { label: "Private pool", icon: "pool" },
  { label: "Ocean view", icon: "ocean" },
  { label: "Full kitchen", icon: "kitchen" },
  { label: "Air-con", icon: "ac" },
  { label: "Free parking", icon: "parking" },
  { label: "Beach access", icon: "beach" },
  { label: "Pets welcome", icon: "pet" },
  { label: "Sleeps 8", icon: "guests" },
  { label: "3 bedrooms", icon: "bed" },
  { label: "2 baths", icon: "bath" },
  { label: "Great location", icon: "pin" },
  { label: "Fast Wi-Fi", icon: "wifi" },
  { label: "Top rated", icon: "star", accent: "sun" },
];

export async function runner({
  bounds: { width, height },
}: RunnerArgs<AmenityChipsPreviewProps>): EffieRunnerReturn {
  const fontSize = Math.round(width * 0.03);
  const frameCount = DURATION * FPS;

  // Two bottom-anchored columns so all chips fit on one screen.
  const half = Math.ceil(CHIPS.length / 2);
  const columns = [
    { chips: CHIPS.slice(0, half), alignment: "left" as const, enterStart: 0.05 },
    { chips: CHIPS.slice(half), alignment: "right" as const, enterStart: 0.08 },
  ];

  const layers = await Promise.all(
    columns.map(async (column) => ({
      type: "animation" as const,
      source: await fnUrl(
        "annie",
        "amenity-chips",
        {
          chips: column.chips,
          fontSize,
          frameCount,
          alignment: column.alignment,
          enterStart: column.enterStart,
          enterStagger: 0.04,
          // The gallery never dismisses its chips.
          exitStart: 1,
        } satisfies AmenityChipsProps,
        { width, height },
      ),
    })),
  );

  return effieData({
    width,
    height,
    fps: FPS,
    // Covers are mandatory; a 1×1 brand-coral pixel is poster enough for a
    // developer-facing gallery.
    cover: effieWebUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4bxEDAAPNAZSHRDdFAAAAAElFTkSuQmCC"),
    // The brand coral makes the white pills and tinted glyphs pop.
    background: { type: "color", color: palette.rausch },
    segments: [effieSegment({ duration: DURATION, layers })],
  });
}
