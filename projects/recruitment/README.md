# Effing project `recruitment`

Programmatic image and video creation with the `@effing/*` packages — see [`GUIDE.md`](./GUIDE.md) for setup and deployment.

A kinetic-typography job ad for "Talentspark", an imaginary recruitment
agency (deep indigo, electric-yellow sparkle mark, "we find your spark").
Swap the props to advertise any vacancy — the team line, the rapid-fire
connecting words, the job title, and the CTA are all inputs.

## Effies

- **`job-listing`** — the full square spot: the Talentspark brand sting (the
  full lockup on frame 0 pops on beat one, swirls on the track's "swoosh",
  then winds up and sweeps itself away), a bouncy team-intro line riding a
  travelling wave, single words punching in one per beat, a beat-locked
  strobe revealing the job title, the title slamming in left-aligned line
  per beat, and a handwritten "Apply now" card with one-blink sparkles and
  the lockup sign-off. Every cut, punch, flash, and reveal sits on the
  backing track's measured beat grid — `app/music.ts` holds the track URL
  and its measured landmarks (~136 BPM grid, accents, swoosh peak).

## Fns

- **Annies** — `logo-intro` (the brand sting), `team-line` (bouncy intro
  line on a travelling wave), `word-punch` (one oversized arced word per
  beat), `title-strobe` (16th-note flicker collage settling into the title
  card), `title-slam` (left-aligned slam, one line landing per beat),
  `cta-card` (handwritten CTA, sparkles, sign-off).
- **Images** — `job-cover` (cover/poster frame).

Shared pieces live in `app/components/`: the sparkle mark and lockup in
`spark-logo.tsx`, and the per-letter curved typesetting (arch + travelling
wave, glyphs rotated to the local slope) in `curved-text.ts`. The palette
and type pairing (Space Grotesk / Baloo 2 / Caveat) are in `app/theme.ts`.
