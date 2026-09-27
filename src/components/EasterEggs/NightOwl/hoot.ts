let audio: AudioContext | null = null;
let woods: ConvolverNode | null = null;
let breath: AudioBuffer | null = null;

/** A short, dark impulse response, so the owl sounds like it sits in a tree, not in the room. */
function makeWoods(ctx: AudioContext) {
  const length = Math.floor(ctx.sampleRate * 1.6);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3.4;
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

/** One second of noise, reused for the breath under every note. */
function makeBreath(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

type Note = { at: number; length: number; pitch: number; level: number };

/** The great horned owl phrase: "hoo — h'hoo hoo — hoooo". */
const CALL: Note[] = [
  { at: 0, length: 0.32, pitch: 1, level: 0.75 },
  { at: 0.5, length: 0.15, pitch: 1.07, level: 1 },
  { at: 0.72, length: 0.16, pitch: 1, level: 0.9 },
  { at: 1, length: 0.52, pitch: 0.93, level: 0.8 },
];

/** Shorter, higher, hurried: the owl has had enough. */
const STARTLED: Note[] = [
  { at: 0, length: 0.12, pitch: 1.2, level: 1 },
  { at: 0.16, length: 0.11, pitch: 1.28, level: 0.95 },
  { at: 0.31, length: 0.22, pitch: 1.14, level: 0.8 },
];

const BASE_HZ = 322;

function playNote(ctx: AudioContext, out: AudioNode, note: Note, base: number, origin: number) {
  const start = origin + note.at;
  const end = start + note.length;
  const hz = base * note.pitch;
  const peak = 0.3 * note.level;
  const attack = Math.min(0.08, note.length * 0.4);

  // Soft at both ends, with a long tail: an owl never clicks on or off.
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(peak, start + attack);
  envelope.gain.exponentialRampToValueAtTime(peak * 0.7, end - note.length * 0.2);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end + 0.16);
  envelope.connect(out);

  // The pitch lifts into the note and sags out of it.
  const tone = ctx.createOscillator();
  tone.type = "sine";
  tone.frequency.setValueAtTime(hz * 0.94, start);
  tone.frequency.exponentialRampToValueAtTime(hz, start + note.length * 0.3);
  tone.frequency.exponentialRampToValueAtTime(hz * 0.9, end);

  // A quiet octave above keeps the tone from sounding like a test signal.
  const overtone = ctx.createOscillator();
  overtone.type = "sine";
  overtone.frequency.setValueAtTime(hz * 1.99, start);
  overtone.frequency.exponentialRampToValueAtTime(hz * 1.8, end);
  const overtoneLevel = ctx.createGain();
  overtoneLevel.gain.value = 0.16;

  const vibrato = ctx.createOscillator();
  const vibratoDepth = ctx.createGain();
  vibrato.frequency.value = 5.5 + Math.random() * 2;
  vibratoDepth.gain.value = hz * 0.012;
  vibrato.connect(vibratoDepth);
  vibratoDepth.connect(tone.frequency);
  vibratoDepth.connect(overtone.frequency);

  // Air through the throat.
  const air = ctx.createBufferSource();
  air.buffer = breath;
  air.loop = true;
  const airBand = ctx.createBiquadFilter();
  airBand.type = "bandpass";
  airBand.frequency.value = hz * 2.2;
  airBand.Q.value = 1.1;
  const airLevel = ctx.createGain();
  airLevel.gain.value = 0.06;

  tone.connect(envelope);
  overtone.connect(overtoneLevel).connect(envelope);
  air.connect(airBand).connect(airLevel).connect(envelope);

  for (const source of [tone, overtone, vibrato, air]) {
    source.start(start);
    source.stop(end + 0.25);
  }
}

/**
 * A synthesized owl call, no audio file needed: breathy tones through a little
 * woodland reverb. `pitch` multiplies the whole phrase, and every call is
 * detuned a touch on its own, so repeat clicks never sound identical. The
 * startled variant is the short, high one the owl gives as it leaves.
 * Only ever called from a click.
 */
export function hoot(pitch = 1, variant: "call" | "startled" = "call") {
  const AudioContextClass =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  audio ??= new AudioContextClass();
  const ctx = audio;
  void ctx.resume();
  breath ??= makeBreath(ctx);
  woods ??= makeWoods(ctx);

  // Owl hoots are dark: everything above the first few harmonics goes.
  const body = ctx.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.value = 1300;
  body.Q.value = 0.8;

  const master = ctx.createGain();
  master.gain.value = 0.9;
  body.connect(master);
  master.connect(ctx.destination);

  const distance = ctx.createGain();
  distance.gain.value = 0.3;
  master.connect(distance).connect(woods).connect(ctx.destination);

  const base = BASE_HZ * pitch * (0.97 + Math.random() * 0.06);
  const notes = variant === "startled" ? STARTLED : CALL;
  const origin = ctx.currentTime + 0.02;
  for (const note of notes) playNote(ctx, body, note, base, origin);
}
