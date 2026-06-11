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
  /**
   * Seconds of the video to play (effies can't probe the file, so this must
   * be passed in). May be shorter than the actual video to trim the tail.
   */
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

// The preview captions the opening of NASA's "We Chose: The Inspiration of
// Apollo" (public domain), which starts with JFK's 1962 Rice University
// speech. Word timings come from a Whisper transcription of the clip, so the
// karaoke highlight tracks the actual voice.
export const previewProps: SubtitledVideoProps = {
  videoUrl:
    "https://images-assets.nasa.gov/video/jsc2019m000363_We_Chose_The_Inspiration_of_Apollo_mp4_1_720/jsc2019m000363_We_Chose_The_Inspiration_of_Apollo_mp4_1_720~medium.mp4",
  videoDuration: 38,
  coverText: "We choose to go to the moon",
  cues: [
    {
      text: "The exploration of space",
      start: 0.0,
      end: 1.7,
      words: [
        { text: "The", start: 0.0, end: 0.48 },
        { text: "exploration", start: 0.48, end: 0.96 },
        { text: "of", start: 0.96, end: 1.46 },
        { text: "space", start: 1.46, end: 1.72 },
      ],
    },
    {
      text: "will go ahead",
      start: 1.72,
      end: 2.85,
      words: [
        { text: "will", start: 1.72, end: 2.08 },
        { text: "go", start: 2.08, end: 2.32 },
        { text: "ahead", start: 2.32, end: 2.6 },
      ],
    },
    {
      text: "whether we join in it or not",
      start: 3.04,
      end: 5.65,
      words: [
        { text: "whether", start: 3.04, end: 3.76 },
        { text: "we", start: 3.76, end: 4.04 },
        { text: "join", start: 4.04, end: 4.34 },
        { text: "in", start: 4.34, end: 4.8 },
        { text: "it", start: 4.8, end: 4.9 },
        { text: "or", start: 4.9, end: 5.04 },
        { text: "not", start: 5.04, end: 5.4 },
      ],
    },
    {
      text: "and it is",
      start: 5.72,
      end: 7.24,
      words: [
        { text: "and", start: 5.72, end: 6.9 },
        { text: "it", start: 6.9, end: 7.1 },
        { text: "is", start: 7.1, end: 7.26 },
      ],
    },
    {
      text: "one of the great adventures",
      start: 7.26,
      end: 8.32,
      words: [
        { text: "one", start: 7.26, end: 7.56 },
        { text: "of", start: 7.56, end: 7.76 },
        { text: "the", start: 7.76, end: 7.86 },
        { text: "great", start: 7.86, end: 8.1 },
        { text: "adventures", start: 8.1, end: 8.34 },
      ],
    },
    {
      text: "of all time",
      start: 8.34,
      end: 9.69,
      words: [
        { text: "of", start: 8.34, end: 8.84 },
        { text: "all", start: 8.84, end: 9.02 },
        { text: "time", start: 9.02, end: 9.44 },
      ],
    },
    {
      text: "And no nation",
      start: 10.02,
      end: 11.45,
      words: [
        { text: "And", start: 10.02, end: 10.56 },
        { text: "no", start: 10.56, end: 10.8 },
        { text: "nation", start: 10.8, end: 11.2 },
      ],
    },
    {
      text: "which expects to be the leader",
      start: 11.62,
      end: 14.24,
      words: [
        { text: "which", start: 11.62, end: 12.56 },
        { text: "expects", start: 12.56, end: 12.92 },
        { text: "to", start: 12.92, end: 13.42 },
        { text: "be", start: 13.42, end: 13.62 },
        { text: "the", start: 13.62, end: 13.9 },
        { text: "leader", start: 13.9, end: 14.26 },
      ],
    },
    {
      text: "of other nations",
      start: 14.26,
      end: 15.47,
      words: [
        { text: "of", start: 14.26, end: 14.6 },
        { text: "other", start: 14.6, end: 14.78 },
        { text: "nations", start: 14.78, end: 15.22 },
      ],
    },
    {
      text: "can expect to stay behind them",
      start: 15.84,
      end: 17.87,
      words: [
        { text: "can", start: 15.84, end: 16.12 },
        { text: "expect", start: 16.12, end: 16.48 },
        { text: "to", start: 16.48, end: 16.72 },
        { text: "stay", start: 16.72, end: 16.94 },
        { text: "behind", start: 16.94, end: 17.38 },
        { text: "them", start: 17.38, end: 17.62 },
      ],
    },
    {
      text: "But why, some say, the moon?",
      start: 18.42,
      end: 20.47,
      words: [
        { text: "But", start: 18.42, end: 18.88 },
        { text: "why,", start: 18.88, end: 19.18 },
        { text: "some", start: 19.18, end: 19.56 },
        { text: "say,", start: 19.56, end: 19.82 },
        { text: "the", start: 19.82, end: 20.04 },
        { text: "moon?", start: 20.04, end: 20.22 },
      ],
    },
    {
      text: "Why choose this as our goal?",
      start: 21.34,
      end: 23.35,
      words: [
        { text: "Why", start: 21.34, end: 21.64 },
        { text: "choose", start: 21.64, end: 22.0 },
        { text: "this", start: 22.0, end: 22.34 },
        { text: "as", start: 22.34, end: 22.68 },
        { text: "our", start: 22.68, end: 22.88 },
        { text: "goal?", start: 22.88, end: 23.1 },
      ],
    },
    {
      text: "Why climb the highest mountain?",
      start: 23.76,
      end: 25.71,
      words: [
        { text: "Why", start: 23.76, end: 24.36 },
        { text: "climb", start: 24.36, end: 24.66 },
        { text: "the", start: 24.66, end: 24.96 },
        { text: "highest", start: 24.96, end: 25.2 },
        { text: "mountain?", start: 25.2, end: 25.46 },
      ],
    },
    {
      text: "Why, 35 years ago?",
      start: 26.54,
      end: 28.37,
      words: [
        { text: "Why,", start: 26.54, end: 26.84 },
        { text: "35", start: 26.84, end: 27.34 },
        { text: "years", start: 27.34, end: 27.84 },
        { text: "ago?", start: 27.84, end: 28.12 },
      ],
    },
    {
      text: "Why the Atlantic?",
      start: 28.88,
      end: 29.73,
      words: [
        { text: "Why", start: 28.88, end: 29.12 },
        { text: "the", start: 29.12, end: 29.3 },
        { text: "Atlantic?", start: 29.3, end: 29.48 },
      ],
    },
    {
      text: "Why does Rice play Texas?",
      start: 30.42,
      end: 32.21,
      words: [
        { text: "Why", start: 30.42, end: 30.8 },
        { text: "does", start: 30.8, end: 30.98 },
        { text: "Rice", start: 30.98, end: 31.18 },
        { text: "play", start: 31.18, end: 31.6 },
        { text: "Texas?", start: 31.6, end: 31.96 },
      ],
    },
    {
      text: "We choose to go to the moon",
      start: 32.88,
      end: 34.39,
      words: [
        { text: "We", start: 32.88, end: 32.92 },
        { text: "choose", start: 32.92, end: 33.26 },
        { text: "to", start: 33.26, end: 33.56 },
        { text: "go", start: 33.56, end: 33.74 },
        { text: "to", start: 33.74, end: 33.84 },
        { text: "the", start: 33.84, end: 33.98 },
        { text: "moon", start: 33.98, end: 34.14 },
      ],
    },
    {
      text: "We choose to go to the moon",
      start: 35.56,
      end: 37.09,
      words: [
        { text: "We", start: 35.56, end: 35.64 },
        { text: "choose", start: 35.64, end: 35.94 },
        { text: "to", start: 35.94, end: 36.24 },
        { text: "go", start: 36.24, end: 36.4 },
        { text: "to", start: 36.4, end: 36.54 },
        { text: "the", start: 36.54, end: 36.62 },
        { text: "moon", start: 36.62, end: 36.84 },
      ],
    },
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
