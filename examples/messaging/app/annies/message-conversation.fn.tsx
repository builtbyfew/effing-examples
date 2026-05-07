import { z } from "zod";
import { interSemiBold, interBold, loadFonts } from "~/fonts";
import { tween, easeOutCubic, easeOutQuad } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";

const messageSchema = z.object({
  sender: z.enum(["a", "b"]),
  text: z.string(),
});

export const propsSchema = z.object({
  messages: z.array(messageSchema),
  totalFrameCount: z.number().int().min(1),
  staggerFrameCount: z.number().int().min(1).optional(),
  entryFrameCount: z.number().int().min(1).optional(),
  slideFrameCount: z.number().int().min(1).optional(),
});

export type MessageConversationProps = z.infer<typeof propsSchema>;
type Message = z.infer<typeof messageSchema>;

export const previewProps: MessageConversationProps = {
  messages: [
    { sender: "a", text: "Hey! Did you catch the game last night?" },
    { sender: "b", text: "Yes! That last-minute goal was incredible" },
    { sender: "a", text: "I know right, I nearly fell off the couch" },
    { sender: "b", text: "We should watch the next one together" },
    { sender: "a", text: "Absolutely, let's make it happen" },
  ],
  totalFrameCount: 270,
  staggerFrameCount: 45,
  entryFrameCount: 20,
  slideFrameCount: 28,
};

// Sender A: right-aligned blue bubbles (the "user")
// Sender B: left-aligned dark bubbles (the "contact")
const BG = "#0F172A";
const BUBBLE_A = "#2563EB";
const BUBBLE_B = "#1E293B";
const TEXT_A = "#FFFFFF";
const TEXT_B = "#E2E8F0";

type Layout = {
  fontSize: number;
  lineHeightPx: number;
  paddingX: number;
  paddingY: number;
  bubbleWidth: number;
  sideMargin: number;
  gap: number;
  bottomPadding: number;
  charsPerLine: number;
  bigRadius: number;
  smallRadius: number;
};

function computeLayout(width: number, height: number): Layout {
  const min = Math.min(width, height);
  const fontSize = Math.round(min * 0.035);
  const lineHeightPx = Math.round(fontSize * 1.45);
  const paddingX = Math.round(fontSize * 0.9);
  const paddingY = Math.round(fontSize * 0.55);
  const bubbleWidth = Math.round(width * 0.68);
  const sideMargin = Math.round(width * 0.06);
  const gap = Math.round(fontSize * 0.55);
  const bottomPadding = Math.round(height * 0.09);
  const charsPerLine = Math.max(
    10,
    Math.floor((bubbleWidth - 2 * paddingX) / (fontSize * 0.53)),
  );
  const bigRadius = Math.round(fontSize * 1.15);
  const smallRadius = Math.round(fontSize * 0.22);
  return {
    fontSize,
    lineHeightPx,
    paddingX,
    paddingY,
    bubbleWidth,
    sideMargin,
    gap,
    bottomPadding,
    charsPerLine,
    bigRadius,
    smallRadius,
  };
}

// Estimates bubble height using a fixed bubbleWidth so positions are accurate.
function estimateBubbleHeight(text: string, layout: Layout): number {
  const lines = Math.max(1, Math.ceil(text.length / layout.charsPerLine));
  return lines * layout.lineHeightPx + layout.paddingY * 2;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export async function* runner({
  props: {
    messages,
    totalFrameCount,
    staggerFrameCount = 45,
    entryFrameCount = 20,
    slideFrameCount = 28,
  },
  bounds: { width, height },
}: RunnerArgs<MessageConversationProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);
  const layout = computeLayout(width, height);
  const bubbleHeights = messages.map((msg) =>
    estimateBubbleHeight(msg.text, layout),
  );

  yield* tween(totalFrameCount, async (_interval, frame) => {
    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <Conversation
        messages={messages}
        bubbleHeights={bubbleHeights}
        layout={layout}
        frame={frame}
        staggerFrameCount={staggerFrameCount}
        entryFrameCount={entryFrameCount}
        slideFrameCount={slideFrameCount}
        width={width}
        height={height}
      />,
      { fonts },
    );
    return canvas.encode("png");
  });
}

function Conversation({
  messages,
  bubbleHeights,
  layout,
  frame,
  staggerFrameCount,
  entryFrameCount,
  slideFrameCount,
  width,
  height,
}: {
  messages: Message[];
  bubbleHeights: number[];
  layout: Layout;
  frame: number;
  staggerFrameCount: number;
  entryFrameCount: number;
  slideFrameCount: number;
  width: number;
  height: number;
}) {
  const {
    fontSize,
    lineHeightPx,
    paddingX,
    paddingY,
    bubbleWidth,
    sideMargin,
    gap,
    bottomPadding,
    bigRadius,
    smallRadius,
  } = layout;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        backgroundColor: BG,
        display: "flex",
        overflow: "hidden",
      }}
    >
      {messages.map((msg, i) => {
        const startFrame = i * staggerFrameCount;
        if (frame < startFrame) return null;

        const entryRaw = clamp01((frame - startFrame) / entryFrameCount);
        const opacity = easeOutQuad(entryRaw);

        // Base Y: anchored to the bottom, shifts up as later messages arrive
        let y = height - bottomPadding - bubbleHeights[i];
        for (let j = i + 1; j < messages.length; j++) {
          const slideStart = j * staggerFrameCount;
          if (frame < slideStart) continue;
          const slideProgress = easeOutCubic(
            clamp01((frame - slideStart) / slideFrameCount),
          );
          y -= (bubbleHeights[j] + gap) * slideProgress;
        }

        // Entry: slide up from slightly below its resting position
        const entryOffset = (1 - easeOutCubic(entryRaw)) * fontSize * 1.5;

        const isA = msg.sender === "a";
        const x = isA ? width - sideMargin - bubbleWidth : sideMargin;

        // The corner nearest the bottom-centre is small, pointing toward sender
        const borderTopLeftRadius = bigRadius;
        const borderTopRightRadius = bigRadius;
        const borderBottomLeftRadius = isA ? bigRadius : smallRadius;
        const borderBottomRightRadius = isA ? smallRadius : bigRadius;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: y,
              left: x,
              display: "flex",
              opacity,
              transform: `translateY(${entryOffset}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                width: bubbleWidth,
                backgroundColor: isA ? BUBBLE_A : BUBBLE_B,
                borderTopLeftRadius,
                borderTopRightRadius,
                borderBottomLeftRadius,
                borderBottomRightRadius,
                paddingLeft: paddingX,
                paddingRight: paddingX,
                paddingTop: paddingY,
                paddingBottom: paddingY,
                color: isA ? TEXT_A : TEXT_B,
                fontFamily: "Inter",
                fontSize,
                fontWeight: isA ? 700 : 600,
                lineHeight: lineHeightPx,
                flexWrap: "wrap",
              }}
            >
              {msg.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
