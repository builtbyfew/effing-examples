import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { AnnieRunnerReturn, RunnerArgs } from "@effing/fn";
import { tween, easeOutBack, easeOutCubic } from "@effing/tween";
import { loadFonts, dmSansMedium, dmSansBold } from "~/fonts";
import { palette, fontFamily } from "~/theme";
import type { GlyphName } from "~/components/icons";
import { AnimatedGlyph } from "~/components/animated-icons";
import { designUnit } from "~/components/design-unit";

// Amenity chips as a live overlay on transparent frames. Each chip pops in on
// its own beat — a scale overshoot with a small rise. Once landed, the icons
// run their own intrinsic animations (see animated-icons.tsx): water travels,
// the Wi-Fi signal ripples, steam rises, the snowflake spins — motion designed
// into each glyph, not bolted on.

const chipSchema = z.object({
  label: z.string(),
  icon: z.enum([
    "wifi",
    "pool",
    "ocean",
    "kitchen",
    "ac",
    "parking",
    "beach",
    "pet",
    "guests",
    "bed",
    "bath",
    "pin",
    "heart",
    "star",
  ]),
  accent: z.enum(["lagoon", "coral", "sun"]).optional(),
});

export const propsSchema = z.object({
  chips: z.array(chipSchema).min(1),
  fontSize: z.number().int().min(1),
  frameCount: z.number().int().min(1),
  alignment: z.enum(["left", "center", "right"]).optional(),
  // Timing as fractions of the clip.
  enterStart: z.number().min(0).max(1).optional(),
  enterStagger: z.number().min(0).max(1).optional(),
  exitStart: z.number().min(0).max(1).optional(),
});

export type AmenityChipsProps = z.infer<typeof propsSchema>;

export const previewProps: AmenityChipsProps = {
  chips: [
    { label: "Guest favourite", icon: "heart", accent: "coral" },
    { label: "Private pool", icon: "pool" },
    { label: "Air-con", icon: "ac" },
    { label: "Fast Wi-Fi", icon: "wifi" },
  ],
  fontSize: 38,
  frameCount: 114,
};

// Keys match the chip-accent enum; the brand's teal, coral, and orange as
// icon ink on white chips.
const ACCENT = {
  lagoon: { ink: "#00857a" },
  coral: { ink: palette.rausch },
  sun: { ink: palette.arches },
} as const;

const ALIGN = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const;

// Durations/periods as clip fractions (tuned for a ~3.8 s scene).
const ENTER_DUR = 0.14;
const EXIT_DUR = 0.09;
const LOOP_P = 0.55; // one idle-animation loop (~2.1 s) — icons cycle inside it

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export async function* runner({
  props: {
    chips,
    fontSize,
    frameCount,
    alignment = "left",
    enterStart = 0.18,
    enterStagger = 0.074,
    exitStart = 0.74,
  },
  bounds: { width, height },
}: RunnerArgs<AmenityChipsProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([dmSansMedium, dmSansBold]);
  const u = designUnit(width, height);
  // Proportions in ems of the label size: a slim pill where the text leads and
  // the icon sits bare — no badge circle — so it can run larger and its
  // animation has room to read.
  const padX = Math.round(fontSize * 0.8);
  const padY = Math.round(fontSize * 0.36);
  const iconSize = Math.round(fontSize * 1.25);
  const inset = Math.round(u * 0.085);
  const bottomInset = Math.round(inset + Math.max(0, height - 1350) * 0.18);

  yield* tween(frameCount, async ({ lower: t }) => {
    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: ALIGN[alignment],
          justifyContent: "flex-end",
          paddingLeft: inset,
          paddingRight: inset,
          paddingBottom: bottomInset,
          gap: Math.round(fontSize * 0.6),
        }}
      >
        {chips.map((chip, i) => {
          const accent = ACCENT[chip.accent ?? "lagoon"];
          const start = enterStart + i * enterStagger;
          const popT = clamp01((t - start) / ENTER_DUR);
          const pop = easeOutBack(popT); // overshoots past 1 for a bouncy landing
          const chipScale = lerp(0.6, 1, pop);
          const rise = (1 - easeOutCubic(popT)) * u * 0.05;
          // A touch of reverse stagger on the way out.
          const exitT = clamp01((t - (exitStart + i * 0.02)) / EXIT_DUR);
          const opacity = clamp01(popT / 0.35) * (1 - exitT);
          const drop = exitT * u * 0.02;

          // The icon rides the chip's pop unchanged; once landed, its own
          // intrinsic animation takes over. The phase is passed unwrapped —
          // AnimatedGlyph wraps it for looping icons, while one-shot icons
          // (Wi-Fi) read the raw value and settle.
          const idleT = Math.max(0, t - (start + ENTER_DUR));
          const phase = idleT / LOOP_P;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: Math.round(fontSize * 0.42),
                paddingLeft: Math.round(fontSize * 0.6),
                paddingRight: padX,
                paddingTop: padY,
                paddingBottom: padY,
                backgroundColor: "rgba(255,255,255,0.96)",
                borderRadius: iconSize + padY * 2,
                boxShadow: "0 6px 18px rgba(34,34,34,0.18)",
                opacity,
                transform: `translateY(${rise + drop}px) scale(${chipScale * (1 - 0.1 * exitT)})`,
                transformOrigin: "center center",
              }}
            >
              <AnimatedGlyph
                icon={chip.icon as GlyphName}
                size={iconSize}
                color={accent.ink}
                phase={phase}
                strokeWidth={2.1}
              />
              <div
                style={{
                  display: "flex",
                  fontFamily: fontFamily.body,
                  fontWeight: 700,
                  fontSize,
                  color: palette.ink,
                  whiteSpace: "nowrap",
                }}
              >
                {chip.label}
              </div>
            </div>
          );
        })}
      </div>,
      { fonts },
    );
    // Transparent overlay frames — PNG for alpha and crisp chip edges.
    return canvas.encode("png");
  });
}
