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
  /**
   * Fade the ending to black (and the audio out) over this many seconds —
   * useful when `videoDuration` cuts the video short. Defaults to 0 (off).
   */
  endFadeOut: z.number().min(0).optional(),
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
  videoDuration: 11,
  endFadeOut: 1,
  highlightColor: "#00c853",
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
    endFadeOut = 0,
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
        audio: keepAudio
          ? {
              source: effieWebUrl(videoUrl),
              fadeOut: endFadeOut > 0 ? endFadeOut : undefined,
            }
          : undefined,
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
      // A black segment crossfaded over the video's tail, so a mid-footage
      // cut ends on a deliberate fade instead of a hard stop.
      ...(endFadeOut > 0
        ? [
            effieSegment({
              duration: endFadeOut,
              transition: { type: "fade" as const, duration: endFadeOut },
              background: { type: "color" as const, color: "#000000" },
              layers: [],
            }),
          ]
        : []),
    ],
  });
}
