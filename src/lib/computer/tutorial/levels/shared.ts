// Shared pieces for writing levels: chapter links, common ports, and boxed
// built-in parts for reference solutions.
import { type Circuit, PRESETS } from "../../logic";
import type { PartCatalog } from "../parts";
import type { ChapterLink, LevelPort, PartId } from "../types";

// Registers, RAM and buses share one chapter.
const MEMORY_CHAPTER: ChapterLink = { number: "2.4", title: "Memory", href: "/computer/memory" };

export const CHAPTERS = {
  transistors: {
    number: "1.2",
    title: "Transistors into Gates",
    href: "/computer/transistors-into-gates",
  },
  // A folded box in 1.2: the link opens it.
  universal: {
    number: "1.2",
    title: "The universalness of some logic gates",
    href: "/computer/transistors-into-gates#callout-the-universalness-of-some-logic-gates",
  },
  transistor: {
    number: "1.2a",
    title: "How does a transistor work",
    href: "/computer/how-does-a-transistor-work",
  },
  arithmetic: {
    number: "1.3",
    title: "Gates to arithmetic",
    href: "/computer/gates-to-arithmetic",
  },
  clock: { number: "2.1", title: "The Clock", href: "/computer/the-clock" },
  memory: { number: "2.2", title: "1-Bit of Memory", href: "/computer/one-bit-of-memory" },
  register: MEMORY_CHAPTER,
  ram: MEMORY_CHAPTER,
  muxes: {
    number: "2.3",
    title: "Multiplexers and Decoders",
    href: "/computer/multiplexers-and-decoders",
  },
  alu: { number: "3.1", title: "The ALU", href: "/computer/the-alu" },
  counter: { number: "3.2", title: "Program Counter", href: "/computer/program-counter" },
  buses: MEMORY_CHAPTER,
  control: { number: "3.3", title: "The Control Unit", href: "/computer/the-control-unit" },
  together: { number: "3.4", title: "Tying it together", href: "/computer/tying-it-together" },
} satisfies Record<string, ChapterLink>;

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
