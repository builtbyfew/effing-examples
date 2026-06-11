import { z } from "zod";
import { effieData, effieWebUrl, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import { chatMessageSchema, sampleConversation } from "~/chat-ui";
import { conversationSchedule } from "~/annies/chat-conversation.fn";
import type { ChatConversationProps } from "~/annies/chat-conversation.fn";
import type { ChatChromeProps } from "~/images/chat-chrome.fn";
import type { ChatCoverProps } from "~/images/chat-cover.fn";
import { ctaOutroPropsSchema, ctaOutroSegment } from "~/effies/cta-outro";
import { chatSoundEffectsDataUrl } from "~/sound-effects";

// A brand-DM promo: the product is pitched in a messaging conversation —
// typing indicator, message pops, read receipt — then a CTA outro lands the
// offer.

export const propsSchema = z.object({
  contactName: z.string(),
  messages: z.array(chatMessageSchema).min(1),
  pace: z.number().positive().optional(),
  ...ctaOutroPropsSchema.shape,
  accentColor: z.string().optional(),
  soundEffects: z.boolean().optional(),
  musicUrl: z.string().url().optional(),
});

type ChatPromoProps = z.infer<typeof propsSchema>;

export const previewProps: ChatPromoProps = {
  contactName: "Sole Mate",
  messages: sampleConversation,
  saleLabel: "Launch week",
  price: "$129",
  oldPrice: "$159",
  ctaText: "Shop now at cloudstep.run",
};

const FPS = 30;

export async function runner({
  props: {
    contactName,
    messages,
    pace,
    saleLabel,
    price,
    oldPrice,
    ctaText,
    accentColor = "#7c5cd6",
    soundEffects = true,
    musicUrl,
  },
  bounds: { width, height },
}: RunnerArgs<ChatPromoProps>): EffieRunnerReturn {
  // The chat segment lasts exactly as long as the conversation's schedule.
  const schedule = conversationSchedule(messages, pace);
  const chatDuration = schedule.totalFrameCount / FPS;

  const cover = await fnUrl(
    "image",
    "chat-cover",
    {
      contactName,
      messages: messages.slice(0, 3),
      accentColor,
      typing: true,
    } satisfies ChatCoverProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps: FPS,
    cover,
    background: { type: "color", color: "#16101f" },
    audio: musicUrl
      ? { source: effieWebUrl(musicUrl), volume: 0.45, fadeOut: 1.5 }
      : undefined,
    segments: [
      // The conversation plays out over the chat chrome, with message pops
      // pre-mixed into one track at the schedule's exact offsets (the effie
      // format has no timed audio cues; see ~/sound-effects).
      effieSegment({
        duration: chatDuration,
        audio: soundEffects
          ? {
              source: effieWebUrl(
                chatSoundEffectsDataUrl(messages, schedule, FPS),
              ),
              volume: 0.8,
            }
          : undefined,
        layers: [
          {
            type: "image",
            source: await fnUrl(
              "image",
              "chat-chrome",
              { contactName, accentColor } satisfies ChatChromeProps,
              { width, height },
            ),
          },
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "chat-conversation",
              {
                messages,
                contactName,
                accentColor,
                pace,
              } satisfies ChatConversationProps,
              { width, height },
            ),
          },
        ],
      }),
      await ctaOutroSegment({
        props: { saleLabel, price, oldPrice, ctaText },
        accentColor,
        soundEffects,
        transition: { type: "fade", duration: 0.6 },
        width,
        height,
        fps: FPS,
      }),
    ],
  });
}
