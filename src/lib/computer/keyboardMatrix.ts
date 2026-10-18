import { Builder, type Ref } from "./blockBuilder";
import { type Circuit, initialSnapshot, type Snapshot, step } from "./logic";

export type MatrixSize = { rows: number; columns: number };
export type MatrixKey = { label: string; plain?: string; shifted?: string; modifier?: true };
export const keyId = (row: number, column: number) => `key-${row}-${column}`;
export function checkSize({ rows, columns }: MatrixSize) {
  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(columns) ||
    rows < 2 ||
    rows > 6 ||
    columns < 2 ||
    columns > 15
  )
    throw new Error("Matrix dimensions must be 2–6 rows and 2–15 columns.");
}

/** US ANSI QWERTY positions, 6 × 15 electrical slots; absent physical keys are empty slots. */
export const US_ANSI: readonly (readonly string[])[] = [
  ["Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace", "`"],
  ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", ""],
  ["Caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter", "", ""],
  ["Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Shift", "", "", ""],
  [
    "Ctrl",
    "Meta",
    "Alt",
    "Space",
    "Alt",
    "Meta",
    "Menu",
    "Ctrl",
    "Left",
    "Down",
    "Up",
    "Right",
    "",
    "",
    "",
  ],
  [
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
    "Delete",
    "Home",
    "End",
  ],
];
export function matrixKeys(size: MatrixSize, ansi = false): MatrixKey[] {
  checkSize(size);
  const shift: Record<string, string> = Object.fromEntries(
    Array.from("1234567890-=[]\\;',./").map((c, i) => [c, Array.from('!@#$%^&*()_+{}|:"<>?')[i]]),
  );
  return Array.from({ length: size.rows * size.columns }, (_, index) => {
    const r = Math.floor(index / size.columns),
      c = index % size.columns;
    const label = ansi
      ? (US_ANSI[r]?.[c] ?? "")
      : index === size.columns
        ? "Shift"
        : String.fromCharCode(65 + (index % 26));
    if (label === "Shift") return { label, modifier: true };
    const plain = /^[A-Z]$/.test(label)
      ? label.toLowerCase()
      : label === "Space"
        ? " "
        : label.length === 1
          ? label
          : undefined;
    return {
      label,
      plain,
      shifted: /^[A-Z]$/.test(label)
        ? label
        : plain
          ? plain === "`"
            ? "~"
            : (shift[plain] ?? plain)
          : undefined,
    };
  });
}

/** Active-low electrical model: one row sinks to 0, all other rows are high-Z, columns have pull-ups.
 * COL→ROW diodes conduct conventional current from pulled-up columns into the selected row.
 * Without diodes, low propagates through the entire undirected closed-switch component. */
export function senseMatrix(
  size: MatrixSize,
  held: readonly boolean[],
  row: number,
  diodes: boolean,
): boolean[] {
  checkSize(size);
  if (!Number.isInteger(row) || row < 0 || row >= size.rows) throw new Error("Invalid scan row");
  const lowRows = new Set([row]),
    lowCols = new Set<number>();
  for (let pass = 0; pass < size.rows + size.columns; pass++) {
    const before = lowRows.size + lowCols.size;
    for (let r = 0; r < size.rows; r++)
      for (let c = 0; c < size.columns; c++) {
        if (!held[r * size.columns + c]) continue;
        if (lowRows.has(r)) lowCols.add(c);
        if (!diodes && lowCols.has(c)) lowRows.add(r);
      }
    if (lowRows.size + lowCols.size === before) break;
  }
  return Array.from({ length: size.columns }, (_, c) => lowCols.has(c));
}

/** Logical switch/diode abstraction: 1 on ROW ACTIVE means an electrical low drive;
 * 1 on SENSE LOW means a pulled-up column was pulled to 0. No analog voltage or current model. */
export function matrixRowCircuit(columns: number): Circuit {
  checkSize({ rows: 2, columns });
  const b = new Builder();
  b.add("row", "switch", 30, 30, "ROW ACTIVE (DRIVE 0)");
  for (let c = 0; c < columns; c++) {
    b.add(`key${c}`, "switch", 30, 200 + c * 150, `CONTACT ${c}`);
    const closed = b.gate(
      `closed${c}`,
      "and",
      300,
      200 + c * 150,
      "row",
      `key${c}`,
      "ISOLATED CONTACT",
    );
    b.gate(`col${c}`, "lamp", 550, 200 + c * 150, closed, undefined, `C${c} SENSE LOW`);
  }
  return {
    ...b.circuit(`${columns}-column isolated matrix row`),
    ports: {
      inputs: ["row", ...Array.from({ length: columns }, (_, c) => `key${c}`)],
      outputs: Array.from({ length: columns }, (_, c) => `col${c}`),
    },
  };
}

/** Entire isolated switch matrix, compact row modules plus column OR trees. */
export function matrixCircuit(size: MatrixSize): Circuit {
  checkSize(size);
  const b = new Builder();
  for (let r = 0; r < size.rows; r++) {
    b.add(`row${r}`, "switch", 30, 30 + r * 500, `R${r} ACTIVE (0 ELSE Z)`);
    b.add(`contacts${r}`, "module", 700, 30 + r * 500, `ROW ${r} CONTACTS`, {
      module: matrixRowCircuit(size.columns),
    });
    b.connect(`row${r}`, `contacts${r}`, 0);
    for (let c = 0; c < size.columns; c++) {
      const id = keyId(r, c);
      b.add(id, "pulse", 30 + c * 190, 230 + r * 500, `R${r} C${c}`, { manualMode: "held" });
      b.connect(id, `contacts${r}`, c + 1);
    }
  }
  for (let c = 0; c < size.columns; c++) {
    const source = b.orTree(
      `col${c}`,
      Array.from({ length: size.rows }, (_, r): Ref => [`contacts${r}`, c]),
      1100,
      30 + c * 150,
    );
    b.gate(`sense${c}`, "lamp", 1800, 30 + c * 150, source, undefined, `C${c} SENSE LOW`);
  }
  return b.circuit(`${size.rows} × ${size.columns} isolated matrix`);
}

/** Two-by-two diode-free graph, expressed as settling Boolean paths, for gate inspection. */
export function ghostMatrixCircuit(): Circuit {
  const b = new Builder();
  for (let r = 0; r < 2; r++) b.add(`row${r}`, "switch", 30, 30 + r * 150, `R${r} ACTIVE`);
  for (let i = 0; i < 4; i++)
    b.add(keyId(i >> 1, i & 1), "switch", 30, 350 + i * 150, `CONTACT ${i >> 1},${i & 1}`);
  let rows: Ref[] = ["row0", "row1"],
    cols: Ref[] = [];
  // Every simple alternating path in this four-vertex graph has at most three edges.
  for (let stage = 0; stage < 2; stage++) {
    cols = [0, 1].map((c) =>
      b.orTree(
        `c${stage}-${c}`,
        [0, 1].map((r) =>
          b.gate(
            `rc${stage}-${r}-${c}`,
            "and",
            300 + stage * 600,
            30 + (r * 2 + c) * 150,
            rows[r],
            keyId(r, c),
          ),
        ),
        500 + stage * 600,
        30 + c * 200,
      ),
    );
    if (stage === 0)
      rows = [0, 1].map((r) =>
        b.orTree(
          `r${stage}-${r}`,
          [
            rows[r],
            ...[0, 1].map((c) =>
              b.gate(`cr${r}-${c}`, "and", 650, 500 + (r * 2 + c) * 150, cols[c], keyId(r, c)),
            ),
          ],
          850,
          500 + r * 200,
        ),
      );
  }
  cols.forEach((source, c) =>
    b.gate(`sense${c}`, "lamp", 1600, 30 + c * 200, source, undefined, `C${c} SENSE LOW`),
  );
  return b.circuit("2 × 2 matrix without isolation diodes");
}

export type KeyEvent = {
  index: number;
  down: boolean;
  code: number;
  shift: boolean;
  character: string | null;
};
export type Scanner = {
  row: number;
  frames: number;
  sampled: boolean[];
  stable: boolean[];
  candidate: boolean[];
  ages: number[];
  events: KeyEvent[];
  dropped: number;
  text: string;
};
export const FIFO_LIMIT = 32;
export function initialScanner(size: MatrixSize): Scanner {
  checkSize(size);
  const bits = () => Array<boolean>(size.rows * size.columns).fill(false);
  return {
    row: 0,
    frames: 0,
    sampled: bits(),
    stable: bits(),
    candidate: bits(),
    ages: Array(size.rows * size.columns).fill(0),
    events: [],
    dropped: 0,
    text: "",
  };
}
/** Controller mapping, separate from electrical scanning: Shift is an independently sampled key. */
export function mapKey(key: MatrixKey, shift: boolean): string | null {
  return (shift ? key.shifted : key.plain) ?? null;
}
export function scanRow(
  state: Scanner,
  size: MatrixSize,
  columnsLow: readonly boolean[],
  keys: readonly MatrixKey[],
  debounceFrames = 2,
): Scanner {
  if (!Number.isInteger(debounceFrames) || debounceFrames < 1 || debounceFrames > 10)
    throw new Error("Invalid frame debounce");
  const next: Scanner = {
    ...state,
    sampled: [...state.sampled],
    stable: [...state.stable],
    candidate: [...state.candidate],
    ages: [...state.ages],
    events: [...state.events],
  };
  columnsLow.forEach((on, c) => {
    if (c < size.columns) next.sampled[state.row * size.columns + c] = on;
  });
  next.row = (state.row + 1) % size.rows;
  if (next.row) return next;
  next.frames++;
  const changes: number[] = [];
  next.sampled.forEach((on, i) => {
    next.ages[i] = on === next.candidate[i] ? next.ages[i] + 1 : 1;
    next.candidate[i] = on;
    if (next.ages[i] >= debounceFrames && next.stable[i] !== on) {
      next.stable[i] = on;
      changes.push(i);
    }
  });
  // Resolve all modifier states in the completed frame before mapping any letter, independent of row order.
  const shift = keys.some((key, i) => key.modifier && next.stable[i]);
  for (const index of changes) {
    const down = next.stable[index],
      key = keys[index];
    const character = down && key ? mapKey(key, shift) : null;
    const event: KeyEvent = { index, down, code: index + 1, shift, character };
    if (next.events.length < FIFO_LIMIT) next.events.push(event);
    else next.dropped++;
    // Mapping consumes the current transition even when the optional event-log FIFO is full.
    if (character !== null) next.text = (next.text + character).slice(-256);
  }
  return next;
}

/** The controller reads the same gate circuit available in the builder, never a key→character callback. */
export class MatrixMachine {
  readonly circuit: Circuit;
  snapshot: Snapshot;
  readonly ghost: Circuit | null;
  constructor(readonly size: MatrixSize) {
    this.circuit = matrixCircuit(size);
    this.snapshot = initialSnapshot();
    this.ghost = size.rows === 2 && size.columns === 2 ? ghostMatrixCircuit() : null;
  }
  sense(held: readonly boolean[], row: number, diodes: boolean): boolean[] {
    const overrides = Object.fromEntries(
      Array.from({ length: this.size.rows }, (_, r) => [`row${r}`, r === row]),
    );
    held.forEach((on, i) => {
      overrides[keyId(Math.floor(i / this.size.columns), i % this.size.columns)] = on;
    });
    if (diodes || this.ghost) {
      const circuit = diodes ? this.circuit : this.ghost!;
      this.snapshot = step(circuit, initialSnapshot(), false, {}, overrides);
      return Array.from({ length: this.size.columns }, (_, c) =>
        Boolean(this.snapshot.values[`sense${c}`]),
      );
    }
    return senseMatrix(this.size, held, row, false);
  }
}

export const SCANNER_SOURCE = `// 0 means selected row; all other row drivers are high-Z.
// Pull-up columns read 0 through a closed switch and its COL→ROW diode.
for each row:
  drive only this row low
  wait for signals to settle
  sampled[row] = NOT read_columns()
  release row to high-Z
// Commit after the complete scan; require N equal frames per key.
stable = debounce(sampled)
changes = stable XOR previous
shift = stable[LEFT_SHIFT] OR stable[RIGHT_SHIFT]
for each changed key:
  emit(position_code, stable[key], shift)
  if pressed: append(character_map(position_code, shift))
previous = stable`;

const ROW_PRESET = "Matrix row (2 columns)";
const GHOST_PRESET = "Matrix ghosting (2 × 2)";
/** Builder examples for the keyboard-matrix lessons. */
export const MATRIX_PRESETS: Record<string, Circuit> = {
  [ROW_PRESET]: matrixRowCircuit(2),
  [GHOST_PRESET]: ghostMatrixCircuit(),
};
export const MATRIX_HINTS: Record<string, string> = {
  [ROW_PRESET]:
    "ROW ACTIVE enables a low driver. A closed isolated contact produces SENSE LOW. These are logical connectivity signals; column electrical 0 is represented by SENSE LOW 1.",
  [GHOST_PRESET]:
    "One row drives low and the other releases to Z. Close three rectangle corners: without diodes, the fourth can appear sensed through an indirect path. Each gate stage extends the low-reachability path.",
};
