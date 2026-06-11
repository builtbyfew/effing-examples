import { z } from "zod";
import { tween, easeOutBack, easeOutCubic, easeOutQuad } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { FontData } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { interBold, interSemiBold, loadFonts } from "~/fonts";
import {
  Avatar,
  Bubble,
  IndicatorShell,
  ReceiptLabel,
  TimestampChip,
  chatColors,
  chatMessageSchema,
  computeChatLayout,
  sampleConversation,
} from "~/chat-ui";
import type { ChatLayout, ChatMessage } from "~/chat-ui";

export const propsSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  // Shown as an initial in the avatar next to contact messages.
  contactName: z.string().optional(),
  timestampLabel: z.string().optional(),
  accentColor: z.string().optional(),
  // Multiplies typing and reading pauses; > 1 slows the conversation down.
  pace: z.number().positive().optional(),
  holdFrames: z.number().int().min(0).optional(),
  // When used as a layer in an effie, omit this so the chat chrome image
  // shows through. Set it in previewProps for a standalone preview.
  backgroundColor: z.string().optional(),
});

export type ChatConversationProps = z.infer<typeof propsSchema>;

export const previewProps: ChatConversationProps = {
  messages: sampleConversation,
  contactName: "Sole Mate",
  backgroundColor: "#16101f",
};

// --- Pacing -----------------------------------------------------------------

// All frame counts assume 30 fps.
const ENTRY_FRAMES = 9;
const SLIDE_FRAMES = 12;

type ScheduleEvent = {
  // Typing indicator visible from typeStart until pop (contact messages only).
  typeStart?: number;
  pop: number;
};

export type ConversationSchedule = {
  events: ScheduleEvent[];
  receiptFrame?: number;
  totalFrameCount: number;
};

function clampInt(value: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, value)));
}

/**
 * Frame schedule for a conversation: when each message's typing indicator
 * appears, when the bubble pops in, and the total length. Pure function of
 * the messages, so effies can derive their segment duration from it.
 */
export function conversationSchedule(
  messages: ChatMessage[],
  pace = 1,
  holdFrames = 42,
): ConversationSchedule {
  const events: ScheduleEvent[] = [];
  let t = 6;

  for (const msg of messages) {
    const effort = (msg.text?.length ?? 0) + (msg.imageUrl ? 30 : 0);
    if (msg.sender === "contact") {
      const typing = clampInt(effort * 1.05 * pace, 26, 64);
      events.push({ typeStart: t, pop: t + typing });
      t += typing;
    } else {
      // The user composes off-screen — a pause without an indicator.
      const composing = clampInt(effort * 0.85 * pace, 18, 48);
      events.push({ pop: t + composing });
      t += composing;
    }
    t += clampInt(effort * 0.5 * pace, 12, 36);
  }

  const lastPop = events[events.length - 1].pop;
  const receiptFrame =
    messages[messages.length - 1].sender === "user" ? lastPop + 14 : undefined;
  const totalFrameCount = Math.max(
    lastPop + holdFrames,
    (receiptFrame ?? 0) + 18,
  );
  return { events, receiptFrame, totalFrameCount };
}

// --- Sprites ------------------------------------------------------------------

type Sprite = {
  canvas: ReturnType<typeof createCanvas>;
  width: number;
  height: number;
};

/**
 * Render an element once and crop it to its exact content bounds (alpha
 * scan) — pixel-accurate sizes with no line-count heuristics, and the
 * expensive JSX layout, image resampling, and emoji fetches happen once
 * instead of once per frame.
 */
async function renderSprite(
  element: React.ReactElement,
  maxWidth: number,
  maxHeight: number,
  fonts: FontData[],
): Promise<Sprite> {
  const scratch = createCanvas(maxWidth, maxHeight);
  const ctx = scratch.getContext("2d");
  await renderReactElement(
    ctx,
    <div
      style={{
        width: maxWidth,
        height: maxHeight,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      {element}
    </div>,
    { fonts },
  );

  const { data } = ctx.getImageData(0, 0, maxWidth, maxHeight);
  let width = 0;
  let height = 0;
  for (let y = 0; y < maxHeight; y++) {
    const row = y * maxWidth * 4;
    for (let x = 0; x < maxWidth; x++) {
      if (data[row + x * 4 + 3] > 8) {
        if (y >= height) height = y + 1;
        if (x >= width) width = x + 1;
      }
    }
  }
  width = Math.max(width, 1);
  height = Math.max(height, 1);

  const canvas = createCanvas(width, height);
  canvas
    .getContext("2d")
    .drawImage(scratch, 0, 0, width, height, 0, 0, width, height);
  return { canvas, width, height };
}

// Generous height bound for a bubble's scratch canvas; the alpha scan finds
// the exact height within it.
function bubbleBound(msg: ChatMessage, layout: ChatLayout): number {
  const textLines = msg.text ? Math.ceil(msg.text.length / 8) + 2 : 0;
  return (
    (msg.imageUrl ? layout.imageHeight : 0) +
    textLines * Math.round(layout.fontSize * 1.4) +
    2 * layout.paddingY +
    100
  );
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

// --- Runner ---------------------------------------------------------------------

export async function* runner({
  props: {
    messages,
    contactName,
    timestampLabel = "Today 9:41",
    accentColor = "#7c5cd6",
    pace = 1,
    holdFrames = 42,
    backgroundColor,
  },
  bounds: { width, height },
}: RunnerArgs<ChatConversationProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interBold, interSemiBold]);
  const layout = computeChatLayout(width, height);
  const { events, receiptFrame, totalFrameCount } = conversationSchedule(
    messages,
    pace,
    holdFrames,
  );

  // Pre-render every element once. Each message gets two variants — bottom
  // corner as tail vs. grouped — since the tail hops to the newest bubble of
  // a same-sender run as the conversation grows.
  const bubbles = await Promise.all(
    messages.map(async (msg, i) => {
      const isUser = msg.sender === "user";
      const prevSameSender = i > 0 && messages[i - 1].sender === msg.sender;
      const top = prevSameSender ? layout.midRadius : layout.bigRadius;
      const radii = (bottom: number): [number, number, number, number] =>
        isUser
          ? [layout.bigRadius, top, bottom, layout.bigRadius]
          : [top, layout.bigRadius, layout.bigRadius, bottom];
      const bound = bubbleBound(msg, layout);
      const [tail, grouped] = await Promise.all(
        [layout.tailRadius, layout.midRadius].map((bottom) =>
          renderSprite(
            <Bubble
              msg={msg}
              layout={layout}
              accentColor={accentColor}
              radii={radii(bottom)}
            />,
            layout.maxBubbleWidth,
            bound,
            fonts,
          ),
        ),
      );
      return { tail, grouped };
    }),
  );
  const indicator = await renderSprite(
    <IndicatorShell layout={layout} />,
    layout.maxBubbleWidth,
    Math.round(layout.fontSize * 5),
    fonts,
  );
  const chip = await renderSprite(
    <TimestampChip label={timestampLabel} layout={layout} />,
    layout.maxBubbleWidth,
    Math.round(layout.fontSize * 4),
    fonts,
  );
  const avatar = await renderSprite(
    <Avatar
      initial={contactName?.charAt(0).toUpperCase() ?? ""}
      layout={layout}
      accentColor={accentColor}
    />,
    layout.avatarSize + 8,
    layout.avatarSize + 8,
    fonts,
  );
  const receipt = receiptFrame
    ? await renderSprite(
        <ReceiptLabel layout={layout} />,
        layout.maxBubbleWidth,
        Math.round(layout.fontSize * 3),
        fonts,
      )
    : undefined;

  // Gap between message i-1 and i — tighter inside a same-sender run.
  const gapBefore = messages.map((msg, i) =>
    i > 0 && messages[i - 1].sender === msg.sender
      ? layout.smallGap
      : layout.bigGap,
  );

  const receiptReserve = receiptFrame ? Math.round(layout.fontSize * 1.5) : 0;
  const stackBottom =
    height -
    layout.bottomInset -
    Math.round(layout.fontSize * 0.9) -
    receiptReserve;

  // Upward shift that message j (and its typing indicator) imposes on
  // everything above it in the stack at the given frame.
  function shiftOf(j: number, frame: number): number {
    const { typeStart, pop } = events[j];
    const slidePop = easeOutCubic(clamp01((frame - pop) / SLIDE_FRAMES));
    if (typeStart !== undefined) {
      const slideTyp = easeOutCubic(clamp01((frame - typeStart) / SLIDE_FRAMES));
      return (
        (indicator.height + gapBefore[j]) * slideTyp +
        (bubbles[j].tail.height - indicator.height) * slidePop
      );
    }
    return (bubbles[j].tail.height + gapBefore[j]) * slidePop;
  }

  yield* tween(totalFrameCount, async (_interval, frame) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Messages scroll between the header and the input bar.
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      0,
      layout.topInset,
      width,
      height - layout.topInset - layout.bottomInset,
    );
    ctx.clip();

    const shiftAbove = (i: number) => {
      let total = 0;
      for (let j = i + 1; j < messages.length; j++) total += shiftOf(j, frame);
      return total;
    };

    // Draw a sprite with opacity and a pop-in scale anchored at (originX, bottomY).
    const drawSprite = (
      sprite: Sprite,
      x: number,
      y: number,
      opacity: number,
      scale: number,
      originX: number,
    ) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      if (scale !== 1) {
        const originY = y + sprite.height;
        ctx.translate(originX, originY);
        ctx.scale(scale, scale);
        ctx.translate(-originX, -originY);
      }
      ctx.drawImage(sprite.canvas, x, y);
      ctx.restore();
    };

    // Timestamp chip scrolls along above the first message.
    drawSprite(
      chip,
      Math.round((width - chip.width) / 2),
      stackBottom - chip.height - shiftAbove(-1),
      1,
      1,
      0,
    );

    messages.forEach((msg, i) => {
      const { pop } = events[i];
      if (frame < pop) return;

      const isUser = msg.sender === "user";
      const entry = clamp01((frame - pop) / ENTRY_FRAMES);
      const opacity = easeOutQuad(clamp01((frame - pop) / 7));
      const scale = 0.55 + 0.45 * easeOutBack(entry);

      // Tail and avatar live on the last visible bubble of a same-sender run.
      const nextVisibleSameSender =
        i < messages.length - 1 &&
        messages[i + 1].sender === msg.sender &&
        frame >= events[i + 1].pop;
      const isTail = !nextVisibleSameSender;
      const sprite = isTail ? bubbles[i].tail : bubbles[i].grouped;

      const rise = (1 - easeOutCubic(entry)) * sprite.height * 0.25;
      const y = stackBottom - sprite.height - shiftAbove(i) + rise;
      const x = isUser
        ? width - layout.outerMargin - sprite.width
        : layout.outerMargin + layout.avatarSize + layout.avatarGap;
      const originX = isUser ? x + sprite.width : x;

      drawSprite(sprite, x, y, opacity, scale, originX);

      if (!isUser && isTail) {
        drawSprite(
          avatar,
          layout.outerMargin,
          y + sprite.height - avatar.height,
          opacity,
          1,
          0,
        );
      }

      // Read receipt under the final user message.
      if (
        i === messages.length - 1 &&
        receipt &&
        receiptFrame &&
        frame >= receiptFrame
      ) {
        drawSprite(
          receipt,
          width - layout.outerMargin - receipt.width,
          y + sprite.height + Math.round(layout.fontSize * 0.35),
          easeOutQuad(clamp01((frame - receiptFrame) / 10)),
          1,
          0,
        );
      }
    });

    // Typing indicator for the contact message currently being "typed".
    const typingIndex = events.findIndex(
      (e) => e.typeStart !== undefined && frame >= e.typeStart && frame < e.pop,
    );
    if (typingIndex >= 0) {
      const typeStart = events[typingIndex].typeStart!;
      const entry = clamp01((frame - typeStart) / ENTRY_FRAMES);
      const x = layout.outerMargin + layout.avatarSize + layout.avatarGap;
      const y = stackBottom - indicator.height;
      drawSprite(
        indicator,
        x,
        y,
        easeOutQuad(entry),
        0.55 + 0.45 * easeOutBack(entry),
        x,
      );

      // Pulsing dots, drawn over the pre-rendered pill.
      const { dotSize } = layout;
      const dotStep = dotSize + Math.round(dotSize * 0.55);
      const centerY = y + indicator.height / 2;
      ctx.save();
      ctx.fillStyle = chatColors.contactText;
      for (let d = 0; d < 3; d++) {
        ctx.globalAlpha =
          0.3 +
          0.55 * (0.5 + 0.5 * Math.sin((frame - typeStart - d * 5) * 0.45));
        ctx.beginPath();
        ctx.arc(
          x + layout.paddingX + dotSize / 2 + d * dotStep,
          centerY,
          dotSize / 2,
          0,
          2 * Math.PI,
        );
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
    return canvas.encode("png");
  });
}
