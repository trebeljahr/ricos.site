import { useCallback, useEffect, useRef, useState } from "react";
import { audioSilenced } from "src/lib/silentAudio";

/** One stroke of the typewriter a typer sounds like. */
export type TypeStroke = "key" | "space" | "return" | "back" | "bell";

type PanelSound =
  | "switch"
  | "button"
  | "success"
  | "toggleOn"
  | "toggleOff"
  | "refuse"
  | TypeStroke;

/** Which stroke a character takes on a typewriter. Null is the backspace key. */
export function strokeOf(char: string | null | undefined): TypeStroke {
  if (char === null || char === undefined) return "back";
  if (char === " " || char === "\t") return "space";
  if (char === "\n" || char === "\r") return "return";
  if (char === "\u0007") return "bell";
  return "key";
}

/** A pitch that falls, the body of anything mechanical that lands. */
function thump(
  audio: AudioContext,
  at: number,
  from: number,
  to: number,
  gain: number,
  length: number,
) {
  const tone = audio.createOscillator();
  const volume = audio.createGain();
  tone.type = "triangle";
  tone.frequency.setValueAtTime(from, at);
  tone.frequency.exponentialRampToValueAtTime(to, at + length);
  volume.gain.setValueAtTime(0.0001, at);
  volume.gain.exponentialRampToValueAtTime(gain, at + 0.003);
  volume.gain.exponentialRampToValueAtTime(0.0001, at + length);
  tone.connect(volume).connect(audio.destination);
  tone.start(at);
  tone.stop(at + length);
}

/** A filtered tick of noise, the contact of metal on metal. */
function tick(
  audio: AudioContext,
  noise: AudioBuffer,
  at: number,
  frequency: number,
  gain: number,
  length: number,
) {
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const volume = audio.createGain();
  source.buffer = noise;
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 0.8;
  volume.gain.setValueAtTime(gain, at);
  volume.gain.exponentialRampToValueAtTime(0.0001, at + length);
  source.connect(filter).connect(volume).connect(audio.destination);
  source.start(at);
  source.stop(at + length + 0.002);
}

/** A pure tone that rings out, for what is struck rather than clicked. */
function ring(audio: AudioContext, at: number, frequency: number, gain: number, length: number) {
  const tone = audio.createOscillator();
  const volume = audio.createGain();
  tone.type = "sine";
  tone.frequency.setValueAtTime(frequency, at);
  volume.gain.setValueAtTime(0.0001, at);
  volume.gain.exponentialRampToValueAtTime(gain, at + 0.002);
  volume.gain.exponentialRampToValueAtTime(0.0001, at + length);
  tone.connect(volume).connect(audio.destination);
  tone.start(at);
  tone.stop(at + length);
}

/** Short, locally synthesized mechanical clicks. Audio starts only after a user gesture. */
export function usePanelSound({ defaultEnabled = true }: { defaultEnabled?: boolean } = {}) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const context = useRef<AudioContext | null>(null);
  const noise = useRef<AudioBuffer | null>(null);

  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );

  const play = useCallback(
    (kind: PanelSound) => {
      if (!enabled || typeof window === "undefined" || audioSilenced()) return;
      try {
        const audio = context.current ?? new AudioContext();
        context.current = audio;
        if (audio.state === "suspended") void audio.resume();

        if (kind === "success") {
          const now = audio.currentTime;
          [523.25, 659.25, 783.99].forEach((frequency, index) => {
            const tone = audio.createOscillator();
            const volume = audio.createGain();
            const start = now + index * 0.065;
            tone.type = "sine";
            tone.frequency.setValueAtTime(frequency, start);
            volume.gain.setValueAtTime(0.0001, start);
            volume.gain.exponentialRampToValueAtTime(0.045, start + 0.012);
            volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.19);
            tone.connect(volume).connect(audio.destination);
            tone.start(start);
            tone.stop(start + 0.2);
          });
          return;
        }

        if (!noise.current) {
          const buffer = audio.createBuffer(
            1,
            Math.ceil(audio.sampleRate * 0.055),
            audio.sampleRate,
          );
          const samples = buffer.getChannelData(0);
          for (let index = 0; index < samples.length; index++)
            samples[index] = Math.random() * 2 - 1;
          noise.current = buffer;
        }

        const now = audio.currentTime;
        // Small differences from stroke to stroke keep a run of them from sounding mechanical.
        const vary = (value: number) => value * (0.92 + Math.random() * 0.16);
        const buffer = noise.current;

        if (kind === "toggleOn" || kind === "toggleOff") {
          const up = kind === "toggleOn";
          // The spring gives, then the lever lands: the snap lines up with .toggleLever's transition.
          const snap = now + 0.095;
          tick(audio, buffer, now, 3400, 0.03, 0.012);
          thump(audio, snap, up ? 240 : 180, up ? 76 : 58, 0.15, 0.07);
          tick(audio, buffer, snap, up ? 1900 : 1400, 0.1, 0.03);
          ring(audio, snap, up ? 2650 : 2200, 0.012, 0.05);
          tick(audio, buffer, snap + 0.032, 2500, 0.022, 0.012);
          return;
        }
        if (kind === "key") {
          thump(audio, now, vary(170), 80, 0.075, 0.035);
          tick(audio, buffer, now, vary(2600), 0.09, 0.02);
          tick(audio, buffer, now + 0.03, vary(1400), 0.035, 0.018);
          return;
        }
        if (kind === "space") {
          thump(audio, now, vary(110), 58, 0.09, 0.05);
          tick(audio, buffer, now, vary(1200), 0.06, 0.025);
          return;
        }
        if (kind === "back") {
          thump(audio, now, vary(240), 130, 0.04, 0.02);
          tick(audio, buffer, now, vary(3000), 0.05, 0.015);
          return;
        }
        if (kind === "return") {
          for (let step = 0; step < 7; step++) {
            tick(audio, buffer, now + step * 0.02, 2100 - step * 90, 0.03, 0.012);
          }
          thump(audio, now + 0.15, 130, 60, 0.13, 0.08);
          tick(audio, buffer, now + 0.15, 1100, 0.08, 0.03);
          return;
        }
        if (kind === "bell") {
          ring(audio, now, 2093, 0.05, 0.6);
          ring(audio, now, 3136, 0.02, 0.35);
          return;
        }
        if (kind === "refuse") {
          // The key meets a locked type bar: all thud, no snap.
          thump(audio, now, 95, 48, 0.14, 0.09);
          tick(audio, buffer, now, 480, 0.05, 0.03);
          return;
        }

        const duration = kind === "switch" ? 0.075 : 0.055;
        const impact = audio.createOscillator();
        const impactVolume = audio.createGain();
        impact.type = "triangle";
        impact.frequency.setValueAtTime(kind === "switch" ? 190 : 260, now);
        impact.frequency.exponentialRampToValueAtTime(kind === "switch" ? 72 : 110, now + duration);
        impactVolume.gain.setValueAtTime(0.0001, now);
        impactVolume.gain.exponentialRampToValueAtTime(0.11, now + 0.003);
        impactVolume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        impact.connect(impactVolume).connect(audio.destination);
        impact.start(now);
        impact.stop(now + duration);

        if (kind === "switch") {
          const returnClack = audio.createOscillator();
          const returnVolume = audio.createGain();
          const returnAt = now + 0.032;
          returnClack.type = "triangle";
          returnClack.frequency.setValueAtTime(105, returnAt);
          returnClack.frequency.exponentialRampToValueAtTime(58, returnAt + 0.04);
          returnVolume.gain.setValueAtTime(0.0001, returnAt);
          returnVolume.gain.exponentialRampToValueAtTime(0.055, returnAt + 0.003);
          returnVolume.gain.exponentialRampToValueAtTime(0.0001, returnAt + 0.04);
          returnClack.connect(returnVolume).connect(audio.destination);
          returnClack.start(returnAt);
          returnClack.stop(returnAt + 0.04);
        }

        const click = audio.createBufferSource();
        const filter = audio.createBiquadFilter();
        const clickVolume = audio.createGain();
        click.buffer = noise.current;
        filter.type = "bandpass";
        filter.frequency.value = kind === "switch" ? 1450 : 2200;
        filter.Q.value = 0.7;
        clickVolume.gain.setValueAtTime(0.065, now);
        clickVolume.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
        click.connect(filter).connect(clickVolume).connect(audio.destination);
        click.start(now);
        click.stop(now + 0.03);
      } catch {
        // Audio is optional; controls remain usable if the browser blocks it.
      }
    },
    [enabled],
  );

  const playSuccess = useCallback(() => play("success"), [play]);

  return {
    soundEnabled: enabled,
    toggleSound: () => setEnabled((current) => !current),
    playSwitch: () => play("switch"),
    playButton: () => play("button"),
    playSuccess,
    /** A lever going over; `on` says which way it lands. */
    playToggle: (on: boolean) => play(on ? "toggleOn" : "toggleOff"),
    /** One typewriter stroke. */
    playType: (stroke: TypeStroke) => play(stroke),
    /** A key the machine would not take. */
    playRefuse: () => play("refuse"),
  };
}
