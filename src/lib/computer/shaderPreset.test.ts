import { describe, expect, it } from "vitest";
import { screenRows, screenView } from "./datapathBlocks";
import { type Circuit, initialSnapshot, type Snapshot, step, validateCircuit } from "./logic";
import { compileShader, renderShader, SAMPLE_SHADERS, shadeFrame, WIDE_SHADERS } from "./shader";
import { SHADER_32X32 } from "./shaderBlocks";
import { SHADER_PRESETS, shaderDemoCircuit } from "./shaderPreset";

/** Clocks a circuit `cycles` times, low then high. */
function run(circuit: Circuit, cycles: number, state: Snapshot = initialSnapshot()) {
  let next = state;
  for (let i = 0; i < cycles * 2; i++) {
    next = step(circuit, next, i % 2 === 1);
    expect(next.unstable).toBe(false);
  }
  return next;
}
/** Clock cycles for one frame: one per instruction, END included, per row. */
const frameCycles = (source: string) => compileShader(source).instructions.length * 8;

describe("shader demo presets", () => {
  it("fills the screen with each sample shader's frame", () => {
    for (const [source, want] of [
      [SAMPLE_SHADERS.CHECKER, [0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55]],
      [SAMPLE_SHADERS.SQUARE, [0, 0, 0x3c, 0x3c, 0x3c, 0x3c, 0, 0]],
    ] as const) {
      const state = run(shaderDemoCircuit(source), frameCycles(source));
      expect(screenRows(state.blocks?.screen)).toEqual(want);
    }
  });

  it("animates the stripes frame by frame", () => {
    const source = SAMPLE_SHADERS.STRIPES;
    const circuit = shaderDemoCircuit(source);
    const frames = renderShader(compileShader(source).bytes, 24);
    let state = initialSnapshot();
    for (let frame = 0; frame < 3; frame++) {
      state = run(circuit, frameCycles(source), state);
      const want = frames.slice(frame * 8, frame * 8 + 8).map((row) => row.pixels);
      expect(screenRows(state.blocks?.screen), `frame ${frame}`).toEqual(want);
    }
    expect(screenRows(state.blocks?.screen)).not.toEqual(
      frames.slice(0, 8).map((row) => row.pixels),
    );
  });

  it("keeps every preset inside the import limits", () => {
    for (const circuit of Object.values(SHADER_PRESETS))
      expect(validateCircuit(JSON.parse(JSON.stringify(circuit)))?.nodes).toHaveLength(
        circuit.nodes.length,
      );
  });
});

describe("32×32 shader preset", () => {
  it("fills the 32×32 screen with the model's frame and passes the validator", () => {
    const name = "Shader: 32×32 square, 8 lanes in 4 passes";
    const circuit = SHADER_PRESETS[name];
    expect(validateCircuit(JSON.parse(JSON.stringify(circuit)))).not.toBeNull();
    const { frame, ticks } = shadeFrame(compileShader(WIDE_SHADERS.SQUARE).bytes, SHADER_32X32);
    // 16× the ticks of the 8×8 frame of the same program.
    expect(ticks).toBe(16 * frameCycles(WIDE_SHADERS.SQUARE));
    const state = run(circuit, ticks);
    expect(screenView("vram32x32", state.blocks?.screen).rows).toEqual(frame);
  });
});
