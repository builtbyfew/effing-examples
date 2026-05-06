import { z } from "zod";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { ImageRunnerReturn, RunnerArgs } from "@effing/fn";
import { frauncesBold, loadFonts, manropeMedium } from "~/fonts";
import { fontFamily, palette } from "~/theme";

export const propsSchema = z.object({
  photoUrl: z.string().url(),
  name: z.string(),
  company: z.string(),
  phone: z.string(),
  email: z.string(),
  part: z
    .enum(["full", "background", "photo", "identity", "contact"])
    .optional(),
});

export type RealtorCardImageProps = z.infer<typeof propsSchema>;

export const previewProps: RealtorCardImageProps = {
  photoUrl: "https://i.pravatar.cc/600?img=32",
  name: "Sofia Martínez",
  company: "Costa del Sol Properties",
  phone: "+34 952 123 456",
  email: "sofia@costadelsol.es",
};

export async function runner({
  props: { photoUrl, name, company, phone, email, part = "full" },
  bounds: { width, height },
}: RunnerArgs<RealtorCardImageProps>): ImageRunnerReturn {
  const fonts = await loadFonts([frauncesBold, manropeMedium]);
  const min = Math.min(width, height);
  const photoSize = Math.round(min * 0.34);
  const photoTop = Math.round(height * 0.18);
  const photoLeft = Math.round((width - photoSize) / 2);
  const ring = Math.max(4, Math.round(photoSize * 0.045));
  const nameSize = Math.round(min * 0.075);
  const companySize = Math.round(min * 0.032);
  const contactSize = Math.round(min * 0.038);
  const arcSize = Math.round(min * 0.58);

  const canvas = createCanvas(width, height);
  await renderReactElement(
    canvas.getContext("2d"),
    <div
      style={{
        position: "relative",
        width,
        height,
        display: "flex",
        backgroundColor:
          part === "full" || part === "background" ? palette.cream : undefined,
        color: palette.charcoal,
        overflow: "hidden",
      }}
    >
      {(part === "full" || part === "background") && (
        <>
          <div
            style={{
              position: "absolute",
              right: -Math.round(arcSize * 0.35),
              top: -Math.round(arcSize * 0.3),
              width: arcSize,
              height: arcSize,
              borderRadius: arcSize,
              backgroundColor: palette.gold,
              opacity: 0.12,
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -Math.round(arcSize * 0.45),
              bottom: -Math.round(arcSize * 0.5),
              width: arcSize,
              height: arcSize,
              borderRadius: arcSize,
              backgroundColor: palette.teal,
              opacity: 0.88,
              display: "flex",
            }}
          />
        </>
      )}
      {(part === "full" || part === "photo") && (
        <>
          <div
            style={{
              position: "absolute",
              top: photoTop - ring,
              left: photoLeft - ring,
              width: photoSize + ring * 2,
              height: photoSize + ring * 2,
              borderRadius: photoSize,
              backgroundColor: palette.gold,
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: photoTop,
              left: photoLeft,
              width: photoSize,
              height: photoSize,
              borderRadius: photoSize,
              overflow: "hidden",
              display: "flex",
            }}
          >
            <img
              src={photoUrl}
              width={photoSize}
              height={photoSize}
              style={{ width: photoSize, height: photoSize, objectFit: "cover" }}
            />
          </div>
        </>
      )}
      {(part === "full" || part === "identity") && (
        <div
          style={{
            position: "absolute",
            top: photoTop + photoSize + Math.round(min * 0.055),
            left: Math.round(width * 0.08),
            width: Math.round(width * 0.84),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            fontFamily: fontFamily.body,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: fontFamily.display,
              fontWeight: 700,
              fontSize: nameSize,
              lineHeight: 1,
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: Math.round(min * 0.02),
              fontSize: companySize,
              fontWeight: 500,
              letterSpacing: companySize * 0.14,
              color: palette.stone,
            }}
          >
            {company.toUpperCase()}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: Math.round(min * 0.045),
              width: Math.round(min * 0.12),
              height: Math.max(2, Math.round(min * 0.004)),
              backgroundColor: palette.gold,
            }}
          />
        </div>
      )}
      {(part === "full" || part === "contact") && (
        <div
          style={{
            position: "absolute",
            top:
              photoTop +
              photoSize +
              Math.round(min * 0.055) +
              nameSize +
              Math.round(min * 0.02) +
              companySize +
              Math.round(min * 0.09),
            left: Math.round(width * 0.08),
            width: Math.round(width * 0.84),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: Math.round(min * 0.018),
            fontFamily: fontFamily.body,
            fontSize: contactSize,
            fontWeight: 500,
            color: palette.charcoal,
          }}
        >
          <div style={{ display: "flex" }}>{phone}</div>
          <div style={{ display: "flex" }}>{email}</div>
        </div>
      )}
    </div>,
    { fonts },
  );

  if (part === "full" || part === "background") {
    return canvas.encode("jpeg");
  }
  return canvas.encode("png");
}
