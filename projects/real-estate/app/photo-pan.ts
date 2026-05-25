/**
 * Compute the source-image crop rectangle for a panning effect: a cover-fit
 * crop scaled inward by `oversize` (so there's slack to move within), shifted
 * along `direction` by `progress * distance` of the slack.
 *
 * `progress` is normalized: 0 = leftmost / topmost crop, 1 = rightmost /
 * bottommost, 0.5 = centered.
 */
export function computePanCrop({
  imageWidth,
  imageHeight,
  width,
  height,
  direction,
  distance,
  oversize,
  progress,
}: {
  imageWidth: number;
  imageHeight: number;
  width: number;
  height: number;
  direction: "left" | "right" | "up" | "down";
  distance: number;
  oversize: number;
  progress: number;
}): { sx: number; sy: number; sw: number; sh: number } {
  const canvasRatio = width / height;
  const imageRatio = imageWidth / imageHeight;
  const coverSw =
    imageRatio > canvasRatio ? imageHeight * canvasRatio : imageWidth;
  const coverSh =
    imageRatio > canvasRatio ? imageHeight : imageWidth / canvasRatio;

  const sw = coverSw / oversize;
  const sh = coverSh / oversize;
  const centerSx = (imageWidth - sw) / 2;
  const centerSy = (imageHeight - sh) / 2;

  const isHorizontal = direction === "left" || direction === "right";
  const safePan = Math.min(
    (isHorizontal ? sw : sh) * distance,
    isHorizontal ? imageWidth - sw : imageHeight - sh,
  );
  const offset = safePan * (progress - 0.5);

  return {
    sx:
      centerSx +
      (direction === "left" ? offset : direction === "right" ? -offset : 0),
    sy:
      centerSy +
      (direction === "up" ? offset : direction === "down" ? -offset : 0),
    sw,
    sh,
  };
}
