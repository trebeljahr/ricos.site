import { describe, expect, it } from "vitest";
import type { BigScreenCard } from "./bigScreenBlocks";
import { CPU_PRESETS } from "./cpuPreset";
import {
  datapathNode,
  foldBlockState,
  screenView,
  toBits,
  toNumber,
  unfoldBlockState,
} from "./datapathBlocks";
import {
  activeBlock,
  type Circuit,
  initialSnapshot,
  MAX_CIRCUIT_NODES,
  moduleInputs,
  moduleOutputs,
  type Node,
  type Snapshot,
  step,
} from "./logic";
import {
  beamAt,
  beamPixel,
  blankFrame,
  frameBytes,
  litPixels,
  paint,
  pixelAt,
  SCREEN_SIZES,
  scanoutTrace,
  videoTiming,
} from "./video";

/** Seeded PRNG (mulberry32), so failures reproduce. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The same node with every nested block running as gates. */
const allGates = (node: Node): Node => ({
  ...node,
  behaviour: undefined,
  module: node.module && {
    ...node.module,
    nodes: node.module.nodes.map((inner) => (inner.module ? allGates(inner) : inner)),
  },
});

/** One switch per block input, one lamp per output. */
function harness(block: Node): Circuit {
  const ins = moduleInputs(block.module!);
  const outs = moduleOutputs(block.module!);
  return {
    name: "harness",
    nodes: [
      block,
      ...ins.map((_, i): Node => ({ id: `in${i}`, type: "switch", x: 0, y: 0 })),
      ...outs.map((_, i): Node => ({ id: `out${i}`, type: "lamp", x: 0, y: 0 })),
    ],
    wires: [
      ...ins.map((_, i) => ({ id: `w-in${i}`, from: `in${i}`, to: block.id, input: i })),
      ...outs.map((_, i) => ({
        id: `w-out${i}`,
        from: block.id,
        to: `out${i}`,
        input: 0,
        output: i,
      })),
    ],
  };
}

/** Drives several forms of one block with the same inputs; every form must agree. */
class Bench {
  readonly circuits: Circuit[];
  states: Snapshot[];
  constructor(readonly forms: Node[]) {
    this.circuits = forms.map(harness);
    this.states = forms.map(() => initialSnapshot());
  }
  apply(inputs: boolean[], where: string): boolean[] {
    const overrides = Object.fromEntries(inputs.map((bit, i) => [`in${i}`, bit]));
    this.states = this.states.map((state, i) =>
      step(this.circuits[i], state, false, {}, overrides),
    );
    const [first, ...rest] = this.states.map((state) =>
      this.circuits[0].nodes
        .filter((n) => n.type === "lamp")
        .map((n) => Boolean(state.values[n.id])),
    );
    for (const [i, other] of rest.entries())
      expect(other, `${where}: form ${i + 1}`).toEqual(first);
    return first;
  }
  tick(inputs: boolean[], where: string) {
    this.apply([...inputs, false], where);
    return this.apply([...inputs, true], where);
  }
}

const SIXTEEN = SCREEN_SIZES["16×16"];
const THIRTY_TWO = SCREEN_SIZES["32×32"];
const BIG = SCREEN_SIZES["512×512"];

describe("sized video model", () => {
  it("keeps the 8×8 timing and lays out wider rows as several bytes", () => {
    expect(videoTiming()).toMatchObject({ columns: 8, scanLines: 16, frameTicks: 128 });
    expect(videoTiming(SIXTEEN).frameTicks).toBe(512);
    expect(videoTiming(BIG).frameTicks).toBe(524_288);
    expect(frameBytes(BIG)).toBe(32_768);
    // Pixel (9, 1) of 16×16 is bit 1 of row 1's second byte: byte 3.
    const frame = paint(blankFrame(SIXTEEN), 9, 1, true, SIXTEEN);
    expect(frame[3]).toBe(2);
    expect(pixelAt(frame, SIXTEEN, 9, 1)).toBe(true);
    expect(litPixels(frame)).toBe(1);
    expect(beamAt(16 * 16, SIXTEEN)).toMatchObject({ x: 0, y: 16, vblank: true });
    expect(beamAt(512 * 1024 - 1, BIG)).toMatchObject({ hsync: true, vsync: true });
  });

  it("scans a 32×32 frame onto the monitor, and reads 512×512 pixels by beam", () => {
    const frame = blankFrame(THIRTY_TWO);
    for (let i = 0; i < 32; i++) frame[i * 4 + (i >> 3)] |= 1 << (i & 7); // the diagonal
    // Tick 0 reads the frame from before the first entry, so pixel (0, 0) lands in frame 2.
    const ticks = videoTiming(THIRTY_TWO).frameTicks + videoTiming(THIRTY_TWO).visibleTicks;
    const last = scanoutTrace(
      Array.from({ length: ticks }, () => frame),
      THIRTY_TWO,
    ).at(-1)!;
    expect(last.image).toEqual(frame);
    expect(litPixels(last.image)).toBe(32);
    // 512×512: tick y * 512 + x reads pixel (x, y); the beam is in blank from line 512.
    const big = paint(blankFrame(BIG), 300, 200, true, BIG);
    expect(beamPixel(big, beamAt(200 * 512 + 300, BIG), BIG)).toBe(true);
    expect(beamPixel(big, beamAt(200 * 512 + 301, BIG), BIG)).toBe(false);
    expect(beamAt(512 * 512, BIG).vblank).toBe(true);
  });
});

describe("big-screen blocks", () => {
  it("fit the builder: at most 24 ports each way and 2,000 nodes a level", () => {
    for (const kind of [
      "vram16x16",
      "vram32x32",
      "scanout16x16",
      "scanout32x32",
      "crt16x16",
      "crt32x32",
    ] as const) {
      const node = datapathNode(kind, "dut", 0, 0);
      expect(activeBlock(node)?.name, kind).toBe(kind);
      expect(moduleInputs(node.module!).length, kind).toBeLessThanOrEqual(24);
      expect(moduleOutputs(node.module!).length, kind).toBeLessThanOrEqual(24);
      const levels: Circuit[] = [node.module!];
      for (const level of levels) {
        expect(level.nodes.length, `${kind} ${level.name}`).toBeLessThanOrEqual(MAX_CIRCUIT_NODES);
        for (const inner of level.nodes) if (inner.module) levels.push(inner.module);
      }
    }
  });

  for (const [kind, size] of [
    ["vram16x16", SIXTEEN],
    ["vram32x32", THIRTY_TWO],
  ] as const)
    it(`${kind}: both ports equal its gates and a byte model over random writes`, {
      timeout: 60_000,
    }, () => {
      const node = datapathNode(kind, "dut", 0, 0);
      const forms =
        kind === "vram16x16"
          ? [node, { ...node, behaviour: undefined }, allGates(node)]
          : [node, { ...node, behaviour: undefined }];
      const bench = new Bench(forms);
      const bytes = frameBytes(size);
      const bits = Math.log2(bytes);
      const model = Array(bytes).fill(0);
      const next = random(bytes);
      for (let i = 0; i < 80; i++) {
        const at = Math.floor(next() * bytes);
        const video = Math.floor(next() * bytes);
        const data = Math.floor(next() * 256);
        const we = next() < 0.5;
        const out = bench.tick(
          [...toBits(at, bits), ...toBits(data, 8), we, ...toBits(video, bits)],
          `${kind} step ${i}`,
        );
        if (we) model[at] = data;
        expect(toNumber(out.slice(0, 8)), `step ${i}: Q`).toBe(model[at]);
        expect(toNumber(out.slice(8)), `step ${i}: V`).toBe(model[video]);
      }
      const state = bench.states[0].blocks?.dut;
      expect(screenView(kind, state).rows).toEqual(model);
      expect(foldBlockState(node, bench.states[1].modules.dut)).toEqual(state);
    });

  for (const [name, size] of [
    ["16x16", SIXTEEN],
    ["32x32", THIRTY_TWO],
  ] as const)
    it(`scanout${name}: follows beamAt for a frame and a half, as block and as gates`, {
      timeout: 60_000,
    }, () => {
      const node = datapathNode(`scanout${name}`, "dut", 0, 0);
      const bench = new Bench(
        name === "16x16" ? [node, allGates(node)] : [node, { ...node, behaviour: undefined }],
      );
      const xBits = Math.log2(size.width);
      const yBits = Math.log2(size.height);
      const ticks = (videoTiming(size).frameTicks * 3) / 2;
      for (let tick = 0; tick < ticks; tick++) {
        const byte = (tick * 37) & 255;
        const out = bench.apply([...toBits(byte, 8), false], `tick ${tick}`);
        const beam = beamAt(tick, size);
        expect(out[0], `tick ${tick}: pixel`).toBe(
          !beam.vblank && Boolean((byte >> (beam.x & 7)) & 1),
        );
        expect(toNumber(out.slice(1, 1 + xBits)), `tick ${tick}: X`).toBe(beam.x);
        expect(toNumber(out.slice(1 + xBits, 1 + xBits + yBits)), `tick ${tick}: Y`).toBe(
          beam.y & (size.height - 1),
        );
        expect(out.slice(1 + xBits + yBits), `tick ${tick}: sync`).toEqual([
          beam.hsync,
          beam.vsync,
          beam.vblank,
        ]);
        bench.apply([...toBits(byte, 8), true], `tick ${tick}`);
      }
    });

  it("crt16x16: paints what it receives where its beam is, as block and as gates", {
    timeout: 60_000,
  }, () => {
    const node = datapathNode("crt16x16", "dut", 0, 0);
    // Its own gates for a whole frame, with the phosphor as a block; every gate for the first lines.
    const bench = new Bench([node, { ...node, behaviour: undefined }]);
    const deep = new Bench([node, allGates(node)]);
    for (let tick = 0; tick < 48; tick++) {
      const beam = beamAt(tick, SIXTEEN);
      deep.tick([tick % 3 === 0, beam.hsync, beam.vsync], `all gates, tick ${tick}`);
    }
    let image = blankFrame(SIXTEEN);
    const ticks = videoTiming(SIXTEEN).frameTicks + 40;
    for (let tick = 0; tick < ticks; tick++) {
      const beam = beamAt(tick, SIXTEEN);
      const pixel = (beam.x + beam.y) % 3 === 0;
      bench.tick([pixel, beam.hsync, beam.vsync], `tick ${tick}`);
      image = paint(image, beam.x, beam.y, pixel, SIXTEEN);
      expect(screenView("crt16x16", bench.states[0].blocks?.dut).rows, `tick ${tick}`).toEqual(
        image,
      );
    }
  });

  it("round-trips every big screen's state through unfold and fold", () => {
    const next = random(3);
    const bytes = (size: { width: number; height: number }) =>
      Array.from({ length: frameBytes(size) }, () => Math.floor(next() * 256));
    for (const [kind, state] of [
      ["vram16x16", { bytes: bytes(SIXTEEN), clock: true }],
      ["vram32x32", { bytes: bytes(THIRTY_TWO), clock: false }],
      ["scanout16x16", { x: 13, y: 21, clock: true }],
      ["scanout32x32", { x: 30, y: 40, clock: false }],
      ["crt16x16", { x: 200, y: 7, bytes: bytes(SIXTEEN), clock: true }],
      ["crt32x32", { x: 3, y: 31, bytes: bytes(THIRTY_TWO), clock: false }],
    ] as const) {
      const node = datapathNode(kind, "dut", 0, 0);
      expect(foldBlockState(node, unfoldBlockState(node, state)), kind).toEqual(state);
    }
  });
});

describe("big scanout benches", () => {
  for (const [preset, size] of [
    ["Scanout and monitor, 16×16", SIXTEEN],
    ["Scanout and monitor, 32×32", THIRTY_TWO],
  ] as const)
    it(`${preset}: a byte written once reaches the monitor within a frame`, () => {
      const circuit = CPU_PRESETS[preset];
      const address = size.width / 8 + 1; // row 1, second byte
      let state = step(circuit, initialSnapshot(), false, {}, { we: true, clk: false });
      state = step(circuit, state, false, {}, { we: true, clk: true });
      state = step(circuit, state, false, {}, { we: false, clk: false });
      expect(screenView(`vram${size.width}x${size.width}`, state.blocks?.vram).rows[address]).toBe(
        0x3c,
      );
      for (let tick = 0; tick < videoTiming(size).frameTicks; tick++) {
        state = step(circuit, state, false, {}, { we: false, clk: true });
        state = step(circuit, state, false, {}, { we: false, clk: false });
      }
      const monitor = screenView(`crt${size.width}x${size.width}`, state.blocks?.monitor).rows;
      const expected = blankFrame(size);
      expected[address] = 0x3c;
      expect(monitor).toEqual(expected);
    });
});

describe("big screen card", () => {
  it("equals its gates over random D_ reads and writes, and ignores other addresses", {
    timeout: 60_000,
  }, () => {
    const node = datapathNode("bigScreenCard", "dut", 0, 0);
    expect(moduleInputs(node.module!)).toHaveLength(19);
    const bench = new Bench([node, { ...node, behaviour: undefined }]);
    const next = random(11);
    for (let i = 0; i < 600; i++) {
      // Mostly D0–DF, sometimes another address the card must leave alone.
      const address = next() < 0.85 ? 0xd0 + Math.floor(next() * 16) : Math.floor(next() * 256);
      const data = Math.floor(next() * 256);
      const we = next() < 0.6;
      const re = !we && next() < 0.5;
      bench.tick([...toBits(address, 8), ...toBits(data, 8), we, re], `step ${i}`);
    }
    const state = bench.states[0].blocks?.dut as BigScreenCard;
    expect(state.bytes.some(Boolean)).toBe(true);
    expect(foldBlockState(node, bench.states[1].modules.dut)).toEqual(state);
    expect(foldBlockState(node, unfoldBlockState(node, state))).toEqual(state);
  });

  it("fills and copies rectangles one byte per tick, as block and as gates", {
    timeout: 60_000,
  }, () => {
    const node = datapathNode("bigScreenCard", "dut", 0, 0);
    const bench = new Bench([node, { ...node, behaviour: undefined }]);
    const store = (address: number, value: number) =>
      bench.tick([...toBits(address, 8), ...toBits(value, 8), true, false], `STM ${address}`);
    const idle = () => bench.tick([...toBits(0, 8), ...toBits(0, 8), false, false], "tick");
    const busy = () =>
      Boolean(bench.tick([...toBits(0xdf, 8), ...toBits(0, 8), false, false], "read DF")[0]);
    store(0xd9, 0); // ADDR 0
    for (const value of [1, 2, 3, 4]) store(0xda, value); // bytes 0–3
    store(0xdc, 64); // DST: row 16
    store(0xdd, 0); // SRC: row 0
    store(0xde, (1 << 2) | 3); // 2 rows of 4
    store(0xdf, 2); // COPY
    let ticks = 0;
    while (busy()) ticks++;
    expect(ticks).toBe(7); // the start edge was the first read; 8 bytes in all
    const frame = (bench.states[0].blocks?.dut as BigScreenCard).bytes;
    expect(frame.slice(64, 72)).toEqual([1, 2, 3, 4, 0, 0, 0, 0]);
    idle();
    expect(foldBlockState(node, bench.states[1].modules.dut)).toEqual(bench.states[0].blocks?.dut);
  });
});
