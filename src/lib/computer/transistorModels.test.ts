import { describe, expect, it } from "vitest";
import {
  channelFormed,
  chargesAt,
  controlPaths,
  DEVICES,
  depletionBoxes,
  deviceLabels,
  deviceParts,
  deviceState,
  electronPaths,
  formatAmps,
  gateCharges,
  pointAlong,
  type Vec3,
} from "./transistorModels";

const MOS = ["planar", "finfet", "gaa"] as const;

describe("transistor models", () => {
  it("has steady control current only in the BJT", () => {
    expect(deviceState("bjt", 0.75).controlAmps).toBeGreaterThan(1e-6);
    for (const device of ["planar", "finfet", "gaa"] as const)
      expect(deviceState(device, 1).controlAmps).toBe(0);
  });

  it("leaks less as the gate wraps further around the channel", () => {
    const leak = (device: "planar" | "finfet" | "gaa") => deviceState(device, 0).mainAmps;
    expect(leak("planar")).toBeGreaterThan(leak("finfet"));
    expect(leak("finfet")).toBeGreaterThan(leak("gaa"));
  });

  it("goes from cutoff through partly on to on", () => {
    for (const device of DEVICES) {
      expect(deviceState(device, 0).state).toBe("CUTOFF");
      expect(deviceState(device, 1).state).toBe("ON");
      const states = Array.from({ length: 101 }, (_, v) => deviceState(device, v / 100).state);
      expect(states).toContain("PARTLY ON");
    }
  });

  it("gives every part a positive size, and only MOS builds have a gate", () => {
    for (const device of DEVICES) {
      const parts = deviceParts(device);
      for (const { id, box } of parts) {
        expect(box[1] - box[0], id).toBeGreaterThan(0);
        expect(box[3] - box[2], id).toBeGreaterThan(0);
        expect(box[5] - box[4], id).toBeGreaterThan(0);
      }
      expect(new Set(parts.map((part) => part.id)).size).toBe(parts.length);
      expect(parts.some((part) => part.gate)).toBe(device !== "bjt");
      expect(electronPaths(device).length).toBeGreaterThan(0);
    }
  });

  it("draws no electrons at zero volts and a full stream when on", () => {
    for (const device of DEVICES) {
      expect(deviceState(device, 0).rate).toBeLessThan(0.001);
      expect(deviceState(device, 1).rate).toBe(1);
    }
    expect(deviceState("bjt", 0).controlRate).toBeLessThan(0.001);
  });

  it("keeps every electron and hole inside the metal or silicon, all the way", () => {
    const conducts = (device: (typeof DEVICES)[number], [x, y, z]: Vec3) =>
      deviceParts(device).some(({ material, box: [x0, x1, y0, y1, z0, z1] }) => {
        if (material === "oxide" || material === "gate") return false;
        return x >= x0 && x <= x1 && y >= y0 && y <= y1 && z >= z0 && z <= z1;
      });
    for (const device of DEVICES)
      for (const path of [...electronPaths(device), ...controlPaths(device)])
        for (let step = 0; step <= 400; step++) {
          const point = pointAlong(path, step / 400);
          expect(conducts(device, point), `${device} ${point}`).toBe(true);
        }
  });

  it("runs electrons from the source to the positive drain", () => {
    for (const device of DEVICES) {
      for (const path of electronPaths(device)) {
        expect(path[0][0]).toBeLessThan(0);
        expect(path[path.length - 1][0]).toBeGreaterThan(0);
        const xs = path.map(([x]) => x);
        for (let index = 1; index < xs.length; index++)
          expect(xs[index]).toBeGreaterThanOrEqual(xs[index - 1] - 0.41);
      }
      const labels = deviceLabels(device, 0).filter((label) => label.terminal);
      expect(labels[0].text).toContain("0 V");
      expect(labels[2].text).toContain("+1 V");
    }
  });

  it("has no channel below the threshold, and only then do electrons fill it", () => {
    for (const device of MOS) {
      expect(channelFormed(device, 0)).toBe(0);
      expect(channelFormed(device, 0.3)).toBe(0);
      expect(channelFormed(device, 0.5)).toBe(1);
    }
    const inChannel = (points: Vec3[]) =>
      points.filter(([x, y]) => Math.abs(x) < 1.2 && y > -0.12 && y < 0).length;
    expect(inChannel(chargesAt("planar", 0).electrons)).toBe(0);
    expect(inChannel(chargesAt("planar", 0.3).electrons)).toBe(0);
    expect(inChannel(chargesAt("planar", 1).electrons)).toBeGreaterThan(0);
    expect(inChannel(chargesAt("planar", 1).holes)).toBe(0);
  });

  it("digs a depletion zone under the gate as the voltage rises, trading holes for ions", () => {
    const under = (volts: number) =>
      depletionBoxes("planar", volts).reduce(
        (deepest, [x0, x1, y0]) => (x0 === -0.9 && x1 === 0.7 ? Math.min(deepest, y0) : deepest),
        0,
      );
    expect(under(0)).toBe(0);
    expect(under(0.1)).toBeLessThan(-0.12);
    expect(under(0.3)).toBeLessThan(under(0.1));
    expect(under(1)).toBeCloseTo(under(0.3));
    const atZero = chargesAt("planar", 0);
    const atOne = chargesAt("planar", 1);
    expect(atOne.holes.length).toBeLessThan(atZero.holes.length);
    expect(atOne.negative.length).toBeGreaterThanOrEqual(atZero.negative.length);
    // The junctions are there with no voltage on the gate at all.
    expect(atZero.negative.length).toBeGreaterThan(0);
    for (const point of atZero.electrons)
      expect(
        depletionBoxes("planar", 0).some(([x0, x1, y0, y1]) => {
          return point[0] > x0 && point[0] < x1 && point[1] > y0 && point[1] < y1;
        }),
      ).toBe(false);
  });

  it("charges the gate plate with its voltage, and a BJT has no plate", () => {
    for (const device of MOS) {
      expect(gateCharges(device, 0)).toHaveLength(0);
      expect(gateCharges(device, 1).length).toBeGreaterThan(gateCharges(device, 0.3).length);
    }
    expect(gateCharges("bjt", 1)).toHaveLength(0);
  });

  it("thins the emitter's depletion zone as the base voltage rises", () => {
    const emitterFloor = (volts: number) => depletionBoxes("bjt", volts)[0][2];
    expect(emitterFloor(0.7)).toBeGreaterThan(emitterFloor(0));
  });

  it("names the voltage in words, with no acronym", () => {
    for (const device of DEVICES)
      for (const label of deviceLabels(device, 0.5)) expect(label.text).not.toMatch(/V[GB][SE]/);
  });

  it("walks a route by distance", () => {
    const route = [
      [0, 0, 0],
      [2, 0, 0],
      [2, 2, 0],
    ] as const;
    expect(pointAlong(route, 0.25)).toEqual([1, 0, 0]);
    expect(pointAlong(route, 0.75)).toEqual([2, 1, 0]);
    expect(pointAlong(route, 1)).toEqual([2, 2, 0]);
  });

  it("formats currents", () => {
    expect(formatAmps(5e-3)).toBe("5.00 mA");
    expect(formatAmps(45e-6)).toBe("45.0 µA");
    expect(formatAmps(0)).toBe("0");
  });
});
