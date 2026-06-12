import { z } from "zod";

// Shared chat building blocks: the message model, color palette, layout
// scale, and the components composed by the chat-conversation annie, the
// chat-chrome image, and the chat-cover image.

export const chatMessageSchema = z.object({
  sender: z.enum(["user", "contact"]),
  text: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// One conversation shared by every chat fn's previewProps, so the previews
// tell a consistent story.
export const sampleConversation: ChatMessage[] = [
  {
    sender: "contact",
    imageUrl:
      "https://static.effing.dev/unsplash/sneakers/max-petrunin-A4fETzh_wlo-unsplash.jpg",
    text: "The NB 574 just dropped 👟",
  },
  { sender: "user", text: "okay these are gorgeous 😍" },
  { sender: "user", text: "do they actually feel like clouds?" },
  { sender: "contact", text: "Literally. Bubble sole, zero break-in." },
  { sender: "contact", text: "Launch week: $129 with code CLOUD20" },
  { sender: "user", text: "say less — ordering now 🙌" },
];

export const chatColors = {
  contactBubble: "#2b2344",
  contactText: "#eae5f6",
  userText: "#ffffff",
  mutedText: "#8d82b5",
};

// --- Layout -------------------------------------------------------------------

// Vertical chrome insets — the message stack scrolls between the header and
// the input bar, so the annie and the chrome must agree on these.
export function chatHeaderInset(width: number, height: number): number {
  return Math.round(Math.min(width, height) * 0.125) + 1;
}

export function chatInputInset(width: number, height: number): number {
  const min = Math.min(width, height);
  return Math.round(min * 0.062) + 2 * Math.round(min * 0.028);
}

export type ChatLayout = {
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
  dotSize: number;
  topInset: number;
  bottomInset: number;
};

export function computeChatLayout(width: number, height: number): ChatLayout {
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
    dotSize: Math.round(fontSize * 0.34),
    topInset: chatHeaderInset(width, height),
    bottomInset: chatInputInset(width, height),
  };
}

// --- Components ----------------------------------------------------------------

export function Bubble({
  msg,
  layout,
  accentColor,
  radii,
}: {
  msg: ChatMessage;
  layout: ChatLayout;
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
        backgroundColor: isUser ? accentColor : chatColors.contactBubble,
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
            color: isUser ? chatColors.userText : chatColors.contactText,
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

// The typing-indicator pill, sized for three dots. The annie animates the
// dots by drawing them straight onto the frame canvas, so it renders the
// pill with invisible dots (the default); static consumers pass dotOpacities.
export function IndicatorShell({
  layout,
  dotOpacities = [0, 0, 0],
}: {
  layout: ChatLayout;
  dotOpacities?: [number, number, number];
}) {
  const { dotSize } = layout;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: chatColors.contactBubble,
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
            backgroundColor: chatColors.contactText,
            opacity: dotOpacities[d],
            marginLeft: d > 0 ? Math.round(dotSize * 0.55) : 0,
            display: "block",
          }}
        />
      ))}
    </div>
  );
}

export function TimestampChip({
  label,
  layout,
}: {
  label: string;
  layout: ChatLayout;
}) {
  return (
    <div
      style={{
        fontFamily: "Inter",
        fontWeight: 600,
        fontSize: Math.round(layout.fontSize * 0.72),
        color: chatColors.mutedText,
        paddingTop: Math.round(layout.fontSize * 0.3),
        paddingBottom: Math.round(layout.fontSize * 0.3),
      }}
    >
      {label}
    </div>
  );
}

export function Avatar({
  initial,
  layout,
  accentColor,
}: {
  initial: string;
  layout: ChatLayout;
  accentColor: string;
}) {
  return (
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
      {initial}
    </div>
  );
}

export function ReceiptLabel({ layout }: { layout: ChatLayout }) {
  return (
    <div
      style={{
        fontFamily: "Inter",
        fontWeight: 600,
        fontSize: Math.round(layout.fontSize * 0.72),
        color: chatColors.mutedText,
      }}
    >
      Read
    </div>
  );
}

// The full chat surface — gradient background, contact header, input bar.
export function ChatChrome({
  contactName,
  accentColor,
  width,
  height,
}: {
  contactName: string;
  accentColor: string;
  width: number;
  height: number;
}) {
  const min = Math.min(width, height);
  const headerH = chatHeaderInset(width, height) - 1;
  const avatarSize = Math.round(min * 0.064);
  const nameFontSize = Math.round(min * 0.036);
  const statusFontSize = Math.round(min * 0.026);
  const dotSize = Math.round(min * 0.015);
  const sideMargin = Math.round(width * 0.045);
  const chevronSize = Math.round(min * 0.04);

  const pillH = Math.round(min * 0.062);
  const inputMargin = Math.round(min * 0.028);
  const sendSize = Math.round(pillH * 0.74);

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        backgroundImage: "linear-gradient(to bottom, #1b1429, #110c1d)",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: headerH,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: sideMargin,
          paddingRight: sideMargin,
          backgroundColor: "#201833",
        }}
      >
        <svg
          width={chevronSize}
          height={chevronSize}
          viewBox="0 0 24 24"
          style={{ marginRight: Math.round(sideMargin * 0.7) }}
        >
          <path
            d="M15 4 L7 12 L15 20"
            fill="none"
            stroke="#a99fd1"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize,
            backgroundImage: `linear-gradient(to bottom, ${accentColor}, #4f3a8f)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: Math.round(avatarSize * 0.44),
            color: "#ffffff",
            marginRight: Math.round(min * 0.03),
          }}
        >
          {contactName.charAt(0).toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: nameFontSize,
              color: "#f4f1fb",
            }}
          >
            {contactName}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              marginTop: Math.round(min * 0.005),
            }}
          >
            <div
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize,
                backgroundColor: "#4ade80",
                marginRight: Math.round(dotSize * 0.8),
                display: "block",
              }}
            />
            <div
              style={{
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: statusFontSize,
                color: chatColors.mutedText,
              }}
            >
              online
            </div>
          </div>
        </div>
      </div>
      <div
        style={{ height: 1, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
      />

      {/* Message area spacer */}
      <div style={{ flexGrow: 1 }} />

      {/* Input bar */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: sideMargin,
          paddingRight: sideMargin,
          paddingTop: inputMargin,
          paddingBottom: inputMargin,
        }}
      >
        <div
          style={{
            flexGrow: 1,
            height: pillH,
            borderRadius: pillH,
            backgroundColor: "#251d3d",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: Math.round(pillH * 0.45),
            paddingRight: Math.round(pillH * 0.13),
          }}
        >
          <div
            style={{
              flexGrow: 1,
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: Math.round(min * 0.03),
              color: "#6f6691",
            }}
          >
            Message
          </div>
          <div
            style={{
              width: sendSize,
              height: sendSize,
              borderRadius: sendSize,
              backgroundColor: accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width={Math.round(sendSize * 0.55)}
              height={Math.round(sendSize * 0.55)}
              viewBox="0 0 24 24"
            >
              <path
                d="M12 19 L12 6 M6 11.5 L12 5.5 L18 11.5"
                fill="none"
                stroke="#ffffff"
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
