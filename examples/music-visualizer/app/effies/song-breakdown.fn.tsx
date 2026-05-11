import { z } from "zod";
import { effieData, effieSegment } from "@effing/effie";
import { fnUrl } from "@effing/fn";
import type { RunnerArgs, EffieRunnerReturn } from "@effing/fn";
import {
  type Beat,
  type SongBreakdownProps,
} from "~/annies/song-breakdown.fn";
import type { SongBreakdownCoverProps } from "~/images/song-breakdown-cover.fn";
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
  duration: z.number().positive().optional(),
  audioUrl: z.string().url().optional(),
  audioVolume: z.number().min(0).max(1).optional(),
  beats: z.array(beatSchema).optional(),
  chords: z.array(chordSchema).optional(),
  keySections: z.array(keySchema).optional(),
  lyrics: z.array(lyricSchema).optional(),
});

type SongBreakdownEffieProps = z.infer<typeof propsSchema>;

// FFS doesn't follow redirects, so use Drive's resolved direct-download host.
// `drive.google.com/uc?...` 303s into this; hitting it directly skips the redirect.
const DEFAULT_AUDIO_URL =
  "https://drive.usercontent.google.com/download?id=1JbsgwMXOdEjZUvV21ShF9xUf9cYXVnHE&export=download";

export const previewProps: SongBreakdownEffieProps = {
  title: analysis.metadata.title,
  artist: analysis.metadata.artist,
  bpm: analysis.tempo.bpm,
  beatsPerMeasure: analysis.tempo.time_signature[0],
  duration: analysis.metadata.duration_seconds,
  audioUrl: DEFAULT_AUDIO_URL,
  audioVolume: 1,
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
    beatsPerMeasure = analysis.tempo.time_signature[0],
    duration = analysis.metadata.duration_seconds,
    audioUrl = DEFAULT_AUDIO_URL,
    audioVolume = 1,
    beats = DEFAULT_BEATS,
    chords = analysis.chords,
    keySections = analysis.key_sections,
    lyrics = analysis.lyrics,
  },
  bounds: { width, height },
}: RunnerArgs<SongBreakdownEffieProps>): EffieRunnerReturn {
  const fps = 30;

  const cover = await fnUrl(
    "image",
    "song-breakdown-cover",
    {
      title,
      artist,
      bpm,
      posterTime: 60,
      beats,
      chords,
      keySections,
      lyrics,
    } satisfies SongBreakdownCoverProps,
    { width, height },
  );

  const animation = await fnUrl(
    "annie",
    "song-breakdown",
    {
      title,
      artist,
      bpm,
      beatsPerMeasure,
      startTime: 0,
      duration,
      beats,
      chords,
      keySections,
      lyrics,
      fps,
    } satisfies SongBreakdownProps,
    { width, height },
  );

  return effieData({
    width,
    height,
    fps,
    cover,
    background: { type: "color", color: "black" },
    audio: audioUrl
      ? { source: audioUrl as `http${string}`, volume: audioVolume }
      : undefined,
    segments: [
      effieSegment({
        duration,
        layers: [{ type: "animation", source: animation }],
      }),
    ],
  });
}
