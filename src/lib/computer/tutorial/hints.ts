// Shared hint-only lesson API. Future keyboard/interrupt lessons supply Level
// goal/spec/palette/hints and use this same behavior-driven policy. No reference
// matching, edit actions, or check-count-triggered disclosure belongs here.
import type { Level, LevelHint } from "./types";

/**
 * The step before the last hint that puts the parts of a working solution on
 * the board, without wires. Only levels with a reference that adds parts to the
 * start board offer it.
 */
export const PARTS_HINT: LevelHint = {
  title: "Parts",
  text: "The parts of a working solution are on the board. Wire them up.",
};

/** Every step of the hint ladder in order: the level's hints, with the parts step second to last. */
export function hintSteps(level: Level, withParts: boolean): LevelHint[] {
  const hints = level.hints ?? [];
  if (!withParts || !hints.length) return hints;
  return [...hints.slice(0, -1), PARTS_HINT, ...hints.slice(-1)];
}
