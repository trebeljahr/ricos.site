// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignalEdges } from "./SignalEdges";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const meter = (name: string) =>
  screen.getByText(name, { selector: "dt" }).parentElement?.querySelector("dd");

/** Runs the demo's animation loop by hand, one frame per call. */
function stubFrames() {
  let pending: FrameRequestCallback | null = null;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pending = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    pending = null;
  });
  let now = performance.now();
  return (milliseconds: number) => {
    now += milliseconds;
    act(() => {
      pending?.(now);
    });
  };
}

describe("signal edges demo", () => {
  it("shows the clock in volts, with the ranges named and no controls", () => {
    render(<SignalEdges />);
    for (const mark of [
      "5 V",
      "3.5 V",
      "1.5 V",
      "0 V",
      "? UNDEFINED REGION",
      "HIGH = 1",
      "LOW = 0",
    ]) {
      expect(screen.getByText(mark)).toBeTruthy();
    }
    expect(meter("CLOCK")?.textContent).toBe("1 Hz");
    expect(meter("BIT NOW")?.textContent).toBe("1");
    expect(meter("VOLTAGE NOW")?.textContent).toMatch(/^[45]\.\d V$/);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/undefined/);
  });

  it("flips the bit half a tick later and moves the trace", () => {
    const frame = stubFrames();
    const { container } = render(<SignalEdges />);
    const path = () => container.querySelector("svg path[class*='trace']")?.getAttribute("d");
    const before = path();
    frame(16);
    // Half a tick on from a high, in steps the loop accepts.
    for (let step = 0; step < 10; step++) frame(50);
    expect(meter("BIT NOW")?.textContent).toBe("0");
    expect(meter("VOLTAGE NOW")?.textContent).toMatch(/^−?0\.\d V$/);
    expect(path()).not.toBe(before);
  });

  it("stands still when the reader asks for less motion", () => {
    const frame = stubFrames();
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<SignalEdges />);
    for (let step = 0; step < 10; step++) frame(50);
    expect(meter("BIT NOW")?.textContent).toBe("1");
  });
});
