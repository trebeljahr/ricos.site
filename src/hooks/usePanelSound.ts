import { useCallback, useEffect, useRef, useState } from "react";

type PanelSound = "switch" | "button";

/** Short, locally synthesized mechanical clicks. Audio starts only after a user gesture. */
export function usePanelSound() {
  const [enabled, setEnabled] = useState(true);
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
      if (!enabled || typeof window === "undefined") return;
      try {
        const audio = context.current ?? new AudioContext();
        context.current = audio;
        if (audio.state === "suspended") void audio.resume();

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

  return {
    soundEnabled: enabled,
    toggleSound: () => setEnabled((current) => !current),
    playSwitch: () => play("switch"),
    playButton: () => play("button"),
  };
}
