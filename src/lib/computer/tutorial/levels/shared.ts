// Shared pieces for writing levels: chapter links, common ports, and boxed
// built-in parts for reference solutions.
import { type Circuit, PRESETS } from "../../logic";
import type { PartCatalog } from "../parts";
import type { LevelPort, PartId } from "../types";

// Registers, RAM and buses share one chapter.

export const port = (id: string, label: string, short?: string): LevelPort =>
  short ? { id, label, short } : { id, label };

export const A = port("a", "A");
export const B = port("b", "B");
export const OUT = port("out", "OUT");

/** Runs `make` once, on first use, and keeps the result. */
export function once<T>(make: () => T): () => T {
  let value: T | undefined;
  let made = false;
  return () => {
    if (!made) {
      value = make();
      made = true;
    }
    return value as T;
  };
}

/** A site preset as the built-in version of a part, for use inside reference solutions. */
export const presetPart = (preset: string) => {
  const circuit = PRESETS[preset];
  if (!circuit) throw new Error(`Unknown preset ${preset}`);
  return circuit;
};

let catalog: PartCatalog | undefined;

/** Called once by levels/index.ts, so references can box parts from other sections. */
export const registerCatalog = (value: PartCatalog) => {
  catalog = value;
};

/**
 * The built-in version of a part as a boxed circuit, for `CircuitKit.part`.
 * Call it inside a level's `reference`, never at module load: the catalog
 * exists only once every section has loaded.
 */
export function boxed(part: PartId): Circuit {
  const module = catalog?.builtInModule(part);
  if (!module) throw new Error(`No boxed built-in version of part ${part}`);
  return module;
}
