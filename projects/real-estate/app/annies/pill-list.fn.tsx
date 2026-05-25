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
  entryFrameCount: z.number().int().min(1).optional(),
  horizontalAlignment: z.enum(["left", "center", "right"]).optional(),
  verticalAlignment: z.enum(["top", "center", "bottom"]).optional(),
});

export type PillListProps = z.infer<typeof propsSchema>;
type Pill = z.infer<typeof pillSchema>;

export const previewProps: PillListProps = {
  pills: [
    { text: "JUST LISTED", variant: "dark" },
    { text: "Washington, DC", variant: "light" },
  ],
  fontSize: 36,
  totalFrameCount: 120,
  staggerFrameCount: 12,
  entryFrameCount: 30,
};

export async function* runner({
  props: {
    pills,
    fontSize,
    totalFrameCount,
    staggerFrameCount = 12,
    entryFrameCount = 30,
    horizontalAlignment = "left",
    verticalAlignment = "bottom",
  },
  bounds: { width, height },
}: RunnerArgs<PillListProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([manropeSemiBold, manropeBold]);
  const timings = computeTimings(
    pills.length,
    staggerFrameCount,
    entryFrameCount,
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

type PillTiming = { start: number; duration: number };

// Per-pill timing multipliers around 1.0, cycled if there are more pills than
// entries. Breaks the metronomic feel of evenly-spaced staggers — pills arrive
// in a syncopated rhythm with slightly varied entry paces.
const STAGGER_WOBBLE = [0.8, 1.3, 0.9, 1.15, 0.95, 1.1];
const DURATION_WOBBLE = [1.0, 0.92, 1.08, 0.95, 1.05, 0.98];

function computeTimings(
  count: number,
  baseStagger: number,
  baseDuration: number,
): PillTiming[] {
  const timings: PillTiming[] = [];
  let start = 0;
  for (let i = 0; i < count; i++) {
    if (i > 0) {
      start += baseStagger * STAGGER_WOBBLE[(i - 1) % STAGGER_WOBBLE.length];
    }
    timings.push({
      start,
      duration: baseDuration * DURATION_WOBBLE[i % DURATION_WOBBLE.length],
    });
  }
  return timings;
}

function progressFor(frame: number, { start, duration }: PillTiming): number {
  return Math.max(0, Math.min(1, (frame - start) / duration));
}

// Cover / static-frame consumers pass 1 per pill for a fully-settled frame.
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
  const pillHeight = fontSize + pillPaddingY * 2;

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
        const progress = progresses[i];
        const isDark = pill.variant === "dark";

        // The entry is one continuous motion split into overlapping sub-curves:
        // the pill is thrown in (translate + rotate, bouncy easeOutBack) over
        // the first ~45%, and unfurls horizontally (width grows on easeOutQuad)
        // from ~20% through ~85%. The overlap kills the dead beat where the
        // small circle would otherwise sit still before starting to widen.
        const slideSubProgress = Math.min(1, progress / 0.45);
        const back = easeOutBack(slideSubProgress);
        const opacity = easeOutQuad(Math.min(1, progress / 0.25));
        const transform = `translate(${(1 - back) * -slideDistance}px, ${(1 - back) * liftDistance}px) rotate(${(1 - back) * -10}deg)`;

        const growEased = easeOutQuad(
          Math.max(0, Math.min(1, (progress - 0.2) / 0.65)),
        );

        // Text fades in only once the pill has grown wide enough to contain it.
        // Earlier overflow is clipped by overflow:hidden, so the text never
        // escapes a narrow pill.
        const textOpacity = easeOutQuad(
          Math.max(0, Math.min(1, (progress - 0.75) / 0.25)),
        );

        const sharedTextStyle = {
          whiteSpace: "nowrap" as const,
          fontFamily: fontFamily.body,
          fontSize,
          fontWeight: isDark ? 700 : 600,
          letterSpacing: isDark ? fontSize * 0.04 : fontSize * 0.01,
          paddingLeft: pillPaddingX,
          paddingRight: pillPaddingX,
          paddingTop: pillPaddingY,
          paddingBottom: pillPaddingY,
        };

        return (
          <div
            key={i}
            style={{
              display: "flex",
              transform,
              transformOrigin: "left center",
              opacity,
            }}
          >
            <div style={{ position: "relative", display: "flex" }}>
              {/* Placeholder sets the natural pill width via the text it
                  contains; the visible pill below is sized as a % of it. */}
              <div
                style={{
                  ...sharedTextStyle,
                  display: "flex",
                  opacity: 0,
                  color: "transparent",
                }}
              >
                {pill.text}
              </div>
              {/* Visible pill — width grows from a circle (minWidth) to the
                  full natural width set by the placeholder. */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${growEased * 100}%`,
                  minWidth: pillHeight,
                  display: "flex",
                  overflow: "hidden",
                  backgroundColor: isDark ? palette.charcoal : palette.cream,
                  color: isDark ? palette.cream : palette.charcoal,
                  borderRadius: fontSize * 2,
                  boxShadow: isDark
                    ? "0 10px 28px rgba(20, 18, 18, 0.28)"
                    : "0 8px 24px rgba(20, 18, 18, 0.14)",
                }}
              >
                <div style={{ ...sharedTextStyle, opacity: textOpacity }}>
                  {pill.text}
                </div>
              </div>
            </div>
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
