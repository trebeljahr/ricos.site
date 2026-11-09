// Where computer-key and MIDI notes go when a page has several pianos (a
// chapter with many demos): to the piano last touched or focused, else to the
// first one on the page. Also the shared Web MIDI connection.

import { QWERTY_LABELS } from "./keys";

// ── The active piano ───────────────────────────────────────────────────────

const mounted: string[] = [];
let active: string | null = null;

export function registerPiano(id: string) {
  mounted.push(id);
  return () => {
    const i = mounted.indexOf(id);
    if (i >= 0) mounted.splice(i, 1);
    if (active === id) active = null;
  };
}

export const activatePiano = (id: string) => {
  active = id;
};

export const isActivePiano = (id: string) => (active ?? mounted[0]) === id;

/** True while typing in a field, where letters must not play notes. */
export function typingInField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = (target as HTMLInputElement).type;
  return !["range", "checkbox", "radio", "button", "submit"].includes(type);
}

// ── Labels of the reader's own keyboard layout ─────────────────────────────

type LayoutMap = { get: (code: string) => string | undefined };
let layoutLabels: Promise<Record<string, string>> | null = null;

/** Labels for the piano's computer keys on this keyboard layout (QWERTZ puts Z where QWERTY has Y). */
export function keyLabels(): Promise<Record<string, string>> {
  if (!layoutLabels) {
    const keyboard = (
      globalThis.navigator as unknown as { keyboard?: { getLayoutMap?: () => Promise<LayoutMap> } }
    )?.keyboard;
    layoutLabels = keyboard?.getLayoutMap
      ? keyboard
          .getLayoutMap()
          .then((map) =>
            Object.fromEntries(
              Object.keys(QWERTY_LABELS).map((code) => [
                code,
                (map.get(code) ?? QWERTY_LABELS[code]).toUpperCase(),
              ]),
            ),
          )
          .catch(() => QWERTY_LABELS)
      : Promise.resolve(QWERTY_LABELS);
  }
  return layoutLabels;
}

// ── Web MIDI ───────────────────────────────────────────────────────────────

export type MidiStatus = "unsupported" | "off" | "connecting" | "on" | "denied";

export type MidiEvent =
  | { type: "on"; midi: number; velocity: number }
  | { type: "off"; midi: number }
  | { type: "sustain"; down: boolean };

type MidiState = { status: MidiStatus; inputs: string[] };

type MIDIMessage = { data: Uint8Array };
type MIDIInputLike = { name?: string | null; onmidimessage: ((event: MIDIMessage) => void) | null };
type MIDIAccessLike = {
  inputs: Map<string, MIDIInputLike>;
  onstatechange: (() => void) | null;
};

const midiSupported = () => typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;

let midiState: MidiState = { status: "off", inputs: [] };
const statusListeners = new Set<() => void>();
const eventListeners = new Set<(event: MidiEvent) => void>();

function setMidiState(next: MidiState) {
  midiState = next;
  for (const listener of statusListeners) listener();
}

export const getMidiState = (): MidiState =>
  midiState.status === "off" && !midiSupported() ? UNSUPPORTED : midiState;
const UNSUPPORTED: MidiState = { status: "unsupported", inputs: [] };
export const getServerMidiState = (): MidiState => midiState;

export function subscribeMidiState(listener: () => void) {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

export function onMidiEvent(listener: (event: MidiEvent) => void) {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

function handle({ data }: MIDIMessage) {
  const [status, a, b] = data;
  const kind = status & 0xf0;
  let event: MidiEvent | null = null;
  if (kind === 0x90 && b > 0) event = { type: "on", midi: a, velocity: b / 127 };
  else if (kind === 0x80 || (kind === 0x90 && b === 0)) event = { type: "off", midi: a };
  else if (kind === 0xb0 && a === 64) event = { type: "sustain", down: b >= 64 };
  if (event) for (const listener of eventListeners) listener(event);
}

/** Asks the browser for MIDI input. Only call from a click: it may show a permission prompt. */
export async function connectMidi() {
  if (!midiSupported()) return setMidiState(UNSUPPORTED);
  setMidiState({ status: "connecting", inputs: [] });
  try {
    const access = (await (
      navigator as unknown as { requestMIDIAccess: () => Promise<MIDIAccessLike> }
    ).requestMIDIAccess()) as MIDIAccessLike;
    const attach = () => {
      const inputs = [...access.inputs.values()];
      for (const input of inputs) input.onmidimessage = handle;
      setMidiState({ status: "on", inputs: inputs.map((input) => input.name ?? "MIDI input") });
    };
    access.onstatechange = attach;
    attach();
  } catch {
    setMidiState({ status: "denied", inputs: [] });
  }
}
