import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { MemeTopBottomProps } from "~/images/meme-top-bottom.fn";
import type { MemeDistractedBoyfriendProps } from "~/images/meme-distracted-boyfriend.fn";
import type { MemeDrakeHotlineBlingProps } from "~/images/meme-drake-hotline-bling.fn";
import type { MemeChangeMyMindProps } from "~/images/meme-change-my-mind.fn";
import type { MemeTopBottomCaptionProps } from "~/annies/meme-top-bottom-caption.fn";
import type { MemeDistractedBoyfriendLabelsProps } from "~/annies/meme-distracted-boyfriend-labels.fn";
import type { MemeDrakeHotlineBlingLabelsProps } from "~/annies/meme-drake-hotline-bling-labels.fn";
import type { MemeChangeMyMindTextProps } from "~/annies/meme-change-my-mind-text.fn";
import { loadFonts, antonRegular } from "~/fonts";
import { computeMemeTopBottomLayout } from "~/meme-top-bottom-layout";

export const propsSchema = z.object({});
type MemeMedleyProps = z.infer<typeof propsSchema>;

export const previewProps: MemeMedleyProps = {};

const FPS = 30;
const SEGMENT_DURATION = 5;
const ANNIE_DURATION = SEGMENT_DURATION - 2;
const TRANSITION_DURATION = 0.6;

// The screaming marmot clip (750×500, 12.5 fps, 6.16 s) contains three shots,
// each with exactly one scream. One caption per scream: revealed the moment
// the mouth opens, hidden again at the shot cut.
const MARMOT_VIDEO_URL =
  "https://media4.giphy.com/media/R8rRQmDIewbRPeJl0H/giphy-hd.mp4";
const MARMOT_DURATION = 6.16;
const MARMOT_SCREAMS = [
  { text: "Pixels!", start: 0.4, until: 2.16 },
  { text: "Frames!", start: 2.6, until: 4.48 },
  { text: "Effing videos!", start: 4.85, until: MARMOT_DURATION },
];
const MARMOT_CAPTION_REVEAL_SECONDS = 0.35;

export async function runner({
  bounds: { width, height },
}: RunnerArgs<MemeMedleyProps>): EffieRunnerReturn {
  const frameCount = ANNIE_DURATION * FPS;

  const topBottomImageUrl =
    "https://static.effing.dev/picsum/1080/1920/plants.jpg";
  const topBottomTopText = "They photosynthesize";
  const topBottomBottomText = "I render videos in TypeScript";

  // Compute the top-bottom layout once so the background image and the two
  // caption annies all agree on font size and anchor offsets.
  const fonts = await loadFonts([antonRegular]);
  const topBottomLayout = await computeMemeTopBottomLayout({
    width,
    height,
    imageUrl: topBottomImageUrl,
    topText: topBottomTopText,
    bottomText: topBottomBottomText,
    font: fonts[0],
  });

  const captionConfigs: Array<{
    text: string;
    anchor: "top" | "bottom";
    offsetY: number;
    startDelayFrac: number;
  }> = [
    {
      text: topBottomTopText,
      anchor: "top",
      offsetY: topBottomLayout.topOffsetY,
      startDelayFrac: 0.08,
    },
    {
      text: topBottomBottomText,
      anchor: "bottom",
      offsetY: topBottomLayout.bottomOffsetY,
      startDelayFrac: 0.42,
    },
  ];

  const [
    topBottomBackground,
    topCaptionAnnie,
    bottomCaptionAnnie,
    cover,
    distractedBoyfriendBackground,
    distractedBoyfriendAnnie,
    drakeBackground,
    drakeAnnie,
    changeMyMindBackground,
    changeMyMindAnnie,
  ] = await Promise.all([
    fnUrl(
      "image",
      "meme-top-bottom",
      { imageUrl: topBottomImageUrl } satisfies MemeTopBottomProps,
      { width, height },
    ),
    ...captionConfigs.map((cfg) =>
      fnUrl(
        "annie",
        "meme-top-bottom-caption",
        {
          text: cfg.text,
          fontSize: topBottomLayout.fontSize,
          anchor: cfg.anchor,
          offsetY: cfg.offsetY,
          paddingX: topBottomLayout.padding,
          startDelayFrac: cfg.startDelayFrac,
          revealFrac: 0.32,
          frameCount,
        } satisfies MemeTopBottomCaptionProps,
        { width, height },
      ),
    ),
    // Cover = poster frame of the first segment. Pass the resolved fontSize
    // so the still doesn't redo the font-fit binary search.
    fnUrl(
      "image",
      "meme-top-bottom",
      {
        imageUrl: topBottomImageUrl,
        topText: topBottomTopText,
        bottomText: topBottomBottomText,
        fontSize: topBottomLayout.fontSize,
      } satisfies MemeTopBottomProps,
      { width, height },
    ),
    fnUrl(
      "image",
      "meme-distracted-boyfriend",
      {} satisfies MemeDistractedBoyfriendProps,
      { width, height },
    ),
    fnUrl(
      "annie",
      "meme-distracted-boyfriend-labels",
      {
        otherWomanLabel: "JSX on Effing Canvas",
        boyfriendLabel: "Me",
        girlfriendLabel: "Puppeteer",
        frameCount,
      } satisfies MemeDistractedBoyfriendLabelsProps,
      { width, height },
    ),
    fnUrl(
      "image",
      "meme-drake-hotline-bling",
      {} satisfies MemeDrakeHotlineBlingProps,
      { width, height },
    ),
    fnUrl(
      "annie",
      "meme-drake-hotline-bling-labels",
      {
        rejectLabel: "Reading the FFmpeg manual",
        approveLabel: "Reading the Effing manual",
        frameCount,
      } satisfies MemeDrakeHotlineBlingLabelsProps,
      { width, height },
    ),
    fnUrl(
      "image",
      "meme-change-my-mind",
      {} satisfies MemeChangeMyMindProps,
      { width, height },
    ),
    fnUrl(
      "annie",
      "meme-change-my-mind-text",
      {
        text: "JSX is a fine effing language",
        frameCount,
      } satisfies MemeChangeMyMindTextProps,
      { width, height },
    ),
  ]);

  // Subtitle-style captions over the marmot video: all bottom-anchored, so
  // each scream's line replaces the previous one in the same spot.
  const marmotCaptionAnnies = await Promise.all(
    MARMOT_SCREAMS.map(({ text, start, until }) => {
      const windowSeconds = until - start;
      return fnUrl(
        "annie",
        "meme-top-bottom-caption",
        {
          text,
          fontSize: Math.round(width * 0.105),
          anchor: "bottom",
          offsetY: Math.round(height * 0.06),
          paddingX: Math.round(width * 0.035),
          startDelayFrac: 0,
          revealFrac: Math.min(1, MARMOT_CAPTION_REVEAL_SECONDS / windowSeconds),
          frameCount: Math.round(windowSeconds * FPS),
        } satisfies MemeTopBottomCaptionProps,
        { width, height },
      );
    }),
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "color", color: "#101018" },
    segments: [
      effieSegment({
        duration: SEGMENT_DURATION,
        layers: [
          {
            type: "image",
            source: topBottomBackground,
            effects: [{ type: "fade-in", start: 0, duration: 0.3 }],
          },
          {
            type: "animation",
            source: topCaptionAnnie,
            effects: [{ type: "fade-in", start: 0, duration: 0.3 }],
          },
          {
            type: "animation",
            source: bottomCaptionAnnie,
            effects: [{ type: "fade-in", start: 0, duration: 0.3 }],
          },
        ],
      }),
      // Subsequent segments: a static image is visible from t=0 so the
      // transition has meaningful pixels to blend, while the animation layer
      // is delayed until the transition has finished.
      effieSegment({
        duration: SEGMENT_DURATION,
        transition: { type: "zoom", duration: TRANSITION_DURATION },
        layers: [
          { type: "image", source: distractedBoyfriendBackground },
          {
            type: "animation",
            source: distractedBoyfriendAnnie,
            delay: TRANSITION_DURATION,
          },
        ],
      }),
      effieSegment({
        duration: SEGMENT_DURATION,
        transition: {
          type: "slide",
          direction: "up",
          duration: TRANSITION_DURATION,
        },
        layers: [
          { type: "image", source: drakeBackground },
          {
            type: "animation",
            source: drakeAnnie,
            delay: TRANSITION_DURATION,
          },
        ],
      }),
      effieSegment({
        duration: SEGMENT_DURATION,
        transition: { type: "fade", duration: TRANSITION_DURATION },
        layers: [
          { type: "image", source: changeMyMindBackground },
          {
            type: "animation",
            source: changeMyMindAnnie,
            delay: TRANSITION_DURATION,
          },
        ],
      }),
      // Finale: the marmot clip plays as the segment background (FFS
      // cover-scales and center-crops it, and the marmot stays in frame at
      // every scream). A hard cut instead of a transition — the first scream
      // starts 0.4 s in and would otherwise be buried in the blend.
      effieSegment({
        duration: MARMOT_DURATION,
        background: { type: "video", source: MARMOT_VIDEO_URL },
        layers: MARMOT_SCREAMS.map(({ start, until }, i) => ({
          type: "animation" as const,
          source: marmotCaptionAnnies[i],
          delay: start,
          until,
        })),
      }),
    ],
  });
}
