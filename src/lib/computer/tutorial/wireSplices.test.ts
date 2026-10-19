import { describe, expect, it } from "vitest";
import { splitWire } from "../wireEditing";
import { withoutWireSplices } from "../wireTopology";
import { circuitStats } from "./analysis";
import { gradeLevel, gradePassed } from "./grade";
import { levelStart } from "./kit";
import { cmosNotLevel, GATE_LEVELS } from "./levels/gates";
import { matchReference, nextAction } from "./matcher";
import { PartCatalog } from "./parts";

describe("tutorial wire splices", () => {
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
