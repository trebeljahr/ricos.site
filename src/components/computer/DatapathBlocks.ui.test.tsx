// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { datapathNode } from "../../lib/computer/datapathBlocks";
import type { Circuit } from "../../lib/computer/logic";
import { LogicBuilder } from "./LogicBuilder";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

/** An 8-bit input and a LOAD switch feeding a register8 block, read by an ACC probe. */
function registerBench(): Circuit {
  const range = Array.from({ length: 8 }, (_, bit) => bit);
  return {
    name: "Register bench",
    nodes: [
      { id: "data", type: "input8", x: 40, y: 40, numberValue: 0xa5, label: "DATA" },
      { id: "load", type: "switch", x: 40, y: 300, value: true, label: "LOAD" },
      { id: "clk", type: "clock", x: 40, y: 420 },
      datapathNode("register8", "reg", 360, 40),
      { id: "acc", type: "display8", x: 800, y: 40, probe: "ACC" },
    ],
    wires: [
      ...range.map((bit) => ({ id: `d${bit}`, from: "data", output: bit, to: "reg", input: bit })),
      { id: "load", from: "load", to: "reg", input: 8 },
      { id: "clk", from: "clk", to: "reg", input: 9 },
      ...range.map((bit) => ({ id: `q${bit}`, from: "reg", output: bit, to: "acc", input: bit })),
    ],
  };
}

const button = (name: string | RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;
const acc = () => screen.getByLabelText("ACC probe value").textContent ?? "";
const cycle = () => {
  fireEvent.click(button("Step ½ cycle"));
  fireEvent.click(button("Step ½ cycle"));
};
const flipFlopBit = (bit: number) =>
  screen.getByRole("group", { name: new RegExp(`^BIT ${bit} — `) }).textContent ?? "";

describe("datapath blocks in the builder", () => {
  it("lists the CPU blocks in the parts menu and adds them as blocks", () => {
    render(<LogicBuilder />);
    const parts = screen.getByLabelText("Gate palette");
    for (const label of [
      "8-BIT REGISTER",
      "PROGRAM COUNTER",
      "8-BIT ALU",
      "256-BYTE ROM",
      "16-BYTE RAM",
      "16-ENTRY STACK",
    ])
      expect(within(parts).getByRole("button", { name: label })).toBeTruthy();
    fireEvent.click(within(parts).getByRole("button", { name: "8-BIT ALU" }));
    const saved = JSON.parse(localStorage.getItem("ricos-computer-circuits-v1")!);
    expect(saved.current.nodes.at(-1).behaviour).toBe("alu8");
  });

  it("keeps the stored value across unfold, fold, and entering the block", () => {
    localStorage.setItem(
      "ricos-computer-circuits-v1",
      JSON.stringify({ current: registerBench(), saved: {} }),
    );
    render(<LogicBuilder />);
    cycle();
    expect(acc()).toContain("165");
    // Stop loading and change the input: only the stored value can show 165 now.
    fireEvent.click(button("ON"));
    fireEvent.click(button("Toggle bit 0 of DATA"));
    cycle();
    expect(acc()).toContain("165");

    // Unfolded, the gates run and their flip-flops start from the stored value.
    fireEvent.click(button("Unfold 8-BIT REGISTER in place"));
    expect(flipFlopBit(0)).toMatch(/1\s*$/);
    expect(flipFlopBit(1)).toMatch(/0\s*$/);
    cycle();
    expect(acc()).toContain("165");
    // Load 164 through the gates, then fold: the block takes the gates' value.
    fireEvent.click(button("OFF"));
    cycle();
    fireEvent.click(button("ON"));
    expect(acc()).toContain("164");
    expect(flipFlopBit(0)).toMatch(/0\s*$/);
    fireEvent.click(button("Refold box"));
    cycle();
    expect(acc()).toContain("164");

    // Entering the block as its own level shows the same bits, and Back keeps them.
    fireEvent.click(button(/^Enter 8-BIT REGISTER/));
    expect(screen.getAllByRole("img", { name: "LED on" })).toHaveLength(3); // 164 = 1010 0100
    fireEvent.click(button("← Back"));
    cycle();
    expect(acc()).toContain("164");
  }, 20000);
});
