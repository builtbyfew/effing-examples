// The backing track for the job-listing effie — a ~15s upbeat cut hosted
// on the static CDN — together with its measured timing landmarks (offline
// onset and high-band energy analysis of this exact file). Everything in
// the video hangs off this grid: segment cuts, word punches, strobe
// flashes, and the logo's moves. If the track ever changes, re-measure.

export const MUSIC_URL = "https://static.effing.dev/audio/accentric-music.mp3";

// Beat grid: ~136.2 BPM, first beat ≈ 0.416s in.
export const MUSIC_BEAT = 0.4406;
export const MUSIC_FIRST_BEAT = 0.416;

/** Time of beat `k` (0-based) in seconds. */
export const beatAt = (k: number) => MUSIC_FIRST_BEAT + k * MUSIC_BEAT;

// The audible audio ends here (the file itself pads out to ~15.06s) — the
// composition is sized to end with it.
export const MUSIC_END = 14.83;

// The track's two loudest accents sit on beats 10 and 26 — the effie puts
// its biggest cuts on them. A "swoosh" riser peaks here; the logo answers
// it with a swirl.
export const MUSIC_SWOOSH_PEAK = 1.47;
