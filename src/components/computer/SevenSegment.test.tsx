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
    const part = screen.getByRole("group", { name: `${s} — SWITCH part` });
    fireEvent.click(within(part).getByRole("button", { name: "OFF" }));
    expect(bits("RAW · 1 lights bar")).toEqual(SEGMENTS.map((_, i) => i <= index));
    expect(screen.getByRole("button", { name: `Connect to RAW · 1 lights bar ${s}` })).toBeTruthy();
  });
});
it("numeric BCD, invalid blank, undo, and fold/unfold keep bar mappings", () => {
  render(<LogicBuilder storageKey={null} initialCircuit={bcdSegmentDemo()} />);
  const input = screen.getByLabelText("BCD 0–9 · 10–15 blank decimal input");
  for (const n of [0, 9, 10, 15, 7]) {
    fireEvent.change(input, { target: { value: String(n) } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(bits("a–g · active high")).toEqual(segmentBits(n));
  }
  fireEvent.click(screen.getByRole("button", { name: /^Unfold BCD to seven segments in place/ }));
  expect(bits("a–g · active high")).toEqual(segmentBits(7));
  fireEvent.click(screen.getByRole("button", { name: "Refold box" }));
  expect(bits("a–g · active high")).toEqual(segmentBits(7));
  fireEvent.click(screen.getByRole("button", { name: /^Undo/ }));
  expect(bits("a–g · active high")).toEqual(segmentBits(7));
});
it.each([
  1, 2, 3, 4,
] as const)("%i digits retain clear per-digit labels and reject source overflow", (digits) => {
  render(<LogicBuilder storageKey={null} initialCircuit={decimalSegmentDemo(digits, 14)} />);
  const input = screen.getByLabelText("UNSIGNED · 0–16383 decimal input");
  for (const n of [9, 10, 99, 100, 255, 9999, 10000, 16383]) {
    fireEvent.change(input, { target: { value: String(n) } });
    fireEvent.keyDown(input, { key: "Enter" });
    const expected = Array.from({ length: digits }, (_, i) => digits - i - 1).flatMap((d) =>
      segmentBits(Math.floor(n / 10 ** d) % 10),
    );
    expect(bits("DECIMAL · leading zeroes")).toEqual(expected);
    expect(
      within(screen.getByRole("group", { name: "OVERFLOW — LAMP part" })).getByLabelText(
        n >= 10 ** digits ? "LED on" : "LED off",
      ),
    ).toBeTruthy();
  }
  fireEvent.change(input, { target: { value: "16384" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(
    screen.getAllByRole("button", { name: /Connect to DECIMAL · leading zeroes/ }),
  ).toHaveLength(digits * 4);
  expect(
    Array.from(
      screen
        .getByLabelText("DECIMAL · leading zeroes active-high segments")
        .querySelectorAll("svg"),
    ).map((el) => el.getAttribute("aria-label")),
  ).toEqual(
    ["units", "tens", "hundreds", "thousands"]
      .slice(0, digits)
      .reverse()
      .map((p) => `${p} segment map`),
  );
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
    fireEvent.click(screen.getByRole("button", { name: `${place} a–g` }));
    expect(screen.getAllByRole("button", { name: /Connect to RAW BANKS/ })).toHaveLength(7);
    for (const s of SEGMENTS)
      expect(
        screen.getByRole("button", { name: `Connect to RAW BANKS ${place} ${s}` }),
      ).toBeTruthy();
  }
});

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
  fireEvent.click(screen.getByRole("button", { name: "thousands a–g" }));
  fireEvent.click(screen.getByRole("button", { name: "Wire from SOURCE Output" }));
  fireEvent.click(screen.getByRole("button", { name: "Connect to RAW BANKS thousands b" }));
  expect(bits("RAW BANKS")).toEqual(Array.from({ length: 28 }, (_, i) => i === 1));
  fireEvent.click(screen.getByRole("button", { name: "units a–g" }));
  expect(bits("RAW BANKS")).toEqual(Array.from({ length: 28 }, (_, i) => i === 1));
  fireEvent.click(screen.getByRole("button", { name: "thousands a–g" }));
  expect(
    screen.getByRole("button", { name: /Select wire from SOURCE Output to RAW BANKS thousands b/ }),
  ).toBeTruthy();
});
