import type { Snapshot } from "./logic";

/** One recorded clock tick: the engine state after the tick and what drove it. */
export type TimelineFrame = {
  tick: number;
  clockHigh: boolean;
  pulses: Record<string, boolean>;
  snapshot: Snapshot;
};

/**
 * Recorded simulation ticks, separate from the edit undo history. `index` is the
 * frame on screen; frames after it are ticks the reader stepped back from.
 */
export type Timeline = { frames: TimelineFrame[]; index: number };

/** Upper bound on recorded ticks, however small the circuit. */
export const MAX_FRAMES = 512;
/** Lower bound, so big circuits can still step back a few cycles. */
export const MIN_FRAMES = 32;
/**
 * Total stored engine values across all frames (~40 bytes each, so ~40 MB).
 * A half adder keeps 512 ticks; a gate-level CPU with ~20k nets keeps ~50.
 */
export const VALUE_BUDGET = 1_000_000;

export function createTimeline(frame: TimelineFrame): Timeline {
  return { frames: [frame], index: 0 };
}

export function currentFrame(timeline: Timeline): TimelineFrame {
  return timeline.frames[timeline.index];
}

/** Number of stored values in a snapshot, nested module snapshots included. */
export function snapshotSize(snapshot: Snapshot): number {
  let size = Object.keys(snapshot.values).length + Object.keys(snapshot.memory).length;
  for (const bits of Object.values(snapshot.outputs)) size += bits.length;
  for (const inner of Object.values(snapshot.modules)) size += snapshotSize(inner);
  return size;
}

/** How many frames fit the memory budget for snapshots of this size. */
export function frameLimit(snapshot: Snapshot): number {
  const fit = Math.floor(VALUE_BUDGET / Math.max(1, snapshotSize(snapshot)));
  return Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, fit));
}

/** Drops the ticks after the current one, like making an edit after an undo. */
export function truncate(timeline: Timeline): Timeline {
  if (timeline.index === timeline.frames.length - 1) return timeline;
  return { frames: timeline.frames.slice(0, timeline.index + 1), index: timeline.index };
}

/** Records a newly simulated tick after the current one, dropping the oldest past the limit. */
export function push(
  timeline: Timeline,
  frame: TimelineFrame,
  limit = frameLimit(frame.snapshot),
): Timeline {
  const frames = [...truncate(timeline).frames, frame];
  const kept = frames.length > limit ? frames.slice(frames.length - limit) : frames;
  return { frames: kept, index: kept.length - 1 };
}

export function seek(timeline: Timeline, index: number): Timeline {
  const clamped = Math.max(0, Math.min(timeline.frames.length - 1, index));
  return clamped === timeline.index ? timeline : { ...timeline, index: clamped };
}

/** Swaps the current frame's engine state, keeping its tick, clock level and pulses. */
export function replaceSnapshot(timeline: Timeline, snapshot: Snapshot): Timeline {
  const frames = [...timeline.frames];
  frames[timeline.index] = { ...frames[timeline.index], snapshot };
  return { ...timeline, frames };
}
