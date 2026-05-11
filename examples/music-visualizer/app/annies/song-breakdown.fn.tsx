import { z } from "zod";
import { tween } from "@effing/tween";
import {
  createCanvas,
  type SKRSContext2D,
} from "@effing/canvas";
import {
  interBold,
  interSemiBold,
  openSansRegular,
  loadFonts,
} from "~/fonts";
import { registerFont } from "@effing/canvas";
import type { RunnerArgs, AnnieRunnerReturn } from "@effing/fn";
import analysis from "~/data/song-analysis.json";
import beatsRaw from "~/data/song-beats.json";

const DEFAULT_BEATS: Beat[] = (beatsRaw as [number, number][]).map(
  ([time, beat]) => ({ time, beat }),
);

const beatSchema = z.object({
  time: z.number(),
  beat: z.number().int().min(1),
});
const chordSchema = z.object({
  time: z.number(),
  duration: z.number(),
  chord: z.string(),
  nashville: z.string(),
});
const keySchema = z.object({ time: z.number(), key: z.string() });
const lyricSchema = z.object({
  time: z.number(),
  text: z.string(),
  duration: z.number().optional(),
});

export const propsSchema = z.object({
  title: z.string().optional(),
  artist: z.string().optional(),
  bpm: z.number().positive().optional(),
  beatsPerMeasure: z.number().int().min(1).optional(),
  startTime: z.number().nonnegative().optional(),
  duration: z.number().positive().optional(),
  beats: z.array(beatSchema).optional(),
  chords: z.array(chordSchema).optional(),
  keySections: z.array(keySchema).optional(),
  lyrics: z.array(lyricSchema).optional(),
  fps: z.number().int().min(1).optional(),
});

export type SongBreakdownProps = z.infer<typeof propsSchema>;
export type Beat = z.infer<typeof beatSchema>;
export type Chord = z.infer<typeof chordSchema>;
export type KeySection = z.infer<typeof keySchema>;
export type Lyric = z.infer<typeof lyricSchema>;

export const previewProps: SongBreakdownProps = {
  title: analysis.metadata.title,
  artist: analysis.metadata.artist,
  bpm: analysis.tempo.bpm,
  beatsPerMeasure: analysis.tempo.time_signature[0],
  startTime: 0,
  duration: 30,
  beats: DEFAULT_BEATS,
  chords: analysis.chords,
  keySections: analysis.key_sections,
  lyrics: analysis.lyrics,
  fps: 30,
};

export async function* runner({
  props: {
    title = analysis.metadata.title,
    artist = analysis.metadata.artist,
    bpm = analysis.tempo.bpm,
    beatsPerMeasure = analysis.tempo.time_signature[0],
    startTime = 0,
    duration = 30,
    beats: providedBeats,
    chords = analysis.chords,
    keySections = analysis.key_sections,
    lyrics = analysis.lyrics,
    fps = 30,
  },
  bounds: { width, height },
}: RunnerArgs<SongBreakdownProps>): AnnieRunnerReturn {
  const fonts = await loadFonts([
    interBold,
    interSemiBold,
    openSansRegular,
  ]);
  // Register so direct ctx.fillText calls can use them.
  fonts.forEach(registerFont);

  const beats =
    providedBeats ??
    (DEFAULT_BEATS.length > 0
      ? DEFAULT_BEATS
      : synthesizeBeats(bpm, beatsPerMeasure, duration + startTime + 1, 0));

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const layout = computeLayout(width, height);

  yield* tween(totalFrames, async ({ lower: t }) => {
    const seconds = startTime + t * duration;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    drawFrame(ctx, layout, seconds, {
      title,
      artist,
      bpm,
      chords,
      keySections,
      beats,
      lyrics,
    });

    return canvas.encode("jpeg");
  });
}

// ---------- Layout ----------

export type Layout = ReturnType<typeof computeLayout>;

export function computeLayout(width: number, height: number) {
  const minDim = Math.min(width, height);
  const padding = Math.round(minDim * 0.06);

  const titleSize = Math.round(minDim * 0.034);
  const artistSize = Math.round(minDim * 0.024);
  const metaSize = Math.round(minDim * 0.024);
  const keyLabelSize = Math.round(minDim * 0.028);
  const bpmSize = Math.round(minDim * 0.028);
  const chordSize = Math.round(minDim * 0.28);
  const nashvilleSize = Math.round(minDim * 0.085);
  const lyricSize = Math.round(minDim * 0.04);

  // Header: title/artist top-left, key/bpm top-right
  const headerTop = padding;
  const headerHeight = Math.round(titleSize * 1.2 + artistSize * 1.4 + 8);

  // Chord block: vertically centered upper-mid
  const chordCenterY = Math.round(height * 0.42);

  // Beat dots: below the Nashville
  const beatRowY = Math.round(height * 0.66);
  const dotRadius = Math.round(minDim * 0.022);
  const dotGap = Math.round(minDim * 0.075);

  // Lyrics area near the bottom
  const lyricTop = Math.round(height * 0.78);

  return {
    width,
    height,
    padding,
    titleSize,
    artistSize,
    metaSize,
    keyLabelSize,
    bpmSize,
    chordSize,
    nashvilleSize,
    lyricSize,
    headerTop,
    headerHeight,
    chordCenterY,
    beatRowY,
    dotRadius,
    dotGap,
    lyricTop,
  };
}

// ---------- Frame state ----------

type FrameInputs = {
  title: string;
  artist: string;
  bpm: number;
  chords: Chord[];
  keySections: KeySection[];
  beats: Beat[];
  lyrics: Lyric[];
};

export function drawFrame(
  ctx: SKRSContext2D,
  layout: Layout,
  seconds: number,
  inputs: FrameInputs,
) {
  const { chords, keySections, beats, lyrics } = inputs;

  const currentChord = findCurrentChord(chords, seconds);
  const currentKey = findCurrentKey(keySections, seconds);
  const currentBeat = findCurrentBeat(beats, seconds);
  const currentLyric = findCurrentLyric(lyrics, seconds);

  const beatPulse =
    currentBeat == null
      ? 0
      : pulseAt(seconds - currentBeat.time, 0.28);
  const downbeatPulse = currentBeat?.beat === 1 ? beatPulse : beatPulse * 0.5;

  drawBackground(ctx, layout, currentKey, keySections, seconds, downbeatPulse);
  drawHeader(ctx, layout, inputs.title, inputs.artist, currentKey, inputs.bpm);
  drawChord(ctx, layout, currentChord, seconds, beatPulse);
  drawBeatDots(ctx, layout, currentBeat, beatPulse, inputs.bpm);
  drawLyric(ctx, layout, currentLyric);
}

function findCurrentChord(chords: Chord[], t: number): Chord | null {
  for (let i = chords.length - 1; i >= 0; i--) {
    if (chords[i].time <= t) return chords[i];
  }
  return null;
}

function findCurrentKey(sections: KeySection[], t: number): KeySection | null {
  let current: KeySection | null = null;
  for (const s of sections) {
    if (s.time <= t) current = s;
    else break;
  }
  return current ?? sections[0] ?? null;
}

function findCurrentBeat(beats: Beat[], t: number): Beat | null {
  if (beats.length === 0 || t < beats[0].time) return null;
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (beats[mid].time <= t) lo = mid;
    else hi = mid - 1;
  }
  return beats[lo];
}

function findCurrentLyric(lyrics: Lyric[], t: number): Lyric | null {
  let current: Lyric | null = null;
  for (const l of lyrics) {
    if (l.time <= t) {
      const end = l.time + (l.duration ?? 4);
      if (t < end) current = l;
    } else break;
  }
  return current;
}

function pulseAt(timeSince: number, halfLife: number): number {
  if (timeSince < 0) return 0;
  const x = Math.max(0, 1 - timeSince / halfLife);
  return x * x;
}

// ---------- Background ----------

const KEY_THEMES: Record<string, { c1: string; c2: string }> = {
  "A# major": { c1: "#f59e0b", c2: "#7f1d1d" },
  "A major": { c1: "#fbbf24", c2: "#9a3412" },
  "C major": { c1: "#fde68a", c2: "#854d0e" },
  "G major": { c1: "#10b981", c2: "#064e3b" },
  "D major": { c1: "#22d3ee", c2: "#0c4a6e" },
  "F major": { c1: "#f97316", c2: "#7c2d12" },
  "A# minor": { c1: "#1e3a8a", c2: "#0a0a4d" },
  "A minor": { c1: "#1e40af", c2: "#0c0a4d" },
  "B minor": { c1: "#312e81", c2: "#0a0a23" },
  "C minor": { c1: "#581c87", c2: "#1e1b4b" },
  "D minor": { c1: "#6d28d9", c2: "#1e1b4b" },
  "G minor": { c1: "#0e7490", c2: "#0c1e2c" },
  "F minor": { c1: "#7c2d12", c2: "#1c1917" },
  "E minor": { c1: "#86198f", c2: "#1e1b4b" },
};
const DEFAULT_THEME = { c1: "#1e293b", c2: "#020617" };

function themeFor(key: string | null | undefined) {
  if (!key) return DEFAULT_THEME;
  return KEY_THEMES[key] ?? DEFAULT_THEME;
}

function drawBackground(
  ctx: SKRSContext2D,
  layout: Layout,
  current: KeySection | null,
  sections: KeySection[],
  seconds: number,
  pulse: number,
) {
  // Crossfade between previous theme and current over the first 1.5s of a section.
  const crossfade = 1.5;
  let theme = themeFor(current?.key);
  if (current) {
    const since = seconds - current.time;
    if (since < crossfade) {
      const idx = sections.findIndex((s) => s.time === current.time);
      const prev = idx > 0 ? sections[idx - 1] : null;
      const prevTheme = themeFor(prev?.key);
      const t = Math.max(0, Math.min(1, since / crossfade));
      theme = {
        c1: mixColors(prevTheme.c1, theme.c1, t),
        c2: mixColors(prevTheme.c2, theme.c2, t),
      };
    }
  }

  const grad = ctx.createLinearGradient(0, 0, layout.width, layout.height);
  grad.addColorStop(0, theme.c1);
  grad.addColorStop(1, theme.c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, layout.width, layout.height);

  // Subtle pulse — overlay a translucent white to brighten on each downbeat.
  if (pulse > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.07})`;
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  // Soft vignette at edges for depth.
  const r = Math.max(layout.width, layout.height) * 0.72;
  const vignette = ctx.createRadialGradient(
    layout.width / 2,
    layout.height / 2,
    r * 0.3,
    layout.width / 2,
    layout.height / 2,
    r,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, layout.width, layout.height);
}

function mixColors(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const mr = Math.round(ar + (br - ar) * t);
  const mg = Math.round(ag + (bg - ag) * t);
  const mb = Math.round(ab + (bb - ab) * t);
  return `#${mr.toString(16).padStart(2, "0")}${mg
    .toString(16)
    .padStart(2, "0")}${mb.toString(16).padStart(2, "0")}`;
}

// ---------- Header ----------

function drawHeader(
  ctx: SKRSContext2D,
  layout: Layout,
  title: string,
  artist: string,
  currentKey: KeySection | null,
  bpm: number,
) {
  ctx.save();
  ctx.textBaseline = "top";

  // Left: title + artist
  ctx.font = `600 ${layout.titleSize}px Inter`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
  ctx.textAlign = "left";
  ctx.fillText(title, layout.padding, layout.headerTop);

  ctx.font = `400 ${layout.artistSize}px "Open Sans"`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.fillText(
    artist,
    layout.padding,
    layout.headerTop + layout.titleSize * 1.25,
  );

  // Right: KEY / BPM stack
  const rightX = layout.width - layout.padding;
  ctx.textAlign = "right";
  ctx.font = `600 ${layout.keyLabelSize}px Inter`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillText(formatKey(currentKey?.key), rightX, layout.headerTop);

  ctx.font = `400 ${layout.bpmSize}px "Open Sans"`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText(
    `${Math.round(bpm)} BPM`,
    rightX,
    layout.headerTop + layout.keyLabelSize * 1.3,
  );
  ctx.restore();
}

function formatKey(key: string | undefined | null) {
  // The loaded Inter weights don't include the unicode ♯/♭ glyphs, so keep
  // the ASCII "#" and "b" — universally rendered.
  if (!key) return "—";
  return key.toUpperCase();
}

// ---------- Chord ----------

function drawChord(
  ctx: SKRSContext2D,
  layout: Layout,
  chord: Chord | null,
  seconds: number,
  beatPulse: number,
) {
  if (!chord) return;
  const since = seconds - chord.time;
  // Punch-in scale on chord change: starts bigger and settles.
  const punch = since < 0.25 ? 1 + 0.07 * Math.max(0, 1 - since / 0.25) : 1;
  const beatScale = 1 + beatPulse * 0.015;
  const scale = punch * beatScale;

  const cx = layout.width / 2;
  const chordY = layout.chordCenterY;
  const nashvilleY =
    chordY + Math.round(layout.chordSize * 0.6) + layout.nashvilleSize;

  ctx.save();
  ctx.translate(cx, chordY);
  ctx.scale(scale, scale);

  // Chord glyph — large bold.
  ctx.font = `700 ${layout.chordSize}px Inter`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.fillText(formatChord(chord.chord), 0, Math.round(layout.chordSize * 0.04));
  ctx.fillStyle = "white";
  ctx.fillText(formatChord(chord.chord), 0, 0);
  ctx.restore();

  // Nashville number badge below.
  ctx.save();
  const nashText = chord.nashville;
  ctx.font = `600 ${layout.nashvilleSize}px Inter`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const padX = Math.round(layout.nashvilleSize * 0.6);
  const padY = Math.round(layout.nashvilleSize * 0.25);
  const textW = ctx.measureText(nashText).width;
  const badgeW = textW + padX * 2;
  const badgeH = layout.nashvilleSize + padY * 2;
  const badgeX = cx - badgeW / 2;
  const badgeY = nashvilleY - badgeH / 2;
  roundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.stroke();
  ctx.fillStyle = "white";
  ctx.fillText(nashText, cx, nashvilleY);
  ctx.restore();
}

function formatChord(chord: string) {
  // Loaded Inter weights don't ship the ♯/♭ glyphs, so keep the ASCII form.
  return chord;
}

// ---------- Beat dots ----------

function drawBeatDots(
  ctx: SKRSContext2D,
  layout: Layout,
  current: Beat | null,
  beatPulse: number,
  bpm: number,
) {
  const beatsPerMeasure = 4;
  const cx = layout.width / 2;
  const totalWidth = (beatsPerMeasure - 1) * layout.dotGap;
  const startX = cx - totalWidth / 2;
  const y = layout.beatRowY;

  ctx.save();
  for (let i = 1; i <= beatsPerMeasure; i++) {
    const x = startX + (i - 1) * layout.dotGap;
    const isActive = current?.beat === i;
    const isOne = i === 1;
    const r = layout.dotRadius * (isActive ? 1 + beatPulse * 0.55 : 1);
    if (isActive && beatPulse > 0) {
      // Glow ring.
      ctx.beginPath();
      ctx.arc(x, y, r + Math.round(layout.dotRadius * 1.5 * beatPulse), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${beatPulse * 0.18})`;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = isActive
      ? "white"
      : isOne
        ? "rgba(255, 255, 255, 0.5)"
        : "rgba(255, 255, 255, 0.28)";
    ctx.fill();
  }
  ctx.restore();
}

// ---------- Lyric ----------

function drawLyric(
  ctx: SKRSContext2D,
  layout: Layout,
  lyric: Lyric | null,
) {
  if (!lyric) return;
  ctx.save();
  ctx.font = `400 ${layout.lyricSize}px "Open Sans"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillText(lyric.text, layout.width / 2, layout.lyricTop);
  ctx.restore();
}

// ---------- Helpers ----------

function synthesizeBeats(
  bpm: number,
  beatsPerMeasure: number,
  endTime: number,
  offsetSec: number,
): Beat[] {
  const period = 60 / bpm;
  const beats: Beat[] = [];
  let t = offsetSec;
  let beatNum = 1;
  while (t < endTime) {
    beats.push({ time: t, beat: beatNum });
    t += period;
    beatNum = (beatNum % beatsPerMeasure) + 1;
  }
  return beats;
}

function roundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

// Re-export for the cover.
export { findCurrentChord, findCurrentKey, findCurrentBeat, findCurrentLyric };
