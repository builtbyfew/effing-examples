import { z } from "zod";
import invariant from "tiny-invariant";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { SubtitleCueProps } from "~/annies/subtitle-cue.fn";
import type { SubtitleCoverProps } from "~/images/subtitle-cover.fn";

// Overlays TikTok-style word-by-word subtitles on a given video. The video
// plays as the (single) segment's background and keeps its own audio; each
// cue becomes a transparent subtitle-cue annie layer timed over it.
//
// Cues only need `text` + `start`/`end` — word highlight timings are then
// spread across the window proportional to word length. Pass per-word
// timings (e.g. from a Whisper transcript) via `words` for exact karaoke.

const timedWordSchema = z.object({
  text: z.string().min(1),
  /** Seconds from the start of the video. */
  start: z.number().min(0),
  end: z.number().min(0),
});

const cueSchema = z.object({
  /** The phrase shown on screen; split on whitespace for highlighting. */
  text: z.string().min(1),
  /** When the cue appears/disappears, in seconds from the video start. */
  start: z.number().min(0),
  end: z.number().min(0),
  /** Optional exact word timings; defaults to spreading `text` over the cue. */
  words: z.array(timedWordSchema).min(1).optional(),
});

export const propsSchema = z.object({
  videoUrl: z.string().url(),
  /** Duration in seconds of the video at `videoUrl` (effies can't probe it). */
  videoDuration: z.number().positive(),
  cues: z.array(cueSchema).min(1),
  /** Keep the video's own audio track. Defaults to true. */
  keepAudio: z.boolean().optional(),
  fontSize: z.number().int().min(1).optional(),
  textColor: z.string().optional(),
  outlineColor: z.string().optional(),
  highlightColor: z.string().optional(),
  highlightTextColor: z.string().optional(),
  /** Vertical center of the caption block, as a fraction of frame height. */
  verticalPosition: z.number().min(0).max(1).optional(),
  /** Cover image text; defaults to the first cue's text. */
  coverText: z.string().optional(),
});

type SubtitledVideoProps = z.infer<typeof propsSchema>;

export const previewProps: SubtitledVideoProps = {
  videoUrl: "https://static.effing.dev/fundamentals/3-final.mp4",
  videoDuration: 9,
  cues: [
    { text: "POV: you generate videos", start: 0.4, end: 2.2 },
    { text: "with nothing but code", start: 2.3, end: 4.0 },
    { text: "no editor, no timeline", start: 4.1, end: 6.0 },
    { text: "just props in, video out", start: 6.1, end: 8.6 },
  ],
};

const FPS = 30;

type CueWord = z.infer<typeof timedWordSchema>;

/**
 * Word timings for a cue, relative to the cue start. Explicit timings are
 * shifted; otherwise the cue window is split across the words of `text`,
 * proportional to word length (longer words take longer to say).
 */
function cueWords(cue: z.infer<typeof cueSchema>): CueWord[] {
  const duration = cue.end - cue.start;
  if (cue.words) {
    return cue.words.map((word) => ({
      text: word.text,
      start: word.start - cue.start,
      end: word.end - cue.start,
    }));
  }
  const texts = cue.text.split(/\s+/).filter(Boolean);
  const weights = texts.map((text) => text.length + 2);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const words: CueWord[] = [];
  let at = 0;
  for (let i = 0; i < texts.length; i++) {
    const slice = (duration * weights[i]!) / totalWeight;
    words.push({ text: texts[i]!, start: at, end: at + slice });
    at += slice;
  }
  return words;
}

export async function runner({
  props: {
    videoUrl,
    videoDuration,
    cues,
    keepAudio = true,
    fontSize,
    textColor,
    outlineColor,
    highlightColor,
    highlightTextColor,
    verticalPosition,
    coverText,
  },
  bounds: { width, height },
}: RunnerArgs<SubtitledVideoProps>): EffieRunnerReturn {
  for (const cue of cues) {
    invariant(cue.start < cue.end, `cue "${cue.text}" has start >= end`);
    invariant(
      cue.end <= videoDuration,
      `cue "${cue.text}" ends after the video does`,
    );
  }

  const cover = await fnUrl(
    "image",
    "subtitle-cover",
    {
      text: coverText ?? cues[0]!.text,
      textColor,
      outlineColor,
      highlightColor,
      highlightTextColor,
    } satisfies SubtitleCoverProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "video", source: effieWebUrl(videoUrl) },
    segments: [
      effieSegment({
        duration: videoDuration,
        // A video background brings only pixels — its soundtrack has to be
        // mixed back in as segment audio.
        audio: keepAudio ? { source: effieWebUrl(videoUrl) } : undefined,
        layers: await Promise.all(
          cues.map(async (cue) => ({
            type: "animation" as const,
            source: await fnUrl(
              "annie",
              "subtitle-cue",
              {
                words: cueWords(cue),
                fps: FPS,
                frameCount: Math.max(
                  1,
                  Math.round((cue.end - cue.start) * FPS),
                ),
                fontSize,
                textColor,
                outlineColor,
                highlightColor,
                highlightTextColor,
                verticalPosition,
              } satisfies SubtitleCueProps,
              { width, height },
            ),
            delay: cue.start,
            until: cue.end,
          })),
        ),
      }),
    ],
  });
}
