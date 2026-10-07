// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { blankFrame, paint, SCREEN_SIZES } from "../../lib/computer/video";
import { LogicBuilder } from "./LogicBuilder";
import { ProgramStepper } from "./ProgramStepper";
import { ScreenGrid } from "./ScreenGrid";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("sized screen grids", () => {
  it("keeps the 8×8 label and draws a 16×16 frame pixel by pixel", () => {
    render(<ScreenGrid rows={[1, 0, 0, 0, 0, 0, 0, 128]} label="Screen" />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Screen rows 01 00 00 00 00 00 00 80",
    );
    cleanup();
    const size = SCREEN_SIZES["16×16"];
    const frame = paint(paint(blankFrame(size), 9, 1, true, size), 15, 15, true, size);
    render(<ScreenGrid rows={frame} size={size} label="Big" beam={{ x: 9, y: 1 }} />);
    const grid = screen.getByRole("img");
    expect(grid.getAttribute("aria-label")).toBe("Big 16×16, 2 of 256 pixels lit, beam at 9, 1");
    expect(grid.querySelectorAll("[data-x]")).toHaveLength(256);
    const lit = Array.from(grid.querySelectorAll("[data-lit=true]")).map(
      (pixel) => `${pixel.getAttribute("data-x")},${pixel.getAttribute("data-y")}`,
    );
    expect(lit).toEqual(["9,1", "15,15"]);
    expect(grid.querySelector("[data-beam]")?.getAttribute("data-x")).toBe("9");
  });

  it("draws 512×512 on a canvas instead of 262,144 elements", () => {
    const size = SCREEN_SIZES["512×512"];
    render(
      <ScreenGrid rows={paint(blankFrame(size), 1, 1, true, size)} size={size} label="Huge" />,
    );
    const canvas = screen.getByRole("img");
    expect(canvas.tagName).toBe("CANVAS");
    expect(canvas.getAttribute("aria-label")).toBe("Huge 512×512, 1 of 262144 pixels lit");
  });

  it("offers the 16×16 and 32×32 screens in the builder and draws them as grids", () => {
    render(<LogicBuilder />);
    const parts = screen.getByLabelText("Gate palette");
    for (const label of ["16×16 SCREEN", "32×32 SCANOUT", "16×16 MONITOR"])
      expect(within(parts).getByRole("button", { name: label })).toBeTruthy();
    fireEvent.click(within(parts).getByRole("button", { name: "32×32 SCREEN" }));
    expect(
      screen.getByRole("img", { name: /^32×32 SCREEN 32×32, 0 of 1024 pixels lit/ }),
    ).toBeTruthy();
  }, 20000);

  it("shows the BANKS program filling the big screen tile by tile", () => {
    render(<ProgramStepper />);
    fireEvent.click(screen.getByRole("button", { name: "BANKS" }));
    const slider = screen.getByLabelText("Execution phase") as HTMLInputElement;
    const big = () =>
      screen.getByRole("img", { name: /^Big screen 32×32/ }).getAttribute("aria-label");
    expect(big()).toBe("Big screen 32×32, 0 of 1024 pixels lit");
    fireEvent.change(slider, { target: { value: slider.max } });
    // Four smileys of 26 lit pixels each.
    expect(big()).toBe("Big screen 32×32, 104 of 1024 pixels lit");
    expect(screen.getByLabelText("Bank").textContent).toContain("BANK 15");
  }, 20000);
});
