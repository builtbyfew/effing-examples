import { z } from "zod";
import { createCanvas, registerFont } from "@effing/canvas";
import {
  interBold,
  interSemiBold,
  openSansRegular,
  loadFonts,
} from "~/fonts";
import type { RunnerArgs, ImageRunnerReturn } from "@effing/fn";
import {
  computeLayout,
  drawFrame,
  type Beat,
  type Chord,
  type KeySection,
  type Lyric,
} from "~/annies/song-breakdown.fn";
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
  posterTime: z.number().nonnegative().optional(),
  beats: z.array(beatSchema).optional(),
  chords: z.array(chordSchema).optional(),
  keySections: z.array(keySchema).optional(),
  lyrics: z.array(lyricSchema).optional(),
});

export type SongBreakdownCoverProps = z.infer<typeof propsSchema>;

export const previewProps: SongBreakdownCoverProps = {
  title: analysis.metadata.title,
  artist: analysis.metadata.artist,
  bpm: analysis.tempo.bpm,
  // Pick a chord-rich moment — first chorus-ish — for the thumbnail.
  posterTime: 60,
  beats: DEFAULT_BEATS,
  chords: analysis.chords,
  keySections: analysis.key_sections,
  lyrics: analysis.lyrics,
};

export async function runner({
  props: {
    title = analysis.metadata.title,
    artist = analysis.metadata.artist,
    bpm = analysis.tempo.bpm,
    posterTime = 60,
    beats = DEFAULT_BEATS,
    chords = analysis.chords,
    keySections = analysis.key_sections,
    lyrics = analysis.lyrics,
  },
  bounds: { width, height },
}: RunnerArgs<SongBreakdownCoverProps>): ImageRunnerReturn {
  const fonts = await loadFonts([interBold, interSemiBold, openSansRegular]);
  fonts.forEach(registerFont);

  const layout = computeLayout(width, height);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  drawFrame(ctx, layout, posterTime, {
    title,
    artist,
    bpm,
    chords: chords as Chord[],
    keySections: keySections as KeySection[],
    beats: beats as Beat[],
    lyrics: lyrics as Lyric[],
  });

  return canvas.encode("jpeg");
}
