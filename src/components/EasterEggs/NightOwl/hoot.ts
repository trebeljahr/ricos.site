let audio: AudioContext | null = null;

/**
 * A synthesized owl call, "hoo, hoooo": two soft falling tones with a slight
 * vibrato, no audio file needed. Only ever called from a click.
 */
export function hoot() {
  const AudioContextClass =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  audio ??= new AudioContextClass();
  const ctx = audio;
  void ctx.resume();

  const out = ctx.createBiquadFilter();
  out.type = "lowpass";
  out.frequency.value = 900;
  out.connect(ctx.destination);

  const calls = [
    { at: 0, length: 0.22, from: 420, to: 380 },
    { at: 0.36, length: 0.55, from: 400, to: 330 },
  ];
  const now = ctx.currentTime;
  for (const call of calls) {
    const start = now + call.at;
    const end = start + call.length;

    const tone = ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.setValueAtTime(call.from, start);
    tone.frequency.exponentialRampToValueAtTime(call.to, end);

    const vibrato = ctx.createOscillator();
    const vibratoDepth = ctx.createGain();
    vibrato.frequency.value = 7;
    vibratoDepth.gain.value = 5;
    vibrato.connect(vibratoDepth).connect(tone.frequency);

    const volume = ctx.createGain();
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(0.22, start + 0.06);
    volume.gain.exponentialRampToValueAtTime(0.0001, end);

    tone.connect(volume).connect(out);
    tone.start(start);
    vibrato.start(start);
    tone.stop(end + 0.05);
    vibrato.stop(end + 0.05);
  }
}
