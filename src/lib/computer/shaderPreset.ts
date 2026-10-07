// Builder examples: the 8-lane shader drawing into the 8×8 screen. The shader's
// first twelve outputs (Y0–2, D0–7, WE) line up with the screen's A, D and WE
// inputs, and both share one clock, so each END tick stores one finished row.
import { Builder, range } from "./blockBuilder";
import { datapathNode } from "./datapathBlocks";
import type { Circuit } from "./logic";
import { compileShader, SAMPLE_SHADERS, WIDE_SHADERS } from "./shader";

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

/**
 * The 32×32 shader on a 32×32 screen, read out by a scanout onto a monitor.
 * The shader's first 16 outputs (A0–6, D0–7, WE) line up with the screen's
 * A, D and WE; the scanout's X3–X4 and Y0–Y4 are the screen's video address.
 */
export function wideShaderDemoCircuit(source: string, name: string): Circuit {
  const b = new Builder();
  b.add("clock", "clock", 30, 30, "CLOCK");
  b.add("run", "switch", 30, 120, "RUN", { value: true });
  b.nodes.push(
    datapathNode("shader32x32", "shader", 260, 30, compileShader(source).bytes),
    datapathNode("vram32x32", "screen", 700, 30),
    datapathNode("scanout32x32", "scanout", 1100, 30),
    datapathNode("crt32x32", "monitor", 1500, 30),
  );
  b.connect("run", "shader", 0);
  b.connect("clock", "shader", 1);
  range(16).forEach((port) => {
    b.connect(["shader", port], "screen", port);
  });
  // Scanout outputs: PIXEL, X0–4, Y0–4, HSYNC, VSYNC, VBLANK.
  [4, 5, 6, 7, 8, 9, 10].forEach((output, bit) => {
    b.connect(["scanout", output], "screen", 16 + bit);
  });
  b.connect("clock", "screen", 23);
  range(8).forEach((bit) => {
    b.connect(["screen", 8 + bit], "scanout", bit);
  });
  b.connect("clock", "scanout", 8);
  [0, 11, 12].forEach((output, input) => {
    b.connect(["scanout", output], "monitor", input);
  });
  b.connect("clock", "monitor", 3);
  return b.circuit(name);
}

const STRIPES_PRESET = "Shader: moving stripes";
const CHECKER_PRESET = "Shader: checkerboard";
const SQUARE_PRESET = "Shader: filled square";
const WIDE_SQUARE_PRESET = "Shader: 32×32 square, 8 lanes in 4 passes";

export const SHADER_PRESETS: Record<string, Circuit> = {
  [STRIPES_PRESET]: shaderDemoCircuit(SAMPLE_SHADERS.STRIPES, STRIPES_PRESET),
  [CHECKER_PRESET]: shaderDemoCircuit(SAMPLE_SHADERS.CHECKER, CHECKER_PRESET),
  [SQUARE_PRESET]: shaderDemoCircuit(SAMPLE_SHADERS.SQUARE, SQUARE_PRESET),
  [WIDE_SQUARE_PRESET]: wideShaderDemoCircuit(WIDE_SHADERS.SQUARE, WIDE_SQUARE_PRESET),
};

const HOW =
  "One program runs on 8 lanes at once; lane i computes pixel i of row Y in the same tick. At END the shader raises WE and the screen stores the row. Unfold the shader to see one decoder feed all 8 lanes.";
export const SHADER_HINTS: Record<string, string> = {
  [STRIPES_PRESET]: `${HOW} Program: pixel = bit 1 of x + y + t. T counts frames, so the stripes move one pixel per frame.`,
  [CHECKER_PRESET]: `${HOW} Program: pixel = (x XOR y) AND 1.`,
  [SQUARE_PRESET]: `${HOW} Program: pixel on when x − 2 < 4 and y − 2 < 4, a 4×4 square.`,
  [WIDE_SQUARE_PRESET]:
    "The same 8 lanes on a 32×32 screen. A row is now 32 pixels, so the lanes run the program 4 times per row: in pass c, lane i computes pixel x = 8c + i, and END stores one byte at row Y, column c. A frame takes 4 × 32 = 128 passes instead of 8, so 16 times the ticks of the 8×8 frame. Program: a 16×16 square, on when (x >> 3) − 1 < 2 and the same for y. A scanout reads the screen out to the monitor.",
};
