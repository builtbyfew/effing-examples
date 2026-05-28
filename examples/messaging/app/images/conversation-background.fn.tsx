import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { interSemiBold, interBold, loadFonts } from "~/fonts";

export const propsSchema = z.object({
  contactName: z.string(),
  backgroundColor: z.string().optional(),
  accentColor: z.string().optional(),
});

export type ConversationBackgroundProps = z.infer<typeof propsSchema>;

// Header height formula — must match topInset in message-conversation
export function headerHeight(width: number, height: number): number {
  return Math.round(Math.min(width, height) * 0.13) + 1; // +1 for separator
}

export const previewProps: ConversationBackgroundProps = {
  contactName: "Bryan",
};

export async function runner({
  props: { contactName, backgroundColor = "#0F172A", accentColor = "#2563EB" },
  bounds: { width, height },
}: RunnerArgs<ConversationBackgroundProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interSemiBold, interBold]);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  await renderReactElement(
    ctx,
    <ConversationBackground
      contactName={contactName}
      backgroundColor={backgroundColor}
      accentColor={accentColor}
      width={width}
      height={height}
    />,
    { fonts },
  );
  return canvas.encode("png");
}

function ConversationBackground({
  contactName,
  backgroundColor,
  accentColor,
  width,
  height,
}: {
  contactName: string;
  backgroundColor: string;
  accentColor: string;
  width: number;
  height: number;
}) {
  const min = Math.min(width, height);
  const hdrH = Math.round(min * 0.13);
  const avatarSize = Math.round(min * 0.065);
  const avatarMargin = Math.round(min * 0.035);
  const nameFontSize = Math.round(min * 0.038);
  const statusFontSize = Math.round(min * 0.028);
  const dotSize = Math.round(min * 0.016);
  const sideMargin = Math.round(width * 0.06);
  const initial = contactName.charAt(0).toUpperCase();

  return (
    <div style={{ width, height, backgroundColor, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          height: hdrH,
          display: "flex",
          alignItems: "center",
          paddingLeft: sideMargin,
          paddingRight: sideMargin,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize,
            backgroundColor: accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: Math.round(avatarSize * 0.44),
            color: "#ffffff",
            marginRight: avatarMargin,
          }}
        >
          {initial}
        </div>
        {/* Name + status */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: nameFontSize,
              color: "#F8FAFC",
            }}
          >
            {contactName}
          </div>
          {/* Online status row */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              marginTop: 3,
            }}
          >
            <div
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize,
                backgroundColor: "#22C55E",
                marginRight: Math.round(dotSize * 0.75),
              }}
            />
            <div
              style={{
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: statusFontSize,
                color: "#64748B",
              }}
            >
              online
            </div>
          </div>
        </div>
      </div>
      {/* Separator */}
      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
    </div>
  );
}
