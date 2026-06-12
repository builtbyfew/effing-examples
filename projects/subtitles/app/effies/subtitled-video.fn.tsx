import { z } from "zod";
import invariant from "tiny-invariant";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import { captionStyleSchema } from "~/captions";
import { jfkRiceSpeech } from "~/jfk-rice-speech";
import type { SubtitleCueProps } from "~/annies/subtitle-cue.fn";
import type { SubtitleCoverProps } from "~/images/subtitle-cover.fn";
import type { SubtitleOutroProps } from "~/images/subtitle-outro.fn";

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
  // The video and its captions.
  videoUrl: z.string().url(),
  /**
   * Seconds of the video to play (effies can't probe the file, so this must
   * be passed in). May be shorter than the actual video to trim the tail.
   */
  videoDuration: z.number().positive(),
  cues: z.array(cueSchema).min(1),
  /** Keep the video's own audio track. Defaults to true. */
  keepAudio: z.boolean().optional(),

  // The cover, doubling as the intro title card.
  /** Title for the cover (and the intro title card, if enabled). */
  coverText: z.string().min(1),
  /** Small line above the cover title (e.g. who is speaking, where, when). */
  coverKicker: z.string().optional(),
  /**
   * Seconds to open on the cover as a title card, crossfading into the
   * video. Defaults to 0 (the video starts right away).
   */
  introDuration: z.number().min(0).optional(),

  // The ending.
  /**
   * Fade the ending (and the audio) out over this many seconds — useful when
   * `videoDuration` cuts the video short. Fades into the outro card when
   * `outroText` is set, to black otherwise. Defaults to 0 (off).
   */
  endFadeOut: z.number().min(0).optional(),
  /**
   * Closing card text (typically attribution); the video ends on this card
   * instead of a black frame. Defaults to no outro card.
   */
  outroText: z.string().optional(),
  /** Seconds to hold the outro card after the fade. Defaults to 1.5. */
  outroDuration: z.number().min(0).optional(),

  ...captionStyleSchema.shape,
});

type SubtitledVideoProps = z.infer<typeof propsSchema>;

// JFK's "We choose to go to the Moon" speech, with Whisper-derived word
// timings — see jfk-rice-speech.ts for the clip's provenance.
export const previewProps: SubtitledVideoProps = {
  ...jfkRiceSpeech,
  videoDuration: 11,
  coverText: "We choose to go to the Moon",
  coverKicker: "JFK · Rice University · 1962",
  introDuration: 1.5,
  endFadeOut: 1,
  outroText: "Footage courtesy of NASA",
  highlightColor: "#00c853",
};

const FPS = 30;

type CueWord = z.infer<typeof timedWordSchema>;

/**
 * Word timings for a cue, relative to the cue start. Explicit timings are
 * shifted; otherwise the cue window is split across the words of `text`,
 * proportional to word length (longer words take longer to say).
 */
function cueWordTimings(cue: z.infer<typeof cueSchema>): CueWord[] {
  const duration = cue.end - cue.start;
  if (cue.words) {
    return cue.words.map((word) => ({
      text: word.text,
      start: word.start - cue.start,
      end: word.end - cue.start,
    }));
  }
  const texts = cue.text.split(/\s+/).filter(Boolean);
  // The +2 keeps short words from flashing by — "a" still takes a beat.
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
    coverText,
    coverKicker,
    introDuration = 0,
    endFadeOut = 0,
    outroText,
    outroDuration = 1.5,
    ...captionStyle
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

  // The intro crossfade overlaps the start of the video segment, so cue
  // layers stay hidden (`from` below) until it completes — otherwise an
  // early cue would pop in on top of the fading title card.
  const introFade = Math.min(0.5, introDuration);

  const cover = await fnUrl(
    "image",
    "subtitle-cover",
    {
      text: coverText,
      kicker: coverKicker,
      ...captionStyle,
    } satisfies SubtitleCoverProps,
    { width, height },
  );

  const outro = outroText
    ? await fnUrl(
        "image",
        "subtitle-outro",
        { text: outroText, ...captionStyle } satisfies SubtitleOutroProps,
        { width, height },
      )
    : null;

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "color", color: "#000000" },
    segments: [
      // Title card intro: the cover held full-frame, crossfading into the
      // video.
      ...(introDuration > 0
        ? [
            effieSegment({
              duration: introDuration,
              layers: [{ type: "image" as const, source: cover }],
            }),
          ]
        : []),
      effieSegment({
        duration: videoDuration,
        // The video is this segment's own background (not the global one):
        // a segment background starts playing at its segment's start, which
        // keeps cue timings aligned even with an intro in front.
        background: { type: "video", source: effieWebUrl(videoUrl) },
        transition:
          introDuration > 0
            ? { type: "fade" as const, duration: introFade }
            : undefined,
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
                words: cueWordTimings(cue),
                fps: FPS,
                frameCount: Math.max(
                  1,
                  Math.round((cue.end - cue.start) * FPS),
                ),
                ...captionStyle,
              } satisfies SubtitleCueProps,
              { width, height },
            ),
            delay: cue.start,
            // Hidden until the intro crossfade completes (clamped so `from`
            // stays inside the cue's own window).
            from: Math.min(Math.max(cue.start, introFade), cue.end),
            until: cue.end,
          })),
        ),
      }),
      // Ending: crossfade the video's tail into the outro card (or plain
      // black without one), so a mid-footage cut ends on a deliberate note
      // instead of a hard stop.
      ...(outro || endFadeOut > 0
        ? [
            effieSegment({
              duration: endFadeOut + (outro ? outroDuration : 0),
              transition:
                endFadeOut > 0
                  ? { type: "fade" as const, duration: endFadeOut }
                  : undefined,
              background: { type: "color" as const, color: "#000000" },
              layers: outro
                ? [{ type: "image" as const, source: outro }]
                : [],
            }),
          ]
        : []),
    ],
  });
}
