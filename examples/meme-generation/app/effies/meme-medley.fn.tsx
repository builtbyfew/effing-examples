import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { MemeTopBottomProps } from "~/images/meme-top-bottom.fn";
import type { MemeTopBottomAnnieProps } from "~/annies/meme-top-bottom.fn";
import type { MemeDistractedBoyfriendAnnieProps } from "~/annies/meme-distracted-boyfriend.fn";
import type { MemeDrakeHotlineBlingAnnieProps } from "~/annies/meme-drake-hotline-bling.fn";
import type { MemeChangeMyMindAnnieProps } from "~/annies/meme-change-my-mind.fn";

export const propsSchema = z.object({});
type MemeMedleyProps = z.infer<typeof propsSchema>;

export const previewProps: MemeMedleyProps = {};

const FPS = 30;
const SEGMENT_DURATION = 5;
const ANNIE_DURATION = SEGMENT_DURATION - 2;
const TRANSITION_DURATION = 0.6;

export async function runner({
  bounds: { width, height },
}: RunnerArgs<MemeMedleyProps>): EffieRunnerReturn {
  const frameCount = ANNIE_DURATION * FPS;

  const topBottomImageUrl =
    "https://static.effing.dev/picsum/1080/1920/plants.jpg";
  const topBottomTopText = "They photosynthesize";
  const topBottomBottomText = "I render videos in TypeScript";

  const topBottomAnnie = await fnUrl(
    "annie",
    "meme-top-bottom",
    {
      imageUrl: topBottomImageUrl,
      topText: topBottomTopText,
      bottomText: topBottomBottomText,
      frameCount,
    } satisfies MemeTopBottomAnnieProps,
    { width, height },
  );

  const distractedBoyfriendAnnie = await fnUrl(
    "annie",
    "meme-distracted-boyfriend",
    {
      otherWomanLabel: "JSX on Effing Canvas",
      boyfriendLabel: "Me",
      girlfriendLabel: "Puppeteer",
      frameCount,
    } satisfies MemeDistractedBoyfriendAnnieProps,
    { width, height },
  );

  const drakeAnnie = await fnUrl(
    "annie",
    "meme-drake-hotline-bling",
    {
      rejectLabel: "Reading the FFmpeg manual",
      approveLabel: "Reading the Effing manual",
      frameCount,
    } satisfies MemeDrakeHotlineBlingAnnieProps,
    { width, height },
  );

  const changeMyMindAnnie = await fnUrl(
    "annie",
    "meme-change-my-mind",
    {
      text: "JSX is a fine effing language",
      frameCount,
    } satisfies MemeChangeMyMindAnnieProps,
    { width, height },
  );

  // The cover is the poster frame — re-use the still version of the first
  // meme rendered with the same labels as the annie segment.
  const cover = await fnUrl(
    "image",
    "meme-top-bottom",
    {
      imageUrl: topBottomImageUrl,
      topText: topBottomTopText,
      bottomText: topBottomBottomText,
    } satisfies MemeTopBottomProps,
    { width, height },
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
            type: "animation",
            source: topBottomAnnie,
            effects: [{ type: "fade-in", start: 0, duration: 0.3 }],
          },
        ],
      }),
      effieSegment({
        duration: SEGMENT_DURATION,
        transition: { type: "zoom", duration: TRANSITION_DURATION },
        layers: [
          {
            type: "animation",
            source: distractedBoyfriendAnnie,
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
          {
            type: "animation",
            source: drakeAnnie,
          },
        ],
      }),
      effieSegment({
        duration: SEGMENT_DURATION,
        transition: { type: "fade", duration: TRANSITION_DURATION },
        layers: [
          {
            type: "animation",
            source: changeMyMindAnnie,
          },
        ],
      }),
    ],
  });
}
