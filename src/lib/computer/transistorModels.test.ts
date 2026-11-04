import { describe, expect, it } from "vitest";
import {
  clipBox,
  DEVICES,
  deviceParts,
  deviceState,
  electronPaths,
  formatAmps,
  pointAlong,
} from "./transistorModels";

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
      expect(electronPaths(device, 1).length).toBeGreaterThan(0);
    }
  });

  it("slices a box into the kept half, or drops it", () => {
    expect(clipBox([-1, 1, 0, 1, -1, 1], "along")).toEqual([-1, 1, 0, 1, -1, 0]);
    expect(clipBox([-1, 1, 0, 1, -1, 1], "across")).toEqual([-1, 0, 0, 1, -1, 1]);
    expect(clipBox([0.5, 1, 0, 1, -1, 1], "across")).toBeNull();
    expect(clipBox([-1, 1, 0, 1, 0.5, 1], "along")).toBeNull();
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
