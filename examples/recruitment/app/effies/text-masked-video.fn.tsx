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

const REVEAL_SFX_DEFAULT =
  "https://static.effing.dev/examples/recruitment/keyboard-click.mp3";

export const propsSchema = z.object({
  jobTitle: z.string(),
  videoUrl: z.string().url(),
  duration: z.number().positive().optional(),
  orangeColor: z.string().optional(),
  cta: z.string().optional(),
  revealSfxUrl: z.string().url().nullable().optional(),
});

type TextMaskedVideoProps = z.infer<typeof propsSchema>;

export const previewProps: TextMaskedVideoProps = {
  jobTitle: "Senior Full-Stack Engineer",
  videoUrl: "https://static.effing.dev/examples/recruitment/skyscrapers.mp4",
  duration: 10,
  orangeColor: "#ff3700",
  // orangeColor: "#ff00c8",
  cta: "APPLY NOW >>>",
  revealSfxUrl: REVEAL_SFX_DEFAULT,
};

export async function runner({
  props: {
    jobTitle,
    videoUrl,
    duration = 6,
    orangeColor = "#e04300",
    cta = "APPLY NOW >>>",
    revealSfxUrl = REVEAL_SFX_DEFAULT,
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
  const stageDuration = (i: number) =>
    i < stageCount - 1
      ? STAGE_INTERVAL_SECONDS
      : Math.max(0.001, duration - (stageCount - 1) * STAGE_INTERVAL_SECONDS);

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

  // Each stage gets its own segment so we can attach a reveal sfx as the
  // segment's audio. The video stays at the top level (not overridden per
  // segment), which makes FFS play it continuously across the segment cuts
  // — it computes `trim=start=cumulativeTime:duration=segment.duration` per
  // segment slice. The first segment (orange-only opener) gets no sfx since
  // nothing is being revealed yet.
  const sfx = revealSfxUrl
    ? { source: effieWebUrl(revealSfxUrl) }
    : undefined;
  const segments = stageUrls.map((source, i) =>
    effieSegment({
      duration: stageDuration(i),
      layers: [effieLayer({ type: "image", source })],
      ...(i > 0 && sfx ? { audio: sfx } : {}),
    }),
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "video", source: effieWebUrl(videoUrl) },
    segments,
  });
}
