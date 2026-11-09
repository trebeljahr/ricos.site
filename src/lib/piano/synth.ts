// Synthesised tones for the sound demos, where the point is to hear exactly
// the partials on screen: a held tone with chosen harmonics, and a plucked
// string whose partials die away.

import { audio, silentVoice, type Voice } from "./audio";

/** A tone that keeps sounding, and can be retuned or reshaped while it does. */
export type HeldTone = Voice & {
  setFrequency: (hz: number, glide?: number) => void;
  setHarmonics: (amplitudes: number[]) => void;
  setLevel: (level: number, glide?: number) => void;
};

const silentHeld: HeldTone = {
  ...silentVoice,
  setFrequency: () => {},
  setHarmonics: () => {},
  setLevel: () => {},
};

/** Amplitudes of harmonics 1, 2, 3 … scaled so their sum peaks near 1. */
function waveFor(ctx: AudioContext, amplitudes: number[]) {
  const n = Math.max(2, amplitudes.length + 1);
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  amplitudes.forEach((amp, i) => {
    imag[i + 1] = amp;
  });
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

/**
 * A held tone with harmonics of the given amplitudes (index 0 is the
 * fundamental). `level` is 0–1.
 */
export function holdTone(hz: number, amplitudes: number[] = [1], level = 0.35): HeldTone {
  const a = audio();
  if (!a) return silentHeld;
  const { ctx, out } = a;
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(waveFor(ctx, amplitudes));
  osc.frequency.value = hz;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(level, ctx.currentTime, 0.02);
  osc.connect(gain).connect(out);
  osc.start();
  let ended = false;
  return {
    setFrequency: (f, glide = 0.03) => {
      if (!ended) osc.frequency.setTargetAtTime(f, ctx.currentTime, glide);
    },
    setHarmonics: (amps) => {
      if (!ended) osc.setPeriodicWave(waveFor(ctx, amps.some((x) => x > 0) ? amps : [0.0001]));
    },
    setLevel: (l, glide = 0.03) => {
      if (!ended) gain.gain.setTargetAtTime(l, ctx.currentTime, glide);
    },
    stop: (when) => {
      if (ended) return;
      ended = true;
      const t = when ?? ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0, t, 0.04);
      osc.stop(t + 0.4);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    },
  };
}

/**
 * A plucked string: partial n at n × `hz` with amplitude `amplitudes[n-1]`,
 * the higher ones dying away faster. Returns at once; the sound stops itself.
 */
export function pluckTone(
  hz: number,
  amplitudes: number[],
  { level = 0.5, sustain = 2.2 }: { level?: number; sustain?: number } = {},
): Voice {
  const a = audio();
  if (!a) return silentVoice;
  const { ctx, out } = a;
  const now = ctx.currentTime;
  const nodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  const peak = amplitudes.reduce((sum, amp) => sum + Math.abs(amp), 0) || 1;
  amplitudes.forEach((amp, i) => {
    const f = hz * (i + 1);
    if (amp === 0 || f > 18000) return;
    const osc = ctx.createOscillator();
    osc.frequency.value = f;
    const gain = ctx.createGain();
    const start = (level * amp) / peak;
    const decay = sustain / (1 + 0.6 * i);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(start, now + 0.004);
    gain.gain.setTargetAtTime(0, now + 0.004, decay / 4);
    osc.connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + decay * 1.5 + 0.1);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    nodes.push({ osc, gain });
  });
  return {
    stop: (when) => {
      const t = when ?? ctx.currentTime;
      for (const { gain, osc } of nodes) {
        gain.gain.cancelScheduledValues(t);
        gain.gain.setTargetAtTime(0, t, 0.03);
        try {
          osc.stop(t + 0.3);
        } catch {
          // Already stopped.
        }
      }
    },
  };
}
