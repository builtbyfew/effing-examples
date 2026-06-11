import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import { tween, easeOutBack } from "@effing/tween";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { interBlack, loadFonts } from "~/fonts";

// One subtitle cue (a short phrase) rendered TikTok-style: chunky uppercase
// words with a thick outline, where the word currently being spoken pops onto
// a colored highlight pill. Frames are transparent PNGs, meant to be layered
// on top of a video — see effies/subtitled-video.fn.tsx.

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
  fontSize: z.number().int().min(1).optional(),
  textColor: z.string().optional(),
  outlineColor: z.string().optional(),
  highlightColor: z.string().optional(),
  highlightTextColor: z.string().optional(),
  /** Vertical center of the caption block, as a fraction of frame height. */
  verticalPosition: z.number().min(0).max(1).optional(),
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
  props: {
    words,
    fps = 30,
    frameCount,
    fontSize = 76,
    textColor = "#ffffff",
    outlineColor = "#000000",
    highlightColor = "#5b2fd6",
    highlightTextColor = "#ffffff",
    verticalPosition = 0.76,
  },
  bounds: { width, height },
}: RunnerArgs<SubtitleCueProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interBlack]);
  const cueEnd = Math.max(...words.map((word) => word.end));
  const frames = frameCount ?? Math.max(1, Math.ceil(cueEnd * fps));

  // `lower * frames / fps` is the frame's start in seconds, matching how the
  // video timeline samples it when the annie is laid over a segment.
  yield* tween(frames, async ({ lower }) => {
    const t = (lower * frames) / fps;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    await renderReactElement(
      ctx,
      <SubtitleCueOverlay
        words={words}
        t={t}
        fontSize={fontSize}
        textColor={textColor}
        outlineColor={outlineColor}
        highlightColor={highlightColor}
        highlightTextColor={highlightTextColor}
        verticalPosition={verticalPosition}
        width={width}
        height={height}
      />,
      { fonts },
    );
    return canvas.encode("png");
  });
}

export function SubtitleCueOverlay({
  words,
  t,
  fontSize,
  textColor,
  outlineColor,
  highlightColor,
  highlightTextColor,
  verticalPosition,
  width,
  height,
}: {
  words: Array<{ text: string; start: number; end: number }>;
  /** Time in seconds from the cue start to render the overlay at. */
  t: number;
  fontSize: number;
  textColor: string;
  outlineColor: string;
  highlightColor: string;
  highlightTextColor: string;
  verticalPosition: number;
  width: number;
  height: number;
}) {
  // The highlight sticks to the most recently started word, so it doesn't
  // flicker off during short gaps between words. Before the first word starts
  // no word is highlighted.
  let activeIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (t >= words[i]!.start) activeIndex = i;
  }

  const entrance = easeOutBack(clamp01(t / ENTRANCE_SECONDS));
  const blockScale = 0.8 + 0.2 * entrance;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: width * 0.86,
          columnGap: fontSize * 0.16,
          rowGap: fontSize * 0.3,
          transform: `translateY(${(verticalPosition - 0.5) * height}px) scale(${blockScale})`,
        }}
      >
        {words.map((word, i) => {
          const isActive = i === activeIndex;
          const pop = isActive
            ? easeOutBack(clamp01((t - word.start) / POP_SECONDS))
            : 0;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                padding: `${fontSize * 0.08}px ${fontSize * 0.2}px`,
                borderRadius: fontSize * 0.22,
                backgroundColor: isActive ? highlightColor : "transparent",
                transform: `scale(${1 + 0.1 * pop})`,
                fontFamily: "Inter",
                fontWeight: 900,
                fontSize,
                color: isActive ? highlightTextColor : textColor,
                textTransform: "uppercase",
                WebkitTextStroke: `${Math.round(fontSize * 0.14)}px ${outlineColor}`,
                textShadow: `0 ${fontSize * 0.06}px ${fontSize * 0.16}px rgba(0, 0, 0, 0.55)`,
              }}
            >
              {word.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
