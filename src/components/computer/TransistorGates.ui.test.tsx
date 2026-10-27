// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { transistorDemo } from "../../lib/computer/demoCircuits";
import { demoStorageKey } from "../../lib/computer/demoStorage";
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

it("exposes real MOSFET terminals and shows conduction independently of drain level", () => {
  render(<TransistorGates gate="nand" fixed />);
  expect(screen.getAllByLabelText("Connect to NMOS Gate (G)", { selector: "button" })).toHaveLength(2);
  const source = screen.getAllByRole("button", { name: "Connect to NMOS Source (S)" })[0];
  expect(source.parentElement?.style.top).toBe("100%");
  const drain = screen.getAllByRole("button", { name: "Wire from NMOS Drain (D)" })[0];
  expect(drain.parentElement?.style.top).toBe("0%");
  expect(screen.getAllByRole("img", { name: /NMOS ideal switch, open/ })).toHaveLength(2);
  fireEvent.click(testButton("OFF", screen.getByLabelText("A — SWITCH part")));
  fireEvent.click(testButton("OFF", screen.getByLabelText("B — SWITCH part")));
  expect(screen.getAllByRole("img", { name: /NMOS ideal switch, conducting/ })).toHaveLength(2);
  expect(
    within(screen.getByLabelText(/OUTPUT — LAMP part/)).getByLabelText("LED off"),
  ).toBeTruthy();
});

it("preserves the fixed gate and legend options", () => {
  const { container } = render(<TransistorGates gate="nor" fixed legend={false} />);
  expect(screen.queryByLabelText("Show the NOT gate")).toBeNull();
  expect(container.textContent).not.toContain("PMOS conducts at 0");
  expect(screen.getByRole("application", { name: "Circuit canvas" })).toBeTruthy();
});

it("compacts a saved transistor demo on Arrange and restores its edits with Undo", () => {
  const saved = structuredClone(transistorDemo("not"));
  saved.nodes = saved.nodes.map((node) => ({
    ...node,
    y: node.y * 2,
    ...(node.id === "a" ? { value: true } : {}),
  }));
  saved.wires = saved.wires.map((wire) => ({ ...wire, color: "amber" as const }));
  const key = demoStorageKey("NOT from transistors", saved.name, "video-HaBMAD-Dr8M-compact-v2");
  localStorage.setItem(key, JSON.stringify({ current: saved, saved: {} }));
  render(<TransistorGates fixed />);
  const current = () => JSON.parse(localStorage.getItem(key)!).current;
  const before = current();
  fireEvent.click(screen.getByText("View", { selector: "summary" }));
  fireEvent.click(testButton("Arrange by signal flow"));
  const arranged = current();
  expect(arranged.nodes.map((node: { y: number }) => node.y)).not.toEqual(
    before.nodes.map((node: { y: number }) => node.y),
  );
  expect(arranged.nodes.find((node: { id: string }) => node.id === "a").value).toBe(true);
  expect(
    arranged.wires.map((wire: { from: string; to: string; input: number; color: string }) => [
      wire.from,
      wire.to,
      wire.input,
      wire.color,
    ]),
  ).toEqual(
    before.wires.map((wire: { from: string; to: string; input: number; color: string }) => [
      wire.from,
      wire.to,
      wire.input,
      wire.color,
    ]),
  );
  fireEvent.click(testButton("Undo"));
  expect(current()).toEqual(before);
});

it.each(["not", "and", "or", "nand", "nor", "xor", "xnor"] as const)(
  "opens the new %s circuit without overwriting an older saved attempt",
  (gate) => {
    const legacy = structuredClone(transistorDemo("nand"));
    legacy.name = transistorDemo(gate).name;
    legacy.nodes.find((node) => node.id === "a")!.label = "OLD ATTEMPT";
    const key = demoStorageKey(`${gate.toUpperCase()} from transistors`, legacy.name);
    const stored = JSON.stringify({ current: legacy, saved: {} });
    localStorage.setItem(key, stored);
    const compoundKey = demoStorageKey(
      `${gate.toUpperCase()} from transistors`,
      legacy.name,
      "compound-cmos-v1",
    );
    localStorage.setItem(compoundKey, stored);
    const videoKey = demoStorageKey(`${gate.toUpperCase()} from transistors`, legacy.name, "video-HaBMAD-Dr8M-v1");
    localStorage.setItem(videoKey, stored);
    render(<TransistorGates gate={gate} fixed />);
    expect(screen.queryByLabelText("OLD ATTEMPT — SWITCH part")).toBeNull();
    expect(screen.getAllByLabelText("Connect to NMOS Gate (G)", { selector: "button" })).toHaveLength(
      transistorDemo(gate).nodes.filter((node) => node.type === "nmos").length,
    );
    expect(screen.getAllByLabelText("Connect to PMOS Gate (G)", { selector: "button" })).toHaveLength(
      transistorDemo(gate).nodes.filter((node) => node.type === "pmos").length,
    );
    fireEvent.click(testButton("OFF", screen.getByLabelText("A — SWITCH part")));
    expect(localStorage.getItem(key)).toBe(stored);
    expect(localStorage.getItem(compoundKey)).toBe(stored);
    expect(localStorage.getItem(videoKey)).toBe(stored);
  },
);

it("keeps edits to the refreshed demo after reloading", () => {
  const first = render(<TransistorGates fixed />);
  fireEvent.click(testButton("OFF", screen.getByLabelText("A — SWITCH part")));
  first.unmount();
  render(<TransistorGates fixed />);
  expect(testButton("ON", screen.getByLabelText("A — SWITCH part"))).toBeTruthy();
  expect(within(screen.getByLabelText(/OUTPUT — LAMP part/)).getByLabelText("LED off")).toBeTruthy();
});
