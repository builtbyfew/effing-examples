# Effing project `subtitles`

TikTok-style word-by-word subtitles on top of any video, driven entirely by props — see [`GUIDE.md`](./GUIDE.md) for setup and deployment.

## Fns

- **`subtitled-video`** (effie) — takes a `videoUrl`, the seconds of it to play (`videoDuration`), and a list of `cues` (`{ text, start, end }`); plays the video as the background (keeping its audio) and overlays one subtitle layer per cue. Word highlight timings are spread across each cue proportional to word length, or can be given exactly via `cues[].words` (e.g. from a Whisper transcript). An optional `introDuration` opens on the cover as a title card that crossfades into the video, and `endFadeOut` fades the picture and audio to black when `videoDuration` cuts the video short.
- **`subtitle-cue`** (annie) — one caption phrase as transparent PNG frames, popping the word currently being spoken onto its highlight pill.
- **`subtitle-cover`** (image) — the cover, doubling as the intro title card: the caption look frozen on its last word over a gradient derived from the highlight color, with an optional `kicker` line for attribution.

The look itself — style props with their defaults and the `CaptionOverlay` component — lives in [`app/captions.tsx`](./app/captions.tsx), shared by all three fns. Restyle via props (`highlightColor`, `fontSize`, `verticalPosition`, …) without touching code.

The preview props caption the opening of NASA's public-domain ["We Chose: The Inspiration of Apollo"](https://images.nasa.gov/details/jsc2019m000363_We_Chose_The_Inspiration_of_Apollo_mp4_1_720) clip — JFK's 1962 Rice University speech — with word timings taken from a Whisper transcription, so the karaoke highlight tracks the actual voice.

## Example

Cues only need text and a time window; word highlighting is then spread across each cue automatically:

```sh
pnpm exec effing url effie subtitled-video --props '{
  "videoUrl": "https://static.effing.dev/fundamentals/3-final.mp4",
  "videoDuration": 9,
  "cues": [
    { "text": "POV: you generate videos", "start": 0.4, "end": 2.2 },
    { "text": "with nothing but code", "start": 2.3, "end": 4.0 }
  ]
}' --width 1080 --height 1920
```
