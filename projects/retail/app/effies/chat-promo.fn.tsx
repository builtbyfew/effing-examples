import { z } from "zod";
import { effieData, effieSegment, effieWebUrl } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import {
  chatMessageSchema,
  conversationSchedule,
} from "~/annies/chat-conversation.fn";
import type { ChatConversationProps } from "~/annies/chat-conversation.fn";
import type { TextTypewriterProps } from "~/annies/text-typewriter.fn";
import type { ChatHeaderProps } from "~/images/chat-header.fn";
import type { PromoHeadlineProps } from "~/images/promo-headline.fn";
import type { PriceTagProps } from "~/images/price-tag.fn";

export const propsSchema = z.object({
  contactName: z.string(),
  messages: z.array(chatMessageSchema).min(1),
  pace: z.number().positive().optional(),
  // Cover art
  kicker: z.string(),
  productName: z.string(),
  tagline: z.string(),
  imageUrl: z.string().url(),
  // CTA outro
  saleLabel: z.string(),
  price: z.string(),
  oldPrice: z.string().optional(),
  ctaText: z.string(),
  accentColor: z.string().optional(),
  musicUrl: z.string().url().optional(),
});

type ChatPromoProps = z.infer<typeof propsSchema>;

export const previewProps: ChatPromoProps = {
  contactName: "Cloudstep Sole Support",
  messages: [
    {
      sender: "contact",
      imageUrl:
        "https://static.effing.dev/unsplash/sneakers/max-petrunin-A4fETzh_wlo-unsplash.jpg",
      text: "The Cloudstep 574 just dropped 👟",
    },
    { sender: "user", text: "okay these are gorgeous 😍" },
    { sender: "user", text: "do they actually feel like clouds?" },
    { sender: "contact", text: "Literally. Bubble sole, zero break-in." },
    { sender: "contact", text: "Launch week: $129 with code CLOUD20" },
    { sender: "user", text: "say less — ordering now 🙌" },
  ],
  kicker: "New drop",
  productName: "Cloudstep 574",
  tagline: "Running shoes that float",
  imageUrl:
    "https://static.effing.dev/unsplash/sneakers/max-petrunin-A4fETzh_wlo-unsplash.jpg",
  saleLabel: "Launch week",
  price: "$129",
  oldPrice: "$159",
  ctaText: "Shop now at cloudstep.run",
  musicUrl:
    "https://static.effing.dev/elevenlabs/music/Aura_of_Elegance_2026-05-07T174428_var1.mp3",
};

const FPS = 30;

export async function runner({
  props: {
    contactName,
    messages,
    pace,
    kicker,
    productName,
    tagline,
    imageUrl,
    saleLabel,
    price,
    oldPrice,
    ctaText,
    accentColor = "#7c5cd6",
    musicUrl,
  },
  bounds: { width, height },
}: RunnerArgs<ChatPromoProps>): EffieRunnerReturn {
  // The chat segment lasts exactly as long as the conversation's schedule.
  const { totalFrameCount } = conversationSchedule(messages, pace);
  const chatDuration = totalFrameCount / FPS;
  const ctaDuration = 4;

  const ctaTextDelay = 0.9;
  const typingFrameCount = Math.min(ctaText.length * 3, 60);
  const blinkingFrameCount = Math.max(
    Math.round((ctaDuration - ctaTextDelay) * FPS) - typingFrameCount,
    0,
  );

  const cover = await fnUrl(
    "image",
    "promo-headline",
    {
      kicker,
      productName,
      tagline,
      accentColor,
      backgroundImageUrl: imageUrl,
    } satisfies PromoHeadlineProps,
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
      // The conversation plays out over the chat chrome.
      effieSegment({
        duration: chatDuration,
        layers: [
          {
            type: "image",
            source: await fnUrl(
              "image",
              "chat-header",
              { contactName, accentColor } satisfies ChatHeaderProps,
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
                accentColor,
                pace,
              } satisfies ChatConversationProps,
              { width, height },
            ),
          },
        ],
      }),
      // CTA outro: price tag bounces in, typewriter spells the call to action.
      effieSegment({
        duration: ctaDuration,
        transition: { type: "fade", duration: 0.6 },
        layers: [
          {
            type: "image",
            source: await fnUrl(
              "image",
              "price-tag",
              {
                label: saleLabel,
                price,
                oldPrice,
                accentColor,
              } satisfies PriceTagProps,
              { width, height },
            ),
            motion: { type: "bounce", start: 0.3, duration: 1.2 },
            effects: [
              { type: "fade-out", start: ctaDuration - 0.6, duration: 0.6 },
            ],
          },
          {
            type: "animation",
            source: await fnUrl(
              "annie",
              "text-typewriter",
              {
                text: ctaText,
                fontSize: Math.round(width * 0.045),
                fontColor: "#ffffff",
                typingFrameCount,
                blinkingFrameCount,
                horizontalAlignment: "center",
                verticalAlignment: "bottom",
              } satisfies TextTypewriterProps,
              { width, height },
            ),
            delay: ctaTextDelay,
            effects: [
              {
                type: "fade-out",
                start: ctaDuration - ctaTextDelay - 0.6,
                duration: 0.6,
              },
            ],
          },
        ],
      }),
    ],
  });
}
