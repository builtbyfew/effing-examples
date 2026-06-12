import { z } from "zod";
import { effieData, effieWebUrl, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import { chatMessageSchema, sampleConversation } from "~/chat-ui";
import { conversationSchedule } from "~/annies/chat-conversation.fn";
import type { ChatConversationProps } from "~/annies/chat-conversation.fn";
import { notificationTapSchedule } from "~/annies/notification-tap.fn";
import type { NotificationTapProps } from "~/annies/notification-tap.fn";
import type { LogoIntroProps } from "~/annies/logo-intro.fn";
import type { ChatChromeProps } from "~/images/chat-chrome.fn";
import type { ChatCoverProps } from "~/images/chat-cover.fn";
import type { GlowBackdropProps } from "~/images/glow-backdrop.fn";
import { ctaOutroPropsSchema, ctaOutroSegment } from "~/effies/cta-outro";
import {
  chatSoundEffectsDataUrl,
  notificationIntroSoundEffectsDataUrl,
} from "~/sound-effects";

// A brand-DM promo: the first message arrives as a push notification over
// the shop's animated logo, a tap opens the chat, the product is pitched in
// a messaging conversation — typing indicator, message pops, read receipt —
// then a CTA outro lands the offer.

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
  // The first message was just tapped as a notification, so it's already in
  // the chat when the app opens (seeded).
  const seededCount = 1;
  const schedule = conversationSchedule(messages, pace, undefined, seededCount);
  const chatDuration = schedule.totalFrameCount / FPS;

  // The intro: the shop's animated logo holds the screen, the first message
  // lands as a notification over it, and a tap on it "opens" the chat (a
  // zoom transition into the next segment). The notification-tap annie's
  // schedule fixes the segment length, the sound offsets, and when the logo
  // dims behind the banner.
  const introDuration = notificationTapSchedule.totalFrameCount / FPS;
  const introSegment = effieSegment({
    duration: introDuration,
    audio: soundEffects
      ? {
          source: effieWebUrl(
            notificationIntroSoundEffectsDataUrl({
              durationSec: introDuration,
              popSec: notificationTapSchedule.popFrame / FPS,
              tapSec: notificationTapSchedule.tapFrame / FPS,
            }),
          ),
          volume: 0.8,
        }
      : undefined,
    layers: [
      {
        type: "animation",
        source: await fnUrl(
          "annie",
          "logo-intro",
          {
            accentColor,
            frameCount: notificationTapSchedule.totalFrameCount,
            dimFrame: notificationTapSchedule.popFrame + 4,
          } satisfies LogoIntroProps,
          { width, height },
        ),
      },
      {
        type: "animation",
        source: await fnUrl(
          "annie",
          "notification-tap",
          {
            contactName,
            message: messages[0],
            accentColor,
          } satisfies NotificationTapProps,
          { width, height },
        ),
      },
    ],
  });

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
      introSegment,
      // The conversation plays out over the chat chrome, with message pops
      // pre-mixed into one track at the schedule's exact offsets (the effie
      // format has no timed audio cues; see ~/sound-effects).
      effieSegment({
        duration: chatDuration,
        // The zoom in from the tapped notification reads as the app opening.
        transition: { type: "zoom", duration: 0.5 },
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
                seededCount,
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
        // Close on the same gradient-and-glow backdrop the intro opens on.
        background: {
          type: "image",
          source: await fnUrl(
            "image",
            "glow-backdrop",
            { accentColor } satisfies GlowBackdropProps,
            { width, height },
          ),
        },
        width,
        height,
        fps: FPS,
      }),
    ],
  });
}
