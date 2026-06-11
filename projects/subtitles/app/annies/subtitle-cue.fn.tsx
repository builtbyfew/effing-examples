import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { tween, easeOutBack } from "@effing/tween";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import {
  CaptionOverlay,
  captionStyleSchema,
  loadCaptionFonts,
  resolveCaptionStyle,
} from "~/captions";

// One subtitle cue (a short phrase) as transparent PNG frames, meant to be
// layered on top of a video — see effies/subtitled-video.fn.tsx. The word
// currently being spoken pops onto its highlight pill as time passes.

const wordSchema = z.object({
  text: z.string().min(1),
  /** When the word starts being spoken, in seconds from the cue start. */
  start: z.number().min(0),
  /** When the word stops being spoken, in seconds from the cue start. */
  end: z.number().min(0),
});

export const propsSchema = z.object({
  /** The cue's words, in display order, with their spoken time windows. */
  words: z.array(wordSchema).min(1),
  fps: z.number().int().min(1).optional(),
  /** Total frames to render; defaults to covering the last word's end. */
  frameCount: z.number().int().min(1).optional(),
  ...captionStyleSchema.shape,
});

export type SubtitleCueProps = z.infer<typeof propsSchema>;

export const previewProps: SubtitleCueProps = {
  words: [
    { text: "Captions", start: 0, end: 0.45 },
    { text: "that", start: 0.45, end: 0.7 },
    { text: "actually", start: 0.7, end: 1.25 },
    { text: "slap", start: 1.25, end: 2.2 },
  ],
};

// How long a word takes to pop onto its highlight pill.
const POP_SECONDS = 0.15;
// The whole cue scales in over its first moments.
const ENTRANCE_SECONDS = 0.12;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export async function* runner({
  props,
  bounds: { width, height },
}: RunnerArgs<SubtitleCueProps>): AnnieRunnerReturn {
  const { words, fps = 30 } = props;
  const style = resolveCaptionStyle(props);
  const fonts = await loadCaptionFonts();
  const cueEnd = Math.max(...words.map((word) => word.end));
  const frameCount = props.frameCount ?? Math.max(1, Math.ceil(cueEnd * fps));

  // `lower * frameCount / fps` is the frame's start in seconds, matching how
  // the video timeline samples it when the annie is laid over a segment.
  yield* tween(frameCount, async ({ lower }) => {
    const t = (lower * frameCount) / fps;

    // The highlight sticks to the most recently started word, so it doesn't
    // flicker off during short gaps between words. Before the first word
    // starts, no word is highlighted.
    let activeIndex = -1;
    for (let i = 0; i < words.length; i++) {
      if (t >= words[i]!.start) activeIndex = i;
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    await renderReactElement(
      ctx,
      <CaptionOverlay
        words={words.map((word) => word.text)}
        activeIndex={activeIndex}
        activePop={
          activeIndex >= 0
            ? easeOutBack(clamp01((t - words[activeIndex]!.start) / POP_SECONDS))
            : 0
        }
        entrance={easeOutBack(clamp01(t / ENTRANCE_SECONDS))}
        style={style}
        width={width}
        height={height}
      />,
      { fonts },
    );
    return canvas.encode("png");
  });
}
