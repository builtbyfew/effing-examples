# Effing project `llm-leaderboard`

An animated **LLM leaderboard** video: a dark, blueprint-gridded board that
builds in row-by-row — figures rolling up, dominance bars growing — holds, then
lifts and fades.

With the preview props, it plays two slides back to back, scoring the same coding
agents two ways (`mean@5`, then `best@5`), and highlights the climber (GLM-5.2,
#3 → #2) with a green glow card and a "▲ from #N" badge.

Rendered at 1080×900 (6:5), 30 fps, ~10 s. See [`GUIDE.md`](./GUIDE.md) for
setup, scripts, and deployment.

## What's here

| fn | file | role |
| --- | --- | --- |
| `leaderboard` (effie) | [`app/effies/leaderboard.fn.tsx`](./app/effies/leaderboard.fn.tsx) | Composes the slides on black → the final MP4. |
| `leaderboard-slide` (annie) | [`app/annies/leaderboard-slide.fn.tsx`](./app/annies/leaderboard-slide.fn.tsx) | One animated slide (build-in → hold → fade-out). |
| `leaderboard-cover` (image) | [`app/images/leaderboard-cover.fn.tsx`](./app/images/leaderboard-cover.fn.tsx) | Still cover — the climactic `best@5` board. |

The annie and the cover both render the same `Leaderboard` component,
[`app/components/leaderboard.tsx`](./app/components/leaderboard.tsx), so the
thumbnail stays pixel-consistent with the video. The dataset lives in
[`app/frontierswe-data.ts`](./app/frontierswe-data.ts) — swap those arrays (or
feed your own rows via the fn props) to retarget the video at any leaderboard.

## Preview & render

```bash
npm install
cp .env.example .env   # set SECRET_KEY
npm run dev            # http://127.0.0.1:3839
```

Open the effie preview, or render straight to an MP4 with the bundled FFS:

```bash
npx ffs render "http://127.0.0.1:3839/preview/effie/leaderboard.json" out.mp4
```
