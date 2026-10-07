// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LogicBuilder } from "./LogicBuilder";
import { ProgramStepper } from "./ProgramStepper";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const button = (name: string | RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("the blitter in the UI", () => {
  it("is a part in the builder's palette", () => {
    render(<LogicBuilder />);
    fireEvent.click(
      within(screen.getByLabelText("Gate palette")).getByRole("button", { name: "BLITTER" }),
    );
    const saved = JSON.parse(localStorage.getItem("ricos-computer-circuits-v1")!);
    expect(saved.current.nodes.at(-1).behaviour).toBe("blitter");
  });

  it("draws the BLIT sprite row by row while the stepper's CPU runs on", () => {
    render(<ProgramStepper />);
    fireEvent.click(button("BLIT"));
    const slider = screen.getByLabelText("Execution phase") as HTMLInputElement;
    const goTo = (step: number) => fireEvent.change(slider, { target: { value: String(step) } });
    const blitter = () => screen.getByLabelText("Blitter").textContent ?? "";
    const grid = () =>
      screen.getByRole("img", { name: /^Screen rows / }).getAttribute("aria-label");
    const explanation = () => screen.getByText(/PC/, { selector: "p" }).textContent ?? "";

    expect(blitter()).toContain("IDLE");
    // Find the first phase after the CMD write: the blitter is busy and part of the heart is drawn.
    let step = 0;
    while (!blitter().includes("BUSY") && step < Number(slider.max)) goTo(++step);
    expect(blitter()).toMatch(/BUSY · SPRITE · STEP \d OF 8/);
    goTo(++step);
    expect(blitter()).toMatch(/BUSY · SPRITE/);
    expect(explanation()).toMatch(/Meanwhile the blitter keeps drawing its SPRITE/);
    expect(grid()).toMatch(/^Screen rows 66 FF/);
    expect(grid()).toMatch(/00$/);
    // At the end the blitter is idle, the heart is drawn, and the CPU counted to 3.
    goTo(Number(slider.max));
    expect(blitter()).toContain("IDLE");
    expect(grid()).toBe("Screen rows 66 FF FF FF 7E 3C 18 FF");
    expect(screen.getByText("1 2 3")).toBeTruthy();
  }, 20000);
});
