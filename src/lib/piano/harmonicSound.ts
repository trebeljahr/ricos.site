// Sounds for the string and overtones demos, made from the same numbers the
// screen shows: a plucked string whose standing waves die away at the rates
// the demo draws, and a held tone built from chosen harmonics. Both stay
// silent where the page is muted (`?mute`, automated browsers).

import { audioSilenced } from "src/lib/silentAudio";
import { audio, silentVoice, type Voice } from "./audio";
import { type HeldTone, holdTone } from "./synth";

export type StringVoice = Voice & { setFrequency: (hz: number) => void };

const silentString: StringVoice = { ...silentVoice, setFrequency: () => {} };

/**
 * A plucked string: standing wave n sounds at n × `hz` with `amplitudes[n-1]`
 * and fades with time constant `decay(n)` seconds. It can be retuned while it
 * rings, as when a peg turns under a sounding string.
 */
export function pluckedString(
  hz: number,
  amplitudes: number[],
  decay: (n: number) => number,
  level = 0.5,
): StringVoice {
  if (audioSilenced()) return silentString;
  const a = audio();
  if (!a) return silentString;
  const { ctx, out } = a;
  const now = ctx.currentTime;
  const total = amplitudes.reduce((sum, amp) => sum + Math.abs(amp), 0) || 1;
  const nodes: { osc: OscillatorNode; gain: GainNode; n: number }[] = [];
  amplitudes.forEach((amp, i) => {
    const n = i + 1;
    if (Math.abs(amp) < 1e-5 || hz * n > 16000) return;
    const osc = ctx.createOscillator();
    osc.frequency.value = hz * n;
    const gain = ctx.createGain();
    const tau = decay(n);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime((level * Math.abs(amp)) / total, now + 0.003);
    gain.gain.setTargetAtTime(0, now + 0.003, tau);
    osc.connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + tau * 7 + 0.1);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    nodes.push({ osc, gain, n });
  });
  let stopped = false;
  return {
    setFrequency: (f) => {
      if (stopped) return;
      for (const { osc, n } of nodes) osc.frequency.setTargetAtTime(f * n, ctx.currentTime, 0.02);
    },
    stop: (when) => {
      if (stopped) return;
      stopped = true;
      const t = when ?? ctx.currentTime;
      for (const { osc, gain } of nodes) {
        gain.gain.cancelScheduledValues(t);
        gain.gain.setTargetAtTime(0, t, 0.02);
        try {
          osc.stop(t + 0.2);
        } catch {
          // Already stopped.
        }
      }
    },
  };
}

const silentHeld: HeldTone = {
  ...silentVoice,
  setFrequency: () => {},
  setHarmonics: () => {},
  setLevel: () => {},
};

/** A held tone with the given harmonic amplitudes, silent on a muted page. */
export function harmonicTone(hz: number, amplitudes: number[], level = 0.3): HeldTone {
  if (audioSilenced()) return silentHeld;
  return holdTone(hz, amplitudes.some((x) => x > 0) ? amplitudes : [0.0001], level);
}
