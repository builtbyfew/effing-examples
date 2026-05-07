import { z } from "zod";
import {
  frauncesBold,
  manropeMedium,
  manropeSemiBold,
  loadFonts,
} from "~/fonts";
import {
  tween,
  easeOutQuad,
  easeOutCubic,
  easeOutQuart,
} from "@effing/tween";
import { createCanvas, renderReactElement } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import { fontFamily } from "~/theme";
import {
  clamp01,
  computeLayout,
  Decorations,
  DECORATION_COUNT,
  DECORATION_TIMING,
  EstMark,
  Flourish,
  luxe,
  Photo,
  PhotoBloom,
  splitWordmark,
  SubWordmark,
  type Layout,
} from "~/images/realtor-card.fn";

export const propsSchema = z.object({
  photoUrl: z.string().url(),
  name: z.string(),
  company: z.string(),
  phone: z.string(),
  email: z.string(),
  totalFrameCount: z.number().int().min(1),
  fadeInFrameCount: z.number().int().min(1).optional(),
});

export type RealtorCardProps = z.infer<typeof propsSchema>;

export const previewProps: RealtorCardProps = {
  photoUrl: "https://i.pravatar.cc/600?img=44",
  name: "Margaret Beaumont",
  company: "Capitop Realty Group",
  phone: "+32 9 296 11 11",
  email: "margaret@capitop.estate",
  totalFrameCount: 120,
  fadeInFrameCount: 18,
};

export async function* runner({
  props: {
    photoUrl,
    name,
    company,
    phone,
    email,
    totalFrameCount,
    fadeInFrameCount = 18,
  },
  bounds: { width, height },
}: RunnerArgs<RealtorCardProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([
    frauncesBold,
    manropeMedium,
    manropeSemiBold,
  ]);
  const layout = computeLayout(width, height);
  const nameWords = name.split(" ");
  const { head, tail } = splitWordmark(company);
  const headChars = head.split("");

  yield* tween(totalFrameCount, async (_interval, frame) => {
    const canvas = createCanvas(width, height);
    await renderReactElement(
      canvas.getContext("2d"),
      <Card
        layout={layout}
        photoUrl={photoUrl}
        nameWords={nameWords}
        headChars={headChars}
        tail={tail}
        phone={phone}
        email={email}
        frame={frame}
        totalFrameCount={totalFrameCount}
        fadeInFrameCount={fadeInFrameCount}
      />,
      { fonts },
    );
    return canvas.encode("png");
  });
}

function progress(frame: number, startFrame: number, durationFrames: number) {
  return clamp01((frame - startFrame) / durationFrames);
}

function Card({
  layout,
  photoUrl,
  nameWords,
  headChars,
  tail,
  phone,
  email,
  frame,
  totalFrameCount,
  fadeInFrameCount,
}: {
  layout: Layout;
  photoUrl: string;
  nameWords: string[];
  headChars: string[];
  tail: string;
  phone: string;
  email: string;
  frame: number;
  totalFrameCount: number;
  fadeInFrameCount: number;
}) {
  const { width, height } = layout;

  const containerFade = easeOutCubic(progress(frame, 0, fadeInFrameCount));
  const liftY = (1 - containerFade) * Math.round(height * 0.02);

  const decorationReveals = Array.from({ length: DECORATION_COUNT }, (_, i) => {
    const t = DECORATION_TIMING[i];
    return easeOutQuart(progress(frame, t.startFrame, t.durationFrames));
  });

  const pulse = 1 + 0.04 * Math.sin(frame * 0.06);

  const photoFade = easeOutQuad(progress(frame, 30, 22));
  const kenBurns =
    1 + 0.015 * (frame / Math.max(1, totalFrameCount)) * photoFade;
  const breath = 1 + 0.003 * Math.sin(frame * 0.04) * photoFade;
  const ringSweep = easeOutQuart(progress(frame, 32, 28));
  const cardinalReveals = [
    progress(frame, 58, 12),
    progress(frame, 63, 12),
    progress(frame, 68, 12),
    progress(frame, 73, 12),
  ];
  const bloomReveal = easeOutQuad(progress(frame, 24, 26));

  const wordmarkReveals = headChars.map((_, i) =>
    easeOutQuart(progress(frame, 76 + i * 2, 14)),
  );
  const subWordmarkReveal = easeOutQuart(progress(frame, 88, 14));

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        display: "flex",
        backgroundColor: luxe.bone,
      }}
    >
      <Decorations
        layout={layout}
        reveals={decorationReveals}
        drift={frame}
      />
      <PhotoBloom layout={layout} opacity={bloomReveal} />
      <Photo
        layout={layout}
        photoUrl={photoUrl}
        ringSweep={ringSweep}
        cardinalReveals={cardinalReveals}
        imageScale={kenBurns * breath}
        imageOpacity={photoFade}
        liftY={liftY}
      />
      <NameLine
        layout={layout}
        words={nameWords}
        reveal={progress(frame, 48, 24)}
        liftY={liftY}
      />
      <FlourishWrap
        layout={layout}
        reveal={easeOutQuart(progress(frame, 64, 22))}
        liftY={liftY}
        pulse={pulse}
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
        reveal={subWordmarkReveal}
        liftY={liftY}
      />
      <Contact
        layout={layout}
        phone={phone}
        email={email}
        frame={frame}
        liftY={liftY}
      />
      <EstMark layout={layout} reveal={easeOutQuart(progress(frame, 78, 18))} />
    </div>
  );
}

function NameLine({
  layout,
  words,
  reveal,
  liftY,
}: {
  layout: Layout;
  words: string[];
  reveal: number;
  liftY: number;
}) {
  const { width, text: t } = layout;
  const perWord = 1 / Math.max(1, words.length);
  return (
    <div
      style={{
        position: "absolute",
        top: t.blockTop,
        left: 0,
        width,
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        fontFamily: fontFamily.display,
        fontSize: t.nameSize,
        fontWeight: 700,
        letterSpacing: -t.nameSize * 0.018,
        color: luxe.ink,
        gap: Math.round(t.nameSize * 0.28),
      }}
    >
      {words.map((word, i) => {
        const local = clamp01(
          (reveal - i * perWord * 0.55) / Math.max(perWord * 0.9, 0.22),
        );
        const eased = easeOutCubic(local);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              opacity: eased,
              transform: `translateY(${liftY + (1 - eased) * t.nameSize * 0.32}px)`,
            }}
          >
            {word}
          </div>
        );
      })}
    </div>
  );
}

function FlourishWrap({
  layout,
  reveal,
  liftY,
  pulse,
}: {
  layout: Layout;
  reveal: number;
  liftY: number;
  pulse: number;
}) {
  const { width, text } = layout;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height: text.flourishTop + text.flourishHeight + 1,
        display: "flex",
        transform: `translateY(${liftY}px) scale(${pulse})`,
        transformOrigin: `${width / 2}px ${text.flourishTop + text.flourishHeight / 2}px`,
      }}
    >
      <Flourish layout={layout} reveal={reveal} />
    </div>
  );
}

function Wordmark({
  layout,
  chars,
  reveals,
  liftY,
}: {
  layout: Layout;
  chars: string[];
  reveals: number[];
  liftY: number;
}) {
  const { width, text } = layout;
  return (
    <div
      style={{
        position: "absolute",
        top: text.wordmarkTop,
        left: 0,
        width,
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        fontFamily: fontFamily.display,
        fontWeight: 700,
        fontSize: text.wordmarkSize,
        letterSpacing: text.wordmarkSize * 0.32,
        color: luxe.brass,
      }}
    >
      {chars.map((ch, i) => {
        const r = clamp01(reveals[i] ?? 0);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              opacity: r,
              transform: `translateY(${liftY + (1 - r) * text.wordmarkSize * 0.4}px)`,
            }}
          >
            {ch}
          </div>
        );
      })}
    </div>
  );
}

function Contact({
  layout,
  phone,
  email,
  frame,
  liftY,
}: {
  layout: Layout;
  phone: string;
  email: string;
  frame: number;
  liftY: number;
}) {
  const { width, min, text } = layout;
  const phoneReveal = easeOutQuart(progress(frame, 88, 14));
  const emailReveal = easeOutQuart(progress(frame, 94, 14));
  return (
    <div
      style={{
        position: "absolute",
        top: text.contactTop,
        left: 0,
        width,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: Math.round(min * 0.022),
        fontFamily: fontFamily.body,
        fontWeight: 500,
        fontSize: text.contactSize,
        letterSpacing: text.contactSize * 0.04,
        color: luxe.inkSoft,
      }}
    >
      <ContactRow
        text={phone}
        reveal={phoneReveal}
        liftY={liftY}
        size={text.contactSize}
      />
      <ContactRow
        text={email}
        reveal={emailReveal}
        liftY={liftY}
        size={text.contactSize}
      />
    </div>
  );
}

function ContactRow({
  text,
  reveal,
  liftY,
  size,
}: {
  text: string;
  reveal: number;
  liftY: number;
  size: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        opacity: reveal,
        transform: `translateY(${liftY + (1 - reveal) * size * 0.6}px)`,
      }}
    >
      {text}
    </div>
  );
}
