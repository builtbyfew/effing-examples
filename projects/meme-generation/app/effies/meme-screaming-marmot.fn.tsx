import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { MemePhotoCaptionProps } from "~/images/meme-photo-caption.fn";
import type { MemeTopBottomCaptionProps } from "~/annies/meme-top-bottom-caption.fn";

export const propsSchema = z.object({
  // One entry per scream, in clip order: the caption text and optionally a
  // matching voice line (omit `audioUrl` for a silent scream). `audioLead`
  // is the MP3's leading silence in seconds — the scream's segment starts
  // that much early so the voice onset lands exactly on the mouth opening.
  // It must stay below the first scream's start time (0.4 s), hence the cap.
  screams: z
    .array(
      z.object({
        caption: z.string(),
        audioUrl: z.string().url().optional(),
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
    // Sped up 1.4× (ffmpeg atempo) from marmot_effing_videos.mp3 so the
    // scream finishes right at the clip end.
    audioUrl:
      "https://static.effing.dev/elevenlabs/marmot/marmot_effing_videos_fast.mp3",
    audioLead: 0.09,
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
// rather than at the shot cuts. The video ends exactly at the clip end,
// and each default voice line finishes before its segment does.

export async function runner({
  props: { screams = DEFAULT_SCREAMS },
  bounds: { width, height },
}: RunnerArgs<MemeScreamingMarmotProps>): EffieRunnerReturn {
  // Shared by the caption annies and the cover so the caption sits in the
  // same spot everywhere.
  const captionLayout = {
    fontSize: Math.round(width * 0.105),
    offsetY: Math.round(height * 0.06),
    paddingX: Math.round(width * 0.035),
  };

  const [cover, ...captionAnnies] = await Promise.all([
    // Cover = the clip's poster still with the punchline, cover-cropped
    // full-bleed like the video itself.
    fnUrl(
      "image",
      "meme-photo-caption",
      {
        imageUrl: STILL_URL,
        caption: screams[2].caption,
        ...captionLayout,
      } satisfies MemePhotoCaptionProps,
      { width, height },
    ),
    ...SCREAM_TIMINGS.map(({ start, shotCut }, i) => {
      const windowSeconds = shotCut - start;
      return fnUrl(
        "annie",
        "meme-top-bottom-caption",
        {
          text: screams[i].caption,
          anchor: "bottom",
          ...captionLayout,
          startDelayFrac: 0,
          revealFrac: Math.min(1, 0.35 / windowSeconds),
          frameCount: Math.round(windowSeconds * FPS),
        } satisfies MemeTopBottomCaptionProps,
        { width, height },
      );
    }),
  ]);

  const audioLeads = screams.map(({ audioUrl, audioLead }) =>
    audioUrl ? (audioLead ?? 0) : 0,
  );
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
        const isLast = i === SCREAM_TIMINGS.length - 1;
        const segmentStart = segmentStarts[i];
        const segmentEnd = isLast ? CLIP_DURATION : segmentStarts[i + 1];
        const audioUrl = screams[i].audioUrl;
        return effieSegment({
          duration: segmentEnd - segmentStart,
          background: {
            type: "video",
            source: "#marmot",
            seek: segmentStart,
          },
          ...(audioUrl ? { audio: { source: effieWebUrl(audioUrl) } } : {}),
          layers: [
            {
              type: "animation",
              source: captionAnnies[i],
              delay: audioLeads[i],
              until: shotCut - segmentStart,
            },
          ],
        });
      }),
    ],
  });
}
