# Effing project `subtitles`

TikTok-style word-by-word subtitles on top of any video, driven entirely by props — see [`GUIDE.md`](./GUIDE.md) for setup and deployment.

## Fns

- **`subtitled-video`** (effie) — takes a `videoUrl`, its `videoDuration`, and a list of `cues` (`{ text, start, end }`); plays the video as the background (keeping its audio) and overlays one subtitle layer per cue. Word highlight timings are spread across each cue proportional to word length, or can be given exactly via `cues[].words` (e.g. from a Whisper transcript). Colors, font size, and vertical position are configurable via props.
- **`subtitle-cue`** (annie) — one caption phrase as transparent PNG frames: chunky uppercase words with a thick outline, the currently spoken word popped onto a colored highlight pill.
- **`subtitle-cover`** (image) — cover still reusing the caption styling on a gradient background.

## Example

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
