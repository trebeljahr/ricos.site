// One AudioContext for every /piano demo on a page. Browsers only let a page
// make sound after a click, tap or key press, so `audio()` is called from those
// handlers; it creates the context the first time and resumes it after that.

type Audio = { ctx: AudioContext; out: AudioNode };

let shared: Audio | null = null;

export const audioSupported = () =>
  typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window);

export function audio(): Audio | null {
  if (!audioSupported()) return null;
  if (!shared) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor({ latencyHint: "interactive" });
    // A gentle limiter, so a ten-note chord or a stack of partials does not clip.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 8;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    const master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(limiter).connect(ctx.destination);
    shared = { ctx, out: master };
  }
  if (shared.ctx.state === "suspended") void shared.ctx.resume();
  return shared;
}

/** The context if a demo already made one, without creating it. */
export const existingAudio = () => shared;

/** A sound that can be stopped early. */
export type Voice = { stop: (when?: number) => void };

export const silentVoice: Voice = { stop: () => {} };
