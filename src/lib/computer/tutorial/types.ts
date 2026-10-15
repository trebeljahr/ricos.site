// The data a tutorial level is made of. A level is plain data plus a few pure
// functions: the builder reads it to scope its palette, lock the pre-placed
// parts, check the reader's wiring and anchor hints in the canvas. Nothing here
// knows about React.
import type { Circuit, GateType, Node } from "../logic";

/** A part made by a tutorial level, e.g. "xor" or "full-adder". */
export type PartId = string;

/** One palette entry: a built-in part type, or a part an earlier level makes. */
export type PaletteRef = GateType | `part:${PartId}`;

/** A locked switch, clock or lamp of a level, between which the reader wires. */
export type LevelPort = {
  id: string;
  /** Label on the board, e.g. "CARRY IN". It also names the port of the boxed part. */
  label: string;
  /** Column heading in the truth table, e.g. "CIN". Defaults to the label. */
  short?: string;
  /** Inputs only: a clock instead of a switch. */
  clock?: boolean;
};

export type TruthSpec = {
  kind: "truth";
  inputs: LevelPort[];
  outputs: LevelPort[];
  /** Output bits for one row of input bits, both in port order. */
  fn: (inputs: boolean[]) => boolean[];
  /** The rows to check when every row would be too many. Default: every row. */
  rows?: boolean[][];
};

/** One tick of a sequence test: set some inputs, settle, read the lamps. */
export type SequenceTick = {
  /** Switch values from this tick on; the others keep their last value. */
  set?: Record<string, boolean>;
  /** Clock level from this tick on; it starts low. */
  clock?: boolean;
  /** Lamp values after the tick settles. Lamps left out are not checked. */
  expect?: Record<string, boolean>;
  /** What the tick does, shown when it fails, e.g. "Store 1 on the rising edge." */
  note: string;
};

export type SequenceSpec = {
  kind: "sequence";
  inputs: LevelPort[];
  outputs: LevelPort[];
  ticks: SequenceTick[];
};

/** A check the level supplies itself, e.g. running programs on the reader's CPU. */
export type CustomGrade = {
  pass: boolean;
  /** One sentence: what passed, or what went wrong first. */
  summary: string;
  /** Problems that stop the check before it runs, one sentence each. */
  problems?: string[];
  /** A comparison table, e.g. expected and actual register values. */
  table?: { head: string[]; rows: string[][] };
  /** Node outlined as the likely cause. */
  highlight?: string;
  /** "Show me" for a failure: load this circuit and run this many half cycles. */
  replay?: { circuit: Circuit; halfCycles: number; message?: string };
};

export type CustomSpec = {
  kind: "custom";
  /** What the check runs, shown above the check button, e.g. "Two test programs". */
  describe: string;
  grade: (circuit: Circuit) => CustomGrade;
};

export type LevelSpec = TruthSpec | SequenceSpec | CustomSpec;

/** Where a hint points: a part, one of its ports, a palette entry, or the check button. */
export type HintAnchor =
  | { kind: "node"; id: string }
  | { kind: "input"; node: string; index: number }
  | { kind: "output"; node: string; index?: number }
  | { kind: "palette"; part: PaletteRef }
  | { kind: "check" };

/** What a step or hint can see when it decides whether it is done or shown. */
export type TutorialContext = {
  circuit: Circuit;
  /** Ids of reader nodes matched to reference node ids, see matcher.ts. */
  match: ReadonlyMap<string, string>;
  /** Whether every checked row or tick passes right now. */
  passing: boolean;
  /** The level's reference solution, when it has one. */
  reference?: Circuit;
};

export type TutorialStep = {
  /** One or two sentences: what to do now. */
  text: string;
  /** Where the callout points while this step is current. */
  anchor?: HintAnchor | ((context: TutorialContext) => HintAnchor | undefined);
  /** True once the step is done; the next step then shows by itself. */
  done: (context: TutorialContext) => boolean;
  /**
   * What "Show me" does: places the next part or wire of the reference
   * solution. Default: the next missing part or wire, see matcher.ts.
   */
  show?: (context: TutorialContext) => Circuit | undefined;
};

/** A hint shown on request ("Hint"), or by itself when `when` is true. */
export type LevelHint = {
  text: string;
  anchor?: HintAnchor;
  /** Show it without being asked, e.g. after two failed checks. */
  when?: (context: TutorialContext & { checks: number }) => boolean;
};

export type ChapterLink = { number: string; title: string; href: string };

/** The built-in version of a part: a gate type, or a preset circuit by name. */
export type BuiltIn = { gate: GateType } | { preset: string } | { reference: true };

export type Level = {
  id: string;
  title: string;
  section: string;
  /** The NandGame level this one follows, if any. */
  nandgame?: string;
  chapter?: ChapterLink;
  /** One or two sentences: what the outputs must do. */
  goal: string;
  /** A short paragraph shown before the reader starts. */
  intro?: string;
  spec: LevelSpec;
  /** Parts the palette offers. Nothing else may sit on the board. */
  palette: PaletteRef[];
  /** The part this level makes, for the palettes of later levels. */
  makes?: { part: PartId; label: string; builtIn: BuiltIn };
  /**
   * The start circuit and the ids of its locked nodes. Default: the spec's
   * ports, laid out left and right, with nothing between them.
   */
  start?: () => { circuit: Circuit; locked: string[]; enforce?: (circuit: Circuit) => Circuit };
  /** A working solution from palette parts: for "Show me", the feedback and the built-in part. */
  reference?: () => Circuit;
  /** Guided steps. Early levels have them; later levels give only the goal and the spec. */
  steps?: TutorialStep[];
  hints?: LevelHint[];
  /** Extra structure rules, one sentence per problem; the check stops on them. */
  rules?: (circuit: Circuit) => string[];
  /** Off the main path: the next level opens without it. */
  optional?: boolean;
};

/** A boxed part on the board: a module node, tagged with the part it implements. */
export type PartNode = Node & { type: "module"; part: PartId };
