// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FRAME_TICKS, scanoutTrace, VISIBLE_TICKS } from "../../lib/computer/video";
import { compileProgram, traceTicks, VIDEO_SAMPLES } from "../../lib/computerStepper";
import { ScanoutDemo } from "./ScanoutDemo";

afterEach(cleanup);

const monitor = () =>
  screen.getByRole("img", { name: /^Monitor rows / }).getAttribute("aria-label") ?? "";
const scrub = (tick: number) =>
  fireEvent.change(screen.getByLabelText("Scrub ticks"), { target: { value: String(tick) } });
/** The tick on which the beam paints the last visible pixel of frame `frame`. */
const frameEnd = (frame: number) => frame * FRAME_TICKS + VISIBLE_TICKS - 1;

describe("scanout demo", () => {
  it("shows the beam moving one pixel per tick over the monitor", () => {
    render(<ScanoutDemo />);
    scrub(frameEnd(2) - 10);
    expect(monitor()).toMatch(/, beam at 6, 6$/);
    fireEvent.click(screen.getByRole("button", { name: "Step 1 tick" }));
    expect(monitor()).toMatch(/, beam at 7, 6$/);
    expect(
      screen.getByRole("img", { name: /^Monitor/ }).querySelector("[data-beam=true]"),
    ).toBeTruthy();
    scrub(frameEnd(2));
    expect(monitor()).toMatch(/, beam in vertical blank$/);
    expect(screen.getByLabelText("Beam").textContent).toBe("VBLANK (line 8)");
  });

  it("tears under TEARING and shows whole pictures after switching to VBLANK waits", () => {
    const frames = scanoutTrace(
      traceTicks(compileProgram(VIDEO_SAMPLES.TEARING)).map((tick) => tick.screen),
    );
    let torn = 1;
    while (new Set(frames[frameEnd(torn)].image).size === 1) torn++;
    render(<ScanoutDemo />);
    scrub(frameEnd(torn));
    expect(monitor()).toMatch(/0F/);
    expect(monitor()).toMatch(/F0/);

    fireEvent.click(screen.getByRole("button", { name: "Wait for VBLANK" }));
    for (const frame of [1, 2, 3, 4]) {
      scrub(frameEnd(frame));
      const row = frame % 2 ? "0F" : "F0";
      expect(monitor()).toBe(
        `Monitor rows ${Array(8).fill(row).join(" ")}, beam in vertical blank`,
      );
    }
  });
});
