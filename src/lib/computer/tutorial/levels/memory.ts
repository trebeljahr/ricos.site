// Memory: a latch from a loop of gates, a D latch, an edge-triggered flip-flop
// from two latches, then registers, a counter and a small RAM, as in
// NandGame's memory section. These are sequence levels: the check sets inputs
// and the clock tick by tick and reads the lamps after each tick settles.
import { bitsOf, busPorts, CircuitKit, type Source } from "../kit";
import { checkStep, hasWire, placeStep, wireStep } from "../matcher";
import type { Level, LevelPort, SequenceTick } from "../types";
import { boxed, CHAPTERS, once, port } from "./shared";

const SECTION = "Memory";

const SET = port("set", "SET");
const RESET = port("reset", "RESET");
const Q = port("q", "Q");
/** Q with a combining overline, as the presets label it. */
const NQ = port("nq", "Q̅");
const ENABLE = port("enable", "ENABLE");
const DATA = port("data", "DATA");
const CLOCK: LevelPort = { id: "clock", label: "CLOCK", clock: true };
const LOAD = port("load", "LOAD");
const D8 = busPorts("d", "D", 8);
const Q8 = busPorts("q", "Q", 8);
const ADDRESS = [port("a0", "ADDRESS 0", "A0"), port("a1", "ADDRESS 1", "A1")];
const READ = port("read", "READ ENABLE", "READ");
const WRITE = port("write", "WRITE ENABLE", "WRITE");
const DATA_IN = busPorts("in", "DATA IN ", 4, "IN");
const DATA_OUT = busPorts("out", "DATA OUT ", 4, "OUT");

const ROWS = 4;
const WIDTH = 4;

/** Q and Q̅ for a stored bit. */
const stored = (value: boolean) => ({ q: value, nq: !value });

/** Port values for the bits of a number, e.g. q0–q7 for a byte. */
const bitPorts = (prefix: string, value: number, width: number): Record<string, boolean> =>
  Object.fromEntries(bitsOf(value, width).map((bit, index) => [`${prefix}${index}`, bit]));

const byteIn = (value: number) => bitPorts("d", value, 8);
const byteOut = (value: number) => bitPorts("q", value, 8);
const nibbleIn = (value: number) => bitPorts("in", value, WIDTH);
const nibbleOut = (value: number) => bitPorts("out", value, WIDTH);
const address = (value: number) => ({ a0: Boolean(value & 1), a1: Boolean(value & 2) });

// ------------------------------------------------------------------ references

/**
 * Q = SET OR (Q AND NOT RESET). The AND comes first in the node list so that
 * "Show me" places the OR first, as the steps do. The loop starts at 0 from
 * power-on in any gate order: an OR and an AND of zeros stay 0.
 */
const srLatch = once(() => {
  const kit = new CircuitKit("SR latch", [SET, RESET], [Q, NQ]);
  const keep = kit.gate("and", [], { id: "keep" });
  const join = kit.gate("or", ["set", keep], { id: "join" });
  const unreset = kit.gate("not", ["reset"], { id: "unreset" });
  kit.wire(join, keep, 0).wire(unreset, keep, 1);
  const flip = kit.gate("not", [join], { id: "flip" });
  return kit.out("q", join).out("nq", flip).build();
});

const dLatch = once(() => {
  const kit = new CircuitKit("D latch", [ENABLE, DATA], [Q, NQ]);
  const inverted = kit.gate("not", ["data"]);
  const set = kit.gate("and", ["enable", "data"]);
  const reset = kit.gate("and", ["enable", inverted]);
  const latch = kit.part("sr-latch", boxed("sr-latch"), [set, reset], { label: "SR LATCH" });
  return kit.out("q", [latch, 0]).out("nq", [latch, 1]).build();
});

const dFlipFlop = once(() => {
  const kit = new CircuitKit("D flip-flop", [CLOCK, DATA], [Q, NQ]);
  const low = kit.gate("not", ["clock"]);
  const leader = kit.part("d-latch", boxed("d-latch"), [low, "data"], { label: "D LATCH" });
  const follower = kit.part("d-latch", boxed("d-latch"), ["clock", [leader, 0]], {
    label: "D LATCH",
  });
  return kit.out("q", [follower, 0]).out("nq", [follower, 1]).build();
});

const register1 = once(() => {
  const kit = new CircuitKit("Register bit", [CLOCK, LOAD, DATA], [Q]);
  const pick = kit.part("selector", boxed("selector"), ["load", null, "data"], {
    label: "SELECTOR",
  });
  const flipFlop = kit.part("d-flip-flop", boxed("d-flip-flop"), ["clock", [pick, 0]], {
    label: "D FLIP-FLOP",
  });
  kit.wire([flipFlop, 0], pick, 1);
  return kit.out("q", [flipFlop, 0]).build();
});

const register8 = once(() => {
  const kit = new CircuitKit("8-bit register", [CLOCK, LOAD, ...D8], Q8);
  const part = boxed("register1");
  for (let bit = 0; bit < 8; bit++) {
    const cell = kit.part("register1", part, ["clock", "load", `d${bit}`], {
      label: "REGISTER BIT",
    });
    kit.out(`q${bit}`, [cell, 0]);
  }
  return kit.build();
});

const counter8 = once(() => {
  const kit = new CircuitKit("Counter", [CLOCK], Q8);
  const one = kit.gate("high", []);
  const zero = kit.gate("ground", []);
  const register = kit.part(
    "register8",
    boxed("register8"),
    ["clock", one, ...Array.from({ length: 8 }, () => null)],
    { label: "8-BIT REGISTER" },
  );
  const bits = Array.from({ length: 8 }, (_, bit): Source => [register, bit]);
  const plusOne = kit.part(
    "adder8",
    boxed("adder8"),
    [...bits, ...Array.from({ length: 8 }, () => zero), one],
    { label: "8-BIT ADDER" },
  );
  for (let bit = 0; bit < 8; bit++) {
    kit.wire([plusOne, bit], register, 2 + bit);
    kit.out(`q${bit}`, [register, bit]);
  }
  return kit.build();
});

const ram = once(() => {
  const kit = new CircuitKit("RAM", [...ADDRESS, READ, WRITE, ...DATA_IN], DATA_OUT);
  const rows = kit.part("decoder", boxed("decoder"), ["a0", "a1"], { label: "DECODER" });
  const latch = boxed("d-latch");
  const reads: Source[][] = Array.from({ length: WIDTH }, () => []);
  for (let row = 0; row < ROWS; row++) {
    const write = kit.gate("and", [[rows, row], "write"]);
    const read = kit.gate("and", [[rows, row], "read"]);
    for (let bit = 0; bit < WIDTH; bit++) {
      const cell = kit.part("d-latch", latch, [write, `in${bit}`], { label: "D LATCH" });
      reads[bit].push(kit.gate("and", [[cell, 0], read]));
    }
  }
  reads.forEach((sources, bit) => {
    const low = kit.gate("or", [sources[0], sources[1]]);
    const high = kit.gate("or", [sources[2], sources[3]]);
    kit.out(`out${bit}`, kit.gate("or", [low, high]));
  });
  return kit.build();
});

// ----------------------------------------------------------------------- ticks

const SR_TICKS: SequenceTick[] = [
  { set: { set: true }, expect: stored(true), note: "Turn SET on: Q becomes 1." },
  { set: { set: false }, expect: stored(true), note: "Turn SET off. Q stays 1." },
  { set: { reset: true }, expect: stored(false), note: "Turn RESET on: Q becomes 0." },
  { set: { reset: false }, expect: stored(false), note: "Turn RESET off. Q stays 0." },
  { set: { reset: true }, expect: stored(false), note: "Turn RESET on again. Q is already 0." },
  { set: { reset: false }, expect: stored(false), note: "Turn RESET off. Q stays 0." },
  { set: { set: true }, expect: stored(true), note: "Turn SET on: Q becomes 1 again." },
  { set: { set: false }, expect: stored(true), note: "Turn SET off. Q stays 1." },
];

const D_LATCH_TICKS: SequenceTick[] = [
  {
    set: { enable: true, data: true },
    expect: stored(true),
    note: "Turn ENABLE on with DATA at 1: Q follows DATA.",
  },
  { set: { data: false }, expect: stored(false), note: "DATA changes to 0. Q follows it." },
  { set: { data: true }, expect: stored(true), note: "DATA changes back to 1. Q follows it." },
  { set: { enable: false }, expect: stored(true), note: "Turn ENABLE off. Q keeps 1." },
  {
    set: { data: false },
    expect: stored(true),
    note: "DATA changes to 0 while ENABLE is off. Q keeps 1.",
  },
  { set: { enable: true }, expect: stored(false), note: "Turn ENABLE on: Q follows DATA to 0." },
  { set: { enable: false }, expect: stored(false), note: "Turn ENABLE off. Q keeps 0." },
  {
    set: { data: true },
    expect: stored(false),
    note: "DATA changes to 1 while ENABLE is off. Q keeps 0.",
  },
];

const FLIP_FLOP_TICKS: SequenceTick[] = [
  { set: { data: true }, note: "Set DATA to 1 while CLOCK is low." },
  { clock: true, expect: stored(true), note: "CLOCK rises, so Q takes DATA: 1." },
  {
    set: { data: false },
    expect: stored(true),
    note: "DATA changes to 0 while CLOCK is high. Q keeps 1.",
  },
  { clock: false, expect: stored(true), note: "CLOCK falls. Q keeps 1." },
  { clock: true, expect: stored(false), note: "CLOCK rises, so Q takes DATA: 0." },
  {
    set: { data: true },
    expect: stored(false),
    note: "DATA changes to 1 while CLOCK is high. Q keeps 0.",
  },
  { clock: false, expect: stored(false), note: "CLOCK falls. Q keeps 0." },
  { set: { data: false }, expect: stored(false), note: "DATA changes to 0 while CLOCK is low." },
  {
    set: { data: true },
    expect: stored(false),
    note: "DATA changes to 1 while CLOCK is low. Q keeps 0.",
  },
  { clock: true, expect: stored(true), note: "CLOCK rises, so Q takes DATA: 1." },
  { clock: false, expect: stored(true), note: "CLOCK falls. Q keeps 1." },
  { clock: true, expect: stored(true), note: "CLOCK rises with DATA still 1. Q stays 1." },
];

const REGISTER1_TICKS: SequenceTick[] = [
  { set: { load: true, data: true }, note: "Turn LOAD on and set DATA to 1." },
  { clock: true, expect: { q: true }, note: "CLOCK rises, so Q takes DATA: 1." },
  { clock: false, expect: { q: true }, note: "CLOCK falls. Q keeps 1." },
  {
    set: { load: false, data: false },
    expect: { q: true },
    note: "Turn LOAD off and set DATA to 0.",
  },
  { clock: true, expect: { q: true }, note: "CLOCK rises with LOAD off. Q keeps 1." },
  { clock: false, expect: { q: true }, note: "CLOCK falls. Q keeps 1." },
  { set: { load: true }, expect: { q: true }, note: "Turn LOAD on. Q waits for the clock." },
  { clock: true, expect: { q: false }, note: "CLOCK rises, so Q takes DATA: 0." },
  {
    set: { data: true },
    expect: { q: false },
    note: "DATA changes to 1 while CLOCK is high. Q keeps 0.",
  },
  { clock: false, expect: { q: false }, note: "CLOCK falls. Q keeps 0." },
  { set: { load: false }, expect: { q: false }, note: "Turn LOAD off." },
  { clock: true, expect: { q: false }, note: "CLOCK rises with LOAD off. Q keeps 0." },
  { clock: false, expect: { q: false }, note: "CLOCK falls. Q keeps 0." },
  { set: { load: true }, expect: { q: false }, note: "Turn LOAD on. Q waits for the clock." },
  { clock: true, expect: { q: true }, note: "CLOCK rises, so Q takes DATA: 1." },
];

const REGISTER8_TICKS: SequenceTick[] = [
  { set: { load: true, ...byteIn(90) }, note: "Turn LOAD on and set D to 90." },
  { clock: true, expect: byteOut(90), note: "CLOCK rises, so the register stores 90." },
  { set: byteIn(15), expect: byteOut(90), note: "D changes to 15 while CLOCK is high." },
  { clock: false, expect: byteOut(90), note: "CLOCK falls. Q keeps 90." },
  {
    set: { load: false, ...byteIn(255) },
    expect: byteOut(90),
    note: "Turn LOAD off and set D to 255.",
  },
  { clock: true, expect: byteOut(90), note: "CLOCK rises with LOAD off. Q keeps 90." },
  { clock: false, expect: byteOut(90), note: "CLOCK falls. Q keeps 90." },
  { set: { load: true }, expect: byteOut(90), note: "Turn LOAD on. Q waits for the clock." },
  { clock: true, expect: byteOut(255), note: "CLOCK rises, so the register stores 255." },
  { clock: false, expect: byteOut(255), note: "CLOCK falls. Q keeps 255." },
  { set: byteIn(0), expect: byteOut(255), note: "Set D to 0." },
  { clock: true, expect: byteOut(0), note: "CLOCK rises, so the register stores 0." },
  { clock: false, expect: byteOut(0), note: "CLOCK falls. Q keeps 0." },
  { set: byteIn(165), expect: byteOut(0), note: "Set D to 165." },
  { clock: true, expect: byteOut(165), note: "CLOCK rises, so the register stores 165." },
];

/** The count from 0 to 8: a carry through one, two and three bits. */
const COUNTER_TICKS: SequenceTick[] = [
  { clock: false, expect: byteOut(0), note: "CLOCK is low. The count starts at 0." },
  ...Array.from({ length: 8 }, (_, index) => index + 1).flatMap((count): SequenceTick[] => [
    { clock: true, expect: byteOut(count), note: `CLOCK rises, so the count goes to ${count}.` },
    { clock: false, expect: byteOut(count), note: `CLOCK falls. The count stays ${count}.` },
  ]),
];

const RAM_TICKS: SequenceTick[] = [
  {
    set: { ...address(0), ...nibbleIn(5), write: true },
    expect: nibbleOut(0),
    note: "Store 5 at address 0 while READ ENABLE is off.",
  },
  { set: { write: false }, expect: nibbleOut(0), note: "Turn WRITE ENABLE off." },
  {
    set: { ...address(1), ...nibbleIn(10), write: true },
    expect: nibbleOut(0),
    note: "Store 10 at address 1.",
  },
  { set: { write: false }, expect: nibbleOut(0), note: "Turn WRITE ENABLE off." },
  {
    set: { ...address(2), ...nibbleIn(15), write: true },
    expect: nibbleOut(0),
    note: "Store 15 at address 2.",
  },
  { set: { write: false }, expect: nibbleOut(0), note: "Turn WRITE ENABLE off." },
  {
    set: { ...address(3), ...nibbleIn(0), write: true },
    expect: nibbleOut(0),
    note: "Store 0 at address 3.",
  },
  { set: { write: false }, expect: nibbleOut(0), note: "Turn WRITE ENABLE off." },
  {
    set: { ...address(0), read: true },
    expect: nibbleOut(5),
    note: "Turn READ ENABLE on and read address 0.",
  },
  { set: address(1), expect: nibbleOut(10), note: "Read address 1." },
  { set: address(2), expect: nibbleOut(15), note: "Read address 2." },
  { set: address(3), expect: nibbleOut(0), note: "Read address 3." },
  {
    set: { ...address(0), ...nibbleIn(9) },
    expect: nibbleOut(5),
    note: "Set DATA IN to 9 and read address 0, which still holds 5.",
  },
  { set: { write: true }, expect: nibbleOut(9), note: "Turn WRITE ENABLE on: address 0 stores 9." },
  { set: { write: false }, expect: nibbleOut(9), note: "Turn WRITE ENABLE off." },
  { set: address(1), expect: nibbleOut(10), note: "Read address 1, which still holds 10." },
  { set: { read: false }, expect: nibbleOut(0), note: "Turn READ ENABLE off: DATA OUT is 0." },
];

// ---------------------------------------------------------------------- levels

export const srLatchLevel: Level = {
  id: "sr-latch",
  title: "SR latch",
  section: SECTION,
  nandgame: "SR Latch",
  chapter: CHAPTERS.memory,
  goal: "SET turns Q on and RESET turns Q off. While both are off, Q keeps its value, and Q̅ is always the opposite of Q.",
  intro:
    "Until now, every output depended only on the inputs at that moment. A latch remembers. Its output feeds back into its own input, so it holds a value after the input that set it is gone.",
  spec: { kind: "sequence", inputs: [SET, RESET], outputs: [Q, NQ], ticks: SR_TICKS },
  palette: ["nand", "part:not", "part:and", "part:or"],
  makes: { part: "sr-latch", label: "SR LATCH", builtIn: { preset: "SR latch" } },
  reference: srLatch,
  steps: [
    placeStep(
      "join",
      "part:or",
      "Place an OR. Its output will be Q. SET goes into it, so SET can turn Q on.",
    ),
    wireStep("set", "join", 0, "Wire SET into the OR's top input."),
    placeStep("unreset", "part:not", "Place a NOT. Its output is 1 while RESET is off."),
    wireStep("reset", "unreset", 0, "Wire RESET into the NOT."),
    placeStep("keep", "part:and", "Place an AND. It will pass Q on for as long as RESET is off."),
    wireStep(
      ["join", "unreset"],
      "keep",
      [0, 1],
      "Wire the OR's output and the NOT's output into the AND.",
    ),
    placeStep("flip", "part:not", "Place a second NOT. Its output is Q̅, the opposite of Q."),
    wireStep("join", "flip", 0, "Wire the OR's output into the second NOT."),
    {
      text: "Wire the OR's output into Q, and the second NOT's output into Q̅.",
      anchor: (context) => ({
        kind: "input",
        node: hasWire(context, "join", "q") ? "nq" : "q",
        index: 0,
      }),
      done: (context) => hasWire(context, "join", "q") && hasWire(context, "flip", "nq"),
    },
    wireStep(
      "keep",
      "join",
      1,
      "Now close the loop. Wire the AND's output into the OR's free input, so Q feeds back into itself.",
    ),
    checkStep(
      "Turn SET on and off, then RESET on and off. Q keeps the value of the last one you used. Then press Check.",
    ),
  ],
  hints: [
    {
      text: "Say the rule as a sentence: Q is 1 when SET is on, or when Q is already 1 and RESET is off.",
    },
    {
      text: "'Q is already 1' is a wire from Q back into the gate that makes Q. That loop is what remembers.",
    },
    {
      text: "Another way: two NAND gates, each wired into an input of the other. Put a NOT before each NAND, so SET and RESET act when they are 1.",
      anchor: { kind: "palette", part: "nand" },
    },
  ],
};

export const dLatchLevel: Level = {
  id: "d-latch",
  title: "D latch",
  section: SECTION,
  nandgame: "D Latch",
  chapter: CHAPTERS.memory,
  goal: "While ENABLE is on, Q follows DATA. While ENABLE is off, Q keeps its value. Q̅ is the opposite of Q.",
  intro:
    "An SR latch needs two inputs to store one bit. A D latch takes the bit itself on DATA. ENABLE says when to store it.",
  spec: { kind: "sequence", inputs: [ENABLE, DATA], outputs: [Q, NQ], ticks: D_LATCH_TICKS },
  palette: ["nand", "part:not", "part:and", "part:or", "part:sr-latch"],
  makes: { part: "d-latch", label: "D LATCH", builtIn: { preset: "D latch" } },
  reference: dLatch,
  hints: [
    {
      text: "Let your SR latch hold the bit. SET it when ENABLE is on and DATA is 1. RESET it when ENABLE is on and DATA is 0.",
      anchor: { kind: "palette", part: "part:sr-latch" },
    },
    {
      text: "One AND makes SET from ENABLE and DATA. A second AND makes RESET from ENABLE and the opposite of DATA.",
    },
  ],
};

export const dFlipFlopLevel: Level = {
  id: "d-flip-flop",
  title: "D flip-flop",
  section: SECTION,
  nandgame: "Data Flip-Flop",
  chapter: CHAPTERS.clock,
  goal: "When CLOCK rises from 0 to 1, Q takes the value of DATA. At every other moment Q keeps its value, whatever DATA does.",
  intro:
    "A D latch lets DATA through for as long as ENABLE is on. A flip-flop stores only at one moment: when the clock rises. So every part of a computer that uses the same clock changes in step.",
  spec: { kind: "sequence", inputs: [CLOCK, DATA], outputs: [Q, NQ], ticks: FLIP_FLOP_TICKS },
  palette: ["part:not", "part:and", "part:d-latch"],
  makes: { part: "d-flip-flop", label: "D FLIP-FLOP", builtIn: { preset: "D flip-flop" } },
  reference: dFlipFlop,
  hints: [
    {
      text: "Use two D latches in a row. The first one takes DATA while CLOCK is low. The second one passes the first one's Q on while CLOCK is high.",
      anchor: { kind: "palette", part: "part:d-latch" },
    },
    {
      text: "Give the first latch the opposite of CLOCK as ENABLE. Give the second latch CLOCK itself. The two latches are never open at the same time.",
    },
  ],
};

export const register1Level: Level = {
  id: "register1",
  title: "Register bit",
  section: SECTION,
  chapter: CHAPTERS.register,
  goal: "When CLOCK rises and LOAD is 1, Q takes DATA. When CLOCK rises and LOAD is 0, Q keeps its value.",
  intro:
    "A flip-flop stores a new bit on every clock tick. A register bit stores only when LOAD is on, and keeps its value on the other ticks.",
  spec: {
    kind: "sequence",
    inputs: [CLOCK, LOAD, DATA],
    outputs: [Q],
    ticks: REGISTER1_TICKS,
  },
  palette: ["part:d-flip-flop", "part:selector"],
  makes: { part: "register1", label: "REGISTER BIT", builtIn: { reference: true } },
  reference: register1,
  hints: [
    {
      text: "The flip-flop stores something on every rising edge. Choose what it stores: DATA when LOAD is 1, its own Q when LOAD is 0.",
    },
    {
      text: "A SELECTOR picks between Q and DATA. Wire LOAD into SELECT, Q into A and DATA into B.",
      anchor: { kind: "palette", part: "part:selector" },
    },
  ],
};

export const register8Level: Level = {
  id: "register8",
  title: "8-bit register",
  section: SECTION,
  nandgame: "Register",
  chapter: CHAPTERS.register,
  goal: "When CLOCK rises and LOAD is 1, Q0–Q7 take D0–D7. When LOAD is 0, Q0–Q7 keep their values.",
  intro: "A register holds a whole byte. Eight register bits share one CLOCK and one LOAD.",
  spec: {
    kind: "sequence",
    inputs: [CLOCK, LOAD, ...D8],
    outputs: Q8,
    ticks: REGISTER8_TICKS,
  },
  palette: ["part:register1"],
  makes: {
    part: "register8",
    label: "8-BIT REGISTER",
    builtIn: { preset: "8-bit parallel register" },
  },
  reference: register8,
  hints: [
    { text: "Place eight register bits. Each one stores one bit: D3 goes in and Q3 comes out." },
    { text: "Wire CLOCK and LOAD into all eight register bits." },
  ],
};

export const counter8Level: Level = {
  id: "counter8",
  title: "Counter",
  section: SECTION,
  nandgame: "Counter",
  chapter: CHAPTERS.counter,
  goal: "Q0–Q7 start at 0 and count up by one each time CLOCK rises.",
  intro:
    "A counter is a register that stores its own value plus one on every clock tick. A processor's program counter works this way.",
  spec: { kind: "sequence", inputs: [CLOCK], outputs: Q8, ticks: COUNTER_TICKS },
  palette: ["high", "ground", "part:register8", "part:adder8"],
  makes: { part: "counter8", label: "COUNTER", builtIn: { preset: "8-bit binary counter" } },
  reference: counter8,
  hints: [
    {
      text: "Keep LOAD on with a HIGH source, so the register stores on every rising edge. What it stores is its own output plus one.",
    },
    {
      text: "Wire Q0–Q7 into A of the 8-bit adder. Set B to 0 with GROUND and CARRY IN to 1 with HIGH. Wire the sum back into D0–D7.",
      anchor: { kind: "palette", part: "part:adder8" },
    },
  ],
};

export const ramLevel: Level = {
  id: "ram",
  title: "RAM",
  section: SECTION,
  nandgame: "RAM",
  chapter: CHAPTERS.ram,
  goal: "While WRITE ENABLE is on, the address on ADDRESS 1 and ADDRESS 0 stores DATA IN. While READ ENABLE is on, DATA OUT shows what that address holds, and it is 0 otherwise.",
  intro:
    "This RAM has four addresses of four bits each, so it is a grid of sixteen latches. A decoder turns the address into one row line. Only that row is written or read.",
  spec: {
    kind: "sequence",
    inputs: [...ADDRESS, READ, WRITE, ...DATA_IN],
    outputs: DATA_OUT,
    ticks: RAM_TICKS,
  },
  palette: ["part:not", "part:and", "part:or", "part:d-latch", "part:decoder"],
  makes: { part: "ram", label: "RAM", builtIn: { preset: "4 × 4 SRAM" } },
  reference: ram,
  hints: [
    {
      text: "Wire ADDRESS 0 and ADDRESS 1 into a decoder. Its Y output with the address number is 1, and that picks the row.",
      anchor: { kind: "palette", part: "part:decoder" },
    },
    {
      text: "Each address is a row of four D latches. An AND of the row's Y output and WRITE ENABLE is ENABLE for all four, and DATA IN 0–3 go into their DATA inputs.",
    },
    {
      text: "To read, AND each latch's Q with its row's Y output and READ ENABLE. Then join the four rows with OR gates for each DATA OUT bit.",
    },
  ],
};

export const MEMORY_LEVELS: Level[] = [
  srLatchLevel,
  dLatchLevel,
  dFlipFlopLevel,
  register1Level,
  register8Level,
  counter8Level,
  ramLevel,
];
