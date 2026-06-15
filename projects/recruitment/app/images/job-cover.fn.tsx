import { z } from "zod";
import {
  createCanvas,
  findLargestUsableFontSize,
  renderReactElement,
} from "@effing/canvas";
import type { ImageRunnerReturn, RunnerArgs } from "@effing/fn";
import {
  caveatBold,
  loadFonts,
  spaceGroteskBold,
} from "~/fonts";
import { fontFamily, palette } from "~/theme";
import { SparkMark } from "~/components/spark-logo";

// Still cover for the job-listing effie: the spark mark, the job title in
// uppercase, and a handwritten "Apply now" — the video's poster frame.

export const propsSchema = z.object({
  titleLines: z.array(z.string().min(1)).min(1).max(4),
});

export type JobCoverProps = z.infer<typeof propsSchema>;

export const previewProps: JobCoverProps = {
  titleLines: ["Senior", "Frontend", "Developer"],
};

export async function runner({
  props: { titleLines },
  bounds: { width, height },
}: RunnerArgs<JobCoverProps>): ImageRunnerReturn {
  const [titleFont, scriptFont] = await loadFonts([
    spaceGroteskBold,
    caveatBold,
  ]);
  const fonts = [titleFont, scriptFont];
  const u = Math.min(width, height);

  const fontSize = Math.min(
    ...titleLines.map((line) =>
      findLargestUsableFontSize({
        text: line.toUpperCase(),
        font: titleFont,
        maxWidth: width * 0.8,
        maxHeight: (height * 0.42) / titleLines.length,
        maxFontSize: Math.round(width * 0.15),
      }),
    ),
  );

  const canvas = createCanvas(width, height);
  await renderReactElement(
    canvas.getContext("2d"),
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: u * 0.05,
        backgroundColor: palette.ember,
      }}
    >
      <SparkMark size={u * 0.16} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: fontFamily.display,
          fontWeight: 700,
          fontSize,
          lineHeight: 1.08,
          textTransform: "uppercase",
          color: palette.cream,
        }}
      >
        {titleLines.map((line, i) => (
          <div key={i} style={{ display: "flex" }}>
            {line}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: fontFamily.script,
          fontWeight: 700,
          fontSize: u * 0.08,
          color: palette.spark,
          transform: "rotate(-4deg)",
        }}
      >
        Apply now
      </div>
    </div>,
    { fonts },
  );
  return canvas.encode("png");
}
