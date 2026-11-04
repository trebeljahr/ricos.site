// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { CMOS_GATES } from "../../lib/computer/cmosGates";
import { transistorDemo } from "../../lib/computer/demoCircuits";
import { TransistorGates } from "./TransistorGates";
import { testButton } from "./testButton";

afterEach(cleanup);

const output = () => screen.getByLabelText("OUT — LAMP part");

it("runs the inverter through native transistor parts and switches gates", () => {
  render(<TransistorGates />);
  expect(within(output()).getByLabelText("LED on")).toBeTruthy();
  fireEvent.click(testButton("OFF", screen.getByLabelText("A — SWITCH part")));
  expect(within(output()).getByLabelText("LED off")).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Show the NAND gate"));
  expect(screen.getByLabelText("B — SWITCH part")).toBeTruthy();
  expect(within(output()).getByLabelText("LED on")).toBeTruthy();
});

it("offers the gates in the order of the builder", () => {
  render(<TransistorGates />);
  expect(
    within(screen.getByRole("group", { name: "Gate" }))
      .getAllByRole("button")
      .map((button) => button.textContent),
  ).toEqual(["NOT", "AND", "NAND", "OR", "NOR", "XOR", "XNOR"]);
});

it("shows conduction independently of drain level", () => {
  render(<TransistorGates gate="nand" fixed />);
  expect(screen.getAllByRole("img", { name: /NMOS ideal switch, open/ })).toHaveLength(2);
  fireEvent.click(testButton("OFF", screen.getByLabelText("A — SWITCH part")));
  fireEvent.click(testButton("OFF", screen.getByLabelText("B — SWITCH part")));
  expect(screen.getAllByRole("img", { name: /NMOS ideal switch, conducting/ })).toHaveLength(2);
  expect(within(output()).getByLabelText("LED off")).toBeTruthy();
});

it("hides the gate buttons for a fixed gate", () => {
  render(<TransistorGates gate="nor" fixed />);
  expect(screen.queryByLabelText("Show the NOT gate")).toBeNull();
  expect(screen.getByRole("application", { name: "Circuit canvas" })).toBeTruthy();
});

it.each(CMOS_GATES)("draws every transistor of %s, with its truth table beside it", (gate) => {
  render(<TransistorGates gate={gate} fixed />);
  const count = (type: string) =>
    transistorDemo(gate).nodes.filter((node) => node.type === type).length;
  expect(screen.getAllByLabelText(/^NMOS — NMOS part$/)).toHaveLength(count("nmos"));
  expect(screen.getAllByLabelText(/^PMOS — PMOS part$/)).toHaveLength(count("pmos"));
  expect(
    within(screen.getByRole("complementary", { name: "Truth table" })).getByRole("table", {
      name: `Truth table of ${gate.toUpperCase()}`,
    }),
  ).toBeTruthy();
});
