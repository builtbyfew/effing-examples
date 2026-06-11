import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interBold, interSemiBold, loadFonts } from "~/fonts";

export const propsSchema = z.object({
  contactName: z.string(),
  accentColor: z.string().optional(),
});

export type ChatHeaderProps = z.infer<typeof propsSchema>;

export const previewProps: ChatHeaderProps = {
  contactName: "Cloudstep",
};

// Vertical chrome insets, shared with the chat-conversation annie so the
// message stack scrolls between the header and the input bar.
export function chatHeaderInset(width: number, height: number): number {
  return Math.round(Math.min(width, height) * 0.125) + 1;
}

export function chatInputInset(width: number, height: number): number {
  const min = Math.min(width, height);
  return Math.round(min * 0.062) + 2 * Math.round(min * 0.028);
}

export async function runner({
  props: { contactName, accentColor = "#7c5cd6" },
  bounds: { width, height },
}: RunnerArgs<ChatHeaderProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interBold, interSemiBold]);

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

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  await renderReactElement(
    ctx,
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
                color: "#8d82b5",
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
    </div>,
    { fonts },
  );

  return canvas.encode("png");
}
