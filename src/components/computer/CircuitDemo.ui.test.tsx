// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { demoStorageKey } from "../../lib/computer/demoStorage";
import type { Circuit } from "../../lib/computer/logic";
import { FullAdder, HalfAdder } from "./Adders";
import { CircuitDemo } from "./CircuitDemo";
import { MemoryMappedScreenDemo } from "./MemoryMappedScreenDemo";
import { testButton } from "./testButton";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("uses native adder parts and changes the sum and carry from real switches", () => {
  render(<HalfAdder />);
  fireEvent.click(testButton("OFF", screen.getByLabelText("B — SWITCH part")));
  expect(within(screen.getByLabelText("SUM — LAMP part")).getByLabelText("LED off")).toBeTruthy();
  expect(within(screen.getByLabelText("CARRY — LAMP part")).getByLabelText("LED on")).toBeTruthy();
});

it("starts the boxed full adder with two unfoldable half adders", () => {
  render(<FullAdder unfolded={false} />);
  expect(screen.getByLabelText("HALF ADDER 1 — 1-bit half adder part")).toBeTruthy();
  fireEvent.click(testButton("Unfold HALF ADDER 1 in place"));
  expect(screen.getByLabelText("1-bit half adder expanded circuit")).toBeTruthy();
});

it("stores into the native screen through the CPU address decoder", () => {
  render(<MemoryMappedScreenDemo />);
  const data = screen.getByLabelText("DATA decimal input");
  fireEvent.change(data, { target: { value: "255" } });
  fireEvent.keyDown(data, { key: "Enter" });
  fireEvent.click(testButton("OFF", screen.getByLabelText("WRITE ENABLE — SWITCH part")));
  fireEvent.click(testButton("Step ½ cycle"));
  expect(screen.getByLabelText("SCREEN (F0–F7) rows FF 00 00 00 00 00 00 00")).toBeTruthy();
  fireEvent.click(testButton("Unfold SCREEN (F0–F7) in place"));
  expect(screen.getByLabelText("8×8 screen expanded circuit")).toBeTruthy();
});

it("restores unfinished demo edits in separate slots without touching the saved lab", () => {
  localStorage.setItem("ricos-computer-circuits-v1", "existing lab");
  const makeCircuit = (): Circuit => ({
    name: "Demo",
    nodes: [{ id: "in", type: "switch", x: 0, y: 0 }],
    wires: [],
  });
  const { unmount } = render(<CircuitDemo makeCircuit={makeCircuit} label="First demo" />);
  fireEvent.click(screen.getByTitle("Drag NAND onto canvas or click to add"));
  const saved = JSON.parse(localStorage.getItem(demoStorageKey("First demo", "Demo"))!);
  expect(saved.current.nodes).toHaveLength(2);
  unmount();
  const second = render(<CircuitDemo makeCircuit={makeCircuit} label="Second demo" />);
  expect(screen.queryByLabelText("NAND — NAND part")).toBeNull();
  second.unmount();
  render(<CircuitDemo makeCircuit={makeCircuit} label="First demo" />);
  expect(screen.getByLabelText("NAND — NAND part")).toBeTruthy();
  expect(localStorage.getItem("ricos-computer-circuits-v1")).toBe("existing lab");
});
