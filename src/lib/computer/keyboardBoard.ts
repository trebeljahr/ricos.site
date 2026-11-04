import type { MatrixKey, MatrixSize } from "./keyboardMatrix";

/** One physical key: where it sits on the plate and where it sits in the switch matrix. */
export type BoardKey = {
  code: string;
  /** Position and size in key widths, measured from the plate's top-left corner. */
  x: number;
  y: number;
  w: number;
  h: number;
  row: number;
  column: number;
  /** The switch under the cap, where its row and column wires meet. */
  contactX: number;
  contactY: number;
  /** Index of this key's bit in the scanner: `row × columns + column`. */
  index: number;
  name: string;
  /** Words printed on a key that types no character of its own. */
  legend?: string;
  plain?: string;
  shifted?: string;
  /** An ISO Enter: two rows tall with its lower-left corner cut away. */
  isoEnter?: true;
};

export type Physical = "ansi" | "iso";
/** What each key prints, by `KeyboardEvent.code`: plain, then with Shift. */
export type CharMap = Record<string, readonly [plain: string, shifted?: string]>;
export type KeyboardLayout = {
  name: string;
  physical: Physical;
  /** macOS reports the two ISO keys beside 1 and beside Z under each other's codes. */
  swapIsoKeys: boolean;
  chars: CharMap;
};
export type Board = {
  keys: BoardKey[];
  byCode: ReadonlyMap<string, BoardKey>;
  matrixKeys: MatrixKey[];
  capsIndex: number;
  rowWires: string[];
  columnWires: string[];
};

export const MATRIX: MatrixSize = { rows: 6, columns: 15 };
export const PLATE_WIDTH = 15;
export const PLATE_ROWS = 6;

type Slot = readonly [code: string, width: number];
const unit = (codes: string) => codes.split(" ").map((code): Slot => [code, 1]);
const letters = (row: string) => Array.from(row).map((c): Slot => [`Key${c}`, 1]);

const FUNCTION_ROW: Slot[] = [
  ["Escape", 1.5],
  ...unit("F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12"),
  ["Delete", 1.5],
];
const DIGITS = unit("Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0");
const BOTTOM_ROW: Slot[] = [
  ["ControlLeft", 1.25],
  ["AltLeft", 1.25],
  ["MetaLeft", 1.25],
  ["Space", 6.25],
  ["MetaRight", 1],
  ["AltRight", 1],
  ...unit("ArrowLeft ArrowDown ArrowRight"),
];

function plateRows(physical: Physical, swapIsoKeys: boolean): Slot[][] {
  if (physical === "ansi")
    return [
      FUNCTION_ROW,
      [["Backquote", 1], ...DIGITS, ...unit("Minus Equal"), ["Backspace", 2]],
      [
        ["Tab", 1.5],
        ...letters("QWERTYUIOP"),
        ...unit("BracketLeft BracketRight"),
        ["Backslash", 1.5],
      ],
      [["CapsLock", 1.75], ...letters("ASDFGHJKL"), ...unit("Semicolon Quote"), ["Enter", 2.25]],
      [
        ["ShiftLeft", 2.25],
        ...letters("ZXCVBNM"),
        ...unit("Comma Period Slash"),
        ["ShiftRight", 1.75],
        ["ArrowUp", 1],
      ],
      BOTTOM_ROW,
    ];
  const [beside1, besideZ] = swapIsoKeys
    ? ["IntlBackslash", "Backquote"]
    : ["Backquote", "IntlBackslash"];
  return [
    FUNCTION_ROW,
    [[beside1, 1], ...DIGITS, ...unit("Minus Equal"), ["Backspace", 2]],
    [["Tab", 1.5], ...letters("QWERTYUIOP"), ...unit("BracketLeft BracketRight")],
    [
      ["CapsLock", 1.75],
      ...letters("ASDFGHJKL"),
      ...unit("Semicolon Quote Backslash"),
      ["Enter", 1.25],
    ],
    [
      ["ShiftLeft", 1.25],
      [besideZ, 1],
      ...letters("ZXCVBNM"),
      ...unit("Comma Period Slash"),
      ["ShiftRight", 1.75],
      ["ArrowUp", 1],
    ],
    BOTTOM_ROW,
  ];
}

const LEGENDS: Record<string, string> = {
  Escape: "esc",
  Delete: "del",
  Backspace: "bksp",
  Tab: "tab",
  CapsLock: "caps",
  Enter: "enter",
  ShiftLeft: "shift",
  ShiftRight: "shift",
  ControlLeft: "ctrl",
  Space: "",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
};
for (let n = 1; n <= 12; n++) LEGENDS[`F${n}`] = `F${n}`;

const SPOKEN: Record<string, string> = {
  Escape: "Escape",
  Delete: "Delete",
  Backspace: "Backspace",
  Tab: "Tab",
  CapsLock: "Caps Lock",
  Enter: "Enter",
  ShiftLeft: "Left Shift",
  ShiftRight: "Right Shift",
  ControlLeft: "Control",
  Space: "Space",
  ArrowLeft: "Left arrow",
  ArrowRight: "Right arrow",
  ArrowUp: "Up arrow",
  ArrowDown: "Down arrow",
};

/** The characters of keys whose legend is a word. */
const CONTROL_CHARS: Record<string, string> = {
  Enter: "\n",
  Backspace: "\b",
  Tab: "\t",
  Space: " ",
};

const SHIFT_CODES = new Set(["ShiftLeft", "ShiftRight"]);

const ALL_LETTERS = "QWERTYUIOPASDFGHJKLZXCVBNM";
function charsWith(symbols: CharMap, swapLetters: Record<string, string> = {}): CharMap {
  const map: Record<string, readonly [string, string?]> = {};
  for (const letter of ALL_LETTERS) {
    const printed = swapLetters[letter] ?? letter;
    map[`Key${letter}`] = [printed.toLowerCase(), printed];
  }
  return { ...map, ...symbols };
}

const digitChars = (shifted: string): CharMap =>
  Object.fromEntries(
    Array.from(shifted).map((s, i) => [`Digit${(i + 1) % 10}`, [String((i + 1) % 10), s]]),
  );

const US_CHARS = charsWith({
  ...digitChars("!@#$%^&*()"),
  Backquote: ["`", "~"],
  Minus: ["-", "_"],
  Equal: ["=", "+"],
  BracketLeft: ["[", "{"],
  BracketRight: ["]", "}"],
  Backslash: ["\\", "|"],
  Semicolon: [";", ":"],
  Quote: ["'", '"'],
  Comma: [",", "<"],
  Period: [".", ">"],
  Slash: ["/", "?"],
  IntlBackslash: ["\\", "|"],
});

const GERMAN_CHARS = charsWith(
  {
    ...digitChars('!"§$%&/()='),
    Backquote: ["^", "°"],
    Minus: ["ß", "?"],
    Equal: ["´", "`"],
    BracketLeft: ["ü", "Ü"],
    BracketRight: ["+", "*"],
    Backslash: ["#", "'"],
    Semicolon: ["ö", "Ö"],
    Quote: ["ä", "Ä"],
    Comma: [",", ";"],
    Period: [".", ":"],
    Slash: ["-", "_"],
    IntlBackslash: ["<", ">"],
  },
  { Y: "Z", Z: "Y" },
);

export const US_LAYOUT: KeyboardLayout = {
  name: "US QWERTY",
  physical: "ansi",
  swapIsoKeys: false,
  chars: US_CHARS,
};

export const germanLayout = (swapIsoKeys = false): KeyboardLayout => ({
  name: "German QWERTZ",
  physical: "iso",
  swapIsoKeys,
  chars: GERMAN_CHARS,
});

/** A starting guess where the browser cannot name the layout. Real key presses refine it. */
export function layoutFromLanguage(language: string, mac: boolean): KeyboardLayout {
  return /^de\b/i.test(language) ? germanLayout(mac) : US_LAYOUT;
}

/**
 * The layout `navigator.keyboard.getLayoutMap()` reports. It gives each key's
 * plain character only, so Shift comes from the known table for that character,
 * or from the capital of a letter.
 */
export function layoutFromMap(map: ReadonlyMap<string, string>): KeyboardLayout {
  const german = map.get("KeyY") === "z";
  const base = german ? GERMAN_CHARS : US_CHARS;
  const shiftedOf = new Map(Object.values(base).map(([plain, shifted]) => [plain, shifted]));
  const chars: Record<string, readonly [string, string?]> = {};
  for (const [code, value] of map) {
    if (code.startsWith("Numpad") || !value) continue;
    const plain = value.toLowerCase();
    const upper = plain.toUpperCase();
    chars[code] = [plain, shiftedOf.get(plain) ?? (upper !== plain ? upper : undefined)];
  }
  const family = map.get("KeyQ") === "a" ? "AZERTY" : german ? "QWERTZ" : "QWERTY";
  const backslash = map.get("Backslash");
  const physical: Physical =
    german || (backslash !== undefined && backslash !== "\\") ? "iso" : "ansi";
  return {
    name: family,
    physical,
    swapIsoKeys: physical === "iso" && map.get("Backquote") === "<",
    chars: { ...base, ...chars },
  };
}

/**
 * What one real key press says about the keyboard, for browsers without the
 * layout API: Y and Z trading places, or a key only ISO boards have.
 */
export function layoutFromKeyPress(
  current: KeyboardLayout,
  code: string,
  key: string,
  mac: boolean,
): KeyboardLayout | null {
  const lower = key.toLowerCase();
  if (current.chars !== GERMAN_CHARS && code === "KeyY" && lower === "z") return germanLayout(mac);
  if (current.physical === "ansi" && code === "IntlBackslash")
    return { ...current, physical: "iso", swapIsoKeys: mac };
  return null;
}

/** Assign columns left to right, each as near its key's centre as the keys beside it allow. */
function assignColumns(row: readonly Slot[]): number[] {
  let x = 0;
  const columns: number[] = [];
  for (const [, width] of row) {
    const wanted = Math.round(x + width / 2 - 0.5);
    columns.push(Math.max(wanted, (columns.at(-1) ?? -1) + 1));
    x += width;
  }
  let ceiling = MATRIX.columns - 1;
  for (let i = row.length - 1; i >= 0; i--) {
    columns[i] = Math.min(columns[i], ceiling);
    ceiling = columns[i] - 1;
  }
  return columns;
}

/** Where column `c` leaves the plate, towards the column sense chip. */
export const columnX = (column: number) => column + 0.5;
const CONTACT_DROP = 0.76;

export function buildBoard(layout: KeyboardLayout, mac = false): Board {
  const legends: Record<string, string> = {
    ...LEGENDS,
    AltLeft: mac ? "opt" : "alt",
    AltRight: mac ? "opt" : "alt",
    MetaLeft: mac ? "cmd" : "win",
    MetaRight: mac ? "cmd" : "win",
  };
  const spoken: Record<string, string> = {
    ...SPOKEN,
    AltLeft: mac ? "Left Option" : "Left Alt",
    AltRight: mac ? "Right Option" : "Right Alt",
    MetaLeft: mac ? "Left Command" : "Left Windows",
    MetaRight: mac ? "Right Command" : "Right Windows",
  };
  const keys: BoardKey[] = [];
  plateRows(layout.physical, layout.swapIsoKeys).forEach((slots, row) => {
    const columns = assignColumns(slots);
    let x = 0;
    slots.forEach(([code, width], i) => {
      const isoEnter = code === "Enter" && layout.physical === "iso";
      const column = columns[i];
      const control = CONTROL_CHARS[code];
      const [plain, shifted] = control ? [control, control] : (layout.chars[code] ?? []);
      keys.push({
        code,
        x: isoEnter ? 13.5 : x,
        y: isoEnter ? row - 1 : row,
        w: isoEnter ? 1.5 : width,
        h: isoEnter ? 2 : 1,
        row,
        column,
        contactX: Math.min(Math.max(columnX(column), x + 0.22), x + width - 0.22),
        contactY: row + CONTACT_DROP,
        index: row * MATRIX.columns + column,
        name: spoken[code] ?? plain?.toUpperCase() ?? code,
        legend: legends[code],
        plain,
        shifted,
        ...(isoEnter ? { isoEnter: true as const } : {}),
      });
      x += width;
    });
  });

  const matrixKeys: MatrixKey[] = Array.from({ length: MATRIX.rows * MATRIX.columns }, () => ({
    label: "",
  }));
  for (const key of keys)
    matrixKeys[key.index] = {
      label: key.code,
      plain: key.plain,
      shifted: key.shifted,
      ...(SHIFT_CODES.has(key.code) ? { modifier: true as const } : {}),
    };

  const rowWires = Array.from({ length: MATRIX.rows }, (_, row) => {
    const end = Math.max(...keys.filter((key) => key.row === row).map((key) => key.contactX));
    return `M 0 ${row + CONTACT_DROP} H ${end}`;
  });

  // A column climbs from the sense chip, stepping sideways in the gap below
  // each row to reach that row's switch.
  const columnWires = Array.from({ length: MATRIX.columns }, (_, column) => {
    let x = columnX(column);
    let path = `M ${x} ${PLATE_ROWS}`;
    for (let row = MATRIX.rows - 1; row >= 0; row--) {
      const key = keys.find((k) => k.row === row && k.column === column);
      if (!key) continue;
      if (key.contactX !== x) {
        path += ` V ${row + 1} H ${key.contactX}`;
        x = key.contactX;
      }
      path += ` V ${key.contactY}`;
    }
    return path;
  });

  return {
    keys,
    byCode: new Map(keys.map((key) => [key.code, key])),
    matrixKeys,
    capsIndex: keys.find((key) => key.code === "CapsLock")?.index ?? -1,
    rowWires,
    columnWires,
  };
}

/** A letter prints only its capital; any other key prints its Shift character above its plain one. */
export function keyLegends(key: BoardKey): { top?: string; bottom: string } {
  if (key.legend !== undefined) return { bottom: key.legend };
  const { plain, shifted } = key;
  if (plain === undefined) return { bottom: "" };
  const upper = plain.toUpperCase();
  if (upper !== plain && (shifted === upper || shifted === undefined)) return { bottom: upper };
  return shifted && shifted !== plain ? { top: shifted, bottom: plain } : { bottom: plain };
}
