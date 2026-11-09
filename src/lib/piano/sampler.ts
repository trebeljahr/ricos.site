// The sampled piano: Salamander Grand Piano V3 (Alexander Holm, CC BY 3.0),
// one recording every three keys from A0 to C8 in public/sounds/piano. Every
// other key, and any frequency in between keys, plays the nearest recording
// slightly faster or slower.

import { audio, silentVoice, type Voice } from "./audio";
import { hzToMidi, PIANO_HIGH, PIANO_LOW } from "./notes";

const SAMPLE_STEP = 3;
const SAMPLE_NAMES: Record<number, string> = { 0: "C", 3: "Ds", 6: "Fs", 9: "A" };

/** MIDI numbers of the recorded keys: 21 (A0), 24 (C1) … 108 (C8). */
export const SAMPLED_KEYS = Array.from(
  { length: (PIANO_HIGH - PIANO_LOW) / SAMPLE_STEP + 1 },
  (_, i) => PIANO_LOW + i * SAMPLE_STEP,
);

export const sampleUrl = (midi: number) =>
  `/sounds/piano/${SAMPLE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}.mp3`;

/** The recorded key nearest to any (fractional) MIDI number. */
export function nearestSample(midi: number) {
  const clamped = Math.min(PIANO_HIGH, Math.max(PIANO_LOW, midi));
  return PIANO_LOW + Math.round((clamped - PIANO_LOW) / SAMPLE_STEP) * SAMPLE_STEP;
}

const files = new Map<number, Promise<ArrayBuffer | null>>();
const buffers = new Map<number, Promise<AudioBuffer | null>>();
const ready = new Map<number, AudioBuffer>();

function fetchFile(sample: number) {
  let file = files.get(sample);
  if (!file) {
    file = fetch(sampleUrl(sample))
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null);
    files.set(sample, file);
  }
  return file;
}

function decoded(sample: number, ctx: AudioContext) {
  let buffer = buffers.get(sample);
  if (!buffer) {
    buffer = fetchFile(sample)
      .then((data) => (data ? ctx.decodeAudioData(data.slice(0)) : null))
      .then((decodedBuffer) => {
        if (decodedBuffer) ready.set(sample, decodedBuffer);
        return decodedBuffer;
      })
      .catch(() => null);
    buffers.set(sample, buffer);
  }
  return buffer;
}

/**
 * Downloads the recordings for a range of keys without decoding them, so the
 * first note plays at once. Safe to call before any click: it makes no sound
 * and creates no AudioContext.
 */
export function prefetchPiano(low = PIANO_LOW, high = PIANO_HIGH) {
  if (typeof fetch === "undefined") return;
  for (const key of SAMPLED_KEYS) {
    if (key >= nearestSample(low) - SAMPLE_STEP && key <= nearestSample(high) + SAMPLE_STEP) {
      void fetchFile(key);
    }
  }
}

export type PianoNoteOptions = {
  /** 0–1, how hard the key is struck. */
  velocity?: number;
  /** Seconds after now to strike. */
  delay?: number;
  /** Seconds the key is held; omit to hold until `stop()`. */
  duration?: number;
};

/** Plays one key (a fractional MIDI number plays between keys). */
export function playPiano(midi: number, options: PianoNoteOptions = {}): Voice {
  const a = audio();
  if (!a) return silentVoice;
  const { ctx, out } = a;
  const sample = nearestSample(midi);
  const velocity = Math.min(1, Math.max(0.05, options.velocity ?? 0.75));
  const startAt = ctx.currentTime + (options.delay ?? 0);

  let stopped: number | null = null;
  let release: ((when: number) => void) | null = null;

  const start = (buffer: AudioBuffer) => {
    const when = Math.max(startAt, ctx.currentTime);
    if (stopped !== null && stopped <= when) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 2 ** ((midi - sample) / 12);
    const gain = ctx.createGain();
    // Softer notes are quieter and, on a real piano, duller; a gentle low-pass
    // that opens with velocity stands in for the missing velocity layers.
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1800 + velocity * velocity * 14000;
    gain.gain.value = 0.9 * velocity ** 1.4;
    source.connect(tone).connect(gain).connect(out);
    source.start(when);
    release = (at: number) => {
      const t = Math.max(at, when);
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      // The damper: about a tenth of a second until the string is quiet.
      gain.gain.setTargetAtTime(0, t, 0.09);
      source.stop(t + 0.8);
    };
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    if (stopped !== null) release(stopped);
    else if (options.duration !== undefined) release(when + options.duration);
  };

  const now = ready.get(sample);
  if (now) start(now);
  else void decoded(sample, ctx).then((buffer) => buffer && start(buffer));

  return {
    stop: (when) => {
      const at = when ?? ctx.currentTime;
      stopped = at;
      release?.(at);
    },
  };
}

/** Plays a frequency in hertz on the sampled piano, for tunings between the keys. */
export const playPianoHz = (hz: number, options?: PianoNoteOptions) =>
  playPiano(hzToMidi(hz), options);

/** Several keys at once (`spread` 0) or one after another (`spread` in seconds). */
export function playPianoChord(
  keys: number[],
  {
    spread = 0,
    velocity = 0.7,
    duration = 1.6,
  }: { spread?: number; velocity?: number; duration?: number } = {},
) {
  const voices = keys.map((midi, i) =>
    playPiano(midi, {
      velocity,
      delay: i * spread,
      duration: duration + (keys.length - 1 - i) * spread,
    }),
  );
  return {
    stop: () =>
      voices.forEach((voice) => {
        voice.stop();
      }),
  } satisfies Voice;
}
