// Video blocks: `scanout`, the controller that reads a framebuffer one pixel
// per tick, and `crt8x8`, a monitor that paints what it receives where its own
// beam is. The two share no wires except PIXEL, HSYNC and VSYNC: the monitor
// keeps in step only by restarting its line on HSYNC and its frame on VSYNC.
//
// Both gate forms count with nested program counters (counter8): X counts
// every tick and reloads 0 on HSYNC; Y counts on HSYNC and reloads 0 on VSYNC.
// Timing is in video.ts. As with the datapath blocks, outputs come from the
// state before the clock commit.
import { Builder, busPorts, ports, type Ref, range, toBits, toNumber } from "./blockBuilder";
import {
  activeBlock,
  type Circuit,
  initialSnapshot,
  type Node,
  registerBlock,
  type Snapshot,
} from "./logic";
import { beamAt, paint, SCAN_COLUMNS, SCAN_LINES, VISIBLE_LINES } from "./video";

/** Gate forms of the parts the video blocks nest, passed in by datapathBlocks. */
export type VideoParts = (kind: "counter8" | "screen8x8" | "plot8") => Circuit;

const LAST_X = SCAN_COLUMNS - 1;
const LAST_Y = SCAN_LINES - 1;

/**
 * A counter8 that counts on `inc` and reloads 0 on `reset`. Returns its
 * output bits.
 */
function counter(
  b: Builder,
  parts: VideoParts,
  id: string,
  y: number,
  label: string,
  inc: Ref,
  reset: Ref,
  clock: Ref,
  zero: Ref,
): Ref[] {
  b.add(id, "module", 360, y, label, { module: parts("counter8"), behaviour: "counter8" });
  for (let bit = 0; bit < 8; bit++) b.connect(zero, id, bit);
  b.connect(inc, id, 8);
  b.connect(reset, id, 9);
  b.connect(clock, id, 10);
  return range(8).map((bit): Ref => [id, bit]);
}

/** One AND per pair, down to one signal: true when every source is. */
function andAll(
  b: Builder,
  prefix: string,
  sources: Ref[],
  x: number,
  y: number,
  label: string,
  id = `${prefix}-all`,
) {
  let level = sources;
  for (let depth = 0; level.length > 1; depth++) {
    const next: Ref[] = [];
    for (let i = 0; i < level.length; i += 2)
      next.push(
        i + 1 < level.length
          ? b.gate(
              level.length === 2 ? id : `${prefix}-and${depth}-${i / 2}`,
              "and",
              x + depth * 140,
              y + i * 40,
              level[i],
              level[i + 1],
              level.length === 2 ? label : undefined,
            )
          : level[i],
      );
    level = next;
  }
  return level[0];
}

// ---------------------------------------------------------------- scanout

/**
 * Inputs ROW0–7 (the framebuffer row at Y, from its video port) and CLK.
 * Outputs PIXEL, X0–X2, Y0–Y2, HSYNC, VSYNC and VBLANK. An 8-way mux picks
 * bit X of ROW; VBLANK (Y ≥ 8, which is Y3) blanks it.
 */
function scanoutCircuit(parts: VideoParts): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("row", "ROW"), ["clock", "CLK"]]);
  b.add("one", "high", 200, 900, "1");
  b.add("zero", "ground", 200, 1000, "0");
  // HSYNC and VSYNC come from the counters' own bits; the counters read them back as LOAD.
  const x = counter(b, parts, "x-count", 1100, "BEAM X", "one", "hsync", "clock", "zero");
  andAll(b, "hsync", x.slice(0, 3), 560, 1100, `X = ${LAST_X} (HSYNC)`, "hsync");
  const y = counter(b, parts, "y-count", 1400, "BEAM Y", "hsync", "vsync", "clock", "zero");
  const lastLine = andAll(b, "last-line", y.slice(0, 4), 560, 1400, `Y = ${LAST_Y}`);
  b.gate("vsync", "and", 860, 1400, lastLine, "hsync", "VSYNC");
  const vblank = y[3];
  const visible = b.gate("visible", "not", 860, 1600, vblank, undefined, "NOT VBLANK");

  // The pixel mux: column c is ROW bit c when X = c.
  const inverted = x
    .slice(0, 3)
    .map((bit, i) => b.gate(`x-not${i}`, "not", 1000, 30 + i * 80, bit, undefined, `NOT X${i}`));
  const pick = (column: number, bit: number) => ((column >> bit) & 1 ? x[bit] : inverted[bit]);
  const columns = range(SCAN_COLUMNS).map((column) => {
    const top = 30 + column * 110;
    const low = b.gate(`col-p${column}`, "and", 1150, top, pick(column, 0), pick(column, 1));
    const sel = b.gate(`col${column}`, "and", 1300, top, low, pick(column, 2), `X = ${column}`);
    return b.gate(`take${column}`, "and", 1450, top, `row${column}`, sel);
  });
  const lit = b.orTree("pixel-bit", columns, 1600, 30, "ROW BIT X");
  b.gate("pixel-on", "and", 2000, 400, lit, visible, "PIXEL");

  b.gate("q-pixel", "lamp", 2200, 400, "pixel-on", undefined, "PIXEL");
  range(3).forEach((bit) =>
    b.gate(`q-x${bit}`, "lamp", 2200, 600 + bit * 90, x[bit], undefined, `X${bit}`),
  );
  range(3).forEach((bit) =>
    b.gate(`q-y${bit}`, "lamp", 2200, 900 + bit * 90, y[bit], undefined, `Y${bit}`),
  );
  b.gate("q-hsync", "lamp", 2200, 1200, "hsync", undefined, "HSYNC");
  b.gate("q-vsync", "lamp", 2200, 1300, "vsync", undefined, "VSYNC");
  b.gate("q-vblank", "lamp", 2200, 1400, vblank, undefined, "VBLANK");
  return b.circuit("Scanout");
}

/** Beam position: column x (0–7) on line y (0–15; 8–15 are blank). */
export type Scanout = { x: number; y: number; clock: boolean };
const position = (state: Scanout) => state.y * SCAN_COLUMNS + state.x;

registerBlock<Scanout>({
  name: "scanout",
  inputs: [...busPorts("row", "ROW").map(([, l]) => l), "CLK"],
  outputs: ["PIXEL", "X0", "X1", "X2", "Y0", "Y1", "Y2", "HSYNC", "VSYNC", "VBLANK"],
  initialState: () => ({ x: 0, y: 0, clock: false }),
  evaluate: (inputs, state) => {
    const clock = inputs[8];
    const beam = beamAt(position(state));
    const rising = clock && !state.clock;
    const next = rising ? beamAt(position(state) + 1) : beam;
    return {
      outputs: [
        !beam.vblank && Boolean((toNumber(inputs.slice(0, 8)) >> beam.x) & 1),
        ...toBits(beam.x, 3),
        ...toBits(beam.y, 3),
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

// ---------------------------------------------------------------- crt8x8

/**
 * Inputs PIXEL, HSYNC, VSYNC and CLK; outputs its beam's X0–X2 and Y0–Y3.
 * The phosphor is a nested 8×8 screen: on each rising CLK the pixel plotter
 * writes PIXEL into the phosphor at the beam, unless the beam is below line 7.
 */
function crtCircuit(parts: VideoParts): Circuit {
  const b = new Builder();
  ports(b, [
    ["pixel", "PIXEL"],
    ["hsync", "HSYNC"],
    ["vsync", "VSYNC"],
    ["clock", "CLK"],
  ]);
  b.add("one", "high", 200, 500, "1");
  b.add("zero", "ground", 200, 600, "0");
  const x = counter(b, parts, "beam-x", 30, "BEAM X", "one", "hsync", "clock", "zero");
  const y = counter(b, parts, "beam-y", 400, "BEAM Y", "hsync", "vsync", "clock", "zero");
  const below = b.orTree("below", y.slice(3), 560, 400, "Y ≥ 8");
  const onScreen = b.gate("on-screen", "not", 860, 400, below, undefined, "ON SCREEN");

  b.add("phosphor", "module", 1100, 30, "PHOSPHOR", {
    module: parts("screen8x8"),
    behaviour: "screen8x8",
  });
  b.add("beam", "module", 1100, 600, "BEAM", { module: parts("plot8"), behaviour: "plot8" });
  range(8).forEach((bit) => b.connect(["phosphor", bit], "beam", bit));
  range(3).forEach((bit) => b.connect(x[bit], "beam", 8 + bit));
  b.connect("pixel", "beam", 11);
  range(3).forEach((bit) => b.connect(y[bit], "phosphor", bit));
  range(8).forEach((bit) => b.connect(["beam", bit], "phosphor", 3 + bit));
  b.connect(onScreen, "phosphor", 11);
  b.connect("clock", "phosphor", 12);

  range(3).forEach((bit) =>
    b.gate(`q-x${bit}`, "lamp", 1500, 30 + bit * 90, x[bit], undefined, `X${bit}`),
  );
  range(4).forEach((bit) =>
    b.gate(`q-y${bit}`, "lamp", 1500, 330 + bit * 90, y[bit], undefined, `Y${bit}`),
  );
  return b.circuit("8×8 monitor");
}

/** The monitor: its beam (0–255 each, as its counters run free without sync) and phosphor rows. */
export type Crt = { x: number; y: number; bytes: number[]; clock: boolean };

registerBlock<Crt>({
  name: "crt8x8",
  inputs: ["PIXEL", "HSYNC", "VSYNC", "CLK"],
  outputs: ["X0", "X1", "X2", "Y0", "Y1", "Y2", "Y3"],
  initialState: () => ({ x: 0, y: 0, bytes: Array(VISIBLE_LINES).fill(0), clock: false }),
  evaluate: (inputs, state) => {
    const [pixel, hsync, vsync, clock] = inputs;
    let next = state;
    if (clock && !state.clock)
      next = {
        x: hsync ? 0 : (state.x + 1) & 255,
        y: vsync ? 0 : hsync ? (state.y + 1) & 255 : state.y,
        bytes: paint(state.bytes, state.x & 7, state.y, pixel),
        clock,
      };
    else if (clock !== state.clock) next = { ...state, clock };
    return { outputs: [...toBits(state.x, 3), ...toBits(state.y, 4)], nextState: next };
  },
});

// ---------------------------------------------------------------- public API

export const VIDEO_BLOCKS = {
  scanout: {
    label: "SCANOUT",
    hint: "Reads the screen one pixel per clock tick, left to right, top to bottom. Wire Y to a framebuffer's video address and ROW to its video data; PIXEL is bit X of ROW. HSYNC ends a line, VSYNC a frame; lines 8–15 are vertical blank (VBLANK), when nothing is drawn.",
  },
  crt8x8: {
    label: "8×8 MONITOR",
    hint: "Paints PIXEL where its own beam is, one pixel per tick, and keeps it lit until the beam comes back. HSYNC starts the next line and VSYNC the next frame, so wire them from a SCANOUT to keep the picture in place.",
  },
} as const;
export type VideoKind = keyof typeof VIDEO_BLOCKS;

export function videoBlockCircuit(kind: VideoKind, parts: VideoParts): Circuit {
  return kind === "scanout" ? scanoutCircuit(parts) : crtCircuit(parts);
}

type ClockedByte = { q: number; clock: boolean };
const counterState = (q: number, clock: boolean): ClockedByte => ({ q, clock });

/** Fold for a nested part: its block state, or its gates read back by `fold`. */
export type FoldNested = (node: Node, snapshot: Snapshot | undefined) => unknown;

export function unfoldVideoState(kind: VideoKind, state: unknown): Snapshot {
  const snapshot = initialSnapshot();
  snapshot.blocks = {};
  if (kind === "scanout") {
    const { x, y, clock } = state as Scanout;
    snapshot.blocks["x-count"] = counterState(x, clock);
    snapshot.blocks["y-count"] = counterState(y, clock);
  } else {
    const { x, y, bytes, clock } = state as Crt;
    snapshot.blocks["beam-x"] = counterState(x, clock);
    snapshot.blocks["beam-y"] = counterState(y, clock);
    snapshot.blocks.phosphor = { bytes: [...bytes], clock };
  }
  return snapshot;
}

export function foldVideoState(
  node: Node,
  kind: VideoKind,
  inner: Snapshot,
  fold: FoldNested,
): unknown {
  const nested = (id: string) => {
    const part = node.module?.nodes.find((item) => item.id === id);
    if (part && activeBlock(part)) return inner.blocks?.[id];
    return fold(part ?? { id, type: "module", x: 0, y: 0 }, inner.modules[id]);
  };
  const count = (id: string) => (nested(id) as ClockedByte | undefined) ?? counterState(0, false);
  if (kind === "scanout") {
    const x = count("x-count");
    return { x: x.q, y: count("y-count").q, clock: x.clock };
  }
  const x = count("beam-x");
  const phosphor = nested("phosphor") as { bytes: number[] } | undefined;
  return {
    x: x.q,
    y: count("beam-y").q,
    bytes: phosphor?.bytes ?? Array(VISIBLE_LINES).fill(0),
    clock: x.clock,
  };
}
