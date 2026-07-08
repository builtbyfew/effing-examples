import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { AnnieRunnerReturn, RunnerArgs } from "@effing/fn";
import {
  tween,
  easeInBack,
  easeInCubic,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
} from "@effing/tween";
import { loadFonts, spaceGroteskBold, spaceGroteskMedium } from "~/fonts";
import { fontFamily, palette } from "~/theme";
import { sparklePath } from "~/components/spark-logo";

// Opening brand sting for the fictional recruitment agency "Talentspark".
// The full lockup is already there on frame 0 — a paused player shows the
// brand, not an empty field. As the track starts, the lockup winds itself
// back in (the pop in reverse) and then POPS — overshoot scale, quarter
// spin, the wordmark rising beneath — landing exactly on the first music
// beat. It holds with a gentle pulse that nods on each beat, then the
// sparkle winds up and collapses to nothing — vanishing on the cut —
// leaving a clean red field for the kinetic type that follows.

export const propsSchema = z.object({
  frameCount: z.number().int().min(1),
  // Fraction of the clip at which the exit begins.
  exitStart: z.number().min(0).max(1).optional(),
  // Music beat positions as fractions of the clip — the mark pulses on
  // each one.
  beats: z.array(z.number().min(0).max(1)).optional(),
  // Fraction of the clip where the track's second "swoosh" peaks — the
  // star answers it with a full swirl that completes right there.
  swirl: z.number().min(0).max(1).optional(),
});

export type LogoIntroProps = z.infer<typeof propsSchema>;

export const previewProps: LogoIntroProps = {
  frameCount: 79,
  exitStart: 0.664,
  beats: [0.158, 0.326, 0.494, 0.664, 0.832],
  swirl: 0.561,
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const bell = (t: number, centre: number, width: number) =>
  Math.exp(-Math.pow((t - centre) / width, 2));

export async function* runner({
  props: { frameCount, exitStart = 0.68, beats = [], swirl },
  bounds: { width, height },
}: RunnerArgs<LogoIntroProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([spaceGroteskBold, spaceGroteskMedium]);
  const u = Math.min(width, height);

  const markSize = u * 0.3;
  const wordFont = Math.round(u * 0.105);
  const tagFont = Math.round(u * 0.028);
  const markGap = u * 0.045;
  const tagGap = u * 0.035;

  // Analytic vertical layout so the mark can scale around its own centre.
  const lockupH = markSize + markGap + wordFont + tagGap + tagFont * 1.2;
  const markTop = (height - lockupH) / 2;
  const markCx = width / 2;
  const markCy = markTop + markSize / 2;

  yield* tween(frameCount, async ({ lower: t }) => {
    // --- Mark timeline: wind-in right away → pop IMPACTING on the first
    //     beat → pulsing hold → wind-up and collapse on the cut. ---------
    // The motion leads the music: the wind-in bottoms out on the off-beat
    // and the pop launches from there, so the overshoot impact — not the
    // start of the motion — is what sits on beat one.
    const popImpact = beats[0] ?? 0.16;
    const popBegin = Math.max(0.02, popImpact - 0.075);
    const anticStart = Math.max(0.01, popBegin - 0.07);
    const exitT = clamp01((t - exitStart) / (0.97 - exitStart));

    const antic = easeInCubic(
      clamp01((t - anticStart) / (popBegin - anticStart)),
    );
    const pop = easeOutBack(clamp01((t - popBegin) / 0.15));
    const enter = t < popBegin ? 1 - antic : pop;

    // Anticipation on exit too: swell briefly, then collapse hard to zero
    // just before the clip ends, so the disappearance lands on the cut.
    const swell = exitT > 0 ? 0.14 * Math.sin(Math.PI * clamp01(exitT / 0.35)) : 0;
    const collapse = 1 - easeInBack(clamp01((exitT - 0.25) / 0.75));
    // A gentle float, nodding a little harder on each music beat.
    let beatP = 0;
    for (const b of beats) {
      if (b <= popImpact || b > exitStart) continue;
      beatP = Math.max(beatP, bell(t, b, 0.035));
    }
    // The star answers the track's second swoosh with a full swirl that
    // rides the riser and completes at its peak, leaning in mid-spin
    // (a touch smaller and slimmer) like it's cutting through air.
    const swirlP =
      swirl !== undefined
        ? easeInOutCubic(clamp01((t - (swirl - 0.14)) / 0.14))
        : 0;
    const lean = Math.sin(Math.PI * swirlP);

    const idlePulse = 1 + 0.02 * Math.sin(t * Math.PI * 4) + 0.05 * beatP;
    const markScale = Math.max(
      0,
      enter * idlePulse * (1 - 0.07 * lean) * (collapse + swell),
    );
    // A quarter spin through the pop, a slow drift while idle, the swoosh
    // swirl, and an accelerating wind-up on exit.
    const rotation =
      -80 * (1 - enter) +
      14 * t +
      360 * swirlP +
      200 * Math.pow(clamp01(exitT), 2);
    // The star slims while swirling and as it spins away.
    const plump = 0.18 - 0.05 * lean - 0.06 * clamp01(exitT);
    const twinkle =
      (t < popBegin ? 1 - antic : clamp01((t - popBegin - 0.06) / 0.08)) *
      (1 - clamp01(exitT * 2.2)) *
      (0.75 + 0.25 * Math.sin(t * Math.PI * 7));

    // --- Wordmark and tagline: dip away with the wind-in, then rise back
    //     to LAND on the second beat — the mark owns beat one, the text
    //     beat two — and sink away on exit. The rise uses a back-ease so
    //     the landing bounces like a hit; its overshoot peak (≈70% into
    //     the window) is what sits on the beat. ---------------------------
    const wordLand = beats[1] ?? popImpact + 0.17;
    const wordProg =
      t < popBegin ? 0 : clamp01((t - (wordLand - 0.09)) / 0.13);
    const tagProg =
      t < popBegin ? 0 : clamp01((t - (wordLand - 0.04)) / 0.13);
    const textOut = easeOutCubic(clamp01(exitT / 0.55));
    const wordAlpha =
      (t < popBegin ? 1 - antic : easeOutCubic(wordProg)) * (1 - textOut);
    const tagAlpha =
      (t < popBegin ? 1 - antic : easeOutCubic(tagProg)) * (1 - textOut);
    const wordRise =
      (t < popBegin ? antic : 1 - easeOutBack(wordProg)) * u * 0.04 +
      textOut * u * 0.06;
    const tagRise =
      (t < popBegin ? antic : 1 - easeOutBack(tagProg)) * u * 0.04 +
      textOut * u * 0.08;

    const r = (markSize / 2) * 0.84 * markScale;

    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <div style={{ position: "relative", width, height, display: "flex" }}>
        {/* Flat red field. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            display: "flex",
            backgroundColor: palette.ember,
          }}
        />

        {/* The sparkle mark, drawn full-frame so scaling stays centred. */}
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          stroke="none"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          {r > 0.5 && (
            <g
              transform={`rotate(${rotation.toFixed(2)} ${markCx} ${markCy.toFixed(1)})`}
            >
              <path
                d={sparklePath(markCx, markCy, r, plump)}
                fill={palette.spark}
              />
            </g>
          )}
          <circle
            cx={markCx + markSize * 0.38}
            cy={markCy - markSize * 0.34}
            r={markSize * 0.045}
            fill={palette.spark}
            fillOpacity={twinkle}
          />
          <circle
            cx={markCx - markSize * 0.4}
            cy={markCy + markSize * 0.3}
            r={markSize * 0.03}
            fill={palette.spark}
            fillOpacity={twinkle}
          />
        </svg>

        {/* Wordmark + tagline below the mark's box. */}
        <div
          style={{
            position: "absolute",
            top: markTop + markSize + markGap,
            left: 0,
            width,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: fontFamily.display,
              fontWeight: 700,
              fontSize: wordFont,
              lineHeight: 1,
              color: `rgba(255, 246, 233, ${wordAlpha.toFixed(3)})`,
              transform: `translateY(${wordRise.toFixed(1)}px)`,
            }}
          >
            talent
            <span style={{ color: `rgba(255, 201, 60, ${wordAlpha.toFixed(3)})` }}>
              spark
            </span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: tagGap,
              fontFamily: fontFamily.display,
              fontWeight: 500,
              fontSize: tagFont,
              letterSpacing: tagFont * 0.38,
              textTransform: "uppercase",
              color: `rgba(255, 246, 233, ${(0.8 * tagAlpha).toFixed(3)})`,
              transform: `translateY(${tagRise.toFixed(1)}px)`,
            }}
          >
            we find your spark
          </div>
        </div>
      </div>,
      { fonts },
    );
    // Flat vector shapes and text on a solid field — PNG keeps edges crisp.
    return canvas.encode("png");
  });
}
