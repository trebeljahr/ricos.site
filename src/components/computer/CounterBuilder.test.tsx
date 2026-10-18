// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { counterDemo } from "../../lib/computer/counterCircuits";
import type { Circuit } from "../../lib/computer/logic";
import { LogicBuilder } from "./LogicBuilder";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const demo = (width: 2 | 4 | 8): Circuit => ({
  ...counterDemo(width, "up-down"),
  nodes: [...counterDemo(width, "up-down").nodes, { id: "clock", type: "clock", x: 40, y: 700 }],
});
const challenge = (circuit: Circuit) => ({ circuit, palette: [], enforce: (c: Circuit) => c });
const value = (root: HTMLElement = document.body) =>
  within(root).getByLabelText("COUNT value").querySelector("span")!.textContent;
/** Switches a button part to held mode in its properties menu. */
const holdMode = (label: string) => {
  fireEvent.contextMenu(screen.getByRole("group", { name: `${label} — BUTTON part` }), {
    clientX: 100,
    clientY: 100,
  });
  fireEvent.change(screen.getByLabelText("Button mode"), { target: { value: "held" } });
};

it.each([
  2, 4, 8,
] as const)("%i-bit UI: each paused click counts once, steps hold, fold/unfold continues", (width) => {
  render(<LogicBuilder challenge={challenge(demo(width))} />);
  const inc = screen.getByRole("button", { name: "INCREMENT pulse button" });
  fireEvent.click(inc);
  expect(value()).toBe("1");
  fireEvent.click(inc);
  expect(value()).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: "Step ½ cycle" }));
  expect(value()).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: /^Unfold .*counter in place$/ }));
  expect(value()).toBe("2");
  fireEvent.click(inc);
  expect(value()).toBe("3");
  fireEvent.click(screen.getByRole("button", { name: "Refold box" }));
  fireEvent.click(screen.getByRole("button", { name: "DECREMENT pulse button" }));
  expect(value()).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: "RESET pulse button" }));
  expect(value()).toBe("0");
});

it("running does not repeat clicks or swallow rapid pulses; held mode persists through steps", () => {
  vi.useFakeTimers();
  render(<LogicBuilder challenge={challenge(demo(4))} />);
  fireEvent.click(screen.getByRole("button", { name: "Run clock" }));
  fireEvent.click(screen.getByRole("button", { name: "INCREMENT pulse button" }));
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(value()).toBe("1");
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  holdMode("INCREMENT");
  const held = screen.getByRole("button", { name: "INCREMENT held button" });
  fireEvent.keyDown(held, { key: "Enter" });
  expect(value()).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: "Step ½ cycle" }));
  expect(value()).toBe("2");
  fireEvent.keyDown(held, { key: "Enter", repeat: true });
  expect(value()).toBe("2");
  fireEvent.blur(held);
  fireEvent.keyDown(held, { key: "Enter" });
  expect(value()).toBe("3");
});

it("numeric input follows bits in both directions; text editing preserves circuit shortcuts", () => {
  const c: Circuit = {
    name: "Numbers",
    nodes: [
      { id: "n4", type: "input4", x: 0, y: 0, numberValue: 0 },
      { id: "n8", type: "input8", x: 250, y: 0, numberValue: 0 },
    ],
    wires: [],
  };
  let current = c;
  render(
    <LogicBuilder
      challenge={{
        ...challenge(c),
        onChange: (next) => {
          current = next;
        },
      }}
    />,
  );
  const input = screen.getByRole("textbox", { name: "4-BIT INPUT decimal input" });
  fireEvent.change(input, { target: { value: "15" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(current.nodes[0].numberValue).toBe(15);
  fireEvent.click(screen.getByRole("button", { name: "Toggle bit 0 of 4-BIT INPUT" }));
  expect((input as HTMLInputElement).value).toBe("14");
  fireEvent.keyDown(input, { key: "Backspace" });
  fireEvent.keyDown(input, { key: "z", metaKey: true });
  expect(current.nodes).toHaveLength(2);
  const byte = screen.getByRole("textbox", { name: "8-BIT INPUT decimal input" });
  fireEvent.change(byte, { target: { value: "255" } });
  fireEvent.blur(byte);
  expect(current.nodes[1].numberValue).toBe(255);
  fireEvent.change(byte, { target: { value: "256" } });
  fireEvent.keyDown(byte, { key: "Enter" });
  expect(current.nodes[1].numberValue).toBe(255);
});

it("manual events belong to the activated builder only", () => {
  const { container } = render(
    <>
      <LogicBuilder challenge={challenge(demo(2))} />
      <LogicBuilder challenge={challenge(demo(2))} />
    </>,
  );
  const roots = container.querySelectorAll<HTMLElement>("[data-logic-builder]");
  fireEvent.click(within(roots[0]).getByRole("button", { name: "INCREMENT pulse button" }));
  expect(value(roots[0])).toBe("1");
  expect(value(roots[1])).toBe("0");
});

it("undoing held mode releases its transient signal and redo keeps the configuration", () => {
  render(<LogicBuilder challenge={challenge(demo(4))} />);
  holdMode("INCREMENT");
  fireEvent.keyDown(screen.getByRole("button", { name: "INCREMENT held button" }), {
    key: "Enter",
  });
  expect(value()).toBe("1");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.getByRole("button", { name: "INCREMENT pulse button" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Step ½ cycle" }));
  expect(value()).toBe("0");
  fireEvent.click(screen.getByRole("button", { name: "Redo" }));
  expect(
    screen.getByRole("button", { name: "INCREMENT held button" }).getAttribute("aria-pressed"),
  ).toBe("false");
});
