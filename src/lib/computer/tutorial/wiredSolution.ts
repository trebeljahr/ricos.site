import type { Circuit } from "../logic";
import { type LevelStart, levelStart } from "./kit";
import type { Level } from "./types";

/**
 * The board "Wire it for me" loads: the level's working solution, under the same
 * name and lock rule as the reader's own board. It goes through the board state
 * like any other circuit, so undo works and the table grades it as usual.
 */
export function wiredSolution(level: Level, start: LevelStart = levelStart(level)): Circuit | null {
  const reference = level.reference?.();
  return reference ? start.enforce({ ...reference, name: start.circuit.name }) : null;
}
