import { audioSilenced } from "src/lib/silentAudio";

/**
 * One recorded heartbeat, "Heartbeat Single" by Universfield on Pixabay,
 * trimmed to the beat itself: the lub from the start of the file, the dub
 * from DUB_FROM on, with only a short silence between them. Playing the two
 * apart lets the gap between them shrink as the heart speeds up.
 */
const SRC = "/sounds/heartbeat.mp3";
const DUB_FROM = 0.28;
/** Each of the two sounds is loudest about this long after it starts. */
export const SOUND_PEAK_S = 0.06;
/** A beat that comes due while the recording still loads is dropped once it
    is this late, so a slow first load never plays a beat out of time. */
const LATE_S = 0.1;

/**
 * From the lub to the dub: the recording's own gap at rest, and shorter the
 * faster the heart goes, by the same square root law that pulls the T wave in
 * on the monitor. The dub lands just after the T wave, where it belongs.
 */
export const systole = (rr: number) => DUB_FROM * Math.sqrt(Math.min(rr, 1));

let audio: AudioContext | null = null;
let fetched: Promise<ArrayBuffer | null> | null = null;
let decoded: Promise<AudioBuffer | null> | null = null;
let recording: AudioBuffer | null = null;

const fetchRecording = () => {
  fetched ??= fetch(SRC)
    .then((response) => (response.ok ? response.arrayBuffer() : null))
    .catch(() => null)
    .then((data) => {
      // Let the next beat try again.
      if (!data) fetched = null;
      return data;
    });
  return fetched;
};

/** Starts the download, on hover or focus, so the first click has it to hand.
    The audio itself waits for a click: browsers only allow sound after one. */
export function warmUp() {
  void fetchRecording();
}

const decode = (ctx: AudioContext) => {
  decoded ??= fetchRecording()
    .then((data) => (data ? ctx.decodeAudioData(data) : null))
    .catch(() => null)
    .then((buffer) => {
      recording = buffer;
      if (!buffer) {
        // Decoding hands the download over, so a retry needs a fresh one.
        decoded = null;
        fetched = null;
      }
      return buffer;
    });
  return decoded;
};

/**
 * Switches the sound on. Call it inside the click itself: Safari only lets an
 * AudioContext start there, and the beats come later, from the monitor.
 */
export function wake() {
  if (audioSilenced()) return;
  const AudioContextClass =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  audio ??= new AudioContextClass();
  if (audio.state !== "running") void audio.resume();
  void decode(audio);
}

/**
 * The heart's lub-dub for one beat, starting now: louder the harder it is
 * pounding (`effort`, 0 at rest and 1 flat out), and squeezed up to fit a
 * beat `rr` seconds long. Silent until a click has called `wake`.
 */
export function thump(effort: number, rr: number) {
  const ctx = audio;
  if (!ctx) return;

  const due = ctx.currentTime;
  const play = (buffer: AudioBuffer) => {
    const at = Math.max(due, ctx.currentTime);
    const level = ctx.createGain();
    level.gain.value = 0.5 + 0.4 * effort;
    level.connect(ctx.destination);
    const lub = ctx.createBufferSource();
    lub.buffer = buffer;
    lub.connect(level);
    lub.start(at, 0, DUB_FROM);
    const dub = ctx.createBufferSource();
    dub.buffer = buffer;
    dub.connect(level);
    dub.start(at + systole(rr), DUB_FROM);
  };

  if (recording) play(recording);
  else
    void decode(ctx).then((buffer) => {
      if (buffer && ctx.currentTime - due < LATE_S) play(buffer);
    });
}
