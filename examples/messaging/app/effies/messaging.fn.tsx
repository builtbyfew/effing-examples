import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import type { MessageConversationProps } from "~/annies/message-conversation.fn";
import type { ConversationBackgroundProps } from "~/images/conversation-background.fn";

const messageSchema = z.object({
  sender: z.enum(["a", "b"]),
  text: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export const propsSchema = z.object({
  contactA: z.string(),
  contactB: z.string(),
  messages: z.array(messageSchema),
  duration: z.number().positive(),
  staggerFrameCount: z.number().int().min(1).optional(),
  entryFrameCount: z.number().int().min(1).optional(),
  slideFrameCount: z.number().int().min(1).optional(),
  backgroundColor: z.string().optional(),
  accentColor: z.string().optional(),
});

type MessagingProps = z.infer<typeof propsSchema>;

export const previewProps: MessagingProps = {
  contactA: "Bryan",
  contactB: "Sneakies Sneakers",
  messages: [
    {
      sender: "b",
      imageUrl: "https://static.effing.dev/unsplash/sneakers/max-petrunin-A4fETzh_wlo-unsplash.jpg",
      text: "New drop 🔥 The AirFlow Pro just launched",
    },
    { sender: "a", text: "These look incredible, are they available now?" },
    { sender: "b", text: "Yes! Use code LAUNCH20 for 20% off today only" },
    { sender: "a", text: "Just ordered a pair 🙌 Can't wait to wear them!" },
    { sender: "b", text: "You're going to love them — ships in 2-3 days 🚀" },
  ],
  duration: 10,
  staggerFrameCount: 50,
  entryFrameCount: 20,
  slideFrameCount: 28,
};

export async function runner({
  props: {
    contactA,
    contactB,
    messages,
    duration,
    staggerFrameCount,
    entryFrameCount,
    slideFrameCount,
    backgroundColor,
    accentColor,
  },
  bounds: { width, height },
}: RunnerArgs<MessagingProps>): EffieRunnerReturn {
  const frameCount = Math.round(duration * 30);

  const [backgroundSource, conversationSource] = await Promise.all([
    fnUrl(
      "image",
      "conversation-background",
      { contactName: contactB, backgroundColor, accentColor } satisfies ConversationBackgroundProps,
      { width, height },
    ),
    fnUrl(
      "annie",
      "message-conversation",
      // No backgroundColor — transparent so the background image shows through
      {
        messages,
        totalFrameCount: frameCount,
        staggerFrameCount,
        entryFrameCount,
        slideFrameCount,
        contactA,
        contactB,
      } satisfies MessageConversationProps,
      { width, height },
    ),
  ]);

  return effieData({
    width,
    height,
    fps: 30,
    cover: backgroundSource,
    background: { type: "color", color: backgroundColor ?? "#0F172A" },
    segments: [
      effieSegment({
        duration,
        layers: [
          { type: "image", source: backgroundSource },
          { type: "animation", source: conversationSource },
        ],
      }),
    ],
  });
}
