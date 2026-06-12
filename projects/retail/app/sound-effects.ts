import type { ChatMessage } from "~/chat-ui";
import type { ConversationSchedule } from "~/annies/chat-conversation.fn";

// Synthesized chat sound effects, pre-mixed into a single WAV and inlined as
// a data: URL (which the effie schema accepts as an audio source). The effie
// format has no timed audio cues — one track per segment, starting at the
// segment start — so per-message pops are baked into one track at the exact
// offsets the conversation schedule dictates.

const SAMPLE_RATE = 22050;

/** Add a sine blip sweeping f0 → f1 with a fast attack and exponential decay. */
function addBlip(
  samples: Float32Array,
  startSec: number,
  durSec: number,
  f0: number,
  f1: number,
  amp: number,
) {
  const start = Math.round(startSec * SAMPLE_RATE);
  const count = Math.round(durSec * SAMPLE_RATE);
  const attack = Math.round(0.005 * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < count && start + i < samples.length; i++) {
    const t = i / count;
    const freq = f0 + (f1 - f0) * t;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const envelope = Math.min(1, i / attack) * Math.exp(-3.5 * t);
    samples[start + i] += amp * envelope * Math.sin(phase);
  }
}

function toWavDataUrl(samples: Float32Array): string {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return `data:audio/wav;base64,${buf.toString("base64")}`;
}

/**
 * One pre-mixed track for a conversation: a rising pop for outgoing
 * messages, a falling one for incoming, soft ticks while the typing
 * indicator runs, and a tiny chirp on the read receipt.
 */
export function chatSoundEffectsDataUrl(
  messages: ChatMessage[],
  schedule: ConversationSchedule,
  fps: number,
): string {
  const { events, receiptFrame, totalFrameCount } = schedule;
  const samples = new Float32Array(
    Math.ceil((totalFrameCount / fps) * SAMPLE_RATE),
  );

  events.forEach(({ typeStart, pop }, i) => {
    // Seeded messages (already on screen at frame 0) pop before the segment
    // starts and make no sound.
    if (pop < 0) return;
    if (messages[i].sender === "user") {
      addBlip(samples, pop / fps, 0.1, 660, 880, 0.32);
    } else {
      addBlip(samples, pop / fps, 0.12, 540, 440, 0.28);
    }
    if (typeStart !== undefined) {
      for (let f = typeStart + 3; f < pop - 3; f += 5) {
        addBlip(samples, f / fps, 0.03, 1150, 1150, 0.06);
      }
    }
  });
  if (receiptFrame) {
    addBlip(samples, receiptFrame / fps, 0.06, 880, 1320, 0.1);
  }

  return toWavDataUrl(samples);
}

/**
 * Effects for the notification intro: a two-note ascending chime when the
 * banner drops in, and a soft fingertip thump (low knock plus a tiny click)
 * when it's tapped.
 */
export function notificationIntroSoundEffectsDataUrl(opts: {
  durationSec: number;
  popSec: number;
  tapSec: number;
}): string {
  const { durationSec, popSec, tapSec } = opts;
  const samples = new Float32Array(Math.ceil(durationSec * SAMPLE_RATE));

  // D6 then G6 — the classic "you've got a message" interval.
  addBlip(samples, popSec, 0.22, 1175, 1175, 0.2);
  addBlip(samples, popSec + 0.09, 0.32, 1568, 1568, 0.24);

  addBlip(samples, tapSec, 0.05, 300, 170, 0.38);
  addBlip(samples, tapSec, 0.025, 1900, 1500, 0.1);

  return toWavDataUrl(samples);
}

/**
 * Soft pops for a staggered list reveal, pitched ascending so the list
 * audibly "builds up". Offsets follow the feature-list annie's timing: the
 * layer delay, then one pill per stagger, each popping a beat into its
 * reveal as it becomes visible.
 */
export function listRevealSoundEffectsDataUrl(opts: {
  durationSec: number;
  delaySec: number;
  count: number;
  staggerFrames: number;
  revealFrames: number;
  fps: number;
}): string {
  const { durationSec, delaySec, count, staggerFrames, revealFrames, fps } =
    opts;
  const samples = new Float32Array(Math.ceil(durationSec * SAMPLE_RATE));

  for (let i = 0; i < count; i++) {
    const at = delaySec + (i * staggerFrames + revealFrames * 0.3) / fps;
    const base = 520 + i * 70;
    addBlip(samples, at, 0.09, base, base * 1.3, 0.22);
    addBlip(samples, at, 0.05, base * 2, base * 2.4, 0.07);
  }

  return toWavDataUrl(samples);
}

/**
 * Effects for the CTA outro: a thud when the price card's bounce starts
 * (with a softer rebound), keyboard ticks in step with the typewriter
 * (one character per 3 frames), and a typewriter-bell ding at the end of
 * the line.
 */
export function ctaSoundEffectsDataUrl(opts: {
  durationSec: number;
  bounceStartSec: number;
  bounceDurationSec: number;
  typingStartSec: number;
  typingFrameCount: number;
  fps: number;
}): string {
  const {
    durationSec,
    bounceStartSec,
    bounceDurationSec,
    typingStartSec,
    typingFrameCount,
    fps,
  } = opts;
  const samples = new Float32Array(Math.ceil(durationSec * SAMPLE_RATE));

  // The bounce motion drops the card from above with a Penner
  // ease-out-bounce, so it contacts its resting spot at these fractions of
  // the motion (rebounding 25%, 6.25%, then 1.5% of the height) — the thuds
  // belong on the impacts, not at motion start.
  const impacts: Array<[fraction: number, energy: number]> = [
    [0.363636, 1],
    [0.727273, 0.5],
    [0.909091, 0.25],
    [0.954545, 0.12],
  ];
  for (const [fraction, energy] of impacts) {
    const at = bounceStartSec + fraction * bounceDurationSec;
    addBlip(samples, at, 0.06 + 0.08 * energy, 160, 60, 0.5 * energy);
    addBlip(samples, at, 0.04 + 0.06 * energy, 280, 120, 0.2 * energy);
  }

  for (let f = 0; f < typingFrameCount; f += 3) {
    const wobble = (f / 3) % 2 === 0 ? 1900 : 1750;
    addBlip(samples, typingStartSec + f / fps, 0.018, wobble, wobble - 150, 0.1);
  }
  addBlip(samples, typingStartSec + typingFrameCount / fps, 0.1, 1320, 1310, 0.16);

  return toWavDataUrl(samples);
}
