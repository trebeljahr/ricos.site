// Every part a tutorial level makes has two versions: the built-in one (a gate
// type or one of the site's preset circuits) and, once the reader solves the
// level, their own circuit, boxed. A boxed part keeps the reader's gates inside,
// so unfolding it shows their own work, down to the parts it is built from.
import {
  type Circuit,
  type GateType,
  type Node,
  PRESETS,
  moduleInputs,
  moduleOutputs,
} from "../logic";
import {
  builtinCircuit,
  recognitionComponent,
  registerRecognitionComponent,
  verifyCircuitIdentity,
  type SymbolIdentity,
} from "../recognition";
import type { KnownPart } from "./analysis";
import { type Allowed, gradeLevel, gradePassed, gradeTruth, gradeSequence } from "./grade";
import { levelStart } from "./kit";
import type { OwnPartsMode, Progress } from "./progress";
import type { BuiltIn, Level, PaletteRef, PartId } from "./types";

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

const verified = new WeakMap<Circuit, Map<string, boolean>>();

export class PartCatalog {
  readonly parts = new Map<PartId, PartInfo>();
  /** Built-in gate type → the part it stands for, e.g. "not" → "not". */
  readonly gateParts = new Map<GateType, PartId>();
  /** Preset name → the part it stands for, e.g. "Half adder" → "half-adder". */
  readonly presetParts = new Map<string, PartId>();
  private moduleChecks = new WeakMap<Circuit, Map<PartId, boolean>>();
  private builtInCache = new Map<PartId, Circuit>();
  private ownCache = new WeakMap<Circuit, Map<string, Circuit>>();

  constructor(readonly levels: readonly Level[]) {
    for (const level of levels) {
      if (!level.makes) continue;
      const info = { ...level.makes, level };
      this.parts.set(level.makes.part, info);
      if (level.spec.kind !== "custom") {
        const symbols: Record<string, SymbolIdentity> = {
          selector8: "mux",
          adder4: "adder",
          adder8: "adder",
          increment4: "adder",
          subtract4: "adder",
          "logic-unit": "alu",
          "alu-slice": "alu",
          alu8: "alu",
          "sr-latch": "srlatch",
          "d-latch": "dlatch",
          "d-flip-flop": "dff",
          register1: "register",
          register8: "register",
          counter8: "counter",
          ram: "memory",
        };
        const symbol =
          recognitionComponent(info.part)?.symbol ??
          symbols[info.part] ??
          ("gate" in info.builtIn ? info.builtIn.gate : "module");
        registerRecognitionComponent({
          id: info.part,
          label: info.label,
          symbol,
          ...(recognitionComponent(info.part)?.counterMode
            ? { counterMode: recognitionComponent(info.part)!.counterMode }
            : {}),
          inputs: level.spec.inputs.map((port) => port.label),
          outputs: level.spec.outputs.map((port) => port.label),
          ...(level.spec.kind === "truth" ? { evaluate: level.spec.fn } : {}),
          checkConstruction: (circuit: Circuit) => this.passes(level, circuit),
          ...(level.spec.kind === "sequence" || (level.spec.kind === "truth" && level.spec.rows)
            ? {
                verificationLabel:
                  level.spec.kind === "sequence" ? "sequence checked" : "sample checked",
              }
            : {}),
        });
      }
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
      circuit = builtinCircuit(part, circuit);
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
    return {
      gates,
      parts,
      verifyPart: (node) => {
        const inner = node.module;
        const info = node.part && this.parts.get(node.part);
        if (!inner || !info || info.level.spec.kind === "custom") return false;
        let checks = this.moduleChecks.get(inner);
        if (!checks) {
          checks = new Map();
          this.moduleChecks.set(inner, checks);
        }
        const cached = checks.get(info.part);
        if (cached !== undefined) return cached;
        const spec = info.level.spec;
        const ins = moduleInputs(inner),
          outs = moduleOutputs(inner);
        if (ins.length !== spec.inputs.length || outs.length !== spec.outputs.length) return false;
        // A label is no proof. Check the boxed implementation through its real port order.
        const mapped = {
          ...spec,
          inputs: spec.inputs.map((p, i) => ({ ...p, id: ins[i].id })),
          outputs: spec.outputs.map((p, i) => ({ ...p, id: outs[i].id })),
        };
        let pass = false;
        if (spec.kind === "truth")
          pass = gradeTruth(inner, {
            ...spec,
            inputs: mapped.inputs,
            outputs: mapped.outputs,
          }).pass;
        else {
          const ids = new Map([
            ...spec.inputs.map((p, i) => [p.id, ins[i].id] as const),
            ...spec.outputs.map((p, i) => [p.id, outs[i].id] as const),
          ]);
          const rename = (values?: Record<string, boolean>) =>
            values &&
            Object.fromEntries(Object.entries(values).map(([id, bit]) => [ids.get(id) ?? id, bit]));
          pass = gradeSequence(inner, {
            ...spec,
            inputs: mapped.inputs,
            outputs: mapped.outputs,
            ticks: spec.ticks.map((tick) => ({
              ...tick,
              set: rename(tick.set),
              expect: rename(tick.expect),
            })),
          }).pass;
        }
        checks.set(info.part, pass);
        return pass;
      },
    };
  }

  /** Whether a stored solution still passes its level. Cached per circuit object. */
  passes(level: Level, circuit: Circuit): boolean {
    let results = verified.get(circuit);
    if (!results) {
      results = new Map();
      verified.set(circuit, results);
    }
    let result = results.get(level.id);
    if (result === undefined) {
      try {
        const start = levelStart(level);
        result = gradePassed(gradeLevel(circuit, level, start.locked, this.allowed(level)));
      } catch {
        result = false;
      }
      results.set(level.id, result);
    }
    return result;
  }

  /** The reader's verified solution for the level that makes `part`. */
  solution(part: PartId, progress: Progress): Circuit | undefined {
    const info = this.parts.get(part);
    const circuit = info && progress.solved[info.level.id]?.circuit;
    return circuit && this.passes(info.level, circuit) ? circuit : undefined;
  }

  /** The exact checked implementation, including nested learner-built modules. */
  ownModule(part: PartId, progress: Progress): Circuit | undefined {
    const info = this.parts.get(part);
    const solution = this.solution(part, progress);
    if (!info || !solution) return undefined;
    let cachedParts = this.ownCache.get(solution);
    if (!cachedParts) {
      cachedParts = new Map();
      this.ownCache.set(solution, cachedParts);
    }
    const cached = cachedParts.get(part);
    if (cached) return cached;
    const raw: Circuit = { ...solution, name: ownName(info.label), identity: undefined };
    const spec = info.level.spec;
    const module =
      spec.kind !== "custom"
        ? (verifyCircuitIdentity(
            raw,
            {
              inputs: spec.inputs.map((port) => port.id),
              outputs: spec.outputs.map((port) => port.id),
            },
            part,
          ) ?? raw)
        : raw;
    cachedParts.set(part, module);
    return module;
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
