// Bigger screens as blocks: a dual-port framebuffer, a scanout and a monitor
// at 16×16 and 32×32. They do what vram8x8, scanout and crt8x8 do for the
// CPU's 8×8 screen, which stays its own set of blocks because the CPU, the
// build-your-own-CPU levels and the gate netlist depend on its exact ports.
//
// A row of a W-pixel screen is W / 8 bytes, so a framebuffer is a byte memory
// addressed by y * W / 8 + x / 8: the x / 8 bits low, the y bits high. A
// scanout reads the byte under its beam through the second port and sends
// bit x mod 8 of it. Timing and the frame layout are in video.ts.
//
// The 16×16 framebuffer's gate form is 32 register8 rows with two select
// decoders. The 32×32 one would pass the builder's 2,000-node limit for one
// level, so it is four 32-byte banks (each a nested 16×16 framebuffer) and a
// bank decoder: the same trick as splitting a big RAM into chips.
import { Builder, busPorts, ports, type Ref, range, toBits, toNumber } from "./blockBuilder";
import {
  activeBlock,
  type Circuit,
  initialSnapshot,
  type Node,
  registerBlock,
  type Snapshot,
} from "./logic";
import {
  beamAt,
  bitsFor,
  blankFrame,
  frameBytes,
  paint,
  rowBytes,
  type ScreenSize,
  videoTiming,
} from "./video";

/** Gate forms of the parts the big screens nest, passed in by datapathBlocks. */
export type BigScreenParts = (kind: "register8" | "counter8" | "plot8" | BigScreenKind) => Circuit;

const SIZES = {
  "16x16": { width: 16, height: 16 },
  "32x32": { width: 32, height: 32 },
} as const satisfies Record<string, ScreenSize>;
type SizeName = keyof typeof SIZES;
const SIZE_NAMES = Object.keys(SIZES) as SizeName[];
/** Bytes in one bank of the banked framebuffer: a whole 16×16 frame. */
const BANK_BYTES = frameBytes(SIZES["16x16"]);

/** Ports and widths of one size. */
function shape(size: ScreenSize) {
  const address = bitsFor(frameBytes(size));
  const xBits = bitsFor(size.width);
  const yBits = bitsFor(size.height);
  const columnBits = bitsFor(rowBytes(size));
  return { address, xBits, yBits, columnBits };
}

const vramInputs = (bits: number): [string, string][] => [
  ...busPorts("a", "A", bits),
  ...busPorts("d", "D"),
  ["we", "WE"],
  ...busPorts("ra", "RA", bits),
  ["clock", "CLK"],
];
const vramOutputs = [...range(8).map((bit) => `Q${bit}`), ...range(8).map((bit) => `V${bit}`)];

/**
 * One-hot select lines for `bits`: split in half, decode each half, then AND
 * every pair, so the gate count stays near one AND per line.
 */
function decode(b: Builder, prefix: string, bits: Ref[], x: number, y: number): Ref[] {
  if (bits.length === 1) {
    const low = b.gate(`${prefix}-not0`, "not", x, y, bits[0]);
    return [low, bits[0]];
  }
  const half = Math.floor(bits.length / 2);
  const low = decode(b, `${prefix}-l`, bits.slice(0, half), x, y);
  const high = decode(b, `${prefix}-h`, bits.slice(half), x, y + low.length * 40 + 80);
  return high.flatMap((h, hi) =>
    low.map((l, li) =>
      b.gate(
        `${prefix}-${hi * low.length + li}`,
        "and",
        x + 200 + bits.length * 60,
        y + (hi * low.length + li) * 30,
        l,
        h,
      ),
    ),
  );
}

/** For each output bit, the OR of `sources[r][bit]` AND `select[r]`. */
function readPort(
  b: Builder,
  prefix: string,
  sources: (bit: number, r: number) => Ref,
  select: Ref[],
  x: number,
  y: number,
): Ref[] {
  return range(8).map((bit) =>
    b.orTree(
      `${prefix}${bit}`,
      select.map((sel, r) =>
        b.gate(`${prefix}-pick${r}-${bit}`, "and", x, y + r * 60 + bit * 6, sources(bit, r), sel),
      ),
      x + 160,
      y + bit * 200,
      `${prefix.toUpperCase()} BIT ${bit}`,
    ),
  );
}

// ---------------------------------------------------------------- framebuffer

/**
 * A dual-port framebuffer of `size`: A, D, WE and Q are the CPU port, RA
 * picks the byte V reads for the beam. Up to 32 bytes it is register8 rows;
 * above, banks of 32 bytes.
 */
function vramCircuit(size: ScreenSize, name: SizeName, parts: BigScreenParts): Circuit {
  const b = new Builder();
  const { address } = shape(size);
  ports(b, vramInputs(address));
  const a = range(address).map((bit) => `a${bit}`);
  const ra = range(address).map((bit) => `ra${bit}`);
  const data = range(8).map((bit) => `d${bit}`);
  const bytes = frameBytes(size);
  let q: Ref[];
  let v: Ref[];
  if (bytes <= BANK_BYTES) {
    const select = decode(b, "addr", a, 200, 30);
    const video = decode(b, "video", ra, 200, 30 + bytes * 40);
    select.forEach((sel, r) => {
      const id = `row${r}`;
      b.add(id, "module", 900, 30 + r * 160, `BYTE ${r}`, {
        module: parts("register8"),
        behaviour: "register8",
      });
      data.forEach((bit, i) => {
        b.connect(bit, id, i);
      });
      b.connect(b.gate(`write${r}`, "and", 760, 30 + r * 160, sel, "we", `WRITE ${r}`), id, 8);
      b.connect("clock", id, 9);
    });
    q = readPort(b, "read", (bit, r) => [`row${r}`, bit], select, 1100, 30);
    v = readPort(b, "video", (bit, r) => [`row${r}`, bit], video, 1100, 30 + bytes * 60 + 200);
  } else {
    // High address bits pick a bank; the low 5 go to every bank.
    const inner = bitsFor(BANK_BYTES);
    const banks = bytes / BANK_BYTES;
    const select = decode(b, "bank", a.slice(inner), 200, 30);
    const video = decode(b, "video-bank", ra.slice(inner), 200, 600);
    range(banks).forEach((k) => {
      const id = `bank${k}`;
      b.add(id, "module", 700, 30 + k * 400, `BANK ${k}`, {
        module: parts("vram16x16"),
        behaviour: "vram16x16",
      });
      const we = b.gate(
        `bank-we${k}`,
        "and",
        560,
        30 + k * 400,
        select[k],
        "we",
        `WRITE BANK ${k}`,
      );
      [...a.slice(0, inner), ...data, we, ...ra.slice(0, inner), "clock"].forEach(
        (source, input) => {
          b.connect(source, id, input);
        },
      );
    });
    q = readPort(b, "read", (bit, k) => [`bank${k}`, bit], select, 1000, 30);
    v = readPort(b, "video", (bit, k) => [`bank${k}`, 8 + bit], video, 1000, 1000);
  }
  q.forEach((bit, i) => {
    b.gate(`q${i}`, "lamp", 1800, 30 + i * 120, bit, undefined, `Q${i}`);
  });
  v.forEach((bit, i) => {
    b.gate(`v${i}`, "lamp", 1800, 1100 + i * 120, bit, undefined, `V${i}`);
  });
  return b.circuit(`Dual-port ${name.replace("x", "×")} screen`);
}

type Frame = { bytes: number[]; clock: boolean };
for (const name of SIZE_NAMES) {
  const size = SIZES[name];
  const { address } = shape(size);
  registerBlock<Frame>({
    name: `vram${name}`,
    inputs: vramInputs(address).map(([, label]) => label),
    outputs: vramOutputs,
    initialState: () => ({ bytes: blankFrame(size), clock: false }),
    evaluate: (inputs, state) => {
      const at = toNumber(inputs.slice(0, address));
      const we = inputs[address + 8];
      const clock = inputs[2 * address + 9];
      let bytes = state.bytes;
      if (clock && !state.clock && we) {
        bytes = [...bytes];
        bytes[at] = toNumber(inputs.slice(address, address + 8));
      }
      const video = toNumber(inputs.slice(address + 9, 2 * address + 9));
      return {
        outputs: [...toBits(state.bytes[at], 8), ...toBits(state.bytes[video], 8)],
        nextState: bytes === state.bytes && clock === state.clock ? state : { bytes, clock },
      };
    },
  });
}

// ---------------------------------------------------------------- counters

/** A counter8 that counts on `inc` and reloads 0 on `reset`. Returns its bits. */
function counter(
  b: Builder,
  parts: BigScreenParts,
  id: string,
  y: number,
  label: string,
  inc: Ref,
  reset: Ref,
  clock: Ref,
): Ref[] {
  b.add(id, "module", 360, y, label, { module: parts("counter8"), behaviour: "counter8" });
  for (let bit = 0; bit < 8; bit++) b.connect("zero", id, bit);
  b.connect(inc, id, 8);
  b.connect(reset, id, 9);
  b.connect(clock, id, 10);
  return range(8).map((bit): Ref => [id, bit]);
}

/** AND of every source, as a chain. */
function andAll(b: Builder, id: string, sources: Ref[], x: number, y: number, label: string) {
  return sources
    .slice(1)
    .reduce<Ref>(
      (acc, source, i) =>
        b.gate(
          i === sources.length - 2 ? id : `${id}-${i}`,
          "and",
          x + i * 120,
          y,
          acc,
          source,
          i === sources.length - 2 ? label : undefined,
        ),
      sources[0],
    );
}

// ---------------------------------------------------------------- scanout

const scanoutOutputs = (size: ScreenSize) => {
  const { xBits, yBits } = shape(size);
  return [
    "PIXEL",
    ...range(xBits).map((bit) => `X${bit}`),
    ...range(yBits).map((bit) => `Y${bit}`),
    "HSYNC",
    "VSYNC",
    "VBLANK",
  ];
};

/**
 * Inputs BYTE0–7 (the framebuffer byte under the beam, from its video port)
 * and CLK. The video address is X / 8 then Y: wire X3 and up, then Y0 and up,
 * to the framebuffer's RA. An 8-way mux picks bit X mod 8; VBLANK (the line
 * counter's top bit) blanks it.
 */
function scanoutCircuit(size: ScreenSize, name: SizeName, parts: BigScreenParts): Circuit {
  const b = new Builder();
  const { xBits, yBits } = shape(size);
  ports(b, [...busPorts("byte", "BYTE"), ["clock", "CLK"]]);
  b.add("one", "high", 200, 900, "1");
  b.add("zero", "ground", 200, 1000, "0");
  const x = counter(b, parts, "x-count", 1100, "BEAM X", "one", "hsync", "clock");
  andAll(b, "hsync", x.slice(0, xBits), 560, 1100, `X = ${size.width - 1} (HSYNC)`);
  const y = counter(b, parts, "y-count", 1400, "BEAM Y", "hsync", "vsync", "clock");
  const lastLine = andAll(
    b,
    "last-line",
    y.slice(0, yBits + 1),
    560,
    1400,
    `Y = ${2 * size.height - 1}`,
  );
  b.gate("vsync", "and", 1400, 1400, lastLine, "hsync", "VSYNC");
  const vblank = y[yBits];
  const visible = b.gate("visible", "not", 1400, 1600, vblank, undefined, "NOT VBLANK");
  const column = decode(b, "col", x.slice(0, 3), 1000, 30);
  const taken = column.map((sel, bit) =>
    b.gate(`take${bit}`, "and", 1500, 30 + bit * 110, `byte${bit}`, sel),
  );
  const lit = b.orTree("pixel-bit", taken, 1650, 30, "BYTE BIT X MOD 8");
  b.gate("pixel-on", "and", 2000, 400, lit, visible, "PIXEL");

  b.gate("q-pixel", "lamp", 2200, 30, "pixel-on", undefined, "PIXEL");
  range(xBits).forEach((bit) => {
    b.gate(`q-x${bit}`, "lamp", 2200, 130 + bit * 90, x[bit], undefined, `X${bit}`);
  });
  range(yBits).forEach((bit) => {
    b.gate(`q-y${bit}`, "lamp", 2200, 700 + bit * 90, y[bit], undefined, `Y${bit}`);
  });
  b.gate("q-hsync", "lamp", 2200, 1300, "hsync", undefined, "HSYNC");
  b.gate("q-vsync", "lamp", 2200, 1400, "vsync", undefined, "VSYNC");
  b.gate("q-vblank", "lamp", 2200, 1500, vblank, undefined, "VBLANK");
  return b.circuit(`${name.replace("x", "×")} scanout`);
}

/** Beam position: column x on line y (lines from `height` on are blank). */
export type BigScanout = { x: number; y: number; clock: boolean };

for (const name of SIZE_NAMES) {
  const size = SIZES[name];
  const { xBits, yBits } = shape(size);
  const { columns } = videoTiming(size);
  registerBlock<BigScanout>({
    name: `scanout${name}`,
    inputs: [...busPorts("byte", "BYTE").map(([, label]) => label), "CLK"],
    outputs: scanoutOutputs(size),
    initialState: () => ({ x: 0, y: 0, clock: false }),
    evaluate: (inputs, state) => {
      const clock = inputs[8];
      const tick = state.y * columns + state.x;
      const beam = beamAt(tick, size);
      const next = clock && !state.clock ? beamAt(tick + 1, size) : beam;
      return {
        outputs: [
          !beam.vblank && Boolean((toNumber(inputs.slice(0, 8)) >> (beam.x & 7)) & 1),
          ...toBits(beam.x, xBits),
          ...toBits(beam.y, yBits),
          beam.hsync,
          beam.vsync,
          beam.vblank,
        ],
        nextState:
          next.x === state.x && next.y === state.y && clock === state.clock
            ? state
            : { x: next.x, y: next.y, clock },
      };
    },
  });
}

// ---------------------------------------------------------------- monitor

/**
 * Inputs PIXEL, HSYNC, VSYNC and CLK; outputs its beam's X and Y bits (Y one
 * bit wider: the top one is set below the screen). The phosphor is a nested
 * framebuffer of the same size: on each rising CLK a pixel plotter writes
 * PIXEL into the byte under the beam, unless the beam is below the screen.
 */
function crtCircuit(size: ScreenSize, name: SizeName, parts: BigScreenParts): Circuit {
  const b = new Builder();
  const { xBits, yBits, columnBits, address } = shape(size);
  ports(b, [
    ["pixel", "PIXEL"],
    ["hsync", "HSYNC"],
    ["vsync", "VSYNC"],
    ["clock", "CLK"],
  ]);
  b.add("one", "high", 200, 500, "1");
  b.add("zero", "ground", 200, 600, "0");
  const x = counter(b, parts, "beam-x", 30, "BEAM X", "one", "hsync", "clock");
  const y = counter(b, parts, "beam-y", 400, "BEAM Y", "hsync", "vsync", "clock");
  const below = b.orTree("below", y.slice(yBits), 560, 400, `Y ≥ ${size.height}`);
  const onScreen = b.gate("on-screen", "not", 860, 400, below, undefined, "ON SCREEN");
  b.add("phosphor", "module", 1100, 30, "PHOSPHOR", {
    module: parts(`vram${name}`),
    behaviour: `vram${name}`,
  });
  b.add("beam", "module", 1100, 800, "BEAM", { module: parts("plot8"), behaviour: "plot8" });
  range(8).forEach((bit) => {
    b.connect(["phosphor", bit], "beam", bit);
  });
  range(3).forEach((bit) => {
    b.connect(x[bit], "beam", 8 + bit);
  });
  b.connect("pixel", "beam", 11);
  const at = [...x.slice(3, 3 + columnBits), ...y.slice(0, yBits)];
  at.forEach((source, bit) => {
    b.connect(source, "phosphor", bit);
  });
  range(8).forEach((bit) => {
    b.connect(["beam", bit], "phosphor", address + bit);
  });
  b.connect(onScreen, "phosphor", address + 8);
  range(address).forEach((bit) => {
    b.connect("zero", "phosphor", address + 9 + bit);
  });
  b.connect("clock", "phosphor", 2 * address + 9);
  range(xBits).forEach((bit) => {
    b.gate(`q-x${bit}`, "lamp", 1500, 30 + bit * 90, x[bit], undefined, `X${bit}`);
  });
  range(yBits + 1).forEach((bit) => {
    b.gate(`q-y${bit}`, "lamp", 1500, 600 + bit * 90, y[bit], undefined, `Y${bit}`);
  });
  return b.circuit(`${name.replace("x", "×")} monitor`);
}

/** The monitor: its beam (0–255 each, as its counters run free without sync) and phosphor. */
export type BigCrt = { x: number; y: number; bytes: number[]; clock: boolean };

for (const name of SIZE_NAMES) {
  const size = SIZES[name];
  const { xBits, yBits } = shape(size);
  registerBlock<BigCrt>({
    name: `crt${name}`,
    inputs: ["PIXEL", "HSYNC", "VSYNC", "CLK"],
    outputs: [...range(xBits).map((bit) => `X${bit}`), ...range(yBits + 1).map((bit) => `Y${bit}`)],
    initialState: () => ({ x: 0, y: 0, bytes: blankFrame(size), clock: false }),
    evaluate: (inputs, state) => {
      const [pixel, hsync, vsync, clock] = inputs;
      let next = state;
      if (clock && !state.clock)
        next = {
          x: hsync ? 0 : (state.x + 1) & 255,
          y: vsync ? 0 : hsync ? (state.y + 1) & 255 : state.y,
          bytes: paint(state.bytes, state.x & (size.width - 1), state.y, pixel, size),
          clock,
        };
      else if (clock !== state.clock) next = { ...state, clock };
      return {
        outputs: [...toBits(state.x, xBits), ...toBits(state.y, yBits + 1)],
        nextState: next,
      };
    },
  });
}

// ---------------------------------------------------------------- public API

const sizeLabel = (name: SizeName) => name.replace("x", "×");
export const BIG_SCREEN_BLOCKS = Object.fromEntries(
  SIZE_NAMES.flatMap((name) => {
    const size = SIZES[name];
    const { address, columnBits } = shape(size);
    return [
      [
        `vram${name}`,
        {
          label: `${sizeLabel(name)} SCREEN`,
          hint: `A dual-port ${sizeLabel(name)} framebuffer: ${frameBytes(size)} bytes, ${rowBytes(size)} per row. A (${address} bits: x / 8 low, y high), D and WE write a byte, Q reads byte A; RA picks the byte V reads for the beam.${frameBytes(size) > BANK_BYTES ? ` Unfold it to see ${frameBytes(size) / BANK_BYTES} banks of ${BANK_BYTES} bytes: built flat it would pass the builder's 2,000-part limit for one level, so it is put together like a RAM from several chips.` : ""}`,
        },
      ],
      [
        `scanout${name}`,
        {
          label: `${sizeLabel(name)} SCANOUT`,
          hint: `Reads a ${sizeLabel(name)} screen one pixel per tick: ${size.width} ticks a line, ${size.height} visible lines, then ${size.height} blank. Wire ${columnBits > 1 ? `X3–X${2 + columnBits}` : "X3"} and then the Y bits to the framebuffer's RA, and its V to BYTE; PIXEL is bit X mod 8 of BYTE.`,
        },
      ],
      [
        `crt${name}`,
        {
          label: `${sizeLabel(name)} MONITOR`,
          hint: `Paints PIXEL where its own beam is, one pixel per tick, on a ${sizeLabel(name)} phosphor. HSYNC starts the next line and VSYNC the next frame: wire them from a ${sizeLabel(name)} SCANOUT.`,
        },
      ],
    ];
  }),
) as Record<BigScreenKind, { label: string; hint: string }>;
export type BigScreenKind = `${"vram" | "scanout" | "crt"}${SizeName}`;
export const isBigScreenKind = (kind: string | undefined): kind is BigScreenKind =>
  kind !== undefined && kind in BIG_SCREEN_BLOCKS;

/** The screen size a big-screen block draws. */
export const bigScreenSize = (kind: BigScreenKind): ScreenSize =>
  SIZES[kind.replace(/^(vram|scanout|crt)/, "") as SizeName];

export function bigScreenBlockCircuit(kind: BigScreenKind, parts: BigScreenParts): Circuit {
  const name = kind.replace(/^(vram|scanout|crt)/, "") as SizeName;
  const size = SIZES[name];
  if (kind.startsWith("vram")) return vramCircuit(size, name, parts);
  if (kind.startsWith("scanout")) return scanoutCircuit(size, name, parts);
  return crtCircuit(size, name, parts);
}

type ClockedByte = { q: number; clock: boolean };
const byteState = (q: number, clock: boolean): ClockedByte => ({ q, clock });

/** Inner snapshot for unfolding a big-screen block; see `unfoldBlockState`. */
export function unfoldBigScreenState(kind: BigScreenKind, state: unknown): Snapshot {
  const snapshot = initialSnapshot();
  snapshot.blocks = {};
  if (state == null) return snapshot;
  if (kind.startsWith("vram")) {
    const { bytes, clock } = state as Frame;
    if (bytes.length <= BANK_BYTES)
      bytes.forEach((q, r) => {
        snapshot.blocks![`row${r}`] = byteState(q, clock);
      });
    else
      range(bytes.length / BANK_BYTES).forEach((k) => {
        snapshot.blocks![`bank${k}`] = {
          bytes: bytes.slice(k * BANK_BYTES, (k + 1) * BANK_BYTES),
          clock,
        } satisfies Frame;
      });
  } else if (kind.startsWith("scanout")) {
    const { x, y, clock } = state as BigScanout;
    snapshot.blocks["x-count"] = byteState(x, clock);
    snapshot.blocks["y-count"] = byteState(y, clock);
  } else {
    const { x, y, bytes, clock } = state as BigCrt;
    snapshot.blocks["beam-x"] = byteState(x, clock);
    snapshot.blocks["beam-y"] = byteState(y, clock);
    snapshot.blocks.phosphor = { bytes: [...bytes], clock } satisfies Frame;
  }
  return snapshot;
}

/** Fold for a nested part: its block state, or its gates read back. */
export type FoldNested = (node: Node, snapshot: Snapshot | undefined) => unknown;

/** Reads a big-screen block's state back out of its gate form; see `foldBlockState`. */
export function foldBigScreenState(
  node: Node,
  kind: BigScreenKind,
  inner: Snapshot,
  fold: FoldNested,
): unknown {
  const nested = (id: string) => {
    const part = node.module?.nodes.find((item) => item.id === id);
    if (part && activeBlock(part)) return inner.blocks?.[id];
    return fold(part ?? { id, type: "module", x: 0, y: 0 }, inner.modules[id]);
  };
  const size = bigScreenSize(kind);
  if (kind.startsWith("vram")) {
    const bytes = frameBytes(size);
    if (bytes <= BANK_BYTES) {
      const rows = range(bytes).map(
        (r) => (nested(`row${r}`) as ClockedByte | undefined) ?? byteState(0, false),
      );
      return { bytes: rows.map((row) => row.q), clock: rows[0].clock } satisfies Frame;
    }
    const banks = range(bytes / BANK_BYTES).map(
      (k) =>
        (nested(`bank${k}`) as Frame | undefined) ?? {
          bytes: Array(BANK_BYTES).fill(0),
          clock: false,
        },
    );
    return { bytes: banks.flatMap((bank) => bank.bytes), clock: banks[0].clock } satisfies Frame;
  }
  const count = (id: string) => (nested(id) as ClockedByte | undefined) ?? byteState(0, false);
  if (kind.startsWith("scanout")) {
    const x = count("x-count");
    return { x: x.q, y: count("y-count").q, clock: x.clock } satisfies BigScanout;
  }
  const x = count("beam-x");
  const phosphor = nested("phosphor") as Frame | undefined;
  return {
    x: x.q,
    y: count("beam-y").q,
    bytes: phosphor?.bytes ?? blankFrame(size),
    clock: x.clock,
  } satisfies BigCrt;
}
