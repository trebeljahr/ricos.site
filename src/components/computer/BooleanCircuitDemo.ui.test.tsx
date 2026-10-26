// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { booleanSelectorDemo } from "src/lib/computer/demoCircuits";
import { demoStorageKey } from "src/lib/computer/demoStorage";
import { afterEach, beforeEach, expect, it } from "vitest";
import { BooleanCircuitDemo } from "./BooleanCircuitDemo";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

it("reads every input combination from the editable circuit and shows the selected value in the expression", () => {
  render(<BooleanCircuitDemo />);
  const set = (name: string, value: boolean) => {
    const input = within(screen.getByLabelText(`${name} — SWITCH part`)).getByRole("button", {
      name: /^(ON|OFF)$/,
    });
    if ((input.getAttribute("aria-pressed") === "true") !== value) fireEvent.click(input);
  };
  for (const s of [false, true])
    for (const a of [false, true])
      for (const b of [false, true]) {
        set("S", s);
        set("A", a);
        set("B", b);
        const expected = Number(s ? b : a);
        expect(screen.getByLabelText("Expression with current inputs").textContent).toBe(
          `${Number(!s)} · ${Number(a)} + ${Number(s)} · ${Number(b)} = ${expected}`,
        );
        expect(screen.getByLabelText("Expression and circuit comparison").textContent).toContain(
          `Circuit Y = ${expected}. Same output for these inputs.`,
        );
      }
});

it("compares the actual saved wiring with the expression instead of calculating the circuit output in the lesson", () => {
  const circuit = booleanSelectorDemo();
  circuit.wires = circuit.wires.filter((wire) => wire.to !== "out");
  localStorage.setItem(
    demoStorageKey("Boolean expression and matching circuit", circuit.name),
    JSON.stringify({ current: circuit, saved: {} }),
  );
  render(<BooleanCircuitDemo />);
  expect(screen.getByLabelText("Expression with current inputs").textContent).toBe(
    "1 · 1 + 0 · 0 = 1",
  );
  expect(screen.getByLabelText("Expression and circuit comparison").textContent).toBe(
    "Circuit Y = 0. Outputs differ for these inputs.",
  );
  expect(localStorage.getItem("ricos-computer-circuits-v1")).toBeNull();
});
