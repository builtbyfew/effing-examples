import { z } from "zod";
import { frauncesBold, manropeMedium, manropeSemiBold, loadFonts } from "~/fonts";
import { tween, easeOutQuad, easeOutCubic, easeOutQuart } from "@effing/tween";
import { createCanvas, loadImage, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
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
  clamp01,
  computeLayout,
  drawBase,
  drawPortraitPhoto,
  splitWordmark,
  type Layout,
} from "~/realtor-card-design";

// Animated counterpart of the realtor-card image — the same dark sign-off
// design from ~/realtor-card-design, driven by a 30 fps beat sheet: the
// backdrop ken-burns in, the ring sweeps around the portrait, and the text
// stack reveals top to bottom.

export const propsSchema = z.object({
  photoUrl: z.string().url(),
  name: z.string(),
  company: z.string(),
  phone: z.string(),
  email: z.string(),
  // Listing photo that bleeds into the card's backdrop; the slide falls back
  // to a plain dark backdrop with an ambient glow when omitted.
  backdropUrl: z.string().url().optional(),
  // When the card fades in over that photo mid-pan, pass the pan's distance
  // and oversize: the backdrop then starts from the pan's exact final crop
  // (seamless crossfade) and only begins its ken-burns drift once the
  // fade-in completes. Without it the backdrop uses its own centered crop.
  backdropPan: z
    .object({
      distance: z.number(),
      oversize: z.number().min(1),
    })
    .optional(),
  eyebrow: z.string().optional(),
  totalFrameCount: z.number().int().min(1),
  fadeInFrameCount: z.number().int().min(1).optional(),
  // Used to scale the internal beat sheet (originally authored at 30 fps) to
  // whatever frame rate the effie is rendering at. Without this, hardcoded
  // start/duration frames keep their integer values and the whole reveal
  // sequence collapses into the first ~0.45s at 240 fps.
  fps: z.number().int().min(1).optional(),
});

export type RealtorCardProps = z.infer<typeof propsSchema>;

export const previewProps: RealtorCardProps = {
  photoUrl: "https://i.pravatar.cc/600?img=44",
  name: "Margaret Beaumont",
  company: "Capitop Realty Group",
  phone: "+1 (202) 555-0100",
  email: "margaret@capitop.estate",
  backdropUrl:
    "https://static.effing.dev/fake-white-house/fake-white-house-drone-shot.jpg",
  totalFrameCount: 210,
  fadeInFrameCount: 18,
};

export async function* runner({
  props: {
    photoUrl,
    name,
    company,
    phone,
    email,
    backdropUrl,
    backdropPan,
    eyebrow = DEFAULT_EYEBROW,
    totalFrameCount,
    fadeInFrameCount = 18,
    fps = 30,
  },
  bounds: { width, height },
}: RunnerArgs<RealtorCardProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([frauncesBold, manropeMedium, manropeSemiBold]);
  const layout = computeLayout(width, height);
  const nameWords = name.split(" ");
  const { head, tail } = splitWordmark(company);
  const headChars = head.split("");
  const eyebrowText = eyebrow.toUpperCase();

  // renderReactElement builds a fresh image cache on every call, so an
  // <img> in the per-frame tree would re-fetch and re-decode its source for
  // each of the ~200 frames. Load both photos once and draw them with raw
  // canvas ops instead; the React tree only carries vectors and text.
  const [backdropImage, portraitImage] = await Promise.all([
    backdropUrl ? loadImage(backdropUrl) : null,
    loadImage(photoUrl),
  ]);

  yield* tween(totalFrameCount, async (_interval, frame) => {
    // tween() runs frame callbacks concurrently (up to CPU parallelism), and
    // this callback suspends at the awaited renderReactElement mid-draw — so
    // the canvas must be per-frame; a shared one would be overwritten by
    // neighboring frames before this one reaches encode().
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    const beats = computeBeats(frame, {
      totalFrameCount,
      fadeInFrameCount,
      fps,
      height,
      backdropFromPan: backdropPan != null,
    });
    drawBase(
      ctx,
      layout,
      backdropImage,
      beats.kenBurns,
      beats.containerFade,
      backdropPan,
    );
    await renderReactElement(
      ctx,
      <CardOverlay
        layout={layout}
        beats={beats}
        hasBackdrop={backdropImage != null}
        eyebrowText={eyebrowText}
        nameWords={nameWords}
        headChars={headChars}
        tail={tail}
        phone={phone}
        email={email}
      />,
      { fonts },
    );
    drawPortraitPhoto(
      ctx,
      portraitImage,
      layout,
      beats.photoScale * beats.breath,
      beats.photoFade,
      beats.liftY,
    );
    return canvas.encode("jpeg");
  });
}

function progress(frame: number, startFrame: number, durationFrames: number) {
  return clamp01((frame - startFrame) / durationFrames);
}

// Per-frame animation values, all derived from the frame index. Hardcoded
// frame numbers here were authored against 30 fps; s() stretches them to the
// current rate, and rates passed to Math.sin are divided by the same factor
// to keep the temporal frequency stable.
function computeBeats(
  frame: number,
  {
    totalFrameCount,
    fadeInFrameCount,
    fps,
    height,
    backdropFromPan,
  }: {
    totalFrameCount: number;
    fadeInFrameCount: number;
    fps: number;
    height: number;
    backdropFromPan: boolean;
  },
) {
  const fpsScale = fps / 30;
  const s = (f: number) => f * fpsScale;

  const containerFade = easeOutCubic(progress(frame, 0, fadeInFrameCount));
  const photoFade = easeOutCubic(progress(frame, s(22), s(26)));

  return {
    frame,
    s,
    containerFade,
    liftY: (1 - containerFade) * Math.round(height * 0.015),
    // When the backdrop continues a pan (backdropFromPan), it must show the
    // pan's exact final crop while the segment crossfade is still revealing
    // the card — so the zoom starts at 1 and eases in from zero velocity
    // (quadratic ramp): drift is imperceptible during the fade and the
    // backdrop never lurches into motion. Standalone cards keep the original
    // pre-zoomed linear drift.
    kenBurns: backdropFromPan
      ? 1 + 0.15 * Math.pow(frame / Math.max(1, totalFrameCount), 2)
      : 1.08 + 0.07 * (frame / Math.max(1, totalFrameCount)),
    frameReveal: easeOutQuad(progress(frame, s(16), s(34))),
    glowReveal: easeOutQuad(progress(frame, s(8), s(30))),
    eyebrowReveal: easeOutQuart(progress(frame, s(14), s(20))),
    photoFade,
    photoScale: 0.92 + 0.08 * easeOutCubic(progress(frame, s(22), s(30))),
    breath: 1 + 0.003 * Math.sin(frame * (0.04 / fpsScale)) * photoFade,
    ringSweep: easeOutQuart(progress(frame, s(26), s(34))),
    pulse: 1 + 0.04 * Math.sin(frame * (0.06 / fpsScale)),
    nameReveal: progress(frame, s(52), s(24)),
    flourishReveal: easeOutQuart(progress(frame, s(70), s(22))),
    subWordmarkReveal: easeOutQuart(progress(frame, s(92), s(14))),
    contactPanelReveal: easeOutCubic(progress(frame, s(96), s(18))),
    contactRowReveals: [
      easeOutQuart(progress(frame, s(102), s(14))),
      easeOutQuart(progress(frame, s(108), s(14))),
    ] as [number, number],
    estReveal: easeOutQuart(progress(frame, s(112), s(18))),
  };
}

type Beats = ReturnType<typeof computeBeats>;

// Everything except the backdrop and the portrait photo — vectors and text
// only, so the per-frame React render never touches an image source.
function CardOverlay({
  layout,
  beats,
  hasBackdrop,
  eyebrowText,
  nameWords,
  headChars,
  tail,
  phone,
  email,
}: {
  layout: Layout;
  beats: Beats;
  hasBackdrop: boolean;
  eyebrowText: string;
  nameWords: string[];
  headChars: string[];
  tail: string;
  phone: string;
  email: string;
}) {
  const { width, height } = layout;
  const { frame, s, liftY } = beats;

  const wordmarkReveals = headChars.map((_, i) =>
    easeOutQuart(progress(frame, s(80 + i * 2), s(14))),
  );

  return (
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
      {!hasBackdrop && <AmbientGlow layout={layout} />}
      <HairlineFrame layout={layout} reveal={beats.frameReveal} />
      <PortraitGlow layout={layout} opacity={beats.glowReveal} />
      <Eyebrow
        layout={layout}
        text={eyebrowText}
        reveal={beats.eyebrowReveal}
        liftY={liftY}
      />
      <PortraitFrame
        layout={layout}
        ringSweep={beats.ringSweep}
        ringOpacity={beats.photoFade}
        liftY={liftY}
      />
      <NameLine
        layout={layout}
        words={nameWords}
        reveal={beats.nameReveal}
        liftY={liftY}
      />
      <FlourishWrap
        layout={layout}
        reveal={beats.flourishReveal}
        liftY={liftY}
        pulse={beats.pulse}
      />
      <Wordmark
        layout={layout}
        chars={headChars}
        reveals={wordmarkReveals}
        liftY={liftY}
      />
      <SubWordmark
        layout={layout}
        text={tail}
        reveal={beats.subWordmarkReveal}
        liftY={liftY}
      />
      <ContactPanel
        layout={layout}
        phone={phone}
        email={email}
        panelReveal={beats.contactPanelReveal}
        rowReveals={beats.contactRowReveals}
        liftY={liftY}
      />
      <EstMark layout={layout} reveal={beats.estReveal} />
    </div>
  );
}
