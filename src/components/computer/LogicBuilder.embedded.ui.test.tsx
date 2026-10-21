// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ComputerEmbedContext } from "./ComputerEmbedContext";
import { LogicBuilder } from "./LogicBuilder";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

it("lets chapter wheel scrolling pass through but retains modifier zoom", () => {
  const { container } = render(<LogicBuilder embedded storageKey={null} />);
  expect(screen.queryByRole("link", { name: /ALL COMPUTER DEMOS/ })).toBeNull();
  expect(container.querySelector('[data-embedded="true"]')).toBeTruthy();
  const canvas = screen.getByRole("application", { name: "Circuit canvas" });
  const viewport = canvas.parentElement!.parentElement!;
  const controls = screen.getByRole("toolbar", { name: "Canvas view controls" });
  const before = controls.textContent;
  const ordinary = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 120 });
  act(() => viewport.dispatchEvent(ordinary));
  expect(ordinary.defaultPrevented).toBe(false);
  expect(controls.textContent).toBe(before);
  const pinch = new WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    deltaY: -120,
    ctrlKey: true,
  });
  act(() => viewport.dispatchEvent(pinch));
  expect(pinch.defaultPrevented).toBe(true);
  expect(controls.textContent).not.toBe(before);
});

it("inherits chapter embedding while an explicit standalone board retains its navigation and wheel behavior", () => {
  const { rerender } = render(
    <ComputerEmbedContext.Provider value={true}>
      <LogicBuilder storageKey={null} />
    </ComputerEmbedContext.Provider>,
  );
  expect(screen.queryByRole("link", { name: /ALL COMPUTER DEMOS/ })).toBeNull();
  rerender(
    <ComputerEmbedContext.Provider value={true}>
      <LogicBuilder embedded={false} storageKey={null} />
    </ComputerEmbedContext.Provider>,
  );
  expect(screen.getByRole("link", { name: /ALL COMPUTER DEMOS/ })).toBeTruthy();
  const canvas = screen.getByRole("application", { name: "Circuit canvas" });
  const wheel = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 120 });
  act(() => canvas.parentElement!.parentElement!.dispatchEvent(wheel));
  expect(wheel.defaultPrevented).toBe(true);
});
