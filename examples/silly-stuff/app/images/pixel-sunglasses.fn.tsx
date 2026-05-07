import { z } from "zod";
import { createCanvas, loadImage } from "@effing/canvas";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import {
  classifyFace,
  clusterDetections,
  runCascade,
  type GrayscaleImage,
} from "~/lib/picojs/pico";
import { localizePupil } from "~/lib/picojs/lploc";

export const propsSchema = z.object({
  imageUrl: z.string().url(),
  qualityThreshold: z.number().optional(),
});
export type PixelSunglassesProps = z.infer<typeof propsSchema>;

export const previewProps: PixelSunglassesProps = {
  imageUrl:
    // "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=720&q=80",
    // "https://ca.slack-edge.com/T03LXHYJV-U03LXHYKH-g59183164d88-512",
    "https://static.effing.dev/examples/silly-stuff/deal-with-it-input.jpeg",
};

const SUNGLASSES_BITMAP: readonly string[] = [
  "  BBBBBBBB      BBBBBBBB  ",
  " BBLLLLLLBB    BBLLLLLLBB ",
  "BBLLHHLLLLBBBBBBLLHHLLLLBB",
  "BBLLLLLLLLBB  BBLLLLLLLLBB",
  "BBLLLLLLLLBB  BBLLLLLLLLBB",
  " BBLLLLLLBB    BBLLLLLLBB ",
  "  BBBBBBBB      BBBBBBBB  ",
];

const SUNGLASSES_COLORS: Record<string, string> = {
  B: "#000000",
  L: "#1c2238",
  H: "#ffffff",
};

const LEFT_LENS_CENTER_COL = 6;
const RIGHT_LENS_CENTER_COL = 20;
const BITMAP_CENTER_COL = (LEFT_LENS_CENTER_COL + RIGHT_LENS_CENTER_COL) / 2;
const BITMAP_CENTER_ROW = SUNGLASSES_BITMAP.length / 2;
const LENS_SEPARATION_CELLS = RIGHT_LENS_CENTER_COL - LEFT_LENS_CENTER_COL;

export async function runner({
  props: { imageUrl, qualityThreshold = 20 },
  bounds: { width, height },
}: RunnerArgs<PixelSunglassesProps>): ImageRunnerReturn {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const img = await loadImage(imageUrl);

  // Detect on the source image's native pixels: drawing into a larger output
  // canvas upsamples bilinearly, and the smoothed pixels break the cascade's
  // pixel-vs-pixel comparisons.
  const detectionCanvas = createCanvas(img.width, img.height);
  const detectionCtx = detectionCanvas.getContext("2d");
  detectionCtx.drawImage(img, 0, 0);
  const { data: rgba } = detectionCtx.getImageData(0, 0, img.width, img.height);
  const grayPixels = new Uint8Array(img.width * img.height);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    grayPixels[j] =
      (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]) | 0;
  }
  const grayscale: GrayscaleImage = {
    pixels: grayPixels,
    rows: img.height,
    cols: img.width,
    stride: img.width,
  };

  const minFaceSize = Math.max(
    80,
    Math.round(Math.min(img.width, img.height) * 0.15),
  );
  const detections = clusterDetections(
    runCascade(grayscale, classifyFace, {
      shiftFactor: 0.1,
      minSize: minFaceSize,
      maxSize: Math.min(img.width, img.height),
      scaleFactor: 1.1,
    }),
    0.2,
  );

  // The output is a transparent overlay positioned to align with the source
  // image when composited at cover-fit (e.g. as an effie layer over a
  // background image of the same source).
  const fitScale = Math.max(width / img.width, height / img.height);
  const offsetX = (width - img.width * fitScale) / 2;
  const offsetY = (height - img.height * fitScale) / 2;

  for (const { row, col, scale: faceScale, score } of detections) {
    if (score < qualityThreshold) continue;
    const eyeScale = 0.35 * faceScale;
    const [leftRowSrc, leftColSrc] = localizePupil(
      row - 0.075 * faceScale,
      col - 0.175 * faceScale,
      eyeScale,
      5,
      grayscale,
    );
    const [rightRowSrc, rightColSrc] = localizePupil(
      row - 0.075 * faceScale,
      col + 0.175 * faceScale,
      eyeScale,
      5,
      grayscale,
    );

    // Map source-pixel coords to output-canvas coords.
    const leftCol = offsetX + leftColSrc * fitScale;
    const leftRow = offsetY + leftRowSrc * fitScale;
    const rightCol = offsetX + rightColSrc * fitScale;
    const rightRow = offsetY + rightRowSrc * fitScale;

    const cellSize = Math.max(
      2,
      Math.round((rightCol - leftCol) / LENS_SEPARATION_CELLS),
    );
    const midRow = (leftRow + rightRow) / 2;
    const midCol = (leftCol + rightCol) / 2;
    const originX = Math.round(midCol - BITMAP_CENTER_COL * cellSize);
    const originY = Math.round(midRow - BITMAP_CENTER_ROW * cellSize);

    for (let r = 0; r < SUNGLASSES_BITMAP.length; r++) {
      const rowStr = SUNGLASSES_BITMAP[r];
      for (let c = 0; c < rowStr.length; c++) {
        const fill = SUNGLASSES_COLORS[rowStr[c]];
        if (fill === undefined) continue;
        ctx.fillStyle = fill;
        ctx.fillRect(
          originX + c * cellSize,
          originY + r * cellSize,
          cellSize,
          cellSize,
        );
      }
    }
  }

  return canvas.encode("png");
}
