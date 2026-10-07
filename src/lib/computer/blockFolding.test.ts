import { describe, expect, it } from "vitest";
import { simulationCircuit, syncBlockStates } from "./blockFolding";
import { datapathNode, toBits, toNumber } from "./datapathBlocks";
import { type Circuit, initialSnapshot, type Node, type Snapshot, step } from "./logic";

/** RAM with switch inputs (A, D, WE), a clock and lamps on Q. */
function ramBench(): Circuit {
  const ins = ["a0", "a1", "a2", "a3", ...Array.from({ length: 8 }, (_, b) => `d${b}`), "we"];
  return {
    name: "RAM bench",
    nodes: [
      datapathNode("ram16", "ram", 0, 0),
      ...ins.map((id): Node => ({ id, type: "switch", x: 0, y: 0 })),
      { id: "clk", type: "clock", x: 0, y: 0 },
      ...Array.from({ length: 8 }, (_, b): Node => ({ id: `q${b}`, type: "lamp", x: 0, y: 0 })),
    ],
    wires: [
      ...ins.map((id, i) => ({ id, from: id, to: "ram", input: i })),
      { id: "clk", from: "clk", to: "ram", input: 13 },
      ...Array.from({ length: 8 }, (_, b) => ({
        id: `q${b}`,
        from: "ram",
        output: b,
        to: `q${b}`,
        input: 0,
      })),
    ],
  };
}
const drive = (address: number, data: number, we: boolean) => ({
  ...Object.fromEntries(toBits(address, 4).map((bit, i) => [`a${i}`, bit])),
  ...Object.fromEntries(toBits(data, 8).map((bit, i) => [`d${i}`, bit])),
  we,
});
const read = (snapshot: Snapshot) =>
  toNumber(Array.from({ length: 8 }, (_, b) => Boolean(snapshot.values[`q${b}`])));

describe("block folding", () => {
  it("runs only unfolded blocks as gates and reuses the folded circuit", () => {
    const circuit = ramBench();
    expect(simulationCircuit(circuit, new Set())).toBe(circuit);
    const open = new Set(["ram", "ram/row3"]);
    const sim = simulationCircuit(circuit, open);
    expect(simulationCircuit(circuit, new Set(open))).toBe(sim);
    const ram = sim.nodes.find((n) => n.id === "ram")!;
    expect(ram.behaviour).toBeUndefined();
    expect(ram.module!.nodes.find((n) => n.id === "row3")!.behaviour).toBeUndefined();
    expect(ram.module!.nodes.find((n) => n.id === "row4")!.behaviour).toBe("register8");
  });

  it("keeps RAM contents while a row is unfolded two levels deep, then folded again", () => {
    const circuit = ramBench();
    let open: ReadonlySet<string> = new Set();
    let snapshot = initialSnapshot();
    const tick = (inputs: Record<string, boolean>) => {
      for (const high of [false, true])
        snapshot = step(
          simulationCircuit(circuit, open),
          syncBlockStates(circuit, snapshot, open),
          high,
          {},
          inputs,
        );
    };
    tick(drive(3, 0x5a, true));
    tick(drive(7, 0xc3, true));
    open = new Set(["ram", "ram/row3"]);
    tick(drive(3, 0, false));
    expect(read(snapshot)).toBe(0x5a);
    expect(snapshot.blocks?.ram).toBeUndefined();
    expect(snapshot.modules.ram.modules.row3.memory.cell1).toBe(true);
    tick(drive(3, 0x81, true)); // written through the row's gates
    tick(drive(7, 0, false));
    expect(read(snapshot)).toBe(0xc3);
    open = new Set();
    tick(drive(3, 0, false));
    expect(read(snapshot)).toBe(0x81);
    expect(snapshot.modules.ram).toBeUndefined();
    expect((snapshot.blocks?.ram as { bytes: number[] }).bytes.slice(0, 8)).toEqual([
      0, 0, 0, 0x81, 0, 0, 0, 0xc3,
    ]);
  });
});
