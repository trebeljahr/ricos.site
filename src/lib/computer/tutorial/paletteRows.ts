// One row of the builder's parts list. A part made by a tutorial level shows
// the version the reader's setting picks, a chip for the other version, and a
// "yours" mark when it places the reader's own, checked circuit. In "only mine"
// mode a part the reader has not built yet links to the level that builds it.
import { type Circuit, type GateType, LABELS, type Node } from "../logic";
import { chosenVersion, type PaletteEntry, type PartCatalog, partNode } from "./parts";
import type { OwnPartsMode, Progress } from "./progress";

/** What a click or drop places: a built-in part type, or a boxed circuit. */
export type Placement = { type: GateType } | { circuit: Circuit; extra: Partial<Node> };

export type PaletteRow = {
  /** Unique within one palette; also the hint anchor, e.g. "part:xor" or "nand". */
  key: string;
  label: string;
  icon: { type: GateType } | { circuit: Circuit };
  title: string;
  /** Undefined while the part is locked. */
  primary?: Placement;
  /** The main entry places the reader's own part. */
  ownPrimary: boolean;
  /** The other version, as a small chip beside the entry. */
  secondary?: { text: string; title: string; placement: Placement };
  locked?: { text: string; href: string };
};

export const TUTORIAL_PATH = "/computer/build-from-nand";
export const levelHref = (level: string) => `${TUTORIAL_PATH}?level=${encodeURIComponent(level)}`;

const placementOf = (node: Omit<Node, "id" | "x" | "y">): Placement =>
  node.type === "module" && node.module
    ? { circuit: node.module, extra: { part: node.part, label: node.label } }
    : { type: node.type };

/** A plain row for a built-in part type with no tutorial versions. */
export const gateRow = (type: GateType): PaletteRow => ({
  key: type,
  label: LABELS[type],
  icon: { type },
  title: `Drag ${LABELS[type]} onto canvas or click to add`,
  primary: { type },
  ownPrimary: false,
});

/** A row for a part with a built-in and maybe an own version. */
export function partRow(
  entry: Extract<PaletteEntry, { kind: "part" }>,
  mode: OwnPartsMode,
  options: {
    key?: string;
    label?: string;
    icon?: PaletteRow["icon"];
    /** Replaces the built-in placement, e.g. a preset laid out for display. */
    builtIn?: Placement;
    /** Tooltip of the built-in version. */
    builtInTitle?: string;
  } = {},
): PaletteRow {
  const label = options.label ?? entry.label;
  let version = chosenVersion(entry, mode);
  // Optional levels (the CMOS gates) never lock their part: NAND stays the given.
  if (version === "locked" && entry.level.optional) version = "built-in";
  const own = entry.own ? placementOf(partNode(entry, "own")) : undefined;
  const builtIn = options.builtIn ?? placementOf(partNode(entry, "built-in"));
  const icon =
    (version === "own" && entry.own ? { circuit: entry.own } : undefined) ?? options.icon ??
    ("gate" in entry.builtIn ? { type: entry.builtIn.gate } : { circuit: entry.builtIn.circuit });
  const ownTitle = `Your ${label}, checked against every row of “${entry.level.title}”. Click to add or drag onto the board.`;
  const builtInTitle =
    options.builtInTitle ?? `The built-in ${label}. Click to add or drag onto the board.`;
  if (version === "locked")
    return {
      key: options.key ?? `part:${entry.part}`,
      label,
      icon,
      title: `You have not built ${label} yet. Build it in “${entry.level.title}”, or switch My parts to Built-in.`,
      ownPrimary: false,
      locked: { text: "Build it", href: levelHref(entry.level.id) },
    };
  return {
    key: options.key ?? `part:${entry.part}`,
    label,
    icon,
    title: version === "own" ? ownTitle : builtInTitle,
    primary: version === "own" ? own : builtIn,
    ownPrimary: version === "own",
    secondary:
      version === "own"
        ? { text: "built-in", title: builtInTitle, placement: builtIn }
        : own
          ? { text: "yours", title: ownTitle, placement: own }
          : undefined,
  };
}

/** Rows for a level's palette, in palette order. */
export function levelRows(
  catalog: PartCatalog,
  refs: Parameters<PartCatalog["entries"]>[0],
  progress: Progress,
): PaletteRow[] {
  return catalog
    .entries(refs, progress)
    .map((entry) =>
      entry.kind === "gate" ? gateRow(entry.type) : partRow(entry, progress.settings.ownParts),
    );
}

/** The part a built-in gate type or preset stands for, as a palette entry, if any. */
export function entryFor(
  catalog: PartCatalog,
  progress: Progress,
  source: { gate: GateType } | { preset: string },
) {
  const part =
    "gate" in source ? catalog.gateParts.get(source.gate) : catalog.presetParts.get(source.preset);
  if (!part) return undefined;
  const [entry] = catalog.entries([`part:${part}`], progress);
  return entry?.kind === "part" ? entry : undefined;
}

/** Own parts that no gate type or preset stands for, e.g. a 4-bit adder: for a "Your parts" list. */
export function extraOwnRows(catalog: PartCatalog, progress: Progress): PaletteRow[] {
  const covered = new Set([...catalog.gateParts.values(), ...catalog.presetParts.values()]);
  return [...catalog.parts.keys()]
    .filter((part) => !covered.has(part))
    .flatMap((part) => {
      const [entry] = catalog.entries([`part:${part}`], progress);
      return entry?.kind === "part" && entry.own ? [partRow(entry, "mine")] : [];
    });
}
