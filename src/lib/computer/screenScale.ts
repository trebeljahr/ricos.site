// The same job — light every pixel of the screen — done every way the toy
// computer offers, at 8×8, 32×32 and 512×512, for the "bigger screens" demo.
//
// 8×8 and 32×32 runs are measured: real programs on the stepper's CPU trace,
// and the shader model. At 512×512 the shader is still measured (its model
// runs any size); the CPU and blitter numbers are worked out from the 32×32
// runs' ticks per byte, because the toy CPU's big screen is 32×32.
import { compileProgram, type Tick, traceTicks } from "../computerStepper";
import { compileShader, shadeFrame } from "./shader";
import { frameBytes, SCREEN_SIZES, type ScreenSize } from "./video";

export type ScaleSize = "8×8" | "32×32" | "512×512";
export const SCALE_SIZES: ScaleSize[] = ["8×8", "32×32", "512×512"];

export type ScaleRun = {
  method: string;
  /** How the work is done, in a sentence. */
  how: string;
  /** Clock ticks from the start until every pixel is lit. */
  ticks: number;
  /** Of those, the ticks the CPU spends on the job; the rest it could spend on other work. */
  cpuTicks: number;
  /** "measured" from a run, or "worked out" from a smaller run's cost per byte. */
  source: "measured" | "worked out";
  /** The program or shader that did it. */
  code: string;
};

/** One tick at 1 MHz, the clock of many 8-bit home computers, in milliseconds. */
export const TICK_MS = 0.001;
/** One frame at 60 frames per second, in milliseconds. */
export const FRAME_MS = 1000 / 60;

const lit = (frame: readonly number[]) => frame.every((byte) => byte === 255);

/** Ticks until the last write of a run that lights the whole frame, and the trace. */
function measure(source: string, done: (tick: Tick) => boolean) {
  const ticks = traceTicks(compileProgram(source));
  const last = ticks.findIndex(done);
  if (last < 0) throw new Error(`The program never lit the whole screen:\n${source}`);
  return { ticks, until: last + 1 };
}

/** A CPU-only run: the CPU is busy for every tick. */
function cpuRun(
  method: string,
  how: string,
  code: string,
  done: (tick: Tick) => boolean,
): ScaleRun {
  const { until } = measure(code, done);
  return { method, how, ticks: until, cpuTicks: until, source: "measured", code };
}

/** A blitter run: the CPU is busy until it has written the start command. */
function blitterRun(
  method: string,
  how: string,
  code: string,
  done: (tick: Tick) => boolean,
  started: (tick: Tick) => boolean,
): ScaleRun {
  const { ticks, until } = measure(code, done);
  return {
    method,
    how,
    ticks: until,
    cpuTicks: ticks.findIndex(started) + 1,
    source: "measured",
    code,
  };
}

/** Lights every pixel: SET with A = 1 in every lane. */
export const FILL_SHADER = "LD 1\nSET";

function shaderRun(size: ScreenSize, lanes: number): ScaleRun {
  const bytes = compileShader(FILL_SHADER).bytes;
  const shape = { ...size, lanes };
  const perPass = compileShader(FILL_SHADER).instructions.length;
  // The model keeps lane pixels in one 32-bit number: wider units are worked out per pass.
  const ticks =
    lanes <= 32 ? shadeFrame(bytes, shape).ticks : size.height * (size.width / lanes) * perPass;
  return {
    method: lanes === size.width ? "Shader, a lane per pixel of a row" : `Shader, ${lanes} lanes`,
    how:
      lanes === size.width
        ? `${lanes} lanes compute a whole row at once: one pass of ${perPass} instructions per row.${lanes > 32 ? " Worked out as rows × instructions: the model keeps at most 32 lanes." : ""}`
        : `${lanes} lanes compute ${lanes} pixels at once, so a row of ${size.width} takes ${size.width / lanes} pass${size.width === lanes ? "" : "es"} of ${perPass} instructions.`,
    ticks,
    cpuTicks: 0,
    source: lanes <= 32 ? "measured" : "worked out",
    code: FILL_SHADER,
  };
}

const rows8 = Array.from({ length: 8 }, (_, r) => `screen[${r}] = 255;`).join("\n");
const window32 = `for (let t = 0; t < 16; t++) {\n  bank(t);\n${Array.from({ length: 8 }, (_, r) => `  window[${r}] = 255;`).join("\n")}\n}`;
// Four stores per pass, one frame row: the trace stops after 512 instructions.
const port32 = `vram_at(0);\nfor (let y = 0; y < 32; y++) {\n${"  vram(255);\n".repeat(4)}}`;

const screenLit = (tick: Tick) => lit(tick.screen);
const frameLit = (tick: Tick) => lit(tick.frame);

function smallRuns(): ScaleRun[] {
  return [
    cpuRun("CPU, a store per row", "Eight STM instructions, one per screen row.", rows8, screenLit),
    blitterRun(
      "Blitter",
      "Two CPU stores start CLEAR with COLOUR FF; the blitter writes one row per tick.",
      "blit(clear, 255);",
      screenLit,
      (tick) => tick.blitter.busy,
    ),
    shaderRun(SCREEN_SIZES["8×8"], 8),
  ];
}

function bigRuns(): ScaleRun[] {
  return [
    cpuRun(
      "CPU through the bank window",
      "For each of the 16 tiles: one store to BANK, then 8 stores through the window.",
      window32,
      frameLit,
    ),
    cpuRun(
      "CPU through the port",
      "One store sets ADDR; then one store per byte, four per loop pass, and ADDR moves on by itself.",
      port32,
      frameLit,
    ),
    blitterRun(
      "Big blitter",
      "Eight CPU stores set DST, the fill byte, SIZE and FILL; the blitter writes one byte per tick.",
      "big_fill(0, 0, 4, 32, 255);",
      frameLit,
      (tick) => tick.bigBlitter.busy,
    ),
    shaderRun(SCREEN_SIZES["32×32"], 8),
    shaderRun(SCREEN_SIZES["32×32"], 32),
  ];
}

/** The 512×512 runs: the 32×32 runs' cost per byte, times 256 times the bytes. */
function hugeRuns(big: ScaleRun[]): ScaleRun[] {
  const scale = frameBytes(SCREEN_SIZES["512×512"]) / frameBytes(SCREEN_SIZES["32×32"]);
  const size = SCREEN_SIZES["512×512"];
  return [
    ...big
      .filter((run) => !run.method.startsWith("Shader"))
      .map((run): ScaleRun => {
        const blitter = run.cpuTicks < run.ticks;
        // The blitter's setup does not grow with the screen; its bytes do.
        const ticks = blitter
          ? run.cpuTicks + (run.ticks - run.cpuTicks) * scale
          : run.ticks * scale;
        return {
          ...run,
          ticks,
          cpuTicks: blitter ? run.cpuTicks : ticks,
          source: "worked out",
          how: `${run.how} Worked out from the 32×32 run: 512×512 is ${scale.toLocaleString("en")} times the bytes.`,
        };
      }),
    shaderRun(size, 8),
    shaderRun(size, 32),
    shaderRun(size, 512),
  ];
}

/** Every run, by size. */
export function screenScaleRuns(): Record<ScaleSize, ScaleRun[]> {
  const big = bigRuns();
  return { "8×8": smallRuns(), "32×32": big, "512×512": hugeRuns(big) };
}

/** Milliseconds for `ticks` at 1 MHz. */
export const ticksToMs = (ticks: number) => ticks * TICK_MS;
