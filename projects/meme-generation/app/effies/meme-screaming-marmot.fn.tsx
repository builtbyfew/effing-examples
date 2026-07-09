import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { MemeTopBottomProps } from "~/images/meme-top-bottom.fn";
import type { MemeTopBottomCaptionProps } from "~/annies/meme-top-bottom-caption.fn";

export const propsSchema = z.object({
  // One caption per scream, in clip order.
  captions: z.array(z.string()).length(3).optional(),
});
type MemeScreamingMarmotProps = z.infer<typeof propsSchema>;

const DEFAULT_CAPTIONS = ["Pixels!", "Frames!", "Effing videos!"];

export const previewProps: MemeScreamingMarmotProps = {
  captions: DEFAULT_CAPTIONS,
};

const FPS = 30;

// The screaming marmot clip (750×500, 12.5 fps, 6.16 s) plays as the video
// background, which FFS cover-scales and center-crops — the marmot stays in
// frame at every scream in both 1:1 and 4:5. It contains three shots, each
// with exactly one scream; `start` is when the mouth opens, `until` the shot
// cut. One caption per scream: revealed the moment the scream starts, hidden
// again at the cut, so each line replaces the previous one subtitle-style.
const VIDEO_URL =
  "https://media4.giphy.com/media/R8rRQmDIewbRPeJl0H/giphy-hd.mp4";
const STILL_URL =
  "https://media4.giphy.com/media/R8rRQmDIewbRPeJl0H/480w_s.jpg";
const CLIP_DURATION = 6.16;
const SCREAMS = [
  { start: 0.4, until: 2.16 },
  { start: 2.6, until: 4.48 },
  { start: 4.85, until: CLIP_DURATION },
];
const CAPTION_REVEAL_SECONDS = 0.35;

export async function runner({
  props: { captions = DEFAULT_CAPTIONS },
  bounds: { width, height },
}: RunnerArgs<MemeScreamingMarmotProps>): EffieRunnerReturn {
  const [cover, ...captionAnnies] = await Promise.all([
    // Cover = the clip's poster still with the punchline, in the project's
    // usual letterboxed-over-blurred-fill treatment.
    fnUrl(
      "image",
      "meme-top-bottom",
      {
        imageUrl: STILL_URL,
        bottomText: captions[2],
      } satisfies MemeTopBottomProps,
      { width, height },
    ),
    ...SCREAMS.map(({ start, until }, i) => {
      const windowSeconds = until - start;
      return fnUrl(
        "annie",
        "meme-top-bottom-caption",
        {
          text: captions[i],
          fontSize: Math.round(width * 0.105),
          anchor: "bottom",
          offsetY: Math.round(height * 0.06),
          paddingX: Math.round(width * 0.035),
          startDelayFrac: 0,
          revealFrac: Math.min(1, CAPTION_REVEAL_SECONDS / windowSeconds),
          frameCount: Math.round(windowSeconds * FPS),
        } satisfies MemeTopBottomCaptionProps,
        { width, height },
      );
    }),
  ]);

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "video", source: VIDEO_URL },
    segments: [
      effieSegment({
        duration: CLIP_DURATION,
        layers: SCREAMS.map(({ start, until }, i) => ({
          type: "animation" as const,
          source: captionAnnies[i],
          delay: start,
          until,
        })),
      }),
    ],
  });
}
