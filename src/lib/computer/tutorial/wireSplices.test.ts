import { describe, expect, it } from "vitest";
import { connectWireEnds, splitWire, wireJoinError } from "../wireEditing";
import { withoutWireSplices } from "../wireTopology";
import { circuitStats } from "./analysis";
import { gradeLevel, gradePassed } from "./grade";
import { levelStart } from "./kit";
import { cmosNandLevel, cmosNotLevel, GATE_LEVELS } from "./levels/gates";
import { matchReference, nextAction } from "./matcher";
import { PartCatalog } from "./parts";

describe("tutorial wire splices", () => {
  it.each([
    cmosNotLevel,
    cmosNandLevel,
  ])("builds $title by dropping transistor branches onto wires, without a junction palette part", (level) => {
    const reference = level.reference!();
    let circuit = {
      ...reference,
      nodes: reference.nodes.filter((node) => node.type !== "junction"),
      wires: reference.wires.filter(
        (wire) =>
          !reference.nodes.some(
            (node) => node.type === "junction" && (wire.from === node.id || wire.to === node.id),
          ),
      ),
    };
    const resolveBranch = (id: string): string => {
      if (reference.nodes.find((node) => node.id === id)?.type !== "junction") return id;
      const inputs = reference.wires
        .filter((wire) => wire.to === id)
        .sort((a, b) => a.input - b.input);
      const left = resolveBranch(inputs[0].from),
        right = resolveBranch(inputs[1].from);
      const feed = { id: `out-${id}`, from: left, to: "out", input: 0 };
      circuit = { ...circuit, wires: [...circuit.wires.filter((wire) => wire.to !== "out"), feed] };
      const target = { wire: feed.id, point: { x: 200, y: 150 }, path: "M 100 150 L 300 150" };
      const source = { node: right, port: 0, kind: "output" as const };
      expect(wireJoinError(circuit, source, target)).toBeUndefined();
      circuit = connectWireEnds(circuit, source, target).circuit!;
      return circuit.wires.find((wire) => wire.to === "out")!.from;
    };
    resolveBranch(reference.wires.find((wire) => wire.to === "out")!.from);
    const catalog = new PartCatalog(GATE_LEVELS);
    expect(
      gradePassed(gradeLevel(circuit, level, levelStart(level).locked, catalog.allowed(level))),
    ).toBe(true);
    const junctions = circuit.nodes.filter((node) => node.type === "junction" && !node.splice);
    expect(junctions).toHaveLength(
      reference.nodes.filter((node) => node.type === "junction").length,
    );
    for (const junction of junctions)
      expect(circuit.wires.filter((wire) => wire.to === junction.id)).toHaveLength(2);
  });

  it("preserves CMOS grading, Show me and part counts", () => {
    const reference = cmosNotLevel.reference!(),
      catalog = new PartCatalog(GATE_LEVELS);
    const wire = reference.wires.find((wire) => wire.from === "a")!;
    const branched = splitWire(reference, {
      wire: wire.id,
      point: { x: 50, y: 50 },
      path: "M 0 50 L 100 50",
    })!.circuit;
    const locked = levelStart(cmosNotLevel).locked;
    expect(
      gradePassed(gradeLevel(branched, cmosNotLevel, locked, catalog.allowed(cmosNotLevel))),
    ).toBe(true);
    const match = matchReference(branched, reference, locked, catalog.gateParts);
    expect(nextAction(branched, reference, match)).toBeUndefined();
    expect(circuitStats(branched, locked)).toEqual(circuitStats(reference, locked));
    expect(withoutWireSplices(branched).nodes).toHaveLength(reference.nodes.length);
  });
});
