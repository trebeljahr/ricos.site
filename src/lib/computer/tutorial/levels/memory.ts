// Memory: a latch from a loop of gates, a D latch, an edge-triggered flip-flop
// from two latches, then registers, a counter and a small RAM, as in
// NandGame's memory section. These are sequence levels: the check sets inputs
// and the clock tick by tick and reads the lamps after each tick settles.
import { bitsOf, busPorts, CircuitKit, type Source } from "../kit";
import type { Level, LevelPort, SequenceTick } from "../types";
import { constructionHints } from "./constructionHints";
import { boxed, once, port } from "./shared";

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
  const cellPart = boxed("ram-cell");
  const reads: Source[][] = Array.from({ length: WIDTH }, () => []);
  for (let row = 0; row < ROWS; row++) {
    for (let bit = 0; bit < WIDTH; bit++) {
      const cell = kit.part("ram-cell", cellPart, [[rows, row], "write", "read", `in${bit}`], {
        label: "RAM CELL",
      });
      reads[bit].push([cell, 0]);
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
  goal: "SET turns Q on, RESET turns Q off, and otherwise Q keeps its value.",
  spec: { kind: "sequence", inputs: [SET, RESET], outputs: [Q, NQ], ticks: SR_TICKS },
  palette: ["nand", "part:not", "part:and", "part:or"],
  makes: { part: "sr-latch", label: "SR LATCH", builtIn: { preset: "SR latch" } },
  reference: srLatch,
  hints: constructionHints(
    "A stored bit needs feedback. With SET and RESET low, the old Q must help produce the next Q.",
    "Start with the hold condition: old Q survives only while RESET is 0. Then allow SET to force Q to 1.",
    "Feed Q back through a gate that RESET can block, and let SET force Q on.",
    "Set Q to 1, release SET, then reset and release RESET. Both values must survive after their control turns off.",
  ),
};

export const dLatchLevel: Level = {
  id: "d-latch",
  title: "D latch",
  section: SECTION,
  goal: "Q follows DATA while ENABLE is on and keeps its value while ENABLE is off.",
  spec: { kind: "sequence", inputs: [ENABLE, DATA], outputs: [Q, NQ], ticks: D_LATCH_TICKS },
  palette: ["nand", "part:not", "part:and", "part:or", "part:sr-latch"],
  makes: { part: "d-latch", label: "D LATCH", builtIn: { preset: "D latch" } },
  reference: dLatch,
  hints: constructionHints(
    "ENABLE controls when this memory is transparent. It can follow several DATA changes during one enabled interval.",
    "Use an SR latch. DATA chooses whether to set or reset, while ENABLE must gate both commands.",
    "Drive an SR latch so that, while ENABLE is on, DATA acts as SET and its opposite acts as RESET.",
    "Enable the latch, change DATA twice, then disable it. Change DATA again: Q must keep the last enabled value.",
  ),
};

export const dFlipFlopLevel: Level = {
  id: "d-flip-flop",
  title: "D flip-flop",
  section: SECTION,
  goal: "Q takes DATA only at the moment CLOCK rises.",
  spec: { kind: "sequence", inputs: [CLOCK, DATA], outputs: [Q, NQ], ticks: FLIP_FLOP_TICKS },
  palette: ["part:not", "part:and", "part:d-latch"],
  makes: { part: "d-flip-flop", label: "D FLIP-FLOP", builtIn: { preset: "D flip-flop" } },
  reference: dFlipFlop,
  hints: constructionHints(
    "Two latches can isolate the output from DATA except at the rising clock edge.",
    "Let the first latch follow DATA while CLOCK is low. Let the second follow the first while CLOCK is high.",
    "Chain two D latches that are open on opposite clock levels, so only one is ever open.",
    "Change DATA while CLOCK is high, then while low. Q must wait for the next rising edge in both cases.",
  ),
};

export const register1Level: Level = {
  id: "register1",
  title: "Register bit",
  section: SECTION,
  goal: "When CLOCK rises, Q takes DATA if LOAD is 1 and keeps its value if LOAD is 0.",
  spec: {
    kind: "sequence",
    inputs: [CLOCK, LOAD, DATA],
    outputs: [Q],
    ticks: REGISTER1_TICKS,
  },
  palette: ["part:d-flip-flop", "part:selector"],
  makes: { part: "register1", label: "REGISTER BIT", builtIn: { reference: true } },
  reference: register1,
  hints: constructionHints(
    "LOAD chooses which value the flip-flop captures. CLOCK chooses when it captures that value.",
    "When LOAD is 0, the next data input must equal the old Q. A selector can choose old Q or new DATA.",
    "Put a selector in front of a D flip-flop, so LOAD chooses between new DATA and the old Q.",
    "Load 1 on a rising edge. Turn LOAD off, set DATA to 0, and pulse CLOCK again. Q must stay 1.",
  ),
};

export const register8Level: Level = {
  id: "register8",
  title: "8-bit register",
  section: SECTION,
  goal: "When CLOCK rises, Q0–Q7 take D0–D7 if LOAD is 1 and keep their values if LOAD is 0.",
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
  hints: constructionHints(
    "A byte register repeats the same one-bit memory eight times. CLOCK and LOAD belong to every bit.",
    "Build bit 0 with one register bit, then repeat the same wiring for bits 1 through 7.",
    "Use one register bit per data lane, with CLOCK and LOAD shared by all eight.",
    "Load 90, then change D to 165 with LOAD off and pulse CLOCK. Q must keep 90 until an enabled rising edge.",
  ),
};

export const counter8Level: Level = {
  id: "counter8",
  title: "Counter",
  section: SECTION,
  goal: "Q0–Q7 start at 0 and count up by one each time CLOCK rises.",
  spec: { kind: "sequence", inputs: [CLOCK], outputs: Q8, ticks: COUNTER_TICKS },
  palette: ["high", "ground", "part:register8", "part:adder8"],
  makes: { part: "counter8", label: "COUNTER", builtIn: { preset: "8-bit binary counter" } },
  reference: counter8,
  hints: constructionHints(
    "The register stores the current count. An adder continuously computes the next count from those stored outputs.",
    "Feed Q0–Q7 into one side of the adder. Add one by grounding the other byte and setting CARRY IN high.",
    "Feed a register's output through an adder that adds 1, and back into the register.",
    "Step through 3 to 4 and 7 to 8. Several bits change on each rising edge; the falling edge must preserve the count.",
  ),
};

export const ramCellLevel: Level = {
  id: "ram-cell",
  optional: true,
  title: "Addressed RAM cell",
  section: SECTION,
  goal: "Store DATA while selected and writing, and show the bit while selected and reading.",
  spec: {
    kind: "sequence",
    inputs: [port("select", "SELECT"), WRITE, READ, DATA],
    outputs: [port("out", "DATA OUT")],
    ticks: [
      {
        set: { select: true, write: true, data: true },
        expect: { out: false },
        note: "Write 1 with reading disabled.",
      },
      { set: { write: false, read: true }, expect: { out: true }, note: "Read the stored 1." },
      {
        set: { data: false },
        expect: { out: true },
        note: "Changing DATA with writing disabled preserves 1.",
      },
      {
        set: { select: false, write: true },
        expect: { out: false },
        note: "An unselected cell ignores a write of 0 and hides its output.",
      },
      {
        set: { write: false, select: true },
        expect: { out: true },
        note: "Select the cell again: its 1 survived.",
      },
      {
        set: { read: false },
        expect: { out: false },
        note: "Disabling read hides the bit without erasing it.",
      },
      {
        set: { read: true },
        expect: { out: true },
        note: "Reading again reveals the same stored bit.",
      },
      { set: { write: true }, expect: { out: false }, note: "Write 0 while selected and reading." },
      {
        set: { data: true },
        expect: { out: true },
        note: "While writing stays enabled, storage follows DATA.",
      },
      {
        set: { data: false },
        expect: { out: false },
        note: "The enabled latch follows DATA back to 0.",
      },
      {
        set: { write: false, data: true },
        expect: { out: false },
        note: "Disabling write keeps the stored 0.",
      },
    ],
  },
  palette: ["part:and", "part:d-latch"],
  makes: { part: "ram-cell", label: "RAM CELL", builtIn: { reference: true } },
  reference: once(() => {
    const kit = new CircuitKit(
      "Addressed RAM cell",
      [port("select", "SELECT"), WRITE, READ, DATA],
      [port("out", "DATA OUT")],
    );
    const write = kit.gate("and", ["select", "write"]);
    const read = kit.gate("and", ["select", "read"]);
    const cell = kit.part("d-latch", boxed("d-latch"), [write, "data"], { label: "D LATCH" });
    return kit.out("out", kit.gate("and", [[cell, 0], read])).build();
  }),
  hints: constructionHints(
    "SELECT chooses this cell. WRITE ENABLE permits storage to change. READ ENABLE permits its stored bit to reach DATA OUT.",
    "Use a D latch for storage. Its ENABLE must require both SELECT and WRITE ENABLE.",
    "Store the bit in a D latch, and gate both its write and its read with SELECT.",
    "Write 1, disable writing, and hide the output by disabling reads. Read again: 1 must remain. An unselected write must do nothing.",
  ),
};

export const ramLevel: Level = {
  id: "ram",
  title: "RAM",
  section: SECTION,
  goal: "Store DATA IN at the chosen address and show that address on DATA OUT while reading.",
  spec: {
    kind: "sequence",
    inputs: [...ADDRESS, READ, WRITE, ...DATA_IN],
    outputs: DATA_OUT,
    ticks: RAM_TICKS,
  },
  palette: ["part:not", "part:and", "part:or", "part:d-latch", "part:decoder", "part:ram-cell"],
  makes: { part: "ram", label: "RAM", builtIn: { preset: "4 × 4 SRAM" } },
  reference: ram,
  hints: constructionHints(
    "The address chooses a row. WRITE ENABLE changes its stored bits; READ ENABLE controls what you can see.",
    "Build one addressed RAM cell first. Then repeat it four times per row and use a decoder to select one row.",
    "Let a decoder pick one row of RAM cells, and OR each column's outputs into one data bit.",
    "Write different values at two addresses with reads disabled. Read them back, then disable reads. The output becomes 0 without erasing either address.",
  ),
};

export const MEMORY_LEVELS: Level[] = [
  srLatchLevel,
  dLatchLevel,
  dFlipFlopLevel,
  register1Level,
  register8Level,
  counter8Level,
  ramCellLevel,
  ramLevel,
];
