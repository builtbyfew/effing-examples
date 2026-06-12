import { z } from "zod";
import { tween, easeOutBack, easeOutCubic, easeOutQuad } from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { interBold, interSemiBold, loadFonts } from "~/fonts";
import { chatMessageSchema, sampleConversation } from "~/chat-ui";

// A push notification for an incoming chat message drops onto the screen, a
// fingertip taps it, and the banner presses with a ripple — the beat that
// "opens" the chat app in the chat-promo intro.

export const propsSchema = z.object({
  contactName: z.string(),
  message: chatMessageSchema,
  accentColor: z.string().optional(),
  // When used as a layer in an effie, omit this so the logo intro underneath
  // shows through. Set it in previewProps for a standalone preview.
  backgroundColor: z.string().optional(),
});

export type NotificationTapProps = z.infer<typeof propsSchema>;

export const previewProps: NotificationTapProps = {
  contactName: "Sole Mate",
  message: sampleConversation[0],
  backgroundColor: "#16101f",
};

// All frame counts assume 30 fps. Exported so the chat-promo effie can derive
// its intro segment duration and sound-effect offsets from the same beats.
export const notificationTapSchedule = {
  // The opening beat belongs to the logo-intro backdrop playing underneath.
  popFrame: 22,
  tapFrame: 56,
  totalFrameCount: 84,
};

const POP_FRAMES = 14;
const PRESS_DOWN_FRAMES = 4;
const PRESS_UP_FRAMES = 8;
const APPROACH_FRAMES = 8;
const RIPPLE_FRAMES = 16;

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export async function* runner({
  props: { contactName, message, accentColor = "#7c5cd6", backgroundColor },
  bounds: { width, height },
}: RunnerArgs<NotificationTapProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([interBold, interSemiBold]);
  const { popFrame, tapFrame, totalFrameCount } = notificationTapSchedule;

  const min = Math.min(width, height);
  const sideMargin = Math.round(width * 0.035);
  const bannerW = width - 2 * sideMargin;
  const pad = Math.round(min * 0.026);
  const iconSize = Math.round(min * 0.082);
  const bannerH = iconSize + 2 * pad;
  const topMargin = Math.round(min * 0.035);
  const titleSize = Math.round(min * 0.03);
  const bodySize = Math.round(min * 0.029);

  // The banner sprite is rendered once with padding around it so its drop
  // shadow isn't clipped, then composited per frame.
  const shadowPad = Math.round(min * 0.06);
  const sprite = createCanvas(bannerW + 2 * shadowPad, bannerH + 2 * shadowPad);
  await renderReactElement(
    sprite.getContext("2d"),
    <div style={{ padding: shadowPad, display: "flex" }}>
      <div
        style={{
          width: bannerW,
          height: bannerH,
          borderRadius: Math.round(min * 0.042),
          backgroundColor: "rgba(40, 32, 66, 0.96)",
          boxShadow: `0 ${Math.round(min * 0.015)}px ${Math.round(min * 0.045)}px rgba(0, 0, 0, 0.45)`,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: pad,
          paddingRight: pad,
        }}
      >
        {/* App icon: the chat app the notification belongs to. */}
        <div
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: Math.round(iconSize * 0.27),
            backgroundImage: `linear-gradient(to bottom, ${accentColor}, #4f3a8f)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width={Math.round(iconSize * 0.56)}
            height={Math.round(iconSize * 0.56)}
            viewBox="0 0 24 24"
          >
            <path
              d="M12 3 C6.5 3 2.5 6.7 2.5 11.2 C2.5 13.8 3.9 16.1 6.1 17.6 L5.3 21 L9 19 C10 19.3 11 19.4 12 19.4 C17.5 19.4 21.5 15.7 21.5 11.2 C21.5 6.7 17.5 3 12 3 Z"
              fill="#ffffff"
            />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            marginLeft: Math.round(pad * 0.85),
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <div
              style={{
                flexGrow: 1,
                fontFamily: "Inter",
                fontWeight: 700,
                fontSize: titleSize,
                color: "#f4f1fb",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {contactName}
            </div>
            <div
              style={{
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: Math.round(min * 0.024),
                color: "#8d82b5",
                marginLeft: pad,
              }}
            >
              now
            </div>
          </div>
          <div
            style={{
              marginTop: Math.round(min * 0.006),
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: bodySize,
              color: "#cfc7e8",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {message.text ?? "Sent a photo"}
          </div>
        </div>
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            style={{
              width: iconSize,
              height: iconSize,
              borderRadius: Math.round(iconSize * 0.27),
              objectFit: "cover",
              marginLeft: pad,
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>,
    { fonts },
  );

  // Tap lands on the right half of the banner, where a thumb would reach.
  const tapX = sideMargin + bannerW * 0.72;
  const tapYWithin = bannerH * 0.62;

  yield* tween(totalFrameCount, async (_interval, frame) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    if (frame < popFrame) return canvas.encode("png");

    // Banner drops in from above the frame and settles with an overshoot.
    const popP = clamp01((frame - popFrame) / POP_FRAMES);
    const slide = easeOutBack(popP);
    const bannerY =
      -(bannerH + shadowPad) + (topMargin + bannerH + shadowPad) * slide;
    const opacity = easeOutQuad(clamp01((frame - popFrame) / 6));

    // Pressing the banner squeezes it briefly around its center.
    let pressScale = 1;
    if (frame >= tapFrame && frame < tapFrame + PRESS_DOWN_FRAMES) {
      pressScale =
        1 - 0.04 * easeOutQuad((frame - tapFrame) / PRESS_DOWN_FRAMES);
    } else if (frame >= tapFrame + PRESS_DOWN_FRAMES) {
      pressScale =
        0.96 +
        0.04 *
          easeOutQuad(
            clamp01((frame - tapFrame - PRESS_DOWN_FRAMES) / PRESS_UP_FRAMES),
          );
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    if (pressScale !== 1) {
      const cx = sideMargin + bannerW / 2;
      const cy = bannerY + bannerH / 2;
      ctx.translate(cx, cy);
      ctx.scale(pressScale, pressScale);
      ctx.translate(-cx, -cy);
    }
    ctx.drawImage(sprite, sideMargin - shadowPad, bannerY - shadowPad);
    ctx.restore();

    const tapY = bannerY + tapYWithin;

    // Fingertip: a soft disc that fades in while closing on the banner,
    // shrinks at contact, then lets the ripple take over.
    const approachStart = tapFrame - APPROACH_FRAMES;
    if (frame >= approachStart && frame < tapFrame + PRESS_UP_FRAMES) {
      const approach = easeOutCubic(
        clamp01((frame - approachStart) / APPROACH_FRAMES),
      );
      const release =
        frame >= tapFrame
          ? clamp01((frame - tapFrame) / PRESS_UP_FRAMES)
          : 0;
      const radius =
        min * 0.045 * (1.5 - 0.5 * approach) * (1 - 0.35 * release);
      const alpha = 0.55 * approach * (1 - release);
      const grad = ctx.createRadialGradient(tapX, tapY, 0, tapX, tapY, radius);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      grad.addColorStop(0.7, `rgba(255, 255, 255, ${alpha * 0.5})`);
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(tapX, tapY, radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Ripple ring expanding from the tap point.
    if (frame >= tapFrame && frame < tapFrame + RIPPLE_FRAMES) {
      const rippleP = clamp01((frame - tapFrame) / RIPPLE_FRAMES);
      const eased = easeOutCubic(rippleP);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 * (1 - eased)})`;
      ctx.lineWidth = Math.max(1, min * 0.006 * (1 - eased) + 1);
      ctx.beginPath();
      ctx.arc(
        tapX,
        tapY,
        min * 0.03 + min * 0.1 * eased,
        0,
        2 * Math.PI,
      );
      ctx.stroke();
    }

    return canvas.encode("png");
  });
}
