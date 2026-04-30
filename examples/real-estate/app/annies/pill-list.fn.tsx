import { z } from "zod";
import { manropeSemiBold, manropeBold, loadFonts } from "~/fonts";
import { tween, easeOutBack, easeOutQuad } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { palette, fontFamily } from "~/theme";

const pillSchema = z.object({
  text: z.string(),
  variant: z.enum(["dark", "light"]).optional(),
});

export const propsSchema = z.object({
  pills: z.array(pillSchema),
  fontSize: z.number().int().min(1),
  totalFrameCount: z.number().int().min(1),
  staggerFrameCount: z.number().int().min(1).optional(),
  slideFrameCount: z.number().int().min(1).optional(),
  horizontalAlignment: z.enum(["left", "center", "right"]).optional(),
  verticalAlignment: z.enum(["top", "center", "bottom"]).optional(),
});

export type PillListProps = z.infer<typeof propsSchema>;
type Pill = z.infer<typeof pillSchema>;

export const previewProps: PillListProps = {
  pills: [
    { text: "New Listing", variant: "dark" },
    { text: "Los Angeles, CA 90045", variant: "light" },
  ],
  fontSize: 36,
  totalFrameCount: 90,
  staggerFrameCount: 12,
  slideFrameCount: 12,
};

export async function* runner({
  props: {
    pills,
    fontSize,
    totalFrameCount,
    staggerFrameCount = 12,
    slideFrameCount = 12,
    horizontalAlignment = "left",
    verticalAlignment = "bottom",
  },
  bounds: { width, height },
}: RunnerArgs<PillListProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([manropeSemiBold, manropeBold]);
  const timings = computeTimings(
    pills.length,
    staggerFrameCount,
    slideFrameCount,
  );
  yield* tween(totalFrameCount, async (_interval, frame) => {
    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <PillListOverlay
        pills={pills}
        fontSize={fontSize}
        progresses={timings.map((t) => progressFor(frame, t))}
        horizontalAlignment={horizontalAlignment}
        verticalAlignment={verticalAlignment}
        width={width}
        height={height}
      />,
      { fonts },
    );
    return canvas.encode("png");
  });
}

type PillTiming = { start: number; slide: number };

// Per-pill timing multipliers around 1.0, cycled if there are more pills than
// entries. Breaks the metronomic feel of evenly-spaced staggers — pills arrive
// in a syncopated rhythm with slightly varied settle paces.
const STAGGER_WOBBLE = [0.8, 1.3, 0.9, 1.15, 0.95, 1.1];
const SLIDE_WOBBLE = [1.0, 0.82, 1.18, 0.92, 1.08, 0.95];

function computeTimings(
  count: number,
  baseStagger: number,
  baseSlide: number,
): PillTiming[] {
  const timings: PillTiming[] = [];
  let start = 0;
  for (let i = 0; i < count; i++) {
    if (i > 0) {
      start += baseStagger * STAGGER_WOBBLE[(i - 1) % STAGGER_WOBBLE.length];
    }
    timings.push({
      start,
      slide: baseSlide * SLIDE_WOBBLE[i % SLIDE_WOBBLE.length],
    });
  }
  return timings;
}

function progressFor(frame: number, { start, slide }: PillTiming): number {
  return Math.max(0, Math.min(1, (frame - start) / slide));
}

// Cover image reuses this with all progresses = 1 for a static frame.
export function PillListOverlay({
  pills,
  fontSize,
  progresses,
  horizontalAlignment,
  verticalAlignment,
  width,
  height,
}: {
  pills: Pill[];
  fontSize: number;
  progresses: number[];
  horizontalAlignment: "left" | "center" | "right";
  verticalAlignment: "top" | "center" | "bottom";
  width: number;
  height: number;
}) {
  const pillPaddingX = Math.round(fontSize * 0.85);
  const pillPaddingY = Math.round(fontSize * 0.42);
  const slideDistance = Math.round(width * 0.4);
  const liftDistance = Math.round(fontSize * 1.4);

  // TikTok-style safe zone: at portrait 9:16 (~1920 tall) the bottom UI
  // (caption, action rail, etc.) eats a big slice; shorter aspect ratios
  // collapse the extra inset back to a uniform 80px.
  const verticalityFactor = Math.max(0, height - 1350) / 570;
  const safety = {
    top: 80 + Math.round(verticalityFactor * 172),
    left: 80 + Math.round(verticalityFactor * 40),
    right: 80 + Math.round(verticalityFactor * 160),
    bottom: 80 + Math.round(verticalityFactor * 560),
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: ALIGN_ITEMS[horizontalAlignment],
        justifyContent: JUSTIFY_CONTENT[verticalAlignment],
        paddingTop: safety.top,
        paddingLeft: safety.left,
        paddingRight: safety.right,
        paddingBottom: safety.bottom,
        gap: Math.round(fontSize * 0.7),
      }}
    >
      {pills.map((pill, i) => {
        const back = easeOutBack(progresses[i]);
        const opacity = easeOutQuad(progresses[i]);
        const isDark = pill.variant === "dark";
        const transform = `translate(${(1 - back) * -slideDistance}px, ${(1 - back) * liftDistance}px) rotate(${(1 - back) * -10}deg) scale(${0.4 + 0.6 * back})`;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              transform,
              transformOrigin: "left center",
              opacity,
              backgroundColor: isDark ? palette.charcoal : palette.cream,
              color: isDark ? palette.cream : palette.charcoal,
              fontFamily: fontFamily.body,
              fontSize,
              fontWeight: isDark ? 700 : 600,
              letterSpacing: isDark ? fontSize * 0.04 : fontSize * 0.01,
              paddingLeft: pillPaddingX,
              paddingRight: pillPaddingX,
              paddingTop: pillPaddingY,
              paddingBottom: pillPaddingY,
              borderRadius: fontSize * 2,
              boxShadow: isDark
                ? "0 10px 28px rgba(20, 18, 18, 0.28)"
                : "0 8px 24px rgba(20, 18, 18, 0.14)",
              whiteSpace: "nowrap",
            }}
          >
            {pill.text}
          </div>
        );
      })}
    </div>
  );
}

const ALIGN_ITEMS = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const;

const JUSTIFY_CONTENT = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end",
} as const;
