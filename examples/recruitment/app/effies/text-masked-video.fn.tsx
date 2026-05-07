import { z } from "zod";
import { effieData, effieLayer, effieSegment, effieWebUrl } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import { interBlack, loadFonts } from "~/fonts";
import { computeLayout } from "~/cutout";
import type { TextMaskProps } from "~/images/text-mask.fn";

const FPS = 30;
// Fixed cadence between consecutive stage transitions. Stage 0 (orange-only)
// holds for one interval, then each line cutout pops in one interval after
// the previous, regardless of total `duration` — long videos just hold the
// final all-cut stage longer.
const STAGE_INTERVAL_SECONDS = 0.6;

export const propsSchema = z.object({
  jobTitle: z.string(),
  videoUrl: z.string().url(),
  duration: z.number().positive().optional(),
  orangeColor: z.string().optional(),
  cta: z.string().optional(),
});

type TextMaskedVideoProps = z.infer<typeof propsSchema>;

export const previewProps: TextMaskedVideoProps = {
  jobTitle: "Senior Full-Stack Engineer",
  videoUrl: "https://static.effing.dev/examples/recruitment/skyscrapers.mp4",
  duration: 10,
  orangeColor: "#ff3700",
  // orangeColor: "#ff00c8",
  cta: "APPLY NOW >>>",
};

export async function runner({
  props: {
    jobTitle,
    videoUrl,
    duration = 6,
    orangeColor = "#e04300",
    cta = "APPLY NOW >>>",
  },
  bounds: { width, height },
}: RunnerArgs<TextMaskedVideoProps>): EffieRunnerReturn {
  // Compute the layout up here so the effie can decide how many cutout
  // stages to compose. Each stage is a separate `text-mask` image —
  // `linesShown = i` gives the orange overlay with the first `i` items
  // knocked out (title lines first, CTA last) — and the effie cuts hard
  // between them.
  const fontDatas = await loadFonts([interBlack]);
  const layout = computeLayout({
    text: jobTitle.toUpperCase(),
    footer: cta?.toUpperCase(),
    width,
    height,
    fontFamily: "Inter",
    fontDatas,
  });
  const itemCount = layout.items.length;
  const stageCount = itemCount + 1;

  // Schedule: stages are spaced `STAGE_INTERVAL_SECONDS` apart, regardless of
  // total duration. Stage 0 (orange-only) holds for one interval, then each
  // line cutout reveals one interval after the previous. The final stage
  // holds from its reveal time until `duration`.
  const revealAt = (i: number) => i * STAGE_INTERVAL_SECONDS;

  const stagePromises = Array.from({ length: stageCount }, (_, i) =>
    fnUrl(
      "image",
      "text-mask",
      {
        title: jobTitle,
        cta,
        linesShown: i,
        orangeColor,
      } satisfies TextMaskProps,
      { width, height },
    ),
  );
  // Cover reuses the same image fn — passing `underlayColor` switches it to
  // its opaque mode so the thumbnail reads without a video behind it.
  const coverPromise = fnUrl(
    "image",
    "text-mask",
    {
      title: jobTitle,
      cta,
      orangeColor,
      underlayColor: "#1a1a1a",
    } satisfies TextMaskProps,
    { width, height },
  );
  const [cover, ...stageUrls] = await Promise.all([
    coverPromise,
    ...stagePromises,
  ]);

  // Stage i is the only visible layer between revealAt(i) and revealAt(i+1).
  // Hard cut at each boundary — the next line's cutout pops in instantly
  // rather than fading. (Cross-fading consecutive stages dims the orange
  // surface during the transition because two semi-transparent orange
  // layers don't compose to full opacity, so a hard cut is the cleanest
  // way to keep the surface solid.)
  const layers = stageUrls.map((source, i) =>
    effieLayer({
      type: "image",
      source,
      from: revealAt(i),
      until: i < stageCount - 1 ? revealAt(i + 1) : duration,
    }),
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "video", source: effieWebUrl(videoUrl) },
    segments: [effieSegment({ duration, layers })],
  });
}
