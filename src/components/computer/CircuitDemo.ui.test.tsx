// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { demoStorageKey } from "../../lib/computer/demoStorage";
import type { Circuit } from "../../lib/computer/logic";
import { EightBitAdder, FourBitAdder, FullAdder, HalfAdder } from "./Adders";
import { DecoderDemo } from "./AddressRouting";
import { CircuitDemo } from "./CircuitDemo";
import { MemoryMappedScreenDemo } from "./MemoryMappedScreenDemo";
import { testButton } from "./testButton";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("uses native adder parts and changes the sum and carry from real switches", () => {
  render(<HalfAdder />);
  expect(within(screen.getByLabelText("SUM — LAMP part")).getByLabelText("LED off")).toBeTruthy();
  expect(within(screen.getByLabelText("CARRY — LAMP part")).getByLabelText("LED on")).toBeTruthy();
  fireEvent.click(testButton("ON", screen.getByLabelText("B — SWITCH part")));
  expect(within(screen.getByLabelText("SUM — LAMP part")).getByLabelText("LED on")).toBeTruthy();
  expect(within(screen.getByLabelText("CARRY — LAMP part")).getByLabelText("LED off")).toBeTruthy();
  expect(screen.queryByLabelText(/^(SUM|CARRY) — (XOR|AND) part/)).toBeNull();
});

it("starts the boxed full adder with two unfoldable half adders", () => {
  render(<FullAdder unfolded={false} />);
  expect(screen.getByLabelText("HALF ADDER 1 — 1-bit half adder part")).toBeTruthy();
  fireEvent.click(testButton("Unfold HALF ADDER 1 in place"));
  expect(screen.getByLabelText("1-bit half adder expanded circuit")).toBeTruthy();
});

it("adds two editable bytes and keeps their controls when a bit stage unfolds", () => {
  render(<EightBitAdder />);
  const a = screen.getByLabelText("A decimal input");
  const b = screen.getByLabelText("B decimal input");
  expect(screen.queryByLabelText("A0 — SWITCH part")).toBeNull();
  fireEvent.change(a, { target: { value: "255" } });
  fireEvent.keyDown(a, { key: "Enter" });
  fireEvent.change(b, { target: { value: "1" } });
  fireEvent.keyDown(b, { key: "Enter" });
  expect(within(screen.getByLabelText("SUM0 — LAMP part")).getByLabelText("LED off")).toBeTruthy();
  expect(within(screen.getByLabelText("CARRY — LAMP part")).getByLabelText("LED on")).toBeTruthy();
  expect(screen.getByLabelText("A + B value").textContent).toBe("256100000000");
  expect(screen.queryByLabelText("CARRY IN — SWITCH part")).toBeNull();
  expect(screen.queryByRole("table")).toBeNull();
  fireEvent.click(testButton("Unfold FULL ADDER 0 in place"));
  expect(screen.getByLabelText("1-bit full adder expanded circuit")).toBeTruthy();
  expect(screen.getByLabelText("A decimal input")).toBeTruthy();
  expect(screen.getByLabelText("B decimal input")).toBeTruthy();
  expect(within(screen.getByLabelText("CARRY — LAMP part")).getByLabelText("LED on")).toBeTruthy();
});

it("adds two 4-bit numbers and shows the five-bit total on lamps and a display", () => {
  render(<FourBitAdder />);
  expect(screen.getByLabelText("A + B value").textContent).toBe("1401110");
  fireEvent.click(screen.getByRole("button", { name: "Toggle bit 3 of A" }));
  expect(screen.getByLabelText("A + B value").textContent).toBe("2210110");
  expect(within(screen.getByLabelText("SUM2 — LAMP part")).getByLabelText("LED on")).toBeTruthy();
  expect(screen.getByLabelText("A + B — 5-BIT DISPLAY part")).toBeTruthy();
});

it("unfolds an input to its switches, display and outputs, and the switches change the sum", () => {
  render(<FourBitAdder />);
  expect(screen.queryByLabelText("A0 — SWITCH part")).toBeNull();
  fireEvent.click(testButton("Unfold A in place"));
  expect(screen.getByLabelText("4-bit input expanded circuit")).toBeTruthy();
  for (const bit of [0, 1, 2, 3]) {
    expect(screen.getByLabelText(`A${bit} — SWITCH part`)).toBeTruthy();
    expect(screen.getByLabelText(`Wire to output A${bit}`)).toBeTruthy();
  }
  expect(screen.getByLabelText("A value").textContent).toBe("50101");
  expect(screen.getByLabelText("A + B value").textContent).toBe("1401110");
  fireEvent.click(testButton("ON", screen.getByLabelText("A0 — SWITCH part")));
  expect(screen.getByLabelText("A value").textContent).toBe("40100");
  expect(screen.getByLabelText("A + B value").textContent).toBe("1301101");
  fireEvent.click(testButton("Refold box"));
  expect(screen.queryByLabelText("A0 — SWITCH part")).toBeNull();
  expect((screen.getByLabelText("A decimal input") as HTMLInputElement).value).toBe("4");
  expect(screen.getByLabelText("A + B value").textContent).toBe("1301101");
});

it("reads 255 + 255 as 510 with the eight-bit inputs folded or open", () => {
  render(<EightBitAdder />);
  for (const name of ["A", "B"]) {
    const input = screen.getByLabelText(`${name} decimal input`);
    fireEvent.change(input, { target: { value: "255" } });
    fireEvent.keyDown(input, { key: "Enter" });
  }
  expect(screen.getByLabelText("A + B value").textContent).toBe("510111111110");
  fireEvent.click(testButton("Unfold B in place"));
  expect(screen.getByLabelText("A + B value").textContent).toBe("510111111110");
  expect(screen.getByLabelText("B value").textContent).toBe("25511111111");
});

it("opens a decoder's modules down to its gates, and stops there", () => {
  render(<DecoderDemo />);
  expect(screen.getAllByLabelText(/expanded circuit$/).length).toBe(2);
  expect(screen.queryByLabelText(/from CMOS transistors expanded circuit$/)).toBeNull();
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
  // About 8s on an idle machine and 39s at a load average of 180.
}, 60000);

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
