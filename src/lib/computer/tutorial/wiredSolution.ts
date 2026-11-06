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

/**
 * The board of the hint before the last: the parts of the level's working
 * solution where that solution puts them, with no wires besides the locked
 * ones. Null when the solution adds no part to the start board.
 */
export function placedParts(level: Level, start: LevelStart = levelStart(level)): Circuit | null {
  const reference = level.reference?.();
  if (!reference) return null;
  const nodes = reference.nodes.filter((node) => !node.splice);
  const given = new Set(start.circuit.nodes.map((node) => node.id));
  if (nodes.every((node) => given.has(node.id))) return null;
  return start.enforce({ ...reference, nodes, wires: [], name: start.circuit.name });
}
