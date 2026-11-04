import { describe, expect, it } from "vitest";
import { buttonCpuBoard } from "./buttonCpuBoard";
import { BUTTON_PROGRAM, buttonCpuCircuit } from "./buttonInterrupt";
import { type Circuit, initialSnapshot, step, validateCircuit } from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";
import { readProbes } from "./probes";
import { resolveLanes } from "./wireLanes";

const run = (circuit: Circuit, ticks: number, pressAt: number[]) => {
  let snapshot = step(circuit, initialSnapshot(), false);
  const log: string[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    if (pressAt.includes(tick)) {
      snapshot = step(circuit, snapshot, false, { "button-raw": true });
      snapshot = step(circuit, snapshot, false, { "button-raw": false });
    }
    snapshot = step(circuit, snapshot, true);
    snapshot = step(circuit, snapshot, false);
    log.push(
      JSON.stringify([
        readProbes(circuit, snapshot),
        snapshot.buses?.bus,
        snapshot.outputs.screen,
        snapshot.outputs.ram,
        snapshot.unstable,
      ]),
    );
  }
  return log;
};

describe("the button CPU's board", () => {
  const board = buttonCpuBoard();

  it("runs tick for tick like the CPU it folds", () => {
    const presses = [40, 400];
    expect(run(board, 700, presses)).toEqual(run(buttonCpuCircuit(BUTTON_PROGRAM), 700, presses));
  }, 120_000);

  it("has no parts on top of each other", () => {
    const overlaps: string[] = [];
    board.nodes.forEach((a, i) => {
      for (const b of board.nodes.slice(i + 1))
        if (
          a.x < b.x + nodeWidth(b) &&
          b.x < a.x + nodeWidth(a) &&
          a.y < b.y + nodeHeight(b) &&
          b.y < a.y + nodeHeight(a)
        )
          overlaps.push(`${a.id} on ${b.id}`);
    });
    expect(overlaps).toEqual([]);
  });

  it("runs its trunks and rails clear of every part", () => {
    const hits: string[] = [];
    const inPart = (x: number, y: number, node: (typeof board.nodes)[number]) =>
      x > node.x && x < node.x + nodeWidth(node) && y > node.y && y < node.y + nodeHeight(node);
    for (const lane of board.lanes ?? []) {
      if (!lane.trunkX) continue;
      const stops = lane.via ?? [];
      for (const x of lane.trunkX)
        for (const node of board.nodes)
          if (x > node.x && x < node.x + nodeWidth(node))
            hits.push(`${lane.id} trunk through ${node.id}`);
      for (const stop of stops)
        for (const node of board.nodes)
          if (inPart(stop.x, stop.y, node)) hits.push(`${lane.id} rail through ${node.id}`);
    }
    expect(hits).toEqual([]);
  });

  it("draws far fewer wires on their own", () => {
    const { tapOf } = resolveLanes(board);
    expect(board.nodes.length).toBeLessThan(110);
    expect(board.wires.length - tapOf.size).toBeLessThan(150);
  });

  it("keeps every lane's sources on real ports", () => {
    const ids = new Set(board.nodes.map((node) => node.id));
    for (const lane of board.lanes ?? [])
      for (const source of lane.sources) expect(ids.has(source.node), lane.id).toBe(true);
  });

  it("keeps its lanes through storage", () => {
    const stored = validateCircuit(JSON.parse(JSON.stringify(board)));
    expect(stored?.lanes?.map((lane) => lane.id)).toEqual(board.lanes?.map((lane) => lane.id));
  });
});
