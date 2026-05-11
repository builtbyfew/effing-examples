import { z } from "zod";
import { tween } from "@effing/tween";
import {
  createCanvas,
  loadImage,
  registerFont,
  type Image,
} from "@effing/canvas";
import { trimPosterFat, attilaSansSharpBold, loadFonts } from "~/fonts";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import {
  photoSlideSchema,
  textSlideSchema,
  findActiveSlide,
  drawPhotoSlide,
  drawPhotoOverlayText,
  drawTextSlide,
  type PhotoSlide,
  type Slide,
  type TextSlide,
} from "./_accent-job-ad-draw";

const ORANGE = "#E84610";
const WHITE = "#FFFFFF";

// Animated text overlays that draw on top of the photo. Reuses the awesome /
// kickass annie's TextSlide schema so slide-in, drift, curve, etc. all work
// identically; `yOffsetFraction` shifts each overlay's vertical anchor (0 =
// canvas center, positive = below center).
const overlayTextSchema = textSlideSchema.extend({
  yOffsetFraction: z.number().optional(),
});
type OverlayText = z.infer<typeof overlayTextSchema>;

// Reference timeline (ref frame → annie-local seconds):
//   "Apply now"   already baked into team-photo-1.jpg; arrives by riding the
//                 photo's vertical slide-up motion (configured at the effie
//                 level). To slide it in horizontally we'd need a clean photo
//                 without the text already baked in — see notes in
//                 ./public/team-photo-*.jpg.
//   "& tell us"   slides in from the right around ref frame 388 → annie 1.13s
//   "your story"  slides in from the right around ref frame 418 → annie 2.13s
const DEFAULT_TEXT_OVERLAYS: OverlayText[] = [
  {
    type: "text",
    time: 1.13,
    duration: 2.14,
    text: "& tell us",
    layout: "curve-down",
    curveAmount: 0.2,
    scale: 0.55,
    font: "trim",
    theme: "a",
    slideIn: "right",
    slideDuration: 0.2,
    // Negative drift = continue moving left after slide-in (same direction
    // the text was already moving as it slid in from the right).
    drift: -25,
    // Baked-in "Apply now" extends down to ~y=910 on 1920-tall (story)
    // canvas (47% from top). Place "& tell us" comfortably below it so the
    // two don't overlap in 9:16.
    yOffsetFraction: 0.06,
  },
  {
    type: "text",
    time: 2.13,
    duration: 1.14,
    text: "your story",
    layout: "curve-down",
    curveAmount: 0.2,
    scale: 0.5,
    font: "trim",
    theme: "a",
    slideIn: "right",
    slideDuration: 0.2,
    drift: -25,
    yOffsetFraction: 0.16,
  },
];

const DEFAULT_PHOTO_URL = "/team-photo-1.jpg";

export const propsSchema = z.object({
  duration: z.number().positive().optional(),
  fps: z.number().int().min(1).optional(),
  colorA: z.string().optional(),
  // Single-photo + animated overlays mode (preferred):
  photoUrl: z.string().optional(),
  textOverlays: z.array(overlayTextSchema).optional(),
  // Legacy multi-slide mode (back-compat — kept so existing callers passing
  // `slides` keep working). When `photoUrl` is set, this is ignored.
  slides: z.array(photoSlideSchema).optional(),
});

export type AccentJobAdPhotosProps = z.infer<typeof propsSchema>;

export const previewProps: AccentJobAdPhotosProps = {
  duration: 3.2667,
  fps: 30,
  colorA: ORANGE,
  photoUrl: DEFAULT_PHOTO_URL,
  textOverlays: DEFAULT_TEXT_OVERLAYS,
};

async function loadPhoto(url: string): Promise<Image | null> {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3839";
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;
  try {
    const r = await fetch(fullUrl);
    if (!r.ok) return null;
    return loadImage(Buffer.from(await r.arrayBuffer()));
  } catch {
    return null;
  }
}

function drawOverlayText(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  overlay: OverlayText,
  seconds: number,
  fg: string,
  width: number,
  height: number,
) {
  const yShift = (overlay.yOffsetFraction ?? 0) * height;
  if (yShift === 0) {
    drawTextSlide(ctx, overlay as TextSlide, seconds, fg, width, height);
    return;
  }
  // drawTextSlide centers at (width/2, height/2 + offsetY); pre-translate so
  // the resulting anchor lands `yShift` pixels below center.
  ctx.save();
  ctx.translate(0, yShift);
  drawTextSlide(ctx, overlay as TextSlide, seconds, fg, width, height);
  ctx.restore();
}

export async function* runner({
  props: {
    duration = 3.2667,
    fps = 30,
    colorA = ORANGE,
    photoUrl,
    textOverlays = DEFAULT_TEXT_OVERLAYS,
    slides,
  },
  bounds: { width, height },
}: RunnerArgs<AccentJobAdPhotosProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([trimPosterFat, attilaSansSharpBold]);
  fonts.forEach(registerFont);

  const totalFrames = Math.max(1, Math.round(duration * fps));

  // Single-photo + animated overlays mode.
  if (photoUrl || (!slides && textOverlays)) {
    const url = photoUrl ?? DEFAULT_PHOTO_URL;
    const img = await loadPhoto(url);

    // For 9:16 (story) the photo is upscaled to fill height and cropped
    // horizontally — the reference adds a slight leftward pan over the
    // segment (matching the leftward drift of the overlay text) so the
    // cropped composition feels alive instead of static. 1:1 (square)
    // doesn't need panning since the photo isn't cropped.
    const aspectRatio = width / height;
    const isStory = aspectRatio < 0.9;
    const panAmplitude = isStory ? width * 0.025 : 0;

    yield* tween(totalFrames, async ({ lower: t }) => {
      const seconds = t * duration;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = colorA;
      ctx.fillRect(0, 0, width, height);

      if (img) {
        // Pan from +panAmplitude to -panAmplitude over the segment duration,
        // so the photo's content slides slightly to the left as the overlays
        // do — same direction as the text drift.
        const panProgress = duration > 0 ? seconds / duration : 0;
        const panX = panAmplitude - 2 * panAmplitude * panProgress;
        drawPhotoSlide(ctx, img, width, height, panX);
      }

      for (const overlay of textOverlays) {
        if (
          seconds >= overlay.time &&
          seconds < overlay.time + overlay.duration
        ) {
          drawOverlayText(ctx, overlay, seconds, WHITE, width, height);
        }
      }

      return canvas.encode("jpeg");
    });
    return;
  }

  // Legacy multi-slide mode.
  const photoCache = new Map<string, Promise<Image | null>>();
  const photoUrls = new Set((slides ?? []).map((s) => s.photoUrl));
  for (const url of photoUrls) {
    photoCache.set(url, loadPhoto(url));
  }
  const photos = new Map<string, Image | null>();
  for (const [url, p] of photoCache) photos.set(url, await p);

  yield* tween(totalFrames, async ({ lower: t }) => {
    const seconds = t * duration;
    const slide = findActiveSlide(
      (slides ?? []) as Slide[],
      seconds,
    ) as PhotoSlide | null;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = colorA;
    ctx.fillRect(0, 0, width, height);

    if (slide) {
      const img = photos.get(slide.photoUrl);
      if (img) drawPhotoSlide(ctx, img, width, height);
      if (slide.overlayText?.length) {
        drawPhotoOverlayText(
          ctx,
          slide.overlayText,
          width,
          height,
          slide.overlayScale ?? 0.55,
          slide.overlayCurveAmount ?? 0.32,
        );
      }
    }

    return canvas.encode("jpeg");
  });
}
