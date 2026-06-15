import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { AnnieRunnerReturn, RunnerArgs } from "@effing/fn";
import { tween, easeOutBack, easeOutCubic } from "@effing/tween";
import {
  caveatBold,
  loadFonts,
  spaceGroteskBold,
} from "~/fonts";
import { fontFamily, palette } from "~/theme";
import { SparkLockup, sparklePath } from "~/components/spark-logo";

// The closing card: a handwritten "Apply now" swings in big and yellow,
// the second line follows underneath, sparkles twinkle around the frame,
// and the Talentspark lockup signs off at the bottom.

export const propsSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().min(1),
  frameCount: z.number().int().min(1),
  // Beat duration as a fraction of the clip — the reveals step in beat by
  // beat and the sparkles twinkle on half-beats (the segment starts on a
  // beat).
  beat: z.number().min(0.02).max(1).optional(),
});

export type CtaCardProps = z.infer<typeof propsSchema>;

export const previewProps: CtaCardProps = {
  line1: "Apply now",
  line2: "& tell us your story",
  frameCount: 89,
  beat: 0.149,
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// Fixed sparkle positions (fractions of the frame), sizes, and the
// half-beat each one ignites on — scattered by hand to keep clear of the
// text block. Each sparkle blinks exactly once and is gone; ignitions stay
// within the first 1.5 beats so the frame is sparkle-free by the time the
// lockup signs off on beat 2.
const SPARKLES = [
  { x: 0.16, y: 0.18, s: 0.045, halfBeat: 1 },
  { x: 0.84, y: 0.14, s: 0.03, halfBeat: 1 },
  { x: 0.88, y: 0.46, s: 0.055, halfBeat: 2 },
  { x: 0.1, y: 0.55, s: 0.035, halfBeat: 2 },
  { x: 0.78, y: 0.78, s: 0.04, halfBeat: 3 },
  { x: 0.2, y: 0.84, s: 0.028, halfBeat: 3 },
];

export async function* runner({
  props: { line1, line2, frameCount, beat = 0.149 },
  bounds: { width, height },
}: RunnerArgs<CtaCardProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([caveatBold, spaceGroteskBold]);
  const u = Math.min(width, height);

  yield* tween(frameCount, async ({ lower: t }) => {
    // Reveals step in beat by beat: the big line on the downbeat the
    // segment opens with, the second line a beat later, the sign-off after.
    const line1In = easeOutBack(clamp01((t - 0.02) / 0.14));
    const line2In = easeOutCubic(clamp01((t - beat) / 0.14));
    const lockupIn = easeOutCubic(clamp01((t - 2 * beat) / 0.16));
    const wobble = Math.sin(t * Math.PI * 3) * 1.2;

    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <div style={{ position: "relative", width, height, display: "flex" }}>
        {/* Twinkling sparkles around the frame. */}
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          stroke="none"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          {SPARKLES.map((sp, i) => {
            // One blink: pop in over the first third of the life, fade out
            // over the rest, then gone for good.
            const life = 0.55 * beat;
            const p = (t - sp.halfBeat * (beat / 2)) / life;
            if (p <= 0 || p >= 1) return null;
            const pop = easeOutBack(clamp01(p / 0.3));
            const fade = 1 - clamp01((p - 0.45) / 0.55);
            const r = sp.s * u * pop;
            return (
              <path
                key={i}
                d={sparklePath(sp.x * width, sp.y * height, r, 0.2)}
                fill={palette.spark}
                fillOpacity={fade}
              />
            );
          })}
        </svg>

        {/* Handwritten CTA, tilted like a marker scrawl. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height: height * 0.86,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: fontFamily.script,
              fontWeight: 700,
              fontSize: u * 0.19,
              lineHeight: 1,
              color: palette.spark,
              opacity: line1In > 0 ? 1 : 0,
              transform: `rotate(${(-5 + wobble).toFixed(2)}deg) scale(${Math.max(0, line1In).toFixed(3)})`,
            }}
          >
            {line1}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: u * 0.015,
              fontFamily: fontFamily.script,
              fontWeight: 700,
              fontSize: u * 0.085,
              lineHeight: 1,
              color: palette.cream,
              opacity: line2In,
              transform: `rotate(-5deg) translateY(${((1 - line2In) * u * 0.03).toFixed(1)}px)`,
            }}
          >
            {line2}
          </div>
        </div>

        {/* Brand sign-off. */}
        <div
          style={{
            position: "absolute",
            bottom: height * 0.08,
            left: 0,
            width,
            display: "flex",
            justifyContent: "center",
            opacity: lockupIn,
          }}
        >
          <SparkLockup markSize={u * 0.055} />
        </div>
      </div>,
      { fonts },
    );
    return canvas.encode("png");
  });
}
