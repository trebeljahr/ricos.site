// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compileShader, SAMPLE_SHADERS } from "../../lib/computer/shader";
import { SHADER_PRESETS } from "../../lib/computer/shaderPreset";
import { LogicBuilder } from "./LogicBuilder";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.setPointerCapture = () => {};
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const button = (name: string | RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("shader demo in the builder", () => {
  it("draws the checkerboard on the screen, one row per END", () => {
    localStorage.setItem(
      "ricos-computer-circuits-v1",
      JSON.stringify({ current: SHADER_PRESETS["Shader: checkerboard"], saved: {} }),
    );
    render(<LogicBuilder />);
    const grid = () => screen.getByRole("img", { name: /^8×8 SCREEN rows / });
    expect(grid().getAttribute("aria-label")).toBe("8×8 SCREEN rows 00 00 00 00 00 00 00 00");
    const perRow = compileShader(SAMPLE_SHADERS.CHECKER).instructions.length;
    // One row: one clock cycle per instruction, END included. Row 0 is lit, the rest blank.
    for (let i = 0; i < perRow * 2; i++) fireEvent.click(button("Step ½ cycle"));
    expect(grid().getAttribute("aria-label")).toBe("8×8 SCREEN rows AA 00 00 00 00 00 00 00");
    for (let i = 0; i < perRow * 2; i++) fireEvent.click(button("Step ½ cycle"));
    expect(grid().getAttribute("aria-label")).toBe("8×8 SCREEN rows AA 55 00 00 00 00 00 00");
  }, 60000);
});
