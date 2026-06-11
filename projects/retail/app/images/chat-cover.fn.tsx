import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interBold, interSemiBold, loadFonts } from "~/fonts";
import {
  Avatar,
  Bubble,
  ChatChrome,
  IndicatorShell,
  TimestampChip,
  chatMessageSchema,
  computeChatLayout,
  sampleConversation,
} from "~/chat-ui";

// A still of the conversation mid-flight — used as the chat-promo cover so
// the thumbnail reads as a messaging video rather than a product card.

export const propsSchema = z.object({
  contactName: z.string(),
  messages: z.array(chatMessageSchema).min(1),
  timestampLabel: z.string().optional(),
  accentColor: z.string().optional(),
  // Show the contact's typing indicator under the messages.
  typing: z.boolean().optional(),
});

export type ChatCoverProps = z.infer<typeof propsSchema>;

export const previewProps: ChatCoverProps = {
  contactName: "Sole Mate",
  messages: sampleConversation.slice(0, 3),
  typing: true,
};

export async function runner({
  props: {
    contactName,
    messages,
    timestampLabel = "Today 9:41",
    accentColor = "#7c5cd6",
    typing = false,
  },
  bounds: { width, height },
}: RunnerArgs<ChatCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interBold, interSemiBold]);
  const layout = computeChatLayout(width, height);
  const initial = contactName.charAt(0).toUpperCase();

  const canvas = createCanvas(width, height);
  await renderReactElement(
    canvas.getContext("2d"),
    <div style={{ width, height, display: "flex" }}>
      <ChatChrome
        contactName={contactName}
        accentColor={accentColor}
        width={width}
        height={height}
      />
      <div
        style={{
          position: "absolute",
          top: layout.topInset,
          left: layout.outerMargin,
          width: width - 2 * layout.outerMargin,
          height:
            height -
            layout.topInset -
            layout.bottomInset -
            Math.round(layout.fontSize * 0.9),
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          overflow: "hidden",
        }}
      >
        <div
          style={{ display: "flex", width: "100%", justifyContent: "center" }}
        >
          <TimestampChip label={timestampLabel} layout={layout} />
        </div>
        {messages.map((msg, i) => {
          const isUser = msg.sender === "user";
          const prevSameSender = i > 0 && messages[i - 1].sender === msg.sender;
          const nextSameSender =
            i < messages.length - 1 && messages[i + 1].sender === msg.sender;
          // The contact's bubble keeps a grouped corner when typing follows.
          const isTail =
            !nextSameSender &&
            !(typing && !isUser && i === messages.length - 1);
          const top = prevSameSender ? layout.midRadius : layout.bigRadius;
          const bottom = isTail ? layout.tailRadius : layout.midRadius;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
                width: "100%",
                justifyContent: isUser ? "flex-end" : "flex-start",
                marginTop: prevSameSender ? layout.smallGap : layout.bigGap,
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
                    <Avatar
                      initial={initial}
                      layout={layout}
                      accentColor={accentColor}
                    />
                  )}
                </div>
              )}
              <Bubble
                msg={msg}
                layout={layout}
                accentColor={accentColor}
                radii={
                  isUser
                    ? [layout.bigRadius, top, bottom, layout.bigRadius]
                    : [top, layout.bigRadius, layout.bigRadius, bottom]
                }
              />
            </div>
          );
        })}
        {typing && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              marginTop: layout.bigGap,
            }}
          >
            <div
              style={{
                width: layout.avatarSize,
                marginRight: layout.avatarGap,
                display: "flex",
                flexShrink: 0,
              }}
            >
              <Avatar
                initial={initial}
                layout={layout}
                accentColor={accentColor}
              />
            </div>
            <IndicatorShell
              layout={layout}
              dotOpacities={[0.85, 0.55, 0.35]}
            />
          </div>
        )}
      </div>
    </div>,
    { fonts },
  );

  return canvas.encode("jpeg");
}
