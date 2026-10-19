// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import {
  bcdSegmentDemo,
  decimalSegmentDemo,
  rawSegmentDemo,
  SEGMENTS,
  segmentBits,
} from "../../lib/computer/sevenSegment";
import { LogicBuilder } from "./LogicBuilder";
import { testButton } from "./testButton";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(cleanup);
const bits = (label: string) =>
  Array.from(
    screen.getByLabelText(`${label} active-high segments`).querySelectorAll("[data-on]"),
  ).map((el) => el.getAttribute("data-on") === "true");
it("each raw switch controls its own labeled visible bar", () => {
  render(<LogicBuilder storageKey={null} initialCircuit={rawSegmentDemo()} />);
  SEGMENTS.forEach((s, index) => {
    const part = screen.getByLabelText(`${s} — SWITCH part`);
    fireEvent.click(testButton("OFF", part));
    expect(bits("RAW · 1 lights bar")).toEqual(SEGMENTS.map((_, i) => i <= index));
    expect(testButton(`Connect to RAW · 1 lights bar ${s}`)).toBeTruthy();
  });
}, 15000);
it("numeric BCD and invalid blank keep bar mappings", () => {
  render(<LogicBuilder storageKey={null} initialCircuit={bcdSegmentDemo()} />);
  const input = screen.getByLabelText("BCD 0–9 · 10–15 blank decimal input");
  for (const n of [0, 9, 10, 15, 7]) {
    fireEvent.change(input, { target: { value: String(n) } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(bits("a–g · active high")).toEqual(segmentBits(n));
  }
});
it("four digits keep per-digit wiring and reject source overflow", () => {
  const digits = 4;
  render(<LogicBuilder storageKey={null} initialCircuit={decimalSegmentDemo(digits, 14)} />);
  const input = screen.getByLabelText("UNSIGNED · 0–16383 decimal input");
  for (const n of [99, 10000]) {
    fireEvent.change(input, { target: { value: String(n) } });
    fireEvent.keyDown(input, { key: "Enter" });
    const expected = Array.from({ length: digits }, (_, i) => digits - i - 1).flatMap((d) =>
      segmentBits(Math.floor(n / 10 ** d) % 10),
    );
    expect(bits("DECIMAL · leading zeroes")).toEqual(expected);
    expect(
      within(screen.getByLabelText("OVERFLOW — LAMP part")).getByLabelText(
        n >= 10 ** digits ? "LED on" : "LED off",
      ),
    ).toBeTruthy();
  }
  fireEvent.change(input, { target: { value: "16384" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getAllByLabelText(/Connect to DECIMAL · leading zeroes/)).toHaveLength(digits * 4);
});

it("raw four-digit pin banks reveal each of 28 connections without stacking wires", () => {
  render(
    <LogicBuilder
      storageKey={null}
      initialCircuit={{
        name: "Raw bank test",
        nodes: [{ id: "raw", type: "sevensegment", digits: 4, label: "RAW BANKS", x: 40, y: 40 }],
        wires: [],
      }}
    />,
  );
  for (const place of ["units", "tens", "hundreds", "thousands"]) {
    fireEvent.click(testButton(`${place} a–g`));
    expect(screen.getAllByLabelText(/Connect to RAW BANKS/)).toHaveLength(7);
    for (const s of SEGMENTS) expect(testButton(`Connect to RAW BANKS ${place} ${s}`)).toBeTruthy();
  }
}, 15000);

it("wires the chosen raw bank and preserves the connection when banks change", () => {
  render(
    <LogicBuilder
      storageKey={null}
      initialCircuit={{
        name: "Pin wiring",
        nodes: [
          { id: "source", type: "switch", label: "SOURCE", x: 40, y: 40, value: true },
          { id: "raw", type: "sevensegment", digits: 4, label: "RAW BANKS", x: 300, y: 40 },
        ],
        wires: [],
      }}
    />,
  );
  fireEvent.click(testButton("thousands a–g"));
  fireEvent.click(testButton("Wire from SOURCE Output"));
  fireEvent.click(testButton("Connect to RAW BANKS thousands b"));
  expect(bits("RAW BANKS")).toEqual(Array.from({ length: 28 }, (_, i) => i === 1));
  fireEvent.click(testButton("units a–g"));
  expect(bits("RAW BANKS")).toEqual(Array.from({ length: 28 }, (_, i) => i === 1));
  fireEvent.click(testButton("thousands a–g"));
  expect(testButton(/Select wire from SOURCE Output to RAW BANKS thousands b/)).toBeTruthy();
});
