import { type RefObject, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  activatePiano,
  connectMidi,
  getMidiState,
  getServerMidiState,
  isActivePiano,
  keyLabels,
  type MidiEvent,
  onMidiEvent,
  registerPiano,
  subscribeMidiState,
  typingInField,
} from "src/lib/piano/input";
import { COMPUTER_KEYS, OCTAVE_DOWN_KEY, OCTAVE_UP_KEY } from "src/lib/piano/keys";

type Handlers = {
  onDown: (midi: number, velocity: number) => void;
  onUp: (midi: number) => void;
  onSustain?: (down: boolean) => void;
};

/**
 * Computer keys and MIDI for one piano. Only the active piano on the page
 * (last touched or focused, else the first) receives them. `base` is the C
 * that the A key plays.
 */
export function usePianoInput(
  base: number,
  handlers: Handlers,
  { onOctave, enabled = true }: { onOctave?: (step: -1 | 1) => void; enabled?: boolean } = {},
) {
  const id = useId();
  const latest = useRef({ base, handlers, onOctave });
  latest.current = { base, handlers, onOctave };

  useEffect(() => {
    if (!enabled) return;
    const unregister = registerPiano(id);
    // Keys held when the octave changes still need their own note-off.
    const held = new Map<string, number>();

    const keydown = (event: KeyboardEvent) => {
      if (!isActivePiano(id) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (typingInField(event.target)) return;
      if (event.code === OCTAVE_DOWN_KEY || event.code === OCTAVE_UP_KEY) {
        if (!event.repeat) latest.current.onOctave?.(event.code === OCTAVE_UP_KEY ? 1 : -1);
        return;
      }
      const step = COMPUTER_KEYS[event.code];
      if (step === undefined) return;
      event.preventDefault();
      if (event.repeat || held.has(event.code)) return;
      const midi = latest.current.base + step;
      held.set(event.code, midi);
      latest.current.handlers.onDown(midi, 0.72);
    };
    const keyup = (event: KeyboardEvent) => {
      const midi = held.get(event.code);
      if (midi === undefined) return;
      held.delete(event.code);
      latest.current.handlers.onUp(midi);
    };
    const blur = () => {
      for (const midi of held.values()) latest.current.handlers.onUp(midi);
      held.clear();
    };
    const midi = (event: MidiEvent) => {
      if (!isActivePiano(id)) return;
      const h = latest.current.handlers;
      if (event.type === "on") h.onDown(event.midi, event.velocity);
      else if (event.type === "off") h.onUp(event.midi);
      else h.onSustain?.(event.down);
    };

    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    const offMidi = onMidiEvent(midi);
    return () => {
      blur();
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      offMidi();
      unregister();
    };
  }, [id, enabled]);

  return { activate: () => activatePiano(id) };
}

export function useMidiStatus() {
  const state = useSyncExternalStore(subscribeMidiState, getMidiState, getServerMidiState);
  return { ...state, connect: connectMidi };
}

/** Letters printed on the reader's keyboard for the piano's computer keys. */
export function useKeyLabels() {
  const [labels, setLabels] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    let live = true;
    void keyLabels().then((l) => live && setLabels(l));
    return () => {
      live = false;
    };
  }, []);
  return labels;
}

/** Width of an element in CSS pixels, kept current. */
export function useWidth(ref: RefObject<HTMLElement | null>, fallback = 640) {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.clientWidth || fallback);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, fallback]);
  return width;
}
