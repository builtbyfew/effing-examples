# Effing project `llm-leaderboard`

An animated **LLM leaderboard** video: a dark, blueprint-gridded board that
builds in row-by-row — figures rolling up, dominance bars growing — holds, then
lifts and fades.

With the preview props, it plays two slides back to back, scoring the same coding
agents two ways (`mean@5`, then `best@5`), and highlights the climber (GLM-5.2,
#3 → #2) with a green glow card and a "▲ from #N" badge.

Rendered at 1080×900 (6:5), 30 fps, ~10 s — except the split-flap **flap** cut,
which is framed 1920×1080 (16:9), since a departure board wants to be wide. See
[`GUIDE.md`](./GUIDE.md) for setup, scripts, and deployment.

There are **three cuts** of the same story. The **original** (`leaderboard-original`)
is the clean, blueprint board above. The **slick** (`leaderboard-slick`) is the
fancy, cinematic version — a cool obsidian glass stage whose lights rise on entry
and dim on exit, frosted rows that land with a specular sheen sweep, real beveled
metal medals (gold/silver/bronze) on the top three ranks, and a single aqua
highlight that singles out the climber. Rolling tabular counters, a headline that
anchors across the metric cut, and a rack-focus outro round it out. Two visual
languages kept deliberately separate: the medal colours mean *placement*, the
aqua means *"this is the climber"*. It's set in **Fraunces** (display serif) +
**Bricolage Grotesque** + **JetBrains Mono**.

The **flap** (`leaderboard-flap`) tells the whole story on a single **Solari
split-flap departure board**: the tiles clatter to life filling in `mean@5`,
hold, then — without a cut — *re-flip in place* to `best@5`, the rows
reshuffling as GLM-5.2's row rolls up into 2nd, an amber spotlight following it.
Only the tiles whose character actually changes flip, so the eye is drawn
exactly to what moved; the header's metric module flaps over from MEAN@5 to
BEST@5 on the same beat. Because it's one board updating itself, it's a single
continuous annie (no segment cut). The fold is the canonical two-phase
split-flap — the old top leaf collapsing at the seam, the new bottom leaf
dropping in — and every tile rolls forward through a fixed glyph reel, just like
the mechanism. It's set in **Space Mono**, warm charcoal on graphite.

## What's here

| fn | file | role |
| --- | --- | --- |
| `leaderboard-original` (effie) | [`app/effies/leaderboard-original.fn.tsx`](./app/effies/leaderboard-original.fn.tsx) | Original cut — composes the slides on black → the final MP4. |
| `leaderboard-original-slide` (annie) | [`app/annies/leaderboard-original-slide.fn.tsx`](./app/annies/leaderboard-original-slide.fn.tsx) | One animated slide (build-in → hold → fade-out). |
| `leaderboard-original-cover` (image) | [`app/images/leaderboard-original-cover.fn.tsx`](./app/images/leaderboard-original-cover.fn.tsx) | Still cover — the climactic `best@5` board. |
| `leaderboard-slick` (effie) | [`app/effies/leaderboard-slick.fn.tsx`](./app/effies/leaderboard-slick.fn.tsx) | Slick cut — composes the slides → the final MP4. |
| `leaderboard-slick-slide` (annie) | [`app/annies/leaderboard-slick-slide.fn.tsx`](./app/annies/leaderboard-slick-slide.fn.tsx) | One cinematic slide (blur-in → sheen build → hold → rack-focus). |
| `leaderboard-slick-cover` (image) | [`app/images/leaderboard-slick-cover.fn.tsx`](./app/images/leaderboard-slick-cover.fn.tsx) | Still cover for the slick cut. |
| `leaderboard-flap` (effie) | [`app/effies/leaderboard-flap.fn.tsx`](./app/effies/leaderboard-flap.fn.tsx) | Flap cut — one segment, one continuous annie → the final MP4 (16:9). |
| `leaderboard-flap-slide` (annie) | [`app/annies/leaderboard-flap-slide.fn.tsx`](./app/annies/leaderboard-flap-slide.fn.tsx) | The whole story on one board: fill-in `mean@5` → hold → re-flip in place to `best@5`. |
| `leaderboard-flap-cover` (image) | [`app/images/leaderboard-flap-cover.fn.tsx`](./app/images/leaderboard-flap-cover.fn.tsx) | Still cover — the settled `best@5` board. |

Each cut's annie and cover render a shared component —
[`app/components/original-leaderboard.tsx`](./app/components/original-leaderboard.tsx),
[`app/components/slick-leaderboard.tsx`](./app/components/slick-leaderboard.tsx) and
[`app/components/flap-leaderboard.tsx`](./app/components/flap-leaderboard.tsx) —
so each thumbnail stays pixel-consistent with its video. All three cuts read the
same dataset, [`app/frontierswe-data.ts`](./app/frontierswe-data.ts) — swap those
arrays (or feed your own rows via the fn props) to retarget the videos at any
leaderboard.

## Preview & render

```bash
npm install
cp .env.example .env   # set SECRET_KEY
npm run dev            # http://127.0.0.1:3839
```

Open the effie preview, or render straight to an MP4 with the bundled FFS:

```bash
# the original cut
npx ffs render "http://127.0.0.1:3839/preview/effie/leaderboard-original.json" original.mp4
# the slick cut
npx ffs render "http://127.0.0.1:3839/preview/effie/leaderboard-slick.json" slick.mp4
# the flap cut — render it widescreen (16:9)
npx ffs render "http://127.0.0.1:3839/preview/effie/leaderboard-flap.json?w=1920&h=1080" flap.mp4
```
