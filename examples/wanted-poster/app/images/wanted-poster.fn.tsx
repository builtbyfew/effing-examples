import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import { imFellEnglishSC, loadFonts, rye } from "~/fonts";

export const propsSchema = z.object({
  topText: z.string().optional(),
  bottomText: z.string().optional(),
  footerText: z.string().optional(),
});

export type WantedPosterProps = z.infer<typeof propsSchema>;

export const previewProps: WantedPosterProps = {
  topText: "WANTED",
  bottomText: "DEAD OR ALIVE",
  footerText: "BY ORDER OF THE SHERIFF",
};

const HOLE_RADIUS = 216;
const INK = "#3b2614";
const PARCHMENT = "#e8d4a3";
const PAPER_TEXTURE_URL =
  "https://static.effing.dev/examples/wanted-poster/old-paper.jpeg";

export async function runner({
  props: {
    topText = "WANTED",
    bottomText = "DEAD OR ALIVE",
    footerText = "BY ORDER OF THE SHERIFF",
  },
  bounds: { width, height },
}: RunnerArgs<WantedPosterProps>): ImageRunnerReturn {
  const fonts = await loadFonts([rye, imFellEnglishSC]);

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
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 70,
        paddingBottom: 70,
        paddingLeft: 60,
        paddingRight: 60,
        backgroundColor: PARCHMENT,
        backgroundImage: [
          "radial-gradient(circle at 50% 50%, transparent 40%, rgba(40,20,5,0.45) 100%)",
          `url(${PAPER_TEXTURE_URL})`,
        ].join(", "),
        backgroundSize: "cover",
        color: INK,
        border: `6px solid ${INK}`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "Rye",
            fontSize: 180,
            letterSpacing: 8,
            lineHeight: 1,
          }}
        >
          {topText}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "Rye",
            fontSize: 92,
            letterSpacing: 6,
            lineHeight: 1,
          }}
        >
          {bottomText}
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: "IM Fell English SC",
            fontSize: 28,
            letterSpacing: 6,
          }}
        >
          {footerText}
        </div>
      </div>
    </div>,
    { fonts },
  );

  const cx = width / 2;
  const cy = height / 2;

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, HOLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, HOLE_RADIUS + 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(60,35,15,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, HOLE_RADIUS + 16, 0, Math.PI * 2);
  ctx.stroke();

  return canvas.encode("png");
}
