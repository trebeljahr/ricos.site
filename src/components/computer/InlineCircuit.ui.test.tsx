// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initialSnapshot, moduleInputs, moduleOutputs, step, validateCircuit } from "../../lib/computer/logic";
import { LogicBuilder } from "./LogicBuilder";

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); localStorage.clear(); });

describe("inline circuit unfolding", () => {
  it("keeps the board and records fold and unfold in history", () => {
    render(<LogicBuilder />);
    const board = screen.getByRole("application", { name: "Circuit canvas" });
    fireEvent.click(screen.getByRole("button", { name: "Unfold SUM in place" }));
    expect(screen.getByRole("application", { name: "Circuit canvas" })).toBe(board);
    expect(screen.getByRole("button", { name: "Fold SUM in place" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Unfold SUM in place" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByRole("button", { name: "Fold SUM in place" })).toBeTruthy();
  });

  it("expands a whole adder box one level at a time", () => {
    render(<LogicBuilder />);
    const parts = screen.getByLabelText("Gate palette");
    fireEvent.click(within(parts).getByRole("button", { name: "8-bit full adder" }));
    const adder = screen.getByRole("group", { name: /8-bit full adder.*part/i });
    fireEvent.click(within(adder).getByRole("button", { name: /Unfold .* in place/i }));
    expect(screen.getByRole("application", { name: "Circuit canvas" })).toBeTruthy();
    const expanded = screen.getByLabelText("8-bit full adder expanded circuit");
    expect(within(expanded).getByRole("button", { name: "Unfold FULL ADDER 0 in place" })).toBeTruthy();
    expect(within(expanded).queryByRole("group", { name: /SWITCH part/i })).toBeNull();
    expect(within(expanded).queryByRole("group", { name: /LAMP part/i })).toBeNull();
    expect(within(expanded).getByLabelText("8-bit full adder internal wires").querySelectorAll("[data-inline-wire]").length).toBeGreaterThan(0);
    fireEvent.click(within(adder).getAllByRole("button", { name: "Unfold one level deeper" })[0]);
    expect(within(expanded).getAllByRole("button", { name: "Unfold HALF ADDER 1 in place" }).length).toBeGreaterThan(0);
    fireEvent.click(within(adder).getAllByRole("button", { name: "Unfold one level deeper" })[0]);
    expect(within(expanded).getAllByRole("button", { name: "Unfold SUM XOR in place" }).length).toBeGreaterThan(0);
    fireEvent.click(within(adder).getAllByRole("button", { name: "Refold one level" })[0]);
    expect(within(expanded).queryAllByRole("button", { name: "Unfold SUM XOR in place" })).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(within(expanded).getAllByRole("button", { name: "Unfold SUM XOR in place" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Refold one level" })[0]);
    expect(within(expanded).queryAllByRole("button", { name: "Unfold SUM XOR in place" })).toHaveLength(0);
  }, 20000);

  it("edits boundary outputs and wires in place with undo and redo", () => {
    render(<LogicBuilder />);
    fireEvent.click(within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "8-bit full adder" }));
    const adder = screen.getByRole("group", { name: /8-bit full adder.*part/i });
    fireEvent.click(within(adder).getByRole("button", { name: /Unfold .* in place/i }));
    let expanded = screen.getByLabelText("8-bit full adder expanded circuit");
    fireEvent.click(within(expanded).getByRole("button", { name: "Add output" }));
    expanded = screen.getByLabelText("Modified 8-bit full adder expanded circuit");
    expect(screen.getByRole("button", { name: "Wire from Modified 8-bit full adder OUT 10" })).toBeTruthy();
    const wiresBefore = within(expanded).getByLabelText("Modified 8-bit full adder internal wires")
      .querySelectorAll("[data-inline-wire]").length;
    fireEvent.click(within(expanded).getByRole("button", { name: "Wire from input A0" }));
    fireEvent.click(within(expanded).getByRole("button", { name: "Wire to output OUT 10" }));
    expect(within(expanded).getByLabelText("Modified 8-bit full adder internal wires")
      .querySelectorAll("[data-inline-wire]").length).toBe(wiresBefore + 1);
    const stored = JSON.parse(localStorage.getItem("ricos-computer-circuits-v1") || "{}");
    const saved = validateCircuit(stored.current);
    const edited = saved?.nodes.find((node) => node.module?.name === "Modified 8-bit full adder")?.module;
    expect(edited).toBeTruthy();
    const input = moduleInputs(edited!)[0].id;
    const output = moduleOutputs(edited!).at(-1)!.id;
    expect(step(edited!, initialSnapshot(), false, {}, { [input]: true }).values[output]).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(within(screen.getByLabelText("Modified 8-bit full adder expanded circuit"))
      .getByRole("button", { name: "Wire to output OUT 10" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("button", { name: "Wire from Modified 8-bit full adder OUT 10" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByRole("button", { name: "Wire from Modified 8-bit full adder OUT 10" })).toBeTruthy();
  }, 15000);

  it("adds, renames, and removes a part inside an expanded gate", () => {
    render(<LogicBuilder />);
    fireEvent.click(screen.getByRole("button", { name: "Unfold SUM in place" }));
    let expanded = screen.getByLabelText(/XOR.*expanded circuit/);
    fireEvent.change(within(expanded).getByRole("combobox", { name: "Add part inside SUM" }),
      { target: { value: "nand" } });
    expanded = screen.getByLabelText(/Modified XOR.*expanded circuit/);
    let part = within(expanded).getByRole("group", { name: "NAND — NAND part" });
    fireEvent.click(within(part).getByRole("button", { name: "Edit NAND label" }));
    const label = within(part).getByRole("textbox", { name: "Label for NAND" });
    fireEvent.change(label, { target: { value: "CUSTOM NAND" } });
    fireEvent.blur(label);
    part = within(expanded).getByRole("group", { name: "CUSTOM NAND — NAND part" });
    const capture = HTMLElement.prototype.setPointerCapture;
    HTMLElement.prototype.setPointerCapture = () => {};
    fireEvent.pointerDown(part, { button: 0, pointerId: 1, clientX: 20, clientY: 20 });
    HTMLElement.prototype.setPointerCapture = capture;
    fireEvent.click(within(expanded).getByRole("button", { name: "Delete selected" }));
    expect(within(expanded).queryByRole("group", { name: "CUSTOM NAND — NAND part" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(within(screen.getByLabelText(/Modified XOR.*expanded circuit/))
      .getByRole("group", { name: "CUSTOM NAND — NAND part" })).toBeTruthy();
  });

  it("keeps edits to a deeper box in the component tree", () => {
    render(<LogicBuilder />);
    fireEvent.click(within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "8-bit full adder" }));
    fireEvent.click(screen.getByRole("button", { name: "Unfold CIRCUIT in place" }));
    fireEvent.click(screen.getByRole("button", { name: "Unfold FULL ADDER 0 in place" }));
    const fullAdder = screen.getByLabelText("1-bit full adder expanded circuit");
    fireEvent.click(within(fullAdder).getByRole("button", { name: "Add output" }));
    expect(screen.getByLabelText("Modified 1-bit full adder expanded circuit")).toBeTruthy();
    expect(screen.getByLabelText("Modified 8-bit full adder expanded circuit")).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem("ricos-computer-circuits-v1") || "{}");
    const saved = validateCircuit(stored.current);
    const outer = saved?.nodes.find((node) => node.module?.name === "Modified 8-bit full adder")?.module;
    const edited = outer?.nodes.find((node) => node.module?.name === "Modified 1-bit full adder")?.module;
    expect(moduleOutputs(edited!)).toHaveLength(3);
  }, 15000);
});

describe("circuit toolbar", () => {
  it("shows clock controls only while the sketch contains a clock", () => {
    render(<LogicBuilder />);
    expect(screen.queryByRole("group", { name: "Simulation" })).toBeNull();
    expect(screen.queryByText("CLK 0")).toBeNull();
    fireEvent.click(screen.getByTitle("Drag CLOCK onto canvas or click to add"));
    expect(screen.getByRole("group", { name: "Simulation" })).toBeTruthy();
    const status = screen.getByLabelText("Clock status");
    expect(within(status).getByText("Cycle 0")).toBeTruthy();
    expect(within(status).getByText("CLK 0")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("group", { name: "Simulation" })).toBeNull();
    expect(screen.queryByLabelText("Clock status")).toBeNull();
  });

  it("renames the sketch from the toolbar", () => {
    render(<LogicBuilder />);
    const name = screen.getByRole("textbox", { name: "Circuit name" }) as HTMLInputElement;
    fireEvent.change(name, { target: { value: "My test circuit" } });
    fireEvent.blur(name);
    expect(name.value).toBe("My test circuit");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(name.value).toBe("Half adder");
  });
});
