import { describe, expect, it } from "vitest";
import {
  type Bit,
  CMOS_GATES,
  cmosStages,
  cmosState,
  describeCmos,
  explainCmos,
  gateTruth,
  truthRows,
} from "./cmosGates";
import { gateBlueprint } from "./logic";

describe("CMOS gates", () => {
  it("match their truth tables for every input", () => {
    for (const gate of CMOS_GATES)
      for (const { a, b, y } of truthRows(gate)) {
        const state = cmosState(gate, a, b);
        expect(state.output, `${gate} ${a}${b}`).toBe(y);
        expect(gateTruth(gate, a, b)).toBe(y);
      }
  });

  it("let exactly one network conduct in every stage, so no output floats or shorts", () => {
    for (const gate of CMOS_GATES)
      for (const { a, b } of truthRows(gate)) {
        const state = cmosState(gate, a, b);
        expect(state.short, `${gate} ${a}${b}`).toBe(false);
        for (const stage of state.stages) {
          expect(stage.pullUp !== stage.pullDown, `${gate} ${a}${b} ${stage.kind}`).toBe(true);
          expect(stage.value).toBe(stage.pullUp ? 1 : 0);
        }
      }
  });

  it("uses the transistor counts of the CMOS blueprints", () => {
    for (const gate of CMOS_GATES) {
      const transistors = cmosStages(gate).flatMap((stage) => stage.transistors);
      const blueprint = gateBlueprint(gate, "transistor").nodes;
      for (const channel of ["p", "n"] as const)
        expect(
          transistors.filter((transistor) => transistor.channel === channel).length,
          `${gate} ${channel}MOS`,
        ).toBe(blueprint.filter((node) => node.type === `${channel}mos`).length);
    }
  });

  it("marks only the transistors on the conducting path", () => {
    // NAND with A=1, B=0: pMOS B pulls Y up. nMOS A is on but leads nowhere.
    const nand = cmosState("nand", 1, 0);
    expect(nand.transistors.pB).toEqual({ on: true, path: 1 });
    expect(nand.transistors.pA).toEqual({ on: false, path: null });
    expect(nand.transistors.nA).toEqual({ on: true, path: null });
    expect(nand.transistors.nB).toEqual({ on: false, path: null });
    expect(nand.nets.m).toEqual({ value: 1, path: null });

    // NAND with both inputs 1: the two nMOS in series pull Y down through m.
    const low = cmosState("nand", 1, 1);
    expect(low.nets.m).toEqual({ value: 0, path: 0 });
    expect(low.nets.y.path).toBe(0);

    // NOR with A=0, B=1: the series pMOS chain breaks at pMOS B, so m floats from Y.
    const nor = cmosState("nor", 0, 1);
    expect(nor.transistors.pA).toEqual({ on: true, path: null });
    expect(nor.transistors.nB).toEqual({ on: true, path: 0 });
    expect(nor.nets.m.value).toBe(1);
  });

  it("drives the second stage of AND and OR from the first", () => {
    for (const [gate, a, b, x] of [
      ["and", 1, 1, 0],
      ["and", 0, 1, 1],
      ["or", 0, 0, 1],
      ["or", 1, 0, 0],
    ] as Array<["and" | "or", Bit, Bit, Bit]>) {
      const state = cmosState(gate, a, b);
      expect(state.nets.x.value).toBe(x);
      expect(state.transistors.pX.on).toBe(x === 0);
      expect(state.transistors.nX.on).toBe(x === 1);
    }
  });

  it("explains each stage in two short sentences", () => {
    expect(explainCmos(cmosState("nand", 1, 0))).toEqual([
      {
        stage: "NAND",
        conducting: "pMOS B is on, so Y connects to 1.",
        open: "nMOS B is off, so Y has no path to 0.",
      },
    ]);
    expect(explainCmos(cmosState("nor", 1, 1))[0]).toEqual({
      stage: "NOR",
      conducting: "Both nMOS are on, so Y connects to 0.",
      open: "Both pMOS are off, so Y has no path to 1.",
    });
    expect(explainCmos(cmosState("and", 1, 1)).map((item) => item.conducting)).toEqual([
      "Both nMOS are on, so X connects to 0.",
      "pMOS X is on, so Y connects to 1.",
    ]);
    expect(describeCmos(cmosState("not", 0, 0))).toBe(
      "NOT gate from 2 transistors. A is 0. On: pMOS A. Off: nMOS A. pMOS A is on, so Y connects to 1. nMOS A is off, so Y has no path to 0.",
    );
  });
});
