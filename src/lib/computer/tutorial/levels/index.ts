// Every tutorial level, in ladder order, and the part catalog built from them.
import { PartCatalog } from "../parts";
import type { Level } from "../types";
import { ALU_LEVELS } from "./alu";
import { ARITHMETIC_LEVELS } from "./arithmetic";
import { GATE_LEVELS } from "./gates";
import { COUNTER_LEVELS } from "./counters";
import { MEMORY_LEVELS } from "./memory";
import { PROCESSOR_LEVELS } from "./processor";
import { registerCatalog } from "./shared";
import { SWITCHING_LEVELS } from "./switching";

export const LEVELS: readonly Level[] = [
  ...GATE_LEVELS,
  ...ARITHMETIC_LEVELS,
  ...SWITCHING_LEVELS,
  ...ALU_LEVELS,
  ...MEMORY_LEVELS,
  ...COUNTER_LEVELS,
  ...PROCESSOR_LEVELS,
];

export const CATALOG = new PartCatalog(LEVELS);
registerCatalog(CATALOG);

export const levelById = (id: string | undefined) => LEVELS.find((level) => level.id === id);

/** Sections in ladder order, each with its levels. */
export function sections(levels: readonly Level[] = LEVELS) {
  const result: { title: string; levels: Level[] }[] = [];
  for (const level of levels) {
    const last = result[result.length - 1];
    if (last?.title === level.section) last.levels.push(level);
    else result.push({ title: level.section, levels: [level] });
  }
  return result;
}
