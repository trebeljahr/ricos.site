import { describe, expect, it } from "vitest";
import { initialSnapshot } from "./logic";
import {
  createTimeline,
  currentFrame,
  frameLimit,
  MAX_FRAMES,
  MIN_FRAMES,
  push,
  replaceSnapshot,
  seek,
  truncate,
} from "./timeline";

const frame = (tick: number) => ({
  tick,
  clockHigh: tick % 2 === 1,
  pulses: {},
  snapshot: initialSnapshot(),
});

describe("simulation timeline", () => {
  it("steps back and forward through recorded ticks", () => {
    let timeline = createTimeline(frame(0));
    for (let tick = 1; tick <= 3; tick++) timeline = push(timeline, frame(tick));
    expect(currentFrame(timeline).tick).toBe(3);
    timeline = seek(timeline, timeline.index - 2);
    expect(currentFrame(timeline).tick).toBe(1);
    expect(seek(timeline, -5).index).toBe(0);
    expect(seek(timeline, 99).index).toBe(3);
  });

  it("cuts the ticks after the shown one when a new tick is recorded or the circuit changes", () => {
    let timeline = createTimeline(frame(0));
    for (let tick = 1; tick <= 3; tick++) timeline = push(timeline, frame(tick));
    timeline = seek(timeline, 1);
    expect(truncate(timeline).frames.map((item) => item.tick)).toEqual([0, 1]);
    timeline = push(timeline, frame(2));
    expect(timeline.frames.map((item) => item.tick)).toEqual([0, 1, 2]);
    expect(timeline.index).toBe(2);
  });

  it("drops the oldest tick past the limit", () => {
    let timeline = createTimeline(frame(0));
    for (let tick = 1; tick <= 10; tick++) timeline = push(timeline, frame(tick), 4);
    expect(timeline.frames.map((item) => item.tick)).toEqual([7, 8, 9, 10]);
  });

  it("keeps fewer ticks for bigger snapshots, within fixed bounds", () => {
    const small = initialSnapshot();
    small.values = { a: true };
    expect(frameLimit(small)).toBe(MAX_FRAMES);
    const huge = initialSnapshot();
    huge.values = Object.fromEntries(
      Array.from({ length: 200_000 }, (_, index) => [`n${index}`, false]),
    );
    expect(frameLimit(huge)).toBe(MIN_FRAMES);
    const nested = initialSnapshot();
    nested.modules = { m: huge };
    expect(frameLimit(nested)).toBe(MIN_FRAMES);
  });

  it("replaces only the shown frame's engine state", () => {
    const timeline = push(createTimeline(frame(0)), frame(1));
    const snapshot = { ...initialSnapshot(), values: { x: true } };
    const next = replaceSnapshot(timeline, snapshot);
    expect(currentFrame(next)).toMatchObject({ tick: 1, clockHigh: true, snapshot });
    expect(next.frames[0]).toBe(timeline.frames[0]);
  });
});
