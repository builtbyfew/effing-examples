import type { ChatMessage, ConversationSchedule } from "~/annies/chat-conversation.fn";

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

  addBlip(samples, bounceStartSec, 0.16, 150, 65, 0.5);
  addBlip(samples, bounceStartSec, 0.12, 260, 120, 0.2);
  addBlip(samples, bounceStartSec + bounceDurationSec * 0.5, 0.12, 130, 70, 0.18);

  for (let f = 0; f < typingFrameCount; f += 3) {
    const wobble = (f / 3) % 2 === 0 ? 1900 : 1750;
    addBlip(samples, typingStartSec + f / fps, 0.018, wobble, wobble - 150, 0.1);
  }
  addBlip(samples, typingStartSec + typingFrameCount / fps, 0.1, 1320, 1310, 0.16);

  return toWavDataUrl(samples);
}
