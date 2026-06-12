import { z } from "zod";
import { createCanvas, loadImage, renderReactElement } from "@effing/canvas";
import type { ImageRunnerReturn, RunnerArgs } from "@effing/fn";
import {
  frauncesBold,
  loadFonts,
  manropeMedium,
  manropeSemiBold,
} from "~/fonts";
import {
  AmbientGlow,
  ContactPanel,
  DEFAULT_EYEBROW,
  EstMark,
  Eyebrow,
  FlourishWrap,
  HairlineFrame,
  NameLine,
  PortraitFrame,
  PortraitGlow,
  SubWordmark,
  Wordmark,
  computeLayout,
  drawBase,
  drawPortraitPhoto,
  splitWordmark,
} from "~/realtor-card-design";

// Static counterpart of the realtor-card annie — same dark sign-off design
// from ~/realtor-card-design, rendered as a single frame. The `part` prop
// carves the card into independently rendered slices so an effie can fade
// and slide them in as separate layers (see listing-promo-basic).

// Match the annie's ken-burns range (1.08 → 1.15) so a static render sits
// visually between the animated card's first and last frame.
const BACKDROP_ZOOM = 1.1;

export const propsSchema = z.object({
  photoUrl: z.string().url(),
  name: z.string(),
  company: z.string(),
  phone: z.string(),
  email: z.string(),
  // Listing photo that bleeds into the card's backdrop; the card falls back
  // to a plain dark backdrop with an ambient glow when omitted.
  backdropUrl: z.string().url().optional(),
  eyebrow: z.string().optional(),
  part: z
    .enum(["full", "background", "photo", "identity", "contact"])
    .optional(),
});

export type RealtorCardImageProps = z.infer<typeof propsSchema>;

export const previewProps: RealtorCardImageProps = {
  photoUrl: "https://i.pravatar.cc/600?img=44",
  name: "Margaret Beaumont",
  company: "Capitop Realty Group",
  phone: "+1 (202) 555-0100",
  email: "margaret@capitop.estate",
  backdropUrl:
    "https://static.effing.dev/fake-white-house/fake-white-house-drone-shot.jpg",
};

export async function runner({
  props: {
    photoUrl,
    name,
    company,
    phone,
    email,
    backdropUrl,
    eyebrow = DEFAULT_EYEBROW,
    part = "full",
  },
  bounds: { width, height },
}: RunnerArgs<RealtorCardImageProps>): ImageRunnerReturn {
  const fonts = await loadFonts([frauncesBold, manropeMedium, manropeSemiBold]);
  const layout = computeLayout(width, height);
  const { head, tail } = splitWordmark(company);

  const showBackground = part === "full" || part === "background";
  const showPhoto = part === "full" || part === "photo";
  const showIdentity = part === "full" || part === "identity";
  const showContact = part === "full" || part === "contact";

  const [backdropImage, portraitImage] = await Promise.all([
    showBackground && backdropUrl ? loadImage(backdropUrl) : null,
    showPhoto ? loadImage(photoUrl) : null,
  ]);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (showBackground) {
    drawBase(ctx, layout, backdropImage, BACKDROP_ZOOM, 1);
  }
  await renderReactElement(
    ctx,
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        overflow: "hidden",
      }}
    >
      {showBackground && !backdropImage && <AmbientGlow layout={layout} />}
      {showBackground && <HairlineFrame layout={layout} />}
      {showPhoto && <PortraitGlow layout={layout} />}
      {showIdentity && <Eyebrow layout={layout} text={eyebrow.toUpperCase()} />}
      {showPhoto && <PortraitFrame layout={layout} />}
      {showIdentity && <NameLine layout={layout} words={name.split(" ")} />}
      {showIdentity && <FlourishWrap layout={layout} />}
      {showIdentity && <Wordmark layout={layout} chars={head.split("")} />}
      {showIdentity && <SubWordmark layout={layout} text={tail} />}
      {showContact && (
        <ContactPanel layout={layout} phone={phone} email={email} />
      )}
      {showBackground && <EstMark layout={layout} />}
    </div>,
    { fonts },
  );
  if (portraitImage) {
    drawPortraitPhoto(ctx, portraitImage, layout);
  }

  // The background slice is opaque (JPEG); the floating slices need alpha.
  if (showBackground) {
    return canvas.encode("jpeg");
  }
  return canvas.encode("png");
}
