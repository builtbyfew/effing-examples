import { z } from "zod";
import { interSemiBold, interBold, loadFonts } from "~/fonts";
import { tween, easeOutCubic, easeOutQuad } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { headerHeight } from "~/images/conversation-background.fn";

// Sender A: right-aligned blue bubbles (the "user")
// Sender B: left-aligned dark bubbles (the "contact / brand")
const BG = "#0F172A";
const BUBBLE_A = "#2563EB";
const BUBBLE_B = "#1E293B";
const TEXT_A = "#FFFFFF";
const TEXT_B = "#E2E8F0";
const AVATAR_A = "#1D4ED8";
const AVATAR_B = "#334155";

const messageSchema = z.object({
  sender: z.enum(["a", "b"]),
  text: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export const propsSchema = z.object({
  messages: z.array(messageSchema),
  totalFrameCount: z.number().int().min(1),
  staggerFrameCount: z.number().int().min(1).optional(),
  entryFrameCount: z.number().int().min(1).optional(),
  slideFrameCount: z.number().int().min(1).optional(),
  contactA: z.string(),
  contactB: z.string(),
  // When used as a layer in an effie, omit this so the background is transparent.
  // Set it explicitly in previewProps for a correct standalone preview.
  backgroundColor: z.string().optional(),
});

export type MessageConversationProps = z.infer<typeof propsSchema>;
type Message = z.infer<typeof messageSchema>;

export const previewProps: MessageConversationProps = {
  messages: [
    {
      sender: "b",
      imageUrl: "https://static.effing.dev/unsplash/sneakers.jpg",
      text: "New drop 🔥 The AirFlow Pro just launched",
    },
    { sender: "a", text: "These look incredible, are they available now?" },
    { sender: "b", text: "Yes! Use code LAUNCH20 for 20% off today only" },
    { sender: "a", text: "Just ordered a pair 🙌 Can't wait!" },
    { sender: "b", text: "You're going to love them — ships in 2–3 days" },
  ],
  totalFrameCount: 300,
  staggerFrameCount: 50,
  entryFrameCount: 20,
  slideFrameCount: 28,
  contactA: "Bryan",
  contactB: "AirFlow Pro",
  backgroundColor: BG,
};

type Layout = {
  fontSize: number;
  lineHeightPx: number;
  paddingX: number;
  paddingY: number;
  bubbleWidth: number;
  avatarSize: number;
  avatarGap: number;
  outerMargin: number;
  sideMargin: number;
  gap: number;
  topInset: number;
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
  const avatarSize = Math.round(fontSize * 1.35);
  const avatarGap = Math.round(fontSize * 0.4);
  const outerMargin = Math.round(width * 0.025);
  const sideMargin = outerMargin + avatarSize + avatarGap;
  const gap = Math.round(fontSize * 0.55);
  const bottomPadding = Math.round(height * 0.09);
  const charsPerLine = Math.max(
    10,
    Math.floor((bubbleWidth - 2 * paddingX) / (fontSize * 0.53)),
  );
  const bigRadius = Math.round(fontSize * 1.15);
  const smallRadius = Math.round(fontSize * 0.22);
  const topInset = headerHeight(width, height);
  return {
    fontSize,
    lineHeightPx,
    paddingX,
    paddingY,
    bubbleWidth,
    avatarSize,
    avatarGap,
    outerMargin,
    sideMargin,
    gap,
    topInset,
    bottomPadding,
    charsPerLine,
    bigRadius,
    smallRadius,
  };
}

function imageHeight(layout: Layout): number {
  return Math.round(layout.bubbleWidth * 0.75);
}

function estimateBubbleHeight(msg: Message, layout: Layout): number {
  const { lineHeightPx, paddingY, charsPerLine } = layout;
  const imgH = msg.imageUrl ? imageHeight(layout) : 0;
  const textLines = msg.text ? Math.max(1, Math.ceil(msg.text.length / charsPerLine)) : 0;
  const textH = textLines > 0 ? textLines * lineHeightPx + paddingY * 2 : 0;
  return imgH + textH;
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
    contactA,
    contactB,
    backgroundColor,
  },
  bounds: { width, height },
}: RunnerArgs<MessageConversationProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);
  const layout = computeLayout(width, height);

  const bubbleHeights = messages.map((msg) => estimateBubbleHeight(msg, layout));
  const initialA = contactA.charAt(0).toUpperCase();
  const initialB = contactB.charAt(0).toUpperCase();

  yield* tween(totalFrameCount, async (_interval, frame) => {
    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <Conversation
        messages={messages}
        bubbleHeights={bubbleHeights}
        initialA={initialA}
        initialB={initialB}
        layout={layout}
        frame={frame}
        staggerFrameCount={staggerFrameCount}
        entryFrameCount={entryFrameCount}
        slideFrameCount={slideFrameCount}
        backgroundColor={backgroundColor}
        width={width}
        height={height}
      />,
      { fonts },
    );
    return canvas.encode("png");
  });
}

function AvatarCircle({
  initial,
  size,
  bgColor,
}: {
  initial: string;
  size: number;
  bgColor: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: bgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter",
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
        color: "#ffffff",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function Conversation({
  messages,
  bubbleHeights,
  initialA,
  initialB,
  layout,
  frame,
  staggerFrameCount,
  entryFrameCount,
  slideFrameCount,
  backgroundColor,
  width,
  height,
}: {
  messages: Message[];
  bubbleHeights: number[];
  initialA: string;
  initialB: string;
  layout: Layout;
  frame: number;
  staggerFrameCount: number;
  entryFrameCount: number;
  slideFrameCount: number;
  backgroundColor?: string;
  width: number;
  height: number;
}) {
  const {
    fontSize,
    lineHeightPx,
    paddingX,
    paddingY,
    bubbleWidth,
    avatarSize,
    avatarGap,
    outerMargin,
    sideMargin,
    gap,
    topInset,
    bottomPadding,
    bigRadius,
    smallRadius,
  } = layout;

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width, height, backgroundColor }}>
      {/* Clip area — messages disappear behind the header */}
      <div
        style={{
          position: "absolute",
          top: topInset,
          left: 0,
          width,
          height: height - topInset,
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

        // Row starts at outerMargin for B, or at (width - sideMargin - bubbleWidth) for A
        const rowX = isA ? width - sideMargin - bubbleWidth : outerMargin;

        const borderTopLeftRadius = bigRadius;
        const borderTopRightRadius = bigRadius;
        const borderBottomLeftRadius = isA ? bigRadius : smallRadius;
        const borderBottomRightRadius = isA ? smallRadius : bigRadius;

        const imgSrc = msg.imageUrl;
        const imgH = imageHeight(layout);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: y - topInset, // relative to clip container
              left: rowX,
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              gap: avatarGap,
              opacity,
              transform: `translateY(${entryOffset}px)`,
            }}
          >
            {/* Avatar on the left for B */}
            {!isA && (
              <AvatarCircle initial={initialB} size={avatarSize} bgColor={AVATAR_B} />
            )}

            {/* Bubble */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: bubbleWidth,
                backgroundColor: isA ? BUBBLE_A : BUBBLE_B,
                borderTopLeftRadius,
                borderTopRightRadius,
                borderBottomLeftRadius,
                borderBottomRightRadius,
                overflow: "hidden",
              }}
            >
              {imgSrc && (
                <img
                  src={imgSrc}
                  style={{ width: bubbleWidth, height: imgH, objectFit: "cover" }}
                />
              )}
              {msg.text && (
                <div
                  style={{
                    paddingLeft: paddingX,
                    paddingRight: paddingX,
                    paddingTop: paddingY,
                    paddingBottom: paddingY,
                    color: isA ? TEXT_A : TEXT_B,
                    fontFamily: "Inter",
                    fontSize,
                    fontWeight: isA ? 700 : 600,
                    lineHeight: `${lineHeightPx}px`,
                    flexWrap: "wrap",
                  }}
                >
                  {msg.text}
                </div>
              )}
            </div>

            {/* Avatar on the right for A */}
            {isA && (
              <AvatarCircle initial={initialA} size={avatarSize} bgColor={AVATAR_A} />
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
