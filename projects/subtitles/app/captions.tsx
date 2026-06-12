import { z } from "zod";
import type { FontData } from "@effing/canvas";
import { interBlack, loadFonts } from "~/fonts";

// The TikTok-style caption look: chunky uppercase words with a thick
// outline, the word currently being spoken popped onto a colored pill. The
// style schema is spread into each fn's propsSchema so the whole look can be
// restyled from props; CaptionOverlay is the purely presentational piece —
// timing lives in the subtitle-cue annie that renders it.

export const captionStyleSchema = z.object({
  fontSize: z.number().int().min(1).optional(),
  textColor: z.string().optional(),
  outlineColor: z.string().optional(),
  /** Pill color behind the word being spoken. */
  highlightColor: z.string().optional(),
  highlightTextColor: z.string().optional(),
  /** Vertical center of the caption block, as a fraction of frame height. */
  verticalPosition: z.number().min(0).max(1).optional(),
});

export type CaptionStyle = z.infer<typeof captionStyleSchema>;

const CAPTION_STYLE_DEFAULTS = {
  fontSize: 76,
  textColor: "#ffffff",
  outlineColor: "#000000",
  highlightColor: "#5b2fd6",
  highlightTextColor: "#ffffff",
  verticalPosition: 0.76,
};

export type ResolvedCaptionStyle = typeof CAPTION_STYLE_DEFAULTS;

/**
 * Fill in defaults for any style prop the caller left unset. `overrides`
 * adjusts the defaults themselves (e.g. the cover centers its text), without
 * overruling anything the caller did set.
 */
export function resolveCaptionStyle(
  style: CaptionStyle,
  overrides?: Partial<ResolvedCaptionStyle>,
): ResolvedCaptionStyle {
  const defaults = { ...CAPTION_STYLE_DEFAULTS, ...overrides };
  return {
    fontSize: style.fontSize ?? defaults.fontSize,
    textColor: style.textColor ?? defaults.textColor,
    outlineColor: style.outlineColor ?? defaults.outlineColor,
    highlightColor: style.highlightColor ?? defaults.highlightColor,
    highlightTextColor: style.highlightTextColor ?? defaults.highlightTextColor,
    verticalPosition: style.verticalPosition ?? defaults.verticalPosition,
  };
}

/** The fonts CaptionOverlay renders with (Inter Black, weight 900). */
export async function loadCaptionFonts(): Promise<FontData[]> {
  return loadFonts([interBlack]);
}

export function CaptionOverlay({
  words,
  activeIndex,
  activePop,
  entrance,
  style,
  width,
  height,
}: {
  words: string[];
  /** Index of the highlighted word; -1 highlights nothing. */
  activeIndex: number;
  /** Eased 0–1 progress of the active word's pop onto its pill. */
  activePop: number;
  /** Eased 0–1 progress of the whole block scaling in. */
  entrance: number;
  style: ResolvedCaptionStyle;
  width: number;
  height: number;
}) {
  const {
    fontSize,
    textColor,
    outlineColor,
    highlightColor,
    highlightTextColor,
    verticalPosition,
  } = style;
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
          return (
            <div
              key={i}
              style={{
                display: "flex",
                padding: `${fontSize * 0.08}px ${fontSize * 0.2}px`,
                borderRadius: fontSize * 0.22,
                backgroundColor: isActive ? highlightColor : "transparent",
                transform: `scale(${isActive ? 1 + 0.1 * activePop : 1})`,
                fontFamily: "Inter",
                fontWeight: 900,
                fontSize,
                color: isActive ? highlightTextColor : textColor,
                textTransform: "uppercase",
                WebkitTextStroke: `${Math.round(fontSize * 0.14)}px ${outlineColor}`,
                textShadow: `0 ${fontSize * 0.06}px ${fontSize * 0.16}px rgba(0, 0, 0, 0.55)`,
              }}
            >
              {word}
            </div>
          );
        })}
      </div>
    </div>
  );
}
