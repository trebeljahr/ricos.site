// Every part a tutorial level makes has two versions: the built-in one (a gate
// type or one of the site's preset circuits) and, once the reader solves the
// level, their own circuit, boxed. A boxed part keeps the reader's gates inside,
// so unfolding it shows their own work, down to the parts it is built from.
import { type Circuit, type GateType, type Node, PRESETS } from "../logic";
import type { KnownPart } from "./analysis";
import { type Allowed, gradeLevel, gradePassed } from "./grade";
import { levelStart } from "./kit";
import type { OwnPartsMode, Progress } from "./progress";
import type { BuiltIn, Level, PaletteRef, PartId } from "./types";

/** Own parts open this many boxes deep; deeper ones use the built-in version. */
const OWN_DEPTH = 4;

export const ownName = (label: string) => `${label} (yours)`;
export const isPartRef = (ref: PaletteRef): ref is `part:${string}` => ref.startsWith("part:");
export const partOf = (ref: `part:${string}`): PartId => ref.slice(5);

export type PartInfo = { part: PartId; label: string; builtIn: BuiltIn; level: Level };

/** A palette entry for the builder: a plain gate type, or a part with its versions. */
export type PaletteEntry =
  | { kind: "gate"; type: GateType }
  | {
      kind: "part";
      part: PartId;
      label: string;
      level: Level;
      /** The reader's own circuit, when they solved the level and it still passes. */
      own?: Circuit;
      builtIn: { gate: GateType } | { circuit: Circuit };
    };

const verified = new WeakMap<Circuit, boolean>();

export class PartCatalog {
  readonly parts = new Map<PartId, PartInfo>();
  /** Built-in gate type → the part it stands for, e.g. "not" → "not". */
  readonly gateParts = new Map<GateType, PartId>();
  /** Preset name → the part it stands for, e.g. "Half adder" → "half-adder". */
  readonly presetParts = new Map<string, PartId>();
  private builtInCache = new Map<PartId, Circuit>();
  private ownCache = new WeakMap<Circuit, Map<string, Circuit>>();

  constructor(readonly levels: readonly Level[]) {
    for (const level of levels) {
      if (!level.makes) continue;
      const info = { ...level.makes, level };
      this.parts.set(level.makes.part, info);
      const builtIn = level.makes.builtIn;
      if ("gate" in builtIn) this.gateParts.set(builtIn.gate, level.makes.part);
      if ("preset" in builtIn) this.presetParts.set(builtIn.preset, level.makes.part);
    }
  }

  level(id: string) {
    return this.levels.find((level) => level.id === id);
  }

  /** The built-in version as a boxed circuit; undefined when it is a plain gate type. */
  builtInModule(part: PartId): Circuit | undefined {
    const info = this.parts.get(part);
    if (!info || "gate" in info.builtIn) return undefined;
    let circuit = this.builtInCache.get(part);
    if (!circuit) {
      circuit =
        "preset" in info.builtIn
          ? PRESETS[info.builtIn.preset]
          : { ...info.level.reference!(), name: info.label };
      this.builtInCache.set(part, circuit);
    }
    return circuit;
  }

  /** What a level lets on the board: its gate types, and its parts in either version. */
  allowed(level: Level): Allowed {
    const gates = new Set<GateType>();
    const parts = new Set<PartId>();
    for (const ref of level.palette) {
      if (!isPartRef(ref)) {
        gates.add(ref);
        continue;
      }
      const part = partOf(ref);
      parts.add(part);
      const builtIn = this.parts.get(part)?.builtIn;
      if (builtIn && "gate" in builtIn) gates.add(builtIn.gate);
    }
    return { gates, parts };
  }

  /** Whether a stored solution still passes its level. Cached per circuit object. */
  passes(level: Level, circuit: Circuit): boolean {
    let result = verified.get(circuit);
    if (result === undefined) {
      try {
        const start = levelStart(level);
        result = gradePassed(gradeLevel(circuit, level, start.locked, this.allowed(level)));
      } catch {
        result = false;
      }
      verified.set(circuit, result);
    }
    return result;
  }

  /** The reader's verified solution for the level that makes `part`. */
  solution(part: PartId, progress: Progress): Circuit | undefined {
    const info = this.parts.get(part);
    const circuit = info && progress.solved[info.level.id]?.circuit;
    return circuit && this.passes(info.level, circuit) ? circuit : undefined;
  }

  /**
   * The reader's part, boxed: their solution with every own part inside it
   * opened from the latest solutions too, up to OWN_DEPTH boxes deep.
   */
  ownModule(part: PartId, progress: Progress, depth = 1): Circuit | undefined {
    const info = this.parts.get(part);
    const solution = this.solution(part, progress);
    if (!info || !solution) return undefined;
    let byDepth = this.ownCache.get(solution);
    if (!byDepth) {
      byDepth = new Map();
      this.ownCache.set(solution, byDepth);
    }
    // Nested parts are rebuilt from the current solutions, so cache per set of them.
    const key = `${depth}|${Object.entries(progress.solved)
      .map(([id, item]) => `${id}:${item.at}`)
      .join(",")}`;
    const cached = byDepth.get(key);
    if (cached) return cached;
    const nodes = solution.nodes.map((node): Node => {
      if (node.type !== "module" || !node.part) return node;
      const own =
        node.module?.name === ownName(this.parts.get(node.part)?.label ?? "") && depth < OWN_DEPTH
          ? this.ownModule(node.part, progress, depth + 1)
          : undefined;
      if (own) return { ...node, module: own };
      return this.builtInNode(node.part, node) ?? node;
    });
    const module: Circuit = { ...solution, name: ownName(info.label), nodes };
    byDepth.set(key, module);
    return module;
  }

  /** `node` turned into the built-in version of `part`, keeping its id, place and label. */
  private builtInNode(part: PartId, node: Node): Node | undefined {
    const info = this.parts.get(part);
    if (!info) return undefined;
    if ("gate" in info.builtIn)
      return { id: node.id, type: info.builtIn.gate, x: node.x, y: node.y, value: false };
    const module = this.builtInModule(part);
    return module ? { ...node, module } : undefined;
  }

  /** Palette entries for a level, or for any list of refs. */
  entries(refs: readonly PaletteRef[], progress: Progress): PaletteEntry[] {
    return refs.map((ref): PaletteEntry => {
      if (!isPartRef(ref)) return { kind: "gate", type: ref };
      const part = partOf(ref);
      const info = this.parts.get(part);
      if (!info) throw new Error(`Unknown tutorial part ${part}`);
      const module = this.builtInModule(part);
      return {
        kind: "part",
        part,
        label: info.label,
        level: info.level,
        own: this.ownModule(part, progress),
        builtIn: module ? { circuit: module } : { gate: (info.builtIn as { gate: GateType }).gate },
      };
    });
  }

  /** The parts the feedback can spot in a reader's gates. */
  known(level: Level): KnownPart[] {
    const known: KnownPart[] = [];
    for (const ref of level.palette) {
      if (!isPartRef(ref)) continue;
      const info = this.parts.get(partOf(ref));
      const spec = info?.level.spec;
      if (!info || spec?.kind !== "truth") continue;
      known.push({
        part: info.part,
        label: info.label,
        inputs: spec.inputs.length,
        outputs: spec.outputs.length,
        fn: spec.fn,
      });
    }
    return known;
  }
}

/** Which version a palette click places, for the reader's setting. */
export function chosenVersion(
  entry: Extract<PaletteEntry, { kind: "part" }>,
  mode: OwnPartsMode,
): "own" | "built-in" | "locked" {
  if (mode === "built-in") return "built-in";
  if (entry.own) return "own";
  return mode === "only-mine" ? "locked" : "built-in";
}

/** A board node for a palette part, without an id or position yet. */
export function partNode(
  entry: Extract<PaletteEntry, { kind: "part" }>,
  version: "own" | "built-in",
): Omit<Node, "id" | "x" | "y"> {
  if (version === "own" && entry.own)
    return { type: "module", module: entry.own, part: entry.part, label: entry.label };
  if ("gate" in entry.builtIn) return { type: entry.builtIn.gate, value: false };
  return { type: "module", module: entry.builtIn.circuit, part: entry.part, label: entry.label };
}
