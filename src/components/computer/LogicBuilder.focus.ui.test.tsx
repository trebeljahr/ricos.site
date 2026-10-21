// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LogicBuilder } from "./LogicBuilder";
import { testButton } from "./testButton";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it.each([
  5300, -5300,
])("frames a focused device at y=%i independently of the canvas origin", (y) => {
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  render(
    <LogicBuilder
      storageKey={null}
      initialFocus={["device"]}
      initialCircuit={{
        name: "Distant device",
        nodes: [
          { id: "origin", type: "switch", x: 0, y: 0 },
          { id: "device", type: "switch", x: 3000, y },
        ],
        wires: [],
      }}
    />,
  );
  const canvas = screen.getByRole("application", { name: "Circuit canvas" });
  const viewport = canvas.parentElement!.parentElement!;
  Object.defineProperties(viewport, {
    clientWidth: { configurable: true, value: 800 },
    clientHeight: { configurable: true, value: 500 },
  });
  act(() => {
    frames.splice(0).forEach((frame) => {
      frame(0);
    });
  });
  const zoom = () =>
    Number.parseInt(
      screen.getByRole("toolbar", { name: "Canvas view controls" }).querySelector("span")!
        .textContent!,
      10,
    );
  expect(zoom()).toBeGreaterThan(100);
  fireEvent.click(testButton("Fit"));
  expect(zoom()).toBeLessThan(20);
});
