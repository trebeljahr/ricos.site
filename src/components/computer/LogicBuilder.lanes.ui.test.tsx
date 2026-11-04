// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Circuit } from "../../lib/computer/logic";
import { LogicBuilder } from "./LogicBuilder";

const byte = (lanes?: Circuit["lanes"]): Circuit => ({
  name: "A byte",
  nodes: [
    { id: "a", type: "input4", x: 0, y: 0, numberValue: 5 },
    { id: "b", type: "display4", x: 500, y: 0 },
    { id: "c", type: "switch", x: 0, y: 400 },
    { id: "d", type: "lamp", x: 500, y: 400 },
  ],
  wires: [
    ...[0, 1, 2, 3].map((bit) => ({
      id: `w${bit}`,
      from: "a",
      output: bit,
      to: "b",
      input: bit,
    })),
    { id: "plain", from: "c", to: "d", input: 0 },
  ],
  ...(lanes ? { lanes } : {}),
});
const lanes: Circuit["lanes"] = [
  { id: "nibble", label: "NIBBLE", sources: [0, 1, 2, 3].map((output) => ({ node: "a", output })) },
];

const mount = (circuit: Circuit, largeBoard = false) =>
  render(
    <LogicBuilder
      initialCircuit={circuit}
      storageKey={`lanes-test-${Math.random()}`}
      largeBoard={largeBoard}
    />,
  );
const drawnWires = (container: HTMLElement) =>
  container.querySelectorAll('[aria-label="Circuit wires"] [data-wire-signal]').length;

afterEach(cleanup);

describe("lanes on the board", () => {
  it("draws a lane's wires as one band with its value", async () => {
    const { container } = mount(byte(lanes));
    await act(async () => {});
    expect(container.querySelectorAll("[data-lane]")).toHaveLength(1);
    expect(drawnWires(container)).toBe(1);
    expect(screen.getByRole("button", { name: /NIBBLE lane, 4 wires, carrying 0x5/ })).toBeTruthy();
  });

  it("selects all of a lane's wires from the keyboard", async () => {
    mount(byte(lanes));
    await act(async () => {});
    fireEvent.keyDown(screen.getByRole("button", { name: /NIBBLE lane/ }), { key: "Enter" });
    expect(screen.getByText("NIBBLE: 4 wires selected.")).toBeTruthy();
  });

  it("draws nothing new on a circuit without lanes", async () => {
    const { container } = mount(byte());
    await act(async () => {});
    expect(container.querySelectorAll("[data-lane]")).toHaveLength(0);
    expect(drawnWires(container)).toBe(5);
  });

  it("keeps every part while a large board's viewport has no size", async () => {
    const { container } = mount(byte(), true);
    await act(async () => {});
    expect(
      container.querySelectorAll('[aria-label="Circuit canvas"] > [data-node-id]'),
    ).toHaveLength(4);
    expect(drawnWires(container)).toBe(5);
  });
});
