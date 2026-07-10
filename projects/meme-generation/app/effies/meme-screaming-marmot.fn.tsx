import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { MemeTopBottomProps } from "~/images/meme-top-bottom.fn";
import type { MemeTopBottomCaptionProps } from "~/annies/meme-top-bottom-caption.fn";

export const propsSchema = z.object({
  // One entry per scream, in clip order: the caption text and the matching
  // voice line. `audioLead` is the MP3's leading silence in seconds — the
  // scream's segment starts that much early so the voice onset lands exactly
  // on the mouth opening. It must stay below the first scream's start time
  // (0.4 s), hence the cap.
  screams: z
    .array(
      z.object({
        caption: z.string(),
        audioUrl: z.string().url(),
        audioLead: z.number().min(0).max(0.3).optional(),
      }),
    )
    .length(3)
    .optional(),
});
type MemeScreamingMarmotProps = z.infer<typeof propsSchema>;

const DEFAULT_SCREAMS = [
  {
    caption: "Pixels!",
    audioUrl: "https://static.effing.dev/elevenlabs/marmot/marmot_pixels.mp3",
    audioLead: 0.16,
  },
  {
    caption: "Frames!",
    audioUrl: "https://static.effing.dev/elevenlabs/marmot/marmot_frames.mp3",
    audioLead: 0,
  },
  {
    caption: "Effing videos!",
    audioUrl:
      "https://static.effing.dev/elevenlabs/marmot/marmot_effing_videos.mp3",
    audioLead: 0.14,
  },
];

export const previewProps: MemeScreamingMarmotProps = {
  screams: DEFAULT_SCREAMS,
};

const FPS = 30;

// The screaming marmot clip (750×500, 12.5 fps, 6.16 s) plays as the video
// background, which FFS cover-scales and center-crops — the marmot stays in
// frame at every scream from 4:5 up to 16:9. It contains three shots, each
// with exactly one scream; `start` is when the mouth opens, `shotCut` where
// the clip cuts to the next shot. One caption per scream: revealed the moment
// the scream starts, hidden again at the cut, so each line replaces the
// previous one subtitle-style.
const VIDEO_URL =
  "https://media4.giphy.com/media/R8rRQmDIewbRPeJl0H/giphy-hd.mp4";
const STILL_URL =
  "https://media4.giphy.com/media/R8rRQmDIewbRPeJl0H/480w_s.jpg";
const CLIP_DURATION = 6.16;
const SCREAM_TIMINGS = [
  { start: 0.4, shotCut: 2.16 },
  { start: 2.6, shotCut: 4.48 },
  { start: 4.85, shotCut: CLIP_DURATION },
];

// FFS plays segment audio from the segment's start (the per-segment audio
// `seek` field is not applied), so the timeline is split at the screams
// rather than at the shot cuts. The default last voice line (2.08 s)
// outlasts what remains of the clip, so the final segment runs past the
// clip end and the cover card holds as an outro while the scream rings out
// (also hiding the background video wrapping around to the first shot).
// Voice lines up to ~2.35 s fit before the outro ends.
const OUTRO_SECONDS = 0.92;

export async function runner({
  props: { screams = DEFAULT_SCREAMS },
  bounds: { width, height },
}: RunnerArgs<MemeScreamingMarmotProps>): EffieRunnerReturn {
  const [cover, ...captionAnnies] = await Promise.all([
    // Cover = the clip's poster still with the punchline, in the project's
    // usual letterboxed-over-blurred-fill treatment. Doubles as the outro
    // card of the final segment.
    fnUrl(
      "image",
      "meme-top-bottom",
      {
        imageUrl: STILL_URL,
        bottomText: screams[2].caption,
      } satisfies MemeTopBottomProps,
      { width, height },
    ),
    ...SCREAM_TIMINGS.map(({ start, shotCut }, i) => {
      const windowSeconds = shotCut - start;
      return fnUrl(
        "annie",
        "meme-top-bottom-caption",
        {
          text: screams[i].caption,
          fontSize: Math.round(width * 0.105),
          anchor: "bottom",
          offsetY: Math.round(height * 0.06),
          paddingX: Math.round(width * 0.035),
          startDelayFrac: 0,
          revealFrac: Math.min(1, 0.35 / windowSeconds),
          frameCount: Math.round(windowSeconds * FPS),
        } satisfies MemeTopBottomCaptionProps,
        { width, height },
      );
    }),
  ]);

  const audioLeads = screams.map(({ audioLead }) => audioLead ?? 0);
  const segmentStarts = SCREAM_TIMINGS.map(
    ({ start }, i) => start - audioLeads[i],
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    sources: { marmot: VIDEO_URL },
    background: { type: "color", color: "#101018" },
    segments: [
      // Lead-in before the first scream's audio starts.
      effieSegment({
        duration: segmentStarts[0],
        background: { type: "video", source: "#marmot" },
        layers: [],
      }),
      ...SCREAM_TIMINGS.map(({ shotCut }, i) => {
        const segmentStart = segmentStarts[i];
        const segmentEnd =
          i < SCREAM_TIMINGS.length - 1
            ? segmentStarts[i + 1]
            : CLIP_DURATION + OUTRO_SECONDS;
        return effieSegment({
          duration: segmentEnd - segmentStart,
          background: {
            type: "video",
            source: "#marmot",
            seek: segmentStart,
          },
          audio: { source: effieWebUrl(screams[i].audioUrl) },
          layers: [
            {
              type: "animation",
              source: captionAnnies[i],
              delay: audioLeads[i],
              until: shotCut - segmentStart,
            },
            ...(i === SCREAM_TIMINGS.length - 1
              ? [
                  {
                    type: "image" as const,
                    source: cover,
                    from: CLIP_DURATION - segmentStart,
                  },
                ]
              : []),
          ],
        });
      }),
    ],
  });
}
