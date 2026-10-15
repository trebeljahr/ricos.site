// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EightBitAdder, FullAdder, HalfAdder } from "./Adders";
import { SwitchLogic } from "./SwitchLogic";
import { AdditionTable, FullAdderTable, GateTruthTable } from "./TruthTables";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const currentRow = (name: string) =>
  within(screen.getByRole("list", { name }))
    .getAllByRole("button")
    .find((row) => row.getAttribute("aria-current") === "true");

describe("truth tables", () => {
  it("marks the row of the current inputs and sets inputs from a row", () => {
    render(<GateTruthTable />);
    expect(currentRow("Truth table of AND")?.textContent).toBe("000");
    click(/^Input A: 0/);
    click(/^Input B: 0/);
    expect(currentRow("Truth table of AND")?.textContent).toBe("111");
    expect(screen.getByRole("img", { name: "Output OUT: 1" })).toBeTruthy();

    click("XOR");
    expect(currentRow("Truth table of XOR")?.textContent).toBe("110");
    click(/^A 0, B 1 gives OUT 1/);
    expect(screen.getByRole("button", { name: /^Input A: 0/ })).toBeTruthy();
  });

  it("shows two-input gates as a 2 × 2 grid and NOT as two rows", () => {
    render(<GateTruthTable gate="nand" view="grid" />);
    const grid = screen.getByRole("group", { name: "NAND as a grid" });
    expect(
      within(grid)
        .getAllByRole("button")
        .map((cell) => cell.textContent),
    ).toEqual(["1", "1", "1", "0"]);
    click("NOT");
    expect(
      within(screen.getByRole("list", { name: "Truth table of NOT" })).getAllByRole("button"),
    ).toHaveLength(2);
    expect(screen.queryByRole("group", { name: "Table layout" })).toBeNull();
  });

  it("finds the gates for SUM and CARRY", () => {
    const { container } = render(<AdditionTable />);
    expect(container.textContent).toContain("1 + 1 = 10");
    click("XOR");
    expect(container.textContent).toContain("XOR matches SUM in 4 of 4 rows and CARRY in 1 of 4.");
    click("AND");
    expect(container.textContent).toContain("AND matches SUM in 1 of 4 rows and CARRY in 4 of 4.");
  });

  it("counts the inputs that are on in the full adder table", () => {
    const { container } = render(<FullAdderTable />);
    expect(container.textContent).toContain("1 + 0 + 1 = 10");
    click(/^Input B: 0/);
    expect(container.textContent).toContain("1 + 1 + 1 = 11");
    expect(container.textContent).toContain("THREE INPUTS ARE ON");
  });
});

describe("switch logic", () => {
  it("fills in the cases tried and reveals the gate", () => {
    const { container } = render(<SwitchLogic />);
    expect(container.textContent).toContain("1 OF 4");
    click(/^Input A: 0/);
    expect(screen.getByRole("img", { name: "Output LAMP: 0" })).toBeTruthy();
    click(/^Input B: 0/);
    expect(screen.getByRole("img", { name: "Output LAMP: 1" })).toBeTruthy();
    expect(container.textContent).toContain("3 OF 4");
    click("REVEAL THE GATE");
    expect(container.textContent).toContain("Two switches in a row work like an AND gate.");

    click("SIDE BY SIDE");
    expect(container.textContent).toContain("1 OF 4");
    expect(container.textContent).not.toContain("AND gate");
    click("REVEAL THE GATE");
    expect(container.textContent).toContain("work like an OR gate");
  });
});

describe("adders", () => {
  it("adds with a half adder and a full adder", () => {
    const half = render(<HalfAdder />);
    expect(half.container.textContent).toContain("1 + 0 = 01");
    cleanup();
    const full = render(<FullAdder />);
    expect(full.container.textContent).toContain("1+1+0 = 10");
    click("BOXES");
    expect(screen.getByRole("img", { name: /^Full adder\. A 1, B 1/ })).toBeTruthy();
    click(/^Input CIN: 0/);
    expect(full.container.textContent).toContain("1+1+1 = 11");
  });

  it("ripples the carries one full adder per step", () => {
    // Only the demo's own timers: React schedules its effects with setImmediate.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { container } = render(<EightBitAdder />);
    expect(container.textContent).toContain("13 + 29 = 42");
    click("255 + 1");
    expect(container.textContent).toContain("CARRIES RIPPLING");
    for (let step = 0; step < 8; step++) act(() => vi.advanceTimersByTime(500));
    expect(container.textContent).toContain("255 + 1 = 256");
    // It starts from the carries of 13 + 29, so some are already right.
    expect(container.textContent).toMatch(/SETTLED AFTER [1-8] STEPS/);

    click("RIPPLE ON");
    click("100 + 200");
    expect(container.textContent).toContain("100 + 200 = 300");
    click(/^Full adder for bit 2:/);
    expect(screen.getByRole("region", { name: "Full adder for bit 2" })).toBeTruthy();
  });
});
