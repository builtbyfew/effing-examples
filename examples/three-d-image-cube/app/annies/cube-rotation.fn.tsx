import { z } from "zod";
import { tween, easeInOutCubic } from "@effing/tween";
import {
  createCanvas,
  loadImage,
  type Image,
  type SKRSContext2D,
} from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";

export const propsSchema = z.object({
  imageUrls: z.array(z.string().url()).min(2),
  holdDuration: z.number().positive().optional(),
  transitionDuration: z.number().positive().optional(),
  zoomOutScale: z.number().positive().max(1).optional(),
  fps: z.number().positive().optional(),
  background: z.string().optional(),
});

export type CubeRotationProps = z.infer<typeof propsSchema>;

export const previewProps: CubeRotationProps = {
  imageUrls: [
    "https://static.effing.dev/picsum/1080/1080/coffee.jpg",
    "https://static.effing.dev/unsplash/white-villa/wide.jpg",
    "https://static.effing.dev/unsplash/white-villa/elevated.jpg",
    "https://static.effing.dev/unsplash/white-villa/bedroom.jpg",
    "https://static.effing.dev/unsplash/white-villa/bathroom.jpg",
    "https://static.effing.dev/unsplash/white-villa/portrait.jpg",
    "https://static.effing.dev/picsum/1080/1920/road.jpg",
    "https://static.effing.dev/picsum/1080/1920/sky.jpg",
  ],
  holdDuration: 1.5,
  transitionDuration: 1,
  zoomOutScale: 0.6,
  fps: 30,
  background: "#0a0a0a",
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Camera distance, in `faceSide` units. Larger = weaker perspective.
// 3 keeps the foreshortening clearly visible without making the cube shrink
// too much when rotated 45°.
const CAMERA_DISTANCE = 3;
// Number of vertical strips per face during rotation. Each strip carries a
// uniform perspective scale taken from its center, so its source slice maps
// to a same-height rectangle on screen. With ~64 strips the per-strip step
// in height is small enough that the trapezoid edges read as smooth.
const STRIP_COUNT = 64;

// Draw a square center-crop of `img` filling a rectangle of size `dw × dh`
// centered at `(cx, cy)`. Used for the hold phase where there's no rotation.
function drawFaceFlat(
  ctx: SKRSContext2D,
  img: Image,
  cx: number,
  cy: number,
  dw: number,
  dh: number,
) {
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, cx - dw / 2, cy - dh / 2, dw, dh);
}

// Render one face of the rotating cube with proper perspective foreshortening.
//
// The face is sliced into `STRIP_COUNT` vertical strips along its u-axis
// (face-local horizontal). For each strip we:
//   1. Map its left/right `u` to a 3D point on the face (before rotation),
//      then apply the cube's CW Y-rotation to get a world-space (x, z).
//   2. Project to screen with a pinhole camera at `(0, 0, cameraZ)`, looking
//      down -z. The perspective scale is `focal / (cameraZ - z)` — points
//      closer to the camera get scaled up, points farther away get shrunk.
//   3. Skip strips where the projected right edge isn't to the right of the
//      left edge: that's a back-facing strip (or one viewed close enough to
//      edge-on that perspective inverts its on-screen orientation), and
//      drawing it would mirror the texture or scribble over a face that's
//      actually in front of it.
//   4. Paint the strip by clipping to its rect on screen and drawing the
//      whole source image under a transform that maps the square crop region
//      onto the strip's screen rect. Painting the whole image (clipped) keeps
//      the bilinear sampling continuous across strip boundaries — slicing the
//      source per strip causes visible vertical seams from edge-clamped
//      sampling.
//      Adjacent strips end up at slightly different heights, which adds up to
//      the trapezoidal silhouette of a foreshortened face.
function renderPerspectiveFace(
  ctx: SKRSContext2D,
  img: Image,
  cx: number,
  cy: number,
  faceSide: number,
  cameraZ: number,
  focal: number,
  cameraScale: number,
  worldXAt: (u: number) => number,
  worldZAt: (u: number) => number,
) {
  const side = Math.min(img.width, img.height);
  const srcXOffset = (img.width - side) / 2;
  const srcYOffset = (img.height - side) / 2;

  for (let i = 0; i < STRIP_COUNT; i++) {
    const uL = i / STRIP_COUNT;
    const uR = (i + 1) / STRIP_COUNT;

    const wzL = worldZAt(uL);
    const wzR = worldZAt(uR);
    const denomL = cameraZ - wzL;
    const denomR = cameraZ - wzR;
    if (denomL <= 0 || denomR <= 0) continue;

    const persL = focal / denomL;
    const persR = focal / denomR;
    const screenXL = worldXAt(uL) * persL * cameraScale;
    const screenXR = worldXAt(uR) * persR * cameraScale;

    // Back-face / near-edge-on strip culling: width must be at least one
    // pixel-ish and pointing the right way. Below this, the strip is either
    // facing away from the camera or so foreshortened it would be sub-pixel
    // noise.
    const stripWidth = screenXR - screenXL;
    if (stripWidth < 0.5) continue;

    const persAvg = (persL + persR) / 2;
    const stripHeight = faceSide * persAvg * cameraScale;
    const destX = cx + screenXL;
    const destY = cy - stripHeight / 2;

    // Affine transform that places the image so the square crop region
    // (srcXOffset..srcXOffset+side × srcYOffset..srcYOffset+side) lines up
    // with the strip's destination rect when sliced at u=uL..uR. The clip
    // restricts the actual painting to just the strip.
    const scaleX = stripWidth / ((uR - uL) * side);
    const scaleY = stripHeight / side;
    const translateX = destX - scaleX * (srcXOffset + uL * side);
    const translateY = destY - scaleY * srcYOffset;

    // Snap the clip rect to integer pixel boundaries. Adjacent strips' float
    // boundaries are exactly equal (strip i's right edge is strip i+1's left
    // edge), so rounding both with `floor`/`ceil` gives clip rects that tile
    // perfectly without sub-pixel gaps. Antialiased clip on fractional edges
    // produces partial-alpha pixels at every boundary, which add up to the
    // light vertical lines between strips.
    const clipX = Math.floor(destX);
    const clipXEnd = Math.ceil(destX + stripWidth);
    const clipY = Math.floor(destY);
    const clipYEnd = Math.ceil(destY + stripHeight);

    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, clipY, clipXEnd - clipX, clipYEnd - clipY);
    ctx.clip();
    ctx.setTransform(scaleX, 0, 0, scaleY, translateX, translateY);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
}

export async function* runner({
  props: {
    imageUrls,
    holdDuration = 1.5,
    transitionDuration = 1,
    zoomOutScale = 0.6,
    fps = 30,
    background = "#0a0a0a",
  },
  bounds: { width, height },
}: RunnerArgs<CubeRotationProps>): AnnieRunnerReturn {
  const N = imageUrls.length;
  const totalSeconds = N * holdDuration + (N - 1) * transitionDuration;
  const frameCount = Math.max(1, Math.round(totalSeconds * fps));

  const images = await Promise.all(
    imageUrls.map(async (url) => {
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      return loadImage(buf);
    }),
  );

  const faceSide = Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;

  yield* tween(frameCount, async ({ lower: p }) => {
    const t = p * totalSeconds;

    // Walk the timeline to find which image we're on and whether we're holding
    // or transitioning into the next one.
    let imageIndex = N - 1;
    let inTransition = false;
    let transitionT = 0;
    let cursor = 0;
    for (let i = 0; i < N; i++) {
      if (t < cursor + holdDuration) {
        imageIndex = i;
        break;
      }
      cursor += holdDuration;
      if (i === N - 1) {
        imageIndex = i;
        break;
      }
      if (t < cursor + transitionDuration) {
        imageIndex = i;
        inTransition = true;
        transitionT = (t - cursor) / transitionDuration;
        break;
      }
      cursor += transitionDuration;
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    if (!inTransition) {
      drawFaceFlat(ctx, images[imageIndex], cx, cy, faceSide, faceSide);
      return canvas.encode("jpeg");
    }

    // Zoom and rotation run together across the whole transition. Rotation is
    // monotonic 0 → π/2 (eased), and `cameraScale` dips along a sin half-cycle
    // so it pulls back to `zoomOutScale` at the midpoint and returns to 1 by
    // the end — same eased clock for both, so the camera bottoms out exactly
    // when the cube is half-rotated.
    // Every transition spins the cube the same way (yaw right): the outgoing
    // face slides off to the left, the incoming face fills in from the right.
    // Reversing direction per transition would un-rotate the previous step
    // while showing a different image, which doesn't make physical sense.
    const eased = easeInOutCubic(transitionT);
    const cameraScale = lerp(1, zoomOutScale, Math.sin(eased * Math.PI));
    const theta = lerp(0, Math.PI / 2, eased);
    const halfW = faceSide / 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Camera setup: focal length is chosen so the unrotated front face exactly
    // fills the canvas — pers = focal/(cameraZ - halfW) = 1 at z = halfW.
    const cameraZ = CAMERA_DISTANCE * faceSide;
    const focal = cameraZ - halfW;

    // Outgoing face (currently the front of the cube). Parameterise by u along
    // its face-local x: u=0 is the cube's front-left corner, u=1 is the
    // front-right corner. Both share z = +halfW before rotation. The Y-axis CW
    // rotation maps (x, z) → (x·cos − z·sin, x·sin + z·cos).
    const outgoingX = (u: number) => (u - 0.5) * faceSide * c - halfW * s;
    const outgoingZ = (u: number) => (u - 0.5) * faceSide * s + halfW * c;

    // Incoming face (the cube's right side, rotating into view). u=0 maps to
    // its front edge (z = +halfW, x = +halfW), u=1 to its back edge
    // (z = -halfW, x = +halfW), so once it has fully rotated into the front
    // position the texture reads the right way around.
    const incomingX = (u: number) => halfW * c - (0.5 - u) * faceSide * s;
    const incomingZ = (u: number) => halfW * s + (0.5 - u) * faceSide * c;

    renderPerspectiveFace(
      ctx,
      images[imageIndex],
      cx,
      cy,
      faceSide,
      cameraZ,
      focal,
      cameraScale,
      outgoingX,
      outgoingZ,
    );
    renderPerspectiveFace(
      ctx,
      images[imageIndex + 1],
      cx,
      cy,
      faceSide,
      cameraZ,
      focal,
      cameraScale,
      incomingX,
      incomingZ,
    );

    return canvas.encode("jpeg");
  });
}
