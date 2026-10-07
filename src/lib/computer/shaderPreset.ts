// Builder examples: the 8-lane shader drawing into the 8×8 screen. The shader's
// first twelve outputs (Y0–2, D0–7, WE) line up with the screen's A, D and WE
// inputs, and both share one clock, so each END tick stores one finished row.
import { Builder, range } from "./blockBuilder";
import { datapathNode } from "./datapathBlocks";
import type { Circuit } from "./logic";
import { compileShader, SAMPLE_SHADERS } from "./shader";

/** The demo: CLOCK and RUN drive the shader; its row, pixels and WE drive the screen. */
export function shaderDemoCircuit(source: string, name = "Shader drawing on a screen"): Circuit {
  const b = new Builder();
  b.add("clock", "clock", 30, 30, "CLOCK");
  b.add("run", "switch", 30, 120, "RUN", { value: true });
  b.nodes.push(
    datapathNode("shader8", "shader", 260, 30, compileShader(source).bytes),
    datapathNode("screen8x8", "screen", 700, 30),
  );
  b.connect("run", "shader", 0);
  b.connect("clock", "shader", 1);
  range(12).forEach((port) => {
    b.connect(["shader", port], "screen", port);
  });
  b.connect("clock", "screen", 12);
  return b.circuit(name);
}

const STRIPES_PRESET = "Shader: moving stripes";
const CHECKER_PRESET = "Shader: checkerboard";
const SQUARE_PRESET = "Shader: filled square";

export const SHADER_PRESETS: Record<string, Circuit> = {
  [STRIPES_PRESET]: shaderDemoCircuit(SAMPLE_SHADERS.STRIPES, STRIPES_PRESET),
  [CHECKER_PRESET]: shaderDemoCircuit(SAMPLE_SHADERS.CHECKER, CHECKER_PRESET),
  [SQUARE_PRESET]: shaderDemoCircuit(SAMPLE_SHADERS.SQUARE, SQUARE_PRESET),
};

const HOW =
  "One program runs on 8 lanes at once; lane i computes pixel i of row Y in the same tick. At END the shader raises WE and the screen stores the row. Unfold the shader to see one decoder feed all 8 lanes.";
export const SHADER_HINTS: Record<string, string> = {
  [STRIPES_PRESET]: `${HOW} Program: pixel = bit 1 of x + y + t. T counts frames, so the stripes move one pixel per frame.`,
  [CHECKER_PRESET]: `${HOW} Program: pixel = (x XOR y) AND 1.`,
  [SQUARE_PRESET]: `${HOW} Program: pixel on when x − 2 < 4 and y − 2 < 4, a 4×4 square.`,
};
