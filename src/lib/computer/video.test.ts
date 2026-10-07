import { describe, expect, it } from "vitest";
import {
  compileProgram,
  describeOperand,
  OPCODES,
  traceTicks,
  VIDEO_SAMPLES,
  VIDEO_STATUS,
} from "../computerStepper";
import { raw } from "./cpuTestPrograms";
import {
  beamAt,
  FRAME_TICKS,
  SCAN_COLUMNS,
  SCAN_LINES,
  scanoutTrace,
  VISIBLE_LINES,
  VISIBLE_TICKS,
} from "./video";

describe("video timing", () => {
  it("counts x 0–7 on every line and y 0–15 on every frame, then wraps", () => {
    for (let tick = 0; tick < 3 * FRAME_TICKS; tick++) {
      const beam = beamAt(tick);
      expect(beam.x).toBe(tick % SCAN_COLUMNS);
      expect(beam.y).toBe(Math.floor(tick / SCAN_COLUMNS) % SCAN_LINES);
    }
    expect(beamAt(FRAME_TICKS)).toEqual(beamAt(0));
  });

  it("puts HSYNC on the last tick of each line, VSYNC on the last tick of each frame", () => {
    const frame = Array.from({ length: FRAME_TICKS }, (_, tick) => beamAt(tick));
    expect(frame.filter((b) => b.hsync).map((b) => b.x)).toEqual(Array(SCAN_LINES).fill(7));
    expect(frame.flatMap((b, tick) => (b.vsync ? [tick] : []))).toEqual([FRAME_TICKS - 1]);
    // The blank lines follow the visible ones: 64 drawn ticks, then 64 blank.
    expect(frame.findIndex((b) => b.vblank)).toBe(VISIBLE_TICKS);
    expect(frame.filter((b) => b.vblank)).toHaveLength(FRAME_TICKS - VISIBLE_TICKS);
  });

  it("paints a framebuffer change only once the beam passes it", () => {
    const blank = Array(VISIBLE_LINES).fill(0);
    const lit = [...blank];
    lit[2] = 0xff;
    // The row is written on tick 5; the beam reaches row 2 on tick 16.
    const screens = Array.from({ length: 40 }, (_, tick) => (tick >= 5 ? lit : blank));
    const frames = scanoutTrace(screens);
    expect(frames[15].image[2]).toBe(0);
    expect(frames[16].image[2]).toBe(0b1);
    expect(frames[23].image[2]).toBe(0xff);
    expect(frames[23].next).toMatchObject({ x: 0, y: 3 });
  });
});

describe("the video status port", () => {
  it("reads VBLANK at FB on the tick the CPU reads it", () => {
    const loop = raw([OPCODES.LDM, VIDEO_STATUS], [OPCODES.OUT, 0], [OPCODES.JMP, 0]);
    const ticks = traceTicks(loop, 120);
    const reads = ticks.filter((tick) => tick.control.includes("RAM_OUT"));
    expect(reads.length).toBeGreaterThan(30);
    for (const tick of reads) expect(tick.bus).toBe(Number(beamAt(tick.index).vblank));
    expect(new Set(reads.map((tick) => tick.bus))).toEqual(new Set([0, 1]));
  });

  it("names FB as the video status for reads and keeps it a pixel write for STM", () => {
    expect(describeOperand(OPCODES.LDM, VIDEO_STATUS, []).short).toBe("[FB] vblank");
    expect(describeOperand(OPCODES.STM, VIDEO_STATUS, []).short).toBe("[FB] pixel");
  });

  it("compiles wait_vblank() from LDM, ADDI and JNC, without a new opcode", () => {
    const { instructions } = compileProgram("wait_vblank();\nscreen[0] = 1;");
    const wait = instructions.slice(0, 7).map(({ opcode, operand }) => [opcode, operand]);
    expect(wait).toEqual([
      [OPCODES.LDM, VIDEO_STATUS],
      [OPCODES.ADDI, 255],
      [OPCODES.JNC, 8],
      [OPCODES.JMP, 0],
      [OPCODES.LDM, VIDEO_STATUS],
      [OPCODES.ADDI, 255],
      [OPCODES.JNC, 8],
    ]);
    expect(() => compileProgram("let v = wait_vblank();")).toThrow(/statement/);
    expect(() => compileProgram("wait_vblank(1);")).toThrow(/no arguments/);
    expect(() => compileProgram("fn wait_vblank() {\n}")).toThrow(/built in/);
  });

  it("returns at the start of a vertical blank, even when called inside one", () => {
    const ticks = traceTicks(compileProgram("wait_vblank();\nwait_vblank();\nscreen[0] = 1;"));
    const write = ticks.find((tick) => tick.screenWrite)!;
    // Two waits: the first returns in frame 0's blank, the second in frame 1's.
    expect(Math.floor(write.index / FRAME_TICKS)).toBe(1);
    expect(beamAt(write.index).vblank).toBe(true);
  });
});

describe("tearing and its fix", () => {
  /** The monitor's picture when the beam finishes each frame's visible lines. */
  const pictures = (source: string) => {
    const frames = scanoutTrace(traceTicks(compileProgram(source)).map((tick) => tick.screen));
    const out: number[][] = [];
    for (let end = FRAME_TICKS + VISIBLE_TICKS - 1; end < frames.length; end += FRAME_TICKS)
      out.push(frames[end].image);
    return out;
  };
  const whole = (picture: number[]) => picture.every((row) => row === picture[0]);

  it("TEARING shows frames that mix two pictures", () => {
    const shown = pictures(VIDEO_SAMPLES.TEARING);
    expect(shown.length).toBeGreaterThan(10);
    expect(shown.filter((picture) => !whole(picture)).length).toBeGreaterThan(shown.length / 4);
  });

  it("VSYNC shows one whole picture per frame, alternating", () => {
    const shown = pictures(VIDEO_SAMPLES.VSYNC);
    expect(shown.length).toBeGreaterThan(10);
    for (const [frame, picture] of shown.entries()) {
      expect(whole(picture), `frame ${frame + 1}`).toBe(true);
      expect(picture[0], `frame ${frame + 1}`).toBe(frame % 2 ? 240 : 15);
    }
  });
});
