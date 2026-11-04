import {
  initialScanner,
  type MatrixKey,
  type MatrixSize,
  type Scanner,
  scanRow,
  senseMatrix,
} from "./keyboardMatrix";

export const MEMORY_BASE = 0x0400;
export const MEMORY_SIZE = 32;
const TEXT_LIMIT = 512;
const QUEUE_LIMIT = 64;

type Transition = { index: number; down: boolean };

/** The controller's latest finished key event. */
export type KeyReport = {
  /** Counts events, so a repeat of the same key still reads as new. */
  serial: number;
  index: number;
  down: boolean;
  character: string | null;
};

/** The latest character the controller put into memory. */
export type MemoryWrite = { serial: number; character: string; bytes: number[]; address: number };

/**
 * A keyboard run by its real scan: the controller drives one row at a time,
 * reads the columns through `senseMatrix`, hands them to `scanRow`, and writes
 * the character of each new key press into a ring buffer in memory.
 */
export type KeyboardMachine = {
  size: MatrixSize;
  keys: readonly MatrixKey[];
  capsIndex: number;
  scanner: Scanner;
  /** Which switches are closed right now. */
  closed: boolean[];
  queue: Transition[];
  /** The row driven in the last step and the columns it pulled low. */
  row: number;
  columnsLow: boolean[];
  caps: boolean;
  memory: number[];
  head: number;
  /** What a program reading the buffer would show. */
  text: string;
  last: KeyReport | null;
  written: MemoryWrite | null;
};

export function createMachine(
  size: MatrixSize,
  keys: readonly MatrixKey[],
  capsIndex = -1,
): KeyboardMachine {
  return {
    size,
    keys,
    capsIndex,
    scanner: initialScanner(size),
    closed: Array<boolean>(size.rows * size.columns).fill(false),
    queue: [],
    row: 0,
    columnsLow: Array<boolean>(size.columns).fill(false),
    caps: false,
    memory: Array<number>(MEMORY_SIZE).fill(0),
    head: 0,
    text: "",
    last: null,
    written: null,
  };
}

/** Where the key will be once everything queued for it has happened. */
function pending(machine: KeyboardMachine, index: number) {
  for (let i = machine.queue.length - 1; i >= 0; i--)
    if (machine.queue[i].index === index) return machine.queue[i].down;
  return machine.closed[index];
}

export function pressKey(machine: KeyboardMachine, index: number): KeyboardMachine {
  if (pending(machine, index) || machine.queue.length >= QUEUE_LIMIT) return machine;
  return { ...machine, queue: [...machine.queue, { index, down: true }] };
}

export function releaseKey(machine: KeyboardMachine, index: number): KeyboardMachine {
  if (!pending(machine, index)) return machine;
  return { ...machine, queue: [...machine.queue, { index, down: false }] };
}

/**
 * Let queued finger movements reach the switches, oldest first. Each one waits
 * until the scan has confirmed the last press and the last change to its own key,
 * so a tap shorter than a scan is never lost, two quick keys never trade places
 * and Shift outlasts the letter it was held for. This scan runs slowly enough to
 * watch; a real keyboard scans fast enough not to need the queue.
 */
function settleContacts(machine: KeyboardMachine): { closed: boolean[]; queue: Transition[] } {
  const { stable } = machine.scanner;
  const closed = [...machine.closed];
  let pressInFlight = closed.some((on, i) => on && !stable[i]);
  let applied = 0;
  for (const { index, down } of machine.queue) {
    if (pressInFlight || closed[index] !== stable[index]) break;
    closed[index] = down;
    if (down) pressInFlight = true;
    applied++;
  }
  return { closed, queue: applied ? machine.queue.slice(applied) : machine.queue };
}

function applyToText(text: string, character: string) {
  if (character === "\b") return Array.from(text).slice(0, -1).join("");
  return (text + character).slice(-TEXT_LIMIT);
}

const isLetter = (key: MatrixKey) =>
  key.plain !== undefined && key.plain !== key.shifted && key.plain.toUpperCase() === key.shifted;

/** Drive the next row, read the columns, and write out any key the finished scan confirmed. */
export function stepRow(machine: KeyboardMachine): KeyboardMachine {
  const { closed, queue } = settleContacts(machine);
  const row = machine.scanner.row;
  const columnsLow = senseMatrix(machine.size, closed, row, true);
  const scanned = scanRow(machine.scanner, machine.size, columnsLow, machine.keys, 1);

  let { caps, head, text, last, written, memory } = machine;
  for (const event of scanned.events) {
    const key = machine.keys[event.index];
    if (event.down && event.index === machine.capsIndex) caps = !caps;
    let character: string | null = null;
    if (event.down && key) {
      const upper = isLetter(key) ? event.shift !== caps : event.shift;
      character = (upper ? key.shifted : key.plain) ?? null;
    }
    const serial = (last?.serial ?? 0) + 1;
    last = { serial, index: event.index, down: event.down, character };
    if (character === null) continue;
    const bytes = Array.from(new TextEncoder().encode(character));
    written = { serial, character, bytes, address: MEMORY_BASE + head };
    memory = [...memory];
    for (const byte of bytes) {
      memory[head] = byte;
      head = (head + 1) % MEMORY_SIZE;
    }
    text = applyToText(text, character);
  }
  return {
    ...machine,
    closed,
    queue,
    row,
    columnsLow,
    // The controller has taken these events; the buffer replaces the scanner's own text.
    scanner: { ...scanned, events: [], text: "" },
    caps,
    memory,
    head,
    text,
    last,
    written,
  };
}

/** Empty the buffer and the screen; the switches and the scan carry on. */
export function clearMemory(machine: KeyboardMachine): KeyboardMachine {
  return {
    ...machine,
    memory: Array<number>(MEMORY_SIZE).fill(0),
    head: 0,
    text: "",
    last: null,
    written: null,
  };
}
