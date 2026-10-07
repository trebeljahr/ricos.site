// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CPU_PRESETS } from "../../lib/computer/cpuPreset";
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
      "8×8 SCREEN",
      "DUAL-PORT SCREEN",
      "SCANOUT",
      "8×8 MONITOR",
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

  it("draws a folded screen as an 8×8 grid that follows ticks, scrubbing and folding", () => {
    const range = Array.from({ length: 8 }, (_, bit) => bit);
    const bench: Circuit = {
      name: "Screen bench",
      nodes: [
        { id: "row", type: "input4", x: 40, y: 40, numberValue: 2, label: "ROW" },
        { id: "data", type: "input8", x: 40, y: 240, numberValue: 0xa5, label: "DATA" },
        { id: "we", type: "switch", x: 40, y: 500, value: true, label: "WE" },
        { id: "clk", type: "clock", x: 40, y: 620 },
        datapathNode("screen8x8", "lcd", 420, 40),
      ],
      wires: [
        ...range
          .slice(0, 3)
          .map((bit) => ({ id: `a${bit}`, from: "row", output: bit, to: "lcd", input: bit })),
        ...range.map((bit) => ({
          id: `d${bit}`,
          from: "data",
          output: bit,
          to: "lcd",
          input: 3 + bit,
        })),
        { id: "we", from: "we", to: "lcd", input: 11 },
        { id: "clk", from: "clk", to: "lcd", input: 12 },
      ],
    };
    localStorage.setItem(
      "ricos-computer-circuits-v1",
      JSON.stringify({ current: bench, saved: {} }),
    );
    render(<LogicBuilder />);
    const grid = () => screen.queryByRole("img", { name: /^8×8 SCREEN rows / });
    const lit = () =>
      Array.from(grid()!.querySelectorAll("[data-lit=true]")).map(
        (pixel) => `${pixel.getAttribute("data-x")},${pixel.getAttribute("data-y")}`,
      );
    expect(grid()!.getAttribute("aria-label")).toBe("8×8 SCREEN rows 00 00 00 00 00 00 00 00");
    expect(grid()!.querySelectorAll("[data-x]")).toHaveLength(64);

    cycle();
    expect(grid()!.getAttribute("aria-label")).toBe("8×8 SCREEN rows 00 00 A5 00 00 00 00 00");
    expect(lit()).toEqual(["0,2", "2,2", "5,2", "7,2"]); // A5 = 1010 0101, bit 0 is x = 0

    fireEvent.click(button("Toggle bit 0 of ROW"));
    fireEvent.click(button("Toggle bit 7 of DATA"));
    cycle();
    expect(grid()!.getAttribute("aria-label")).toBe("8×8 SCREEN rows 00 00 A5 25 00 00 00 00");

    // Stepping back through the recorded ticks redraws the grid from each frame.
    fireEvent.click(button("Back ½ cycle"));
    fireEvent.click(button("Back ½ cycle"));
    expect(grid()!.getAttribute("aria-label")).toBe("8×8 SCREEN rows 00 00 A5 00 00 00 00 00");
    fireEvent.click(button("Step ½ cycle"));
    fireEvent.click(button("Step ½ cycle"));
    expect(grid()!.getAttribute("aria-label")).toBe("8×8 SCREEN rows 00 00 A5 25 00 00 00 00");

    // Unfolded, the register rows replace the grid; folding brings the same pixels back.
    fireEvent.click(button("Unfold 8×8 SCREEN in place"));
    expect(grid()).toBeNull();
    expect(screen.getByRole("group", { name: /^ROW 3 — 8-bit register part/ })).toBeTruthy();
    fireEvent.click(button("Refold box"));
    expect(grid()!.getAttribute("aria-label")).toBe("8×8 SCREEN rows 00 00 A5 25 00 00 00 00");
  }, 20000);

  it("draws the monitor's beam and paints a written row only as the beam passes it", () => {
    localStorage.setItem(
      "ricos-computer-circuits-v1",
      JSON.stringify({ current: CPU_PRESETS["Scanout and monitor"], saved: {} }),
    );
    render(<LogicBuilder />);
    const label = (name: string) =>
      screen.getByRole("img", { name: new RegExp(`^${name} rows `) }).getAttribute("aria-label");
    const blank = "00 00 00 00 00 00 00 00";
    expect(label("8×8 MONITOR")).toBe(`8×8 MONITOR rows ${blank}, beam at 0, 0`);

    // One cycle with WE on stores DATA (3C) in row 3 of the framebuffer at once.
    fireEvent.click(button("OFF"));
    cycle();
    fireEvent.click(button("ON"));
    expect(label("DUAL-PORT SCREEN")).toBe("DUAL-PORT SCREEN rows 00 00 00 3C 00 00 00 00");
    expect(label("8×8 MONITOR")).toBe(`8×8 MONITOR rows ${blank}, beam at 1, 0`);

    // The monitor only shows it once its beam has crossed row 3, pixel by pixel.
    for (let tick = 1; tick < 27; tick++) cycle();
    expect(label("8×8 MONITOR")).toBe("8×8 MONITOR rows 00 00 00 04 00 00 00 00, beam at 3, 3");
    const monitor = screen.getByRole("img", { name: /^8×8 MONITOR rows / });
    const beam = monitor.querySelector("[data-beam=true]");
    expect([beam?.getAttribute("data-x"), beam?.getAttribute("data-y")]).toEqual(["3", "3"]);
    for (let tick = 27; tick < 32; tick++) cycle();
    expect(label("8×8 MONITOR")).toBe("8×8 MONITOR rows 00 00 00 3C 00 00 00 00, beam at 0, 4");
  }, 60000);
});
