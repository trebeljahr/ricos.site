/**
 * "Owl Hooting" by Lazy Chill Zone, from Pixabay (sound effect 223549),
 * credited on /imprint. Downmixed to mono at 64 kbps. All four hoots stay in
 * one file and play as clips cut from it: one small download, one decode.
 */
const SRC = "/sounds/owl-hoots.mp3";

type Clip = { from: number; to: number };

/** Where the hoots sit in the recording, in seconds, cut in the quiet between them. */
const CLIPS = {
  /** A soft pickup straight into a short, rising hoot: "h'HOO". */
  double: { from: 0.12, to: 0.99 },
  /** The same short hoot without the pickup. */
  short: { from: 0.395, to: 0.99 },
  /** A long hoot that sags as it goes. */
  long: { from: 0.99, to: 2.2 },
  /** The longest and steadiest. */
  longest: { from: 2.25, to: 3.56 },
} satisfies Record<string, Clip>;

/**
 * `call` is a full hoot, for the first poke and the lap round the footer,
 * `hurried` a short one for the quick pokes in between, and `startled` the
 * short one sped up, as the owl leaves.
 */
export type HootKind = "call" | "hurried" | "startled";

const POOLS: Record<HootKind, Clip[]> = {
  call: [CLIPS.double, CLIPS.long, CLIPS.longest],
  hurried: [CLIPS.double, CLIPS.short],
  startled: [CLIPS.double],
};

/** The recording peaks near full scale; a footer easter egg should not. */
const LEVEL = 0.45;
const FADE_IN = 0.012;
const FADE_OUT = 0.08;
const STARTLED_RATE = 1.3;

let audio: AudioContext | null = null;
let bytes: Promise<ArrayBuffer> | null = null;
let recording: Promise<AudioBuffer> | null = null;
let playing: { source: AudioBufferSourceNode; level: GainNode } | null = null;
let last: Clip | null = null;

/** Fetch the file before the first click (on hover or focus), so the first hoot is not late. */
export function warmHoots() {
  if (!bytes) {
    bytes = fetch(SRC).then((response) => {
      if (!response.ok) throw new Error(`${SRC}: ${response.status}`);
      return response.arrayBuffer();
    });
    // Offline or blocked: forget the attempt, so the next one tries again.
    bytes.catch(() => {
      bytes = null;
    });
  }
  return bytes;
}

/** A random clip from the pool, never the one just played, so repeat clicks do not sound looped. */
function pick(kind: HootKind) {
  const pool = POOLS[kind];
  const fresh = pool.length > 1 ? pool.filter((clip) => clip !== last) : pool;
  const clip = fresh[Math.floor(Math.random() * fresh.length)];
  last = clip;
  return clip;
}

function play(ctx: AudioContext, buffer: AudioBuffer, clip: Clip, rate: number) {
  const now = ctx.currentTime;

  // One throat: a new hoot cuts the last one off instead of piling on top of it.
  if (playing) {
    const { gain } = playing.level;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0, now + FADE_OUT);
    playing.source.stop(now + FADE_OUT);
  }

  // Fade both cuts, so a clip never clicks on or off.
  const length = clip.to - clip.from;
  const end = now + length / rate;
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, now);
  level.gain.linearRampToValueAtTime(LEVEL, now + FADE_IN);
  level.gain.setValueAtTime(LEVEL, end - FADE_OUT);
  level.gain.linearRampToValueAtTime(0, end);
  level.connect(ctx.destination);

  // Playback rate moves pitch and speed together, like a slightly different owl.
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  source.connect(level);
  source.start(now, clip.from, length);

  const current = { source, level };
  playing = current;
  source.onended = () => {
    level.disconnect();
    if (playing === current) playing = null;
  };
}

/**
 * Hoot once. `rate` above 1 is higher and quicker. Call it straight from the
 * click handler: the audio context has to start inside the user's gesture, or
 * Safari keeps it silent.
 */
export function hoot(rate = 1, kind: HootKind = "call") {
  const AudioContextClass =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  audio ??= new AudioContextClass();
  const ctx = audio;
  void ctx.resume();

  const clip = pick(kind);
  recording ??= warmHoots().then((data) => ctx.decodeAudioData(data));
  recording.then(
    (buffer) => play(ctx, buffer, clip, kind === "startled" ? rate * STARTLED_RATE : rate),
    () => {
      // Decoding detaches the bytes, so a retry has to fetch them again.
      bytes = null;
      recording = null;
    },
  );
}
