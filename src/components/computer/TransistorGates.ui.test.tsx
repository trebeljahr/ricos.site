// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { TransistorGates } from "./TransistorGates";
import { testButton } from "./testButton";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("runs the inverter through native transistor parts and switches gates", () => {
  render(<TransistorGates />);
  const output = () => screen.getByLabelText(/OUTPUT — LAMP part/);
  expect(within(output()).getByLabelText("LED on")).toBeTruthy();
  fireEvent.click(testButton("OFF", screen.getByLabelText("A — SWITCH part")));
  expect(within(output()).getByLabelText("LED off")).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Show the NAND gate"));
  expect(screen.getByLabelText("B — SWITCH part")).toBeTruthy();
  expect(within(output()).getByLabelText("LED on")).toBeTruthy();
});

it("preserves the fixed gate and legend options", () => {
  const { container } = render(<TransistorGates gate="nor" fixed legend={false} />);
  expect(screen.queryByLabelText("Show the NOT gate")).toBeNull();
  expect(container.textContent).not.toContain("PMOS conducts at 0");
  expect(screen.getByRole("application", { name: "Circuit canvas" })).toBeTruthy();
});
