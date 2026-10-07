import { describe, expect, it } from "vitest";
import { FRAME_MS, screenScaleRuns, ticksToMs } from "./screenScale";

describe("screen scale runs", () => {
  const runs = screenScaleRuns();
  const byMethod = (size: keyof typeof runs, method: string) =>
    runs[size].find((run) => run.method === method)!;

  it("measures 8×8 and 32×32 and works out the 512×512 CPU and blitter", () => {
    for (const run of [...runs["8×8"], ...runs["32×32"]])
      expect(run.source, run.method).toBe("measured");
    expect(byMethod("512×512", "CPU through the port").source).toBe("worked out");
    expect(byMethod("512×512", "Shader, 8 lanes").source).toBe("measured");
  });

  it("backs the page's claims", () => {
    expect(byMethod("8×8", "CPU, a store per row").ticks).toBeLessThan(100);
    const window = byMethod("32×32", "CPU through the bank window");
    const port = byMethod("32×32", "CPU through the port");
    for (const run of [window, port]) {
      expect(run.ticks).toBeGreaterThan(2000);
      expect(run.ticks / 128).toBeGreaterThanOrEqual(17);
      expect(run.ticks / 128).toBeLessThan(22);
      expect(run.cpuTicks).toBe(run.ticks);
    }
    expect(port.ticks).toBeGreaterThan(window.ticks);
    const blitter = byMethod("32×32", "Big blitter");
    expect(blitter.cpuTicks).toBe(60);
    expect(blitter.ticks - blitter.cpuTicks).toBe(128);
    // 512×512: the CPU over half a second and 30 frames; the blitter about two frames.
    const cpu = byMethod("512×512", "CPU through the bank window");
    expect(ticksToMs(cpu.ticks)).toBeGreaterThan(500);
    expect(ticksToMs(cpu.ticks) / FRAME_MS).toBeGreaterThan(30);
    const big = byMethod("512×512", "Big blitter");
    expect(big.ticks).toBe(60 + 128 * 256);
    expect(Math.round(ticksToMs(big.ticks) / FRAME_MS)).toBe(2);
    expect(ticksToMs(byMethod("512×512", "Shader, a lane per pixel of a row").ticks)).toBeLessThan(
      FRAME_MS,
    );
    // Lanes buy speed: a quarter of the lanes, four times the ticks.
    expect(byMethod("32×32", "Shader, 8 lanes").ticks).toBe(
      4 * byMethod("32×32", "Shader, a lane per pixel of a row").ticks,
    );
  });
});
