// Datapath blocks for the toy CPU: register8, sp8, counter8, alu8, rom256, ram16,
// ram32, stack16 and the screen8x8 framebuffer. Each is a module node whose gate form is the inner circuit and whose
// folded form runs as a registered behavioural block (see `registerBlock`).
//
// Outputs always come from the state before the clock commit, as a D flip-flop's
// do, so the folded block and its gates agree after every step. RAM, stack and
// screen rows are nested register8 blocks; ROM is 16 page blocks of readable byte rows.

import { SCREEN_ROWS } from "../computerStepper";
import {
  Builder,
  busPorts,
  cellIds,
  hex,
  ports,
  type Ref,
  range,
  readCells,
  seedCells,
  toBits,
  toNumber,
} from "./blockBuilder";
import {
  CONTROL_BLOCKS,
  type ControlKind,
  controlBlockCircuit,
  foldControlState,
  unfoldControlState,
} from "./controlUnit";
import { type Circuit, initialSnapshot, type Node, registerBlock, type Snapshot } from "./logic";
import {
  foldShaderState,
  SHADER_BLOCKS,
  type ShaderKind,
  shaderBlockCircuit,
  unfoldShaderState,
} from "./shaderBlocks";

export { toBits, toNumber } from "./blockBuilder";

// ---------------------------------------------------------------- register8

/**
 * An 8-bit register. Bits set in `reset` are stored inverted (a NOT before and
 * after the flip-flop), so a fresh register reads `reset` instead of 0.
 */
function register8Circuit(reset = 0): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("d", "D"), ["load", "LOAD"], ["clock", "CLK"]]);
  b.gate("hold", "not", 200, 750, "load", undefined, "HOLD");
  for (let bit = 0; bit < 8; bit++) {
    const y = 30 + bit * 140;
    const inverted = Boolean((reset >> bit) & 1);
    const q = inverted ? b.gate(`stored${bit}`, "not", 760, y + 60, `cell${bit}`) : `cell${bit}`;
    const keep = b.gate(`keep${bit}`, "and", 360, y + 60, q, "hold");
    const write = b.gate(`write${bit}`, "and", 360, y, `d${bit}`, "load");
    const next = b.gate(`next${bit}`, "or", 500, y, keep, write);
    b.add(`cell${bit}`, "dff", 650, y, inverted ? `BIT ${bit} (INVERTED)` : `BIT ${bit}`);
    b.connect(inverted ? b.gate(`flip${bit}`, "not", 570, y + 60, next) : next, `cell${bit}`);
    b.connect("clock", `cell${bit}`, 1);
    b.gate(`q${bit}`, "lamp", 820, y, q, undefined, `Q${bit}`);
  }
  return b.circuit(reset ? "Stack pointer" : "8-bit register");
}

/** SP of the stack-in-RAM CPU resets to 32: one past the top of 32 bytes of RAM. */
export const SP_RESET = 32;

type ClockedByte = { q: number; clock: boolean };
for (const [name, reset] of [
  ["register8", 0],
  ["sp8", SP_RESET],
] as const)
  registerBlock<ClockedByte>({
    name,
    inputs: [...busPorts("d", "D").map(([, l]) => l), "LOAD", "CLK"],
    outputs: range(8).map((bit) => `Q${bit}`),
    initialState: () => ({ q: reset, clock: false }),
    evaluate: (inputs, state) => {
      const [load, clock] = inputs.slice(8);
      const q = clock && !state.clock && load ? toNumber(inputs.slice(0, 8)) : state.q;
      return {
        outputs: toBits(state.q, 8),
        nextState: q === state.q && clock === state.clock ? state : { q, clock },
      };
    },
  });

// ---------------------------------------------------------------- counter8

function counter8Circuit(): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("d", "D"), ["inc", "INC"], ["load", "LOAD"], ["clock", "CLK"]]);
  b.gate("count", "not", 200, 840, "load", undefined, "COUNT");
  let carry: Ref = "inc";
  for (let bit = 0; bit < 8; bit++) {
    const y = 30 + bit * 140;
    const sum = b.gate(`sum${bit}`, "xor", 360, y + 60, `cell${bit}`, carry, `+1 BIT ${bit}`);
    carry = b.gate(`carry${bit}`, "and", 360, y + 120, `cell${bit}`, carry);
    const write = b.gate(`write${bit}`, "and", 500, y, `d${bit}`, "load");
    const keep = b.gate(`keep${bit}`, "and", 500, y + 60, sum, "count");
    b.gate(`next${bit}`, "or", 640, y, write, keep);
    b.add(`cell${bit}`, "dff", 790, y, `BIT ${bit}`);
    b.connect(`next${bit}`, `cell${bit}`);
    b.connect("clock", `cell${bit}`, 1);
    b.gate(`q${bit}`, "lamp", 960, y, `cell${bit}`, undefined, `Q${bit}`);
  }
  return b.circuit("Program counter");
}

registerBlock<ClockedByte>({
  name: "counter8",
  inputs: [...busPorts("d", "D").map(([, l]) => l), "INC", "LOAD", "CLK"],
  outputs: range(8).map((bit) => `Q${bit}`),
  initialState: () => ({ q: 0, clock: false }),
  evaluate: (inputs, state) => {
    const [inc, load, clock] = inputs.slice(8);
    const rising = clock && !state.clock;
    const q = !rising
      ? state.q
      : load
        ? toNumber(inputs.slice(0, 8))
        : inc
          ? (state.q + 1) & 255
          : state.q;
    return {
      outputs: toBits(state.q, 8),
      nextState: q === state.q && clock === state.clock ? state : { q, clock },
    };
  },
});

// ---------------------------------------------------------------- alu8

/** The ALU's arithmetic: CARRY is the carry out on add and the borrow on subtract. */
export function alu(a: number, b: number, sub: boolean) {
  const raw = sub ? a - b : a + b;
  const result = raw & 255;
  return { result, carry: sub ? raw < 0 : raw > 255, zero: result === 0 };
}

function alu8Circuit(): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("a", "A"), ...busPorts("b", "B"), ["sub", "SUB"]]);
  // A − B is A + NOT B + 1: SUB flips every B bit and is the first carry in.
  let carry: Ref = "sub";
  for (let bit = 0; bit < 8; bit++) {
    const y = 30 + bit * 190;
    const operand = b.gate(`bx${bit}`, "xor", 220, y, `b${bit}`, "sub", `B${bit} OR NOT B${bit}`);
    const half = b.gate(`half${bit}`, "xor", 380, y, `a${bit}`, operand);
    b.gate(`sum${bit}`, "xor", 540, y, half, carry, `SUM ${bit}`);
    const both = b.gate(`both${bit}`, "and", 380, y + 70, `a${bit}`, operand);
    const pass = b.gate(`pass${bit}`, "and", 540, y + 70, half, carry);
    carry = b.gate(`carry${bit}`, "or", 700, y + 70, both, pass, `CARRY ${bit + 1}`);
  }
  for (let bit = 0; bit < 8; bit++)
    b.gate(`r${bit}`, "lamp", 1100, 30 + bit * 190, `sum${bit}`, undefined, `R${bit}`);
  // No carry out of A + NOT B + 1 means A < B: a borrow.
  b.gate("flag", "xor", 860, 1600, carry, "sub", "CARRY OR BORROW");
  b.gate("carry", "lamp", 1100, 1600, "flag", undefined, "CARRY");
  const any = b.orTree(
    "zero",
    range(8).map((bit) => `sum${bit}`),
    860,
    1700,
    "ANY BIT",
  );
  b.gate("none", "not", 1000, 1760, any, undefined, "ALL ZERO");
  b.gate("zero", "lamp", 1100, 1760, "none", undefined, "ZERO");
  return b.circuit("ALU with flags");
}

registerBlock<null>({
  name: "alu8",
  inputs: [...busPorts("a", "A"), ...busPorts("b", "B"), ["sub", "SUB"]].map(([, l]) => l),
  outputs: [...range(8).map((bit) => `R${bit}`), "CARRY", "ZERO"],
  initialState: () => null,
  evaluate: (inputs, state) => {
    const { result, carry, zero } = alu(
      toNumber(inputs.slice(0, 8)),
      toNumber(inputs.slice(8, 16)),
      inputs[16],
    );
    return { outputs: [...toBits(result, 8), carry, zero], nextState: state };
  },
});

// ---------------------------------------------------------------- memory rows

/** Wraps a register8 block as a memory row. */
const rowNode = (id: string, x: number, y: number, label: string): Node => ({
  id,
  type: "module",
  x,
  y,
  label,
  module: register8Circuit(),
  behaviour: "register8",
});

/**
 * One register8 row per `write` line, sharing the data inputs. `write[r]` loads
 * row r on the clock; the outputs read the row picked by `read[r]`. Returns the
 * 8 read bits.
 */
function memoryRows(b: Builder, data: Ref[], write: Ref[], read: Ref[], x: number): Ref[] {
  const rows = write.map((_, r) => {
    const id = `row${r}`;
    b.nodes.push(
      rowNode(id, x, 30 + r * 220, `ROW ${write.length > 16 ? hex(r) : hex(r).slice(1)}`),
    );
    data.forEach((bit, i) => b.connect(bit, id, i));
    b.connect(write[r], id, 8);
    b.connect("clock", id, 9);
    return id;
  });
  return range(8).map((bit) =>
    b.orTree(
      `read${bit}`,
      rows.map((row, r) =>
        b.gate(`pick${r}-${bit}`, "and", x + 260, 30 + r * 220 + bit * 24, [row, bit], read[r]),
      ),
      x + 420,
      30 + (bit * write.length * 220) / 8,
      `READ BIT ${bit}`,
    ),
  );
}
const rowState = (q: number, clock: boolean): ClockedByte => ({ q, clock });

// ---------------------------------------------------------------- ram16

function ramCircuit(addressBits: number): Circuit {
  const b = new Builder();
  ports(b, [
    ...busPorts("a", "A", addressBits),
    ...busPorts("d", "D"),
    ["we", "WE"],
    ["clock", "CLK"],
  ]);
  const low = range(4).map((bit) => `a${bit}`);
  // A 5th address bit picks between two 4-bit decoders: rows 0–F, then 10–1F.
  const select =
    addressBits === 4
      ? b.decoder("addr", low, 200, 30, undefined, "ADDRESS")
      : [
          ...b.decoder(
            "addr",
            low,
            200,
            30,
            b.gate("a4-low", "not", 60, 1500, "a4", undefined, "NOT A4"),
          ),
          ...b.decoder("addr-high", low, 200, 1500, "a4"),
        ];
  const write = select.map((sel, r) =>
    b.gate(`write${r}`, "and", 680, 30 + r * 90, sel, "we", `WRITE ${r}`),
  );
  const out = memoryRows(
    b,
    range(8).map((bit) => `d${bit}`),
    write,
    select,
    900,
  );
  out.forEach((bit, i) => b.gate(`q${i}`, "lamp", 2000, 30 + i * 440, bit, undefined, `Q${i}`));
  return b.circuit(`${1 << addressBits}-byte RAM`);
}

type Ram = { bytes: number[]; clock: boolean };
/** A byte memory with `addressBits` address lines: A, D, WE, CLK in, Q (the addressed row) out. */
function registerMemory(name: string, addressBits: number) {
  registerBlock<Ram>({
    name,
    inputs: [
      ...busPorts("a", "A", addressBits),
      ...busPorts("d", "D"),
      ["we", "WE"],
      ["clock", "CLK"],
    ].map(([, l]) => l),
    outputs: range(8).map((bit) => `Q${bit}`),
    initialState: () => ({ bytes: Array(1 << addressBits).fill(0), clock: false }),
    evaluate: (inputs, state) => {
      const address = toNumber(inputs.slice(0, addressBits));
      const [we, clock] = inputs.slice(addressBits + 8);
      let bytes = state.bytes;
      if (clock && !state.clock && we) {
        bytes = [...bytes];
        bytes[address] = toNumber(inputs.slice(addressBits, addressBits + 8));
      }
      return {
        outputs: toBits(state.bytes[address], 8),
        nextState: bytes === state.bytes && clock === state.clock ? state : { bytes, clock },
      };
    },
  });
}
const RAM_ADDRESS_BITS = { ram16: 4, ram32: 5 } as const;
for (const [name, bits] of Object.entries(RAM_ADDRESS_BITS)) registerMemory(name, bits);

// ---------------------------------------------------------------- screen8x8

/**
 * An 8×8 monochrome framebuffer: 8 register8 rows, one per y. Bit i of a row is
 * the pixel at x = i. A picks the row; with WE on, a rising CLK stores D there.
 * Q reads row A back, as RAM does.
 */
function screen8x8Circuit(): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("a", "A", 3), ...busPorts("d", "D"), ["we", "WE"], ["clock", "CLK"]]);
  const address = range(3).map((bit) => `a${bit}`);
  const inverted = address.map((bit, i) =>
    b.gate(`addr-not${i}`, "not", 200, 30 + i * 80, bit, undefined, `NOT A${i}`),
  );
  const pick = (row: number, bit: number) => ((row >> bit) & 1 ? address[bit] : inverted[bit]);
  const select = range(SCREEN_ROWS).map((row) => {
    const low = b.gate(`addr-p${row}`, "and", 350, 30 + row * 90, pick(row, 0), pick(row, 1));
    return b.gate(`addr-sel${row}`, "and", 500, 30 + row * 90, low, pick(row, 2), `ROW ${row}`);
  });
  const write = select.map((sel, r) =>
    b.gate(`write${r}`, "and", 680, 30 + r * 90, sel, "we", `WRITE ${r}`),
  );
  const out = memoryRows(
    b,
    range(8).map((bit) => `d${bit}`),
    write,
    select,
    900,
  );
  out.forEach((bit, i) => b.gate(`q${i}`, "lamp", 2000, 30 + i * 220, bit, undefined, `Q${i}`));
  return b.circuit("8×8 screen");
}
registerMemory("screen8x8", 3);

/** The screen's 8 row bytes (row index = y, bit i = pixel x = i); blank for no state. */
export function screenRows(state: unknown): number[] {
  const bytes = (state as Partial<Ram> | null | undefined)?.bytes;
  return range(SCREEN_ROWS).map((r) => (bytes?.[r] ?? 0) & 255);
}

// ---------------------------------------------------------------- data memory

type Place = { id: string; x: number; y: number; label?: string };
type DataMemoryWiring = {
  /** Eight address bits, A0 first. */
  address: Ref[];
  data: Ref[];
  we: Ref;
  clock: Ref;
  ram: Place;
  /** ram16 (A0–A3) by default; ram32 (A0–A4) for the stack-in-RAM CPU. */
  ramKind?: "ram16" | "ram32";
  screen: Place;
  /** Top left of the decode and read-select gates. */
  x: number;
  y: number;
};

/**
 * Adds a RAM and a screen8x8 behind one 8-bit data address, decoded as
 * `traceTicks` does: high nibble F selects the screen (row = A0–A2), anything
 * else the RAM (row = A0–A3, or A0–A4 for ram32). Returns the 8 read bits of
 * the selected byte.
 */
export function addDataMemory(b: Builder, wiring: DataMemoryWiring): Ref[] {
  const { address, data, we, clock, x, y } = wiring;
  const id = (name: string) => `${wiring.ram.id}-${name}`;
  const upper = b.gate(id("high-lo"), "and", x, y, address[4], address[5]);
  const lower = b.gate(id("high-hi"), "and", x, y + 80, address[6], address[7]);
  const screenSel = b.gate(id("screen-sel"), "and", x + 140, y + 40, upper, lower, "SCREEN (F_)");
  const ramSel = b.gate(id("ram-sel"), "not", x + 280, y + 120, screenSel, undefined, "RAM");
  const ramWe = b.gate(id("ram-we"), "and", x + 420, y + 40, we, ramSel, "RAM WE");
  const screenWe = b.gate(id("screen-we"), "and", x + 420, y + 200, we, screenSel, "SCREEN WE");
  const block = (
    place: Place,
    kind: "ram16" | "ram32" | "screen8x8",
    addressBits: number,
    write: Ref,
  ) => {
    b.add(place.id, "module", place.x, place.y, place.label ?? DATAPATH_BLOCKS[kind].label, {
      module: datapathCircuit(kind),
      behaviour: kind,
    });
    for (let bit = 0; bit < addressBits; bit++) b.connect(address[bit], place.id, bit);
    for (const [bit, source] of data.entries()) b.connect(source, place.id, addressBits + bit);
    b.connect(write, place.id, addressBits + 8);
    b.connect(clock, place.id, addressBits + 9);
  };
  const ramKind = wiring.ramKind ?? "ram16";
  block(wiring.ram, ramKind, RAM_ADDRESS_BITS[ramKind], ramWe);
  block(wiring.screen, "screen8x8", 3, screenWe);
  return range(8).map((bit) => {
    const row = y + 300 + bit * 140;
    const fromRam = b.gate(id(`ram-q${bit}`), "and", x + 560, row, [wiring.ram.id, bit], ramSel);
    const fromScreen = b.gate(
      id(`screen-q${bit}`),
      "and",
      x + 560,
      row + 60,
      [wiring.screen.id, bit],
      screenSel,
    );
    return b.gate(id(`read${bit}`), "or", x + 700, row, fromRam, fromScreen, `READ BIT ${bit}`);
  });
}

/** Data memory as the CPU's DMAR sees it. Inputs A0–A7, D0–D7, WE, CLK; Q reads the selected byte. */
export function dataMemoryCircuit(): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("a", "A"), ...busPorts("d", "D"), ["we", "WE"], ["clock", "CLK"]]);
  const read = addDataMemory(b, {
    address: range(8).map((bit) => `a${bit}`),
    data: range(8).map((bit) => `d${bit}`),
    we: "we",
    clock: "clock",
    ram: { id: "ram", x: 1000, y: 30 },
    screen: { id: "screen", x: 1000, y: 800 },
    x: 200,
    y: 1500,
  });
  read.forEach((bit, i) => b.gate(`q${i}`, "lamp", 1400, 30 + i * 200, bit, undefined, `Q${i}`));
  return b.circuit("Data memory");
}

// ---------------------------------------------------------------- stack16

function stack16Circuit(): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("d", "D"), ["push", "PUSH"], ["pop", "POP"], ["clock", "CLK"]]);
  b.add("one", "high", 200, 1000, "1");
  b.gate("not-push", "not", 200, 1100, "push", undefined, "NOT PUSH");
  b.gate("not-pop", "not", 200, 1200, "pop", undefined, "NOT POP");
  // SP + 1 for a push, SP − 1 for a pop and for the read address (the top entry).
  let up: Ref = "one";
  let down: Ref = "one";
  for (let bit = 0; bit < 4; bit++) {
    const y = 1300 + bit * 260;
    const sp = `sp${bit}`;
    b.gate(`inc${bit}`, "xor", 360, y, sp, up, `SP+1 BIT ${bit}`);
    up = b.gate(`inc-carry${bit}`, "and", 360, y + 60, sp, up);
    b.gate(`dec${bit}`, "xor", 360, y + 120, sp, down, `SP−1 BIT ${bit}`);
    const zero = b.gate(`sp-zero${bit}`, "not", 220, y + 180, sp);
    down = b.gate(`dec-borrow${bit}`, "and", 360, y + 180, zero, down);
    const popped = b.gate(`popped${bit}`, "and", 500, y + 60, `dec${bit}`, "pop");
    const kept = b.gate(`kept${bit}`, "and", 500, y + 120, sp, "not-pop");
    const hold = b.gate(`hold${bit}`, "or", 640, y + 90, popped, kept);
    const pushed = b.gate(`pushed${bit}`, "and", 640, y, `inc${bit}`, "push");
    const other = b.gate(`other${bit}`, "and", 780, y + 90, hold, "not-push");
    b.gate(`next-sp${bit}`, "or", 920, y, pushed, other);
    b.add(sp, "dff", 1060, y, `SP BIT ${bit}`);
    b.connect(`next-sp${bit}`, sp);
    b.connect("clock", sp, 1);
  }
  const write = b.decoder(
    "write",
    range(4).map((bit) => `sp${bit}`),
    1200,
    30,
    "push",
    "PUSH TO",
  );
  const read = b.decoder(
    "top",
    range(4).map((bit) => `dec${bit}`),
    1200,
    1600,
    undefined,
    "TOP",
  );
  const out = memoryRows(
    b,
    range(8).map((bit) => `d${bit}`),
    write,
    read,
    1800,
  );
  out.forEach((bit, i) => b.gate(`top${i}`, "lamp", 2900, 30 + i * 440, bit, undefined, `TOP${i}`));
  range(4).forEach((bit) =>
    b.gate(`sp-out${bit}`, "lamp", 2900, 3600 + bit * 90, `sp${bit}`, undefined, `SP${bit}`),
  );
  return b.circuit("16-entry stack");
}

type Stack = { bytes: number[]; sp: number; clock: boolean };
registerBlock<Stack>({
  name: "stack16",
  inputs: [...busPorts("d", "D").map(([, l]) => l), "PUSH", "POP", "CLK"],
  outputs: [...range(8).map((bit) => `TOP${bit}`), ...range(4).map((bit) => `SP${bit}`)],
  initialState: () => ({ bytes: Array(16).fill(0), sp: 0, clock: false }),
  evaluate: (inputs, state) => {
    const [push, pop, clock] = inputs.slice(8);
    let { bytes, sp } = state;
    if (clock && !state.clock) {
      if (push) {
        bytes = [...bytes];
        bytes[sp] = toNumber(inputs.slice(0, 8));
        sp = (sp + 1) & 15;
      } else if (pop) sp = (sp - 1) & 15;
    }
    return {
      outputs: [...toBits(state.bytes[(state.sp - 1) & 15], 8), ...toBits(state.sp, 4)],
      nextState:
        bytes === state.bytes && sp === state.sp && clock === state.clock
          ? state
          : { bytes, sp, clock },
    };
  },
});

// ---------------------------------------------------------------- rom256

/** A 16-byte ROM page: one readable 8-bit row per address, enabled by EN. */
function rom16Circuit(bytes: readonly number[], base = 0): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("a", "A", 4), ["en", "EN"]]);
  const select = b.decoder(
    "addr",
    range(4).map((bit) => `a${bit}`),
    200,
    30,
    "en",
    "ADDRESS",
  );
  range(16).forEach((r) =>
    b.add(`byte${r}`, "input8", 820, 30 + r * 220, `${hex(base + r)}: ${hex(bytes[r] ?? 0)}`, {
      numberValue: (bytes[r] ?? 0) & 255,
    }),
  );
  range(8).forEach((bit) => {
    const picked = b.orTree(
      `read${bit}`,
      range(16).map((r) =>
        b.gate(
          `pick${r}-${bit}`,
          "and",
          1000,
          30 + r * 220 + bit * 24,
          [`byte${r}`, bit],
          select[r],
        ),
      ),
      1160,
      30 + bit * 440,
      `READ BIT ${bit}`,
    );
    b.gate(`q${bit}`, "lamp", 1800, 30 + bit * 440, picked, undefined, `D${bit}`);
  });
  return b.circuit(`ROM ${hex(base)}–${hex(base + 15)}`);
}
/** The bytes stored in a ROM page's rows. */
const pageBytes = (page: Circuit) =>
  range(16).map((r) => page.nodes.find((node) => node.id === `byte${r}`)?.numberValue ?? 0);

type Rom = { bytes: number[] };
registerBlock<Rom>({
  name: "rom16",
  inputs: [...busPorts("a", "A", 4), ["en", "EN"]].map(([, l]) => l),
  outputs: range(8).map((bit) => `D${bit}`),
  initialState: (module) => ({ bytes: pageBytes(module) }),
  evaluate: (inputs, state) => ({
    outputs: toBits(inputs[4] ? state.bytes[toNumber(inputs.slice(0, 4))] : 0, 8),
    nextState: state,
  }),
});

function rom256Circuit(bytes: readonly number[]): Circuit {
  const b = new Builder();
  ports(b, busPorts("a", "A"));
  const page = b.decoder(
    "page",
    range(4).map((bit) => `a${bit + 4}`),
    200,
    30,
    undefined,
    "PAGE",
  );
  const pages = range(16).map((p) => {
    const id = `page${p}`;
    b.add(id, "module", 700, 30 + p * 140, `ROM ${hex(p * 16)}–${hex(p * 16 + 15)}`, {
      module: rom16Circuit(bytes.slice(p * 16, p * 16 + 16), p * 16),
      behaviour: "rom16",
    });
    range(4).forEach((bit) => b.connect(`a${bit}`, id, bit));
    b.connect(page[p], id, 4);
    return id;
  });
  range(8).forEach((bit) => {
    const any = b.orTree(
      `out${bit}`,
      pages.map((id) => [id, bit] as Ref),
      900,
      30 + bit * 280,
      `DATA BIT ${bit}`,
    );
    b.gate(`q${bit}`, "lamp", 1500, 30 + bit * 280, any, undefined, `D${bit}`);
  });
  return b.circuit("256-byte ROM");
}
/** The 256 bytes stored in a ROM's pages. */
export const romBytes = (rom: Circuit) =>
  range(16).flatMap((p) => {
    const page = rom.nodes.find((node) => node.id === `page${p}`)?.module;
    return page ? pageBytes(page) : Array<number>(16).fill(0);
  });

registerBlock<Rom>({
  name: "rom256",
  inputs: busPorts("a", "A").map(([, l]) => l),
  outputs: range(8).map((bit) => `D${bit}`),
  initialState: (module) => ({ bytes: romBytes(module) }),
  evaluate: (inputs, state) => ({
    outputs: toBits(state.bytes[toNumber(inputs)], 8),
    nextState: state,
  }),
});

// ---------------------------------------------------------------- public API

export const DATAPATH_BLOCKS = {
  register8: { label: "8-BIT REGISTER", hint: "Set D and LOAD, then raise CLK: Q takes D." },
  sp8: {
    label: "STACK POINTER",
    hint: "A register that starts at 32 (20 hex), the top of 32 bytes of RAM. LOAD on a rising CLK takes D.",
  },
  counter8: { label: "PROGRAM COUNTER", hint: "On a rising CLK: LOAD takes D, else INC adds 1." },
  alu8: {
    label: "8-BIT ALU",
    hint: "R = A + B, or A − B with SUB. CARRY is the borrow when subtracting.",
  },
  rom256: { label: "256-BYTE ROM", hint: "A picks a byte; D reads it. Unfold to see the rows." },
  ram16: { label: "16-BYTE RAM", hint: "A picks a row; with WE on, a rising CLK stores D there." },
  screen8x8: {
    label: "8×8 SCREEN",
    hint: "A picks a row (y); with WE on, a rising CLK stores D there. Bit i lights pixel x = i.",
  },
  ram32: {
    label: "32-BYTE RAM",
    hint: "Five address bits pick one of 32 rows; with WE on, a rising CLK stores D there.",
  },
  stack16: {
    label: "16-ENTRY STACK",
    hint: "PUSH stores D at SP and adds 1; POP subtracts 1. TOP is the last entry.",
  },
  ...CONTROL_BLOCKS,
  ...SHADER_BLOCKS,
} as const;
const isControlKind = (kind: DatapathKind): kind is ControlKind => kind in CONTROL_BLOCKS;
const isShaderKind = (kind: DatapathKind): kind is ShaderKind => kind in SHADER_BLOCKS;
export type DatapathKind = keyof typeof DATAPATH_BLOCKS;
export const DATAPATH_KINDS = Object.keys(DATAPATH_BLOCKS) as DatapathKind[];
export const isDatapathKind = (name: string | undefined): name is DatapathKind =>
  name !== undefined && name in DATAPATH_BLOCKS;

/**
 * The gate form of a datapath block. `bytes` fills a ROM, e.g. `compileProgram(...).bytes`,
 * or a shader's program, e.g. `compileShader(...).bytes`.
 */
export function datapathCircuit(kind: DatapathKind, bytes: readonly number[] = []): Circuit {
  if (isControlKind(kind)) return controlBlockCircuit(kind);
  if (isShaderKind(kind)) return shaderBlockCircuit(kind, bytes);
  switch (kind) {
    case "register8":
      return register8Circuit();
    case "sp8":
      return register8Circuit(SP_RESET);
    case "counter8":
      return counter8Circuit();
    case "alu8":
      return alu8Circuit();
    case "ram16":
      return ramCircuit(4);
    case "ram32":
      return ramCircuit(5);
    case "screen8x8":
      return screen8x8Circuit();
    case "stack16":
      return stack16Circuit();
    case "rom256":
      return rom256Circuit(range(256).map((i) => (bytes[i] ?? 0) & 255));
  }
}

/** A module node that runs as the behavioural block while folded. */
export const datapathNode = (
  kind: DatapathKind,
  id: string,
  x: number,
  y: number,
  bytes?: readonly number[],
): Node => ({
  id,
  type: "module",
  x,
  y,
  label: DATAPATH_BLOCKS[kind].label,
  module: datapathCircuit(kind, bytes),
  behaviour: kind,
});

/**
 * The inner snapshot to unfold a block into: its gate form's flip-flops (and
 * nested row blocks) hold the block's stored value. Settle it with one `step`
 * before drawing outputs.
 */
export function unfoldBlockState(node: Node, state: unknown): Snapshot {
  const snapshot = initialSnapshot();
  snapshot.blocks = {};
  if (state == null || !isDatapathKind(node.behaviour)) return snapshot;
  if (isControlKind(node.behaviour)) return unfoldControlState(node.behaviour, state);
  if (isShaderKind(node.behaviour)) return unfoldShaderState(node.behaviour, state);
  switch (node.behaviour) {
    case "register8":
    case "counter8": {
      const { q, clock } = state as ClockedByte;
      seedCells(snapshot, cellIds("cell"), q, clock);
      break;
    }
    case "sp8": {
      const { q, clock } = state as ClockedByte;
      seedCells(snapshot, cellIds("cell"), q ^ SP_RESET, clock);
      break;
    }
    case "ram16":
    case "ram32":
    case "screen8x8": {
      const { bytes, clock } = state as Ram;
      for (const [r, q] of bytes.entries()) snapshot.blocks![`row${r}`] = rowState(q, clock);
      break;
    }
    case "stack16": {
      const { bytes, sp, clock } = state as Stack;
      for (const [r, q] of bytes.entries()) snapshot.blocks![`row${r}`] = rowState(q, clock);
      seedCells(snapshot, cellIds("sp", 4), sp, clock);
      break;
    }
    case "rom256":
    case "alu8":
      break;
  }
  return snapshot;
}

/** Reads a block's state back out of its unfolded gate form, for folding. */
export function foldBlockState(node: Node, snapshot: Snapshot | undefined): unknown {
  if (!isDatapathKind(node.behaviour) || !node.module) return undefined;
  const inner = snapshot ?? initialSnapshot();
  if (isControlKind(node.behaviour)) return foldControlState(node, node.behaviour, inner);
  if (isShaderKind(node.behaviour)) return foldShaderState(node, node.behaviour, inner);
  // A nested row may run as gates (unfolded) or as a block; prefer the gates.
  const row = (r: number): ClockedByte => {
    const gates = inner.modules[`row${r}`];
    if (gates && Object.keys(gates.memory).length)
      return { q: readCells(gates, cellIds("cell")), clock: Boolean(gates.lastClock.cell0) };
    return (inner.blocks?.[`row${r}`] as ClockedByte | undefined) ?? rowState(0, false);
  };
  switch (node.behaviour) {
    case "register8":
    case "counter8":
      return { q: readCells(inner, cellIds("cell")), clock: Boolean(inner.lastClock.cell0) };
    case "sp8":
      return {
        q: readCells(inner, cellIds("cell")) ^ SP_RESET,
        clock: Boolean(inner.lastClock.cell0),
      };
    case "ram16":
    case "ram32":
    case "screen8x8": {
      const rows = range(
        node.behaviour === "screen8x8" ? SCREEN_ROWS : 1 << RAM_ADDRESS_BITS[node.behaviour],
      ).map(row);
      return { bytes: rows.map((r) => r.q), clock: rows[0].clock };
    }
    case "stack16": {
      const rows = range(16).map(row);
      return {
        bytes: rows.map((r) => r.q),
        sp: readCells(inner, cellIds("sp", 4)),
        clock: Boolean(inner.lastClock.sp0),
      };
    }
    case "rom256":
      return { bytes: romBytes(node.module) };
    case "alu8":
      return null;
  }
}
