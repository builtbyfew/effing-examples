import { z } from "zod";
import { tween, easeOutBack, easeOutCubic, easeOutQuad } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { FontData } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { interBold, interSemiBold, loadFonts } from "~/fonts";
import { chatHeaderInset, chatInputInset } from "~/images/chat-header.fn";

export const chatMessageSchema = z.object({
  sender: z.enum(["user", "contact"]),
  text: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

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

// --- Layout -----------------------------------------------------------------

const CONTACT_BUBBLE = "#2b2344";
const CONTACT_TEXT = "#eae5f6";
const USER_TEXT = "#ffffff";
const MUTED_TEXT = "#8d82b5";

type Layout = {
  fontSize: number;
  paddingX: number;
  paddingY: number;
  maxBubbleWidth: number;
  imageHeight: number;
  avatarSize: number;
  avatarGap: number;
  outerMargin: number;
  bigGap: number;
  smallGap: number;
  bigRadius: number;
  midRadius: number;
  tailRadius: number;
  topInset: number;
  bottomInset: number;
};

function computeLayout(width: number, height: number): Layout {
  const min = Math.min(width, height);
  const fontSize = Math.round(min * 0.034);
  const maxBubbleWidth = Math.round(width * 0.64);
  return {
    fontSize,
    paddingX: Math.round(fontSize * 0.85),
    paddingY: Math.round(fontSize * 0.6),
    maxBubbleWidth,
    imageHeight: Math.round(maxBubbleWidth * 0.72),
    avatarSize: Math.round(fontSize * 1.5),
    avatarGap: Math.round(fontSize * 0.4),
    outerMargin: Math.round(width * 0.045),
    bigGap: Math.round(fontSize * 0.85),
    smallGap: Math.round(fontSize * 0.28),
    bigRadius: Math.round(fontSize * 1.25),
    midRadius: Math.round(fontSize * 0.45),
    tailRadius: Math.round(fontSize * 0.26),
    topInset: chatHeaderInset(width, height),
    bottomInset: chatInputInset(width, height),
  };
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

// --- Components ---------------------------------------------------------------

function Bubble({
  msg,
  layout,
  accentColor,
  radii,
}: {
  msg: ChatMessage;
  layout: Layout;
  accentColor: string;
  radii: [number, number, number, number]; // TL TR BR BL
}) {
  const isUser = msg.sender === "user";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        maxWidth: layout.maxBubbleWidth,
        backgroundColor: isUser ? accentColor : CONTACT_BUBBLE,
        borderTopLeftRadius: radii[0],
        borderTopRightRadius: radii[1],
        borderBottomRightRadius: radii[2],
        borderBottomLeftRadius: radii[3],
        overflow: "hidden",
      }}
    >
      {msg.imageUrl && (
        <img
          src={msg.imageUrl}
          style={{
            width: layout.maxBubbleWidth,
            height: layout.imageHeight,
            objectFit: "cover",
          }}
        />
      )}
      {msg.text && (
        <div
          style={{
            paddingLeft: layout.paddingX,
            paddingRight: layout.paddingX,
            paddingTop: layout.paddingY,
            paddingBottom: layout.paddingY,
            color: isUser ? USER_TEXT : CONTACT_TEXT,
            fontFamily: "Inter",
            fontSize: layout.fontSize,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}

function TypingDots({
  layout,
  frame,
  typeStart,
}: {
  layout: Layout;
  frame: number;
  typeStart: number;
}) {
  const dotSize = Math.round(layout.fontSize * 0.34);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: CONTACT_BUBBLE,
        borderTopLeftRadius: layout.bigRadius,
        borderTopRightRadius: layout.bigRadius,
        borderBottomRightRadius: layout.bigRadius,
        borderBottomLeftRadius: layout.tailRadius,
        paddingLeft: layout.paddingX,
        paddingRight: layout.paddingX,
        paddingTop: layout.paddingY + Math.round(dotSize * 0.4),
        paddingBottom: layout.paddingY + Math.round(dotSize * 0.4),
      }}
    >
      {[0, 1, 2].map((d) => (
        <div
          key={d}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize,
            backgroundColor: CONTACT_TEXT,
            marginLeft: d > 0 ? Math.round(dotSize * 0.55) : 0,
            opacity:
              0.3 +
              0.55 *
                (0.5 + 0.5 * Math.sin((frame - typeStart - d * 5) * 0.45)),
            display: "block",
          }}
        />
      ))}
    </div>
  );
}

function TimestampChip({
  label,
  layout,
}: {
  label: string;
  layout: Layout;
}) {
  return (
    <div
      style={{
        fontFamily: "Inter",
        fontWeight: 600,
        fontSize: Math.round(layout.fontSize * 0.72),
        color: MUTED_TEXT,
        paddingTop: Math.round(layout.fontSize * 0.3),
        paddingBottom: Math.round(layout.fontSize * 0.3),
      }}
    >
      {label}
    </div>
  );
}

// --- Measurement --------------------------------------------------------------

/**
 * Render an element once on a scratch canvas and scan the alpha channel to
 * find its exact content height — no line-count heuristics.
 */
async function measureContentHeight(
  element: React.ReactElement,
  width: number,
  maxHeight: number,
  fonts: FontData[],
): Promise<number> {
  const canvas = createCanvas(width, maxHeight);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <div
      style={{
        width,
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
  const { data } = ctx.getImageData(0, 0, width, maxHeight);
  for (let y = maxHeight - 1; y >= 0; y--) {
    const row = y * width * 4;
    for (let x = 3; x < width * 4; x += 16) {
      if (data[row + x] > 8) return y + 1;
    }
  }
  return 0;
}

function measureBound(msg: ChatMessage, layout: Layout): number {
  const textLines = msg.text
    ? Math.ceil(msg.text.length / 8) + 2 // generous upper bound, exact comes from the scan
    : 0;
  return (
    (msg.imageUrl ? layout.imageHeight : 0) +
    textLines * Math.round(layout.fontSize * 1.4) +
    2 * layout.paddingY +
    100
  );
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
  const layout = computeLayout(width, height);
  const { events, receiptFrame, totalFrameCount } = conversationSchedule(
    messages,
    pace,
    holdFrames,
  );

  const genericRadii: [number, number, number, number] = [
    layout.bigRadius,
    layout.bigRadius,
    layout.bigRadius,
    layout.bigRadius,
  ];
  const bubbleHeights = await Promise.all(
    messages.map((msg) =>
      measureContentHeight(
        <Bubble
          msg={msg}
          layout={layout}
          accentColor={accentColor}
          radii={genericRadii}
        />,
        layout.maxBubbleWidth,
        measureBound(msg, layout),
        fonts,
      ),
    ),
  );
  const indicatorHeight = await measureContentHeight(
    <TypingDots layout={layout} frame={0} typeStart={0} />,
    layout.maxBubbleWidth,
    Math.round(layout.fontSize * 5),
    fonts,
  );
  const chipHeight = await measureContentHeight(
    <TimestampChip label={timestampLabel} layout={layout} />,
    layout.maxBubbleWidth,
    Math.round(layout.fontSize * 4),
    fonts,
  );

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
      const slideTyp = easeOutCubic(
        clamp01((frame - typeStart) / SLIDE_FRAMES),
      );
      return (
        (indicatorHeight + gapBefore[j]) * slideTyp +
        (bubbleHeights[j] - indicatorHeight) * slidePop
      );
    }
    return (bubbleHeights[j] + gapBefore[j]) * slidePop;
  }

  yield* tween(totalFrameCount, async (_interval, frame) => {
    const rows: React.ReactNode[] = [];
    const shiftAbove = (i: number) => {
      let total = 0;
      for (let j = i + 1; j < messages.length; j++) total += shiftOf(j, frame);
      return total;
    };

    // Timestamp chip scrolls along above the first message.
    const chipY = stackBottom - chipHeight - shiftAbove(-1);
    rows.push(
      <div
        key="chip"
        style={{
          position: "absolute",
          top: chipY - layout.topInset,
          left: layout.outerMargin,
          width: width - 2 * layout.outerMargin,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <TimestampChip label={timestampLabel} layout={layout} />
      </div>,
    );

    messages.forEach((msg, i) => {
      const { pop } = events[i];
      if (frame < pop) return;

      const isUser = msg.sender === "user";
      const entry = clamp01((frame - pop) / ENTRY_FRAMES);
      const opacity = easeOutQuad(clamp01((frame - pop) / 7));
      const scale = 0.55 + 0.45 * easeOutBack(entry);
      const rise = (1 - easeOutCubic(entry)) * bubbleHeights[i] * 0.25;

      const y = stackBottom - bubbleHeights[i] - shiftAbove(i);

      // Tail and avatar live on the last visible bubble of a same-sender run.
      const nextVisibleSameSender =
        i < messages.length - 1 &&
        messages[i + 1].sender === msg.sender &&
        frame >= events[i + 1].pop;
      const prevSameSender = i > 0 && messages[i - 1].sender === msg.sender;
      const isTail = !nextVisibleSameSender;

      const senderTop = prevSameSender ? layout.midRadius : layout.bigRadius;
      const senderBottom = isTail ? layout.tailRadius : layout.midRadius;
      const radii: [number, number, number, number] = isUser
        ? [layout.bigRadius, senderTop, senderBottom, layout.bigRadius]
        : [senderTop, layout.bigRadius, layout.bigRadius, senderBottom];

      rows.push(
        <div
          key={i}
          style={{
            position: "absolute",
            top: y - layout.topInset,
            left: layout.outerMargin,
            width: width - 2 * layout.outerMargin,
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: isUser ? "flex-end" : "flex-start",
            opacity,
            transform: `translateY(${rise}px) scale(${scale})`,
            transformOrigin: `${isUser ? "100%" : "0%"} 100%`,
          }}
        >
          {!isUser && (
            <div
              style={{
                width: layout.avatarSize,
                marginRight: layout.avatarGap,
                display: "flex",
                flexShrink: 0,
              }}
            >
              {isTail && (
                <div
                  style={{
                    width: layout.avatarSize,
                    height: layout.avatarSize,
                    borderRadius: layout.avatarSize,
                    backgroundImage: `linear-gradient(to bottom, ${accentColor}, #4f3a8f)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Inter",
                    fontWeight: 700,
                    fontSize: Math.round(layout.avatarSize * 0.44),
                    color: "#ffffff",
                  }}
                >
                  {contactName?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
          <Bubble
            msg={msg}
            layout={layout}
            accentColor={accentColor}
            radii={radii}
          />
        </div>,
      );

      // Read receipt under the final user message.
      if (i === messages.length - 1 && receiptFrame && frame >= receiptFrame) {
        rows.push(
          <div
            key="receipt"
            style={{
              position: "absolute",
              top: y - layout.topInset + bubbleHeights[i] + Math.round(layout.fontSize * 0.35),
              left: layout.outerMargin,
              width: width - 2 * layout.outerMargin,
              display: "flex",
              justifyContent: "flex-end",
              opacity: easeOutQuad(clamp01((frame - receiptFrame) / 10)),
            }}
          >
            <div
              style={{
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: Math.round(layout.fontSize * 0.72),
                color: MUTED_TEXT,
              }}
            >
              Read
            </div>
          </div>,
        );
      }
    });

    // Typing indicator for the contact message currently being "typed".
    const typingIndex = events.findIndex(
      (e, i) =>
        e.typeStart !== undefined &&
        frame >= e.typeStart &&
        frame < e.pop &&
        messages[i].sender === "contact",
    );
    if (typingIndex >= 0) {
      const { typeStart } = events[typingIndex];
      const entry = clamp01((frame - typeStart!) / ENTRY_FRAMES);
      rows.push(
        <div
          key="typing"
          style={{
            position: "absolute",
            top: stackBottom - indicatorHeight - layout.topInset,
            left: layout.outerMargin + layout.avatarSize + layout.avatarGap,
            display: "flex",
            opacity: easeOutQuad(entry),
            transform: `scale(${0.55 + 0.45 * easeOutBack(entry)})`,
            transformOrigin: "0% 100%",
          }}
        >
          <TypingDots layout={layout} frame={frame} typeStart={typeStart!} />
        </div>,
      );
    }

    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          backgroundColor,
        }}
      >
        {/* Messages scroll between the header and the input bar. */}
        <div
          style={{
            position: "absolute",
            top: layout.topInset,
            left: 0,
            width,
            height: height - layout.topInset - layout.bottomInset,
            overflow: "hidden",
          }}
        >
          {rows}
        </div>
      </div>,
      { fonts },
    );
    return canvas.encode("png");
  });
}
