import { describe, expect, it } from "vitest";
import {
  type BoardKey,
  buildBoard,
  germanLayout,
  keyLegends,
  layoutFromKeyPress,
  layoutFromLanguage,
  layoutFromMap,
  MATRIX,
  PLATE_WIDTH,
  US_LAYOUT,
} from "./keyboardBoard";
import {
  clearMemory,
  createMachine,
  type KeyboardMachine,
  MEMORY_BASE,
  MEMORY_SIZE,
  pressKey,
  releaseKey,
  stepRow,
} from "./keyboardMachine";

const board = buildBoard(US_LAYOUT);
const german = buildBoard(germanLayout());
const keyOf = (code: string, b = board): BoardKey => {
  const key = b.byCode.get(code);
  if (!key) throw new Error(`No key ${code}`);
  return key;
};
const at = (code: string, b = board) => keyOf(code, b).index;
const fresh = (b = board) => createMachine(MATRIX, b.matrixKeys, b.capsIndex);
const scan = (machine: KeyboardMachine, rows = MATRIX.rows * 2) => {
  let next = machine;
  for (let i = 0; i < rows; i++) next = stepRow(next);
  return next;
};
const tap = (machine: KeyboardMachine, code: string, b = board) =>
  scan(releaseKey(scan(pressKey(machine, at(code, b))), at(code, b)));

describe("the keyboard's plate", () => {
  for (const [name, layout] of [
    ["ANSI", US_LAYOUT],
    ["ISO", germanLayout()],
    ["ISO as macOS reports it", germanLayout(true)],
  ] as const) {
    it(`${name}: every key has its own switch, and the rows fill the plate`, () => {
      const { keys } = buildBoard(layout);
      expect(new Set(keys.map((k) => k.index)).size).toBe(keys.length);
      for (const key of keys) {
        expect(key.row).toBeLessThan(MATRIX.rows);
        expect(key.column).toBeLessThan(MATRIX.columns);
        expect(key.column).toBeGreaterThanOrEqual(0);
      }
      for (let row = 0; row < MATRIX.rows; row++) {
        const width = keys
          .filter((k) => k.row === row)
          .reduce((sum, k) => sum + (k.isoEnter ? 1.25 : k.w), 0);
        // Enter's upper half closes the short ISO row above its switch.
        expect(width).toBe(
          layout.physical === "iso" && row === 2 ? PLATE_WIDTH - 1.5 : PLATE_WIDTH,
        );
      }
    });

    it(`${name}: columns run left to right along each row`, () => {
      const { keys } = buildBoard(layout);
      for (let row = 0; row < MATRIX.rows; row++) {
        const columns = keys.filter((k) => k.row === row).map((k) => k.column);
        expect(columns).toEqual([...columns].sort((a, b) => a - b));
      }
    });

    it(`${name}: each switch lies on its row wire and its column wire`, () => {
      const built = buildBoard(layout);
      for (const key of built.keys) {
        expect(built.rowWires[key.row]).toContain(`M 0 ${key.contactY} `);
        expect(key.contactX).toBeLessThanOrEqual(Number(built.rowWires[key.row].split(" H ")[1]));
        const wire = built.columnWires[key.column];
        expect(wire).toContain(`V ${key.contactY}`);
      }
    });

    it(`${name}: each switch sits under its own cap`, () => {
      for (const key of buildBoard(layout).keys) {
        expect(key.contactX).toBeGreaterThan(key.x);
        expect(key.contactX).toBeLessThan(key.x + key.w);
        expect(key.contactY).toBeGreaterThan(key.y);
        expect(key.contactY).toBeLessThan(key.y + key.h);
      }
    });
  }

  it("places the ISO keys where macOS reports them", () => {
    const mac = buildBoard(germanLayout(true));
    expect(keyOf("Backquote", german).row).toBe(1);
    expect(keyOf("IntlBackslash", german).row).toBe(4);
    expect(keyOf("IntlBackslash", mac).row).toBe(1);
    expect(keyOf("Backquote", mac).row).toBe(4);
  });

  it("gives an ISO Enter two rows and its switch in the lower one", () => {
    expect(keyOf("Enter", german)).toMatchObject({ isoEnter: true, h: 2, row: 3, y: 2 });
  });

  it("prints a capital on a letter and two characters on a symbol key", () => {
    expect(keyLegends(keyOf("KeyA"))).toEqual({ bottom: "A" });
    expect(keyLegends(keyOf("Digit1"))).toEqual({ top: "!", bottom: "1" });
    expect(keyLegends(keyOf("BracketLeft", german))).toEqual({ bottom: "Ü" });
    expect(keyLegends(keyOf("Minus", german))).toEqual({ top: "?", bottom: "ß" });
    expect(keyLegends(keyOf("KeyY", german))).toEqual({ bottom: "Z" });
  });
});

describe("detecting the layout", () => {
  const germanMac = new Map([
    ["KeyY", "z"],
    ["KeyZ", "y"],
    ["KeyQ", "q"],
    ["Minus", "ß"],
    ["Backslash", "#"],
    ["IntlBackslash", "^"],
    ["Backquote", "<"],
    ["Digit2", "2"],
  ]);

  it("reads QWERTZ, ISO and the macOS key swap from the browser's map", () => {
    const layout = layoutFromMap(germanMac);
    expect(layout).toMatchObject({ name: "QWERTZ", physical: "iso", swapIsoKeys: true });
    expect(layout.chars.Digit2).toEqual(["2", '"']);
    expect(layout.chars.Minus).toEqual(["ß", "?"]);
    expect(layout.chars.IntlBackslash).toEqual(["^", "°"]);
  });

  it("reads a US map as ANSI", () => {
    const layout = layoutFromMap(
      new Map([
        ["KeyY", "y"],
        ["KeyQ", "q"],
        ["Backslash", "\\"],
      ]),
    );
    expect(layout).toMatchObject({ name: "QWERTY", physical: "ansi" });
  });

  it("takes a letter's Shift from its capital on a layout it has no table for", () => {
    const layout = layoutFromMap(
      new Map([
        ["KeyQ", "й"],
        ["Backslash", "\\"],
      ]),
    );
    expect(layout.chars.KeyQ).toEqual(["й", "Й"]);
  });

  it("guesses from the language without the API, and real presses correct the guess", () => {
    expect(layoutFromLanguage("de-DE", false).physical).toBe("iso");
    expect(layoutFromLanguage("en-US", false)).toBe(US_LAYOUT);
    expect(layoutFromKeyPress(US_LAYOUT, "KeyY", "z", true)?.swapIsoKeys).toBe(true);
    expect(layoutFromKeyPress(US_LAYOUT, "IntlBackslash", "<", false)?.physical).toBe("iso");
    expect(layoutFromKeyPress(US_LAYOUT, "KeyY", "y", false)).toBeNull();
  });
});

describe("the keyboard machine", () => {
  it("drives one row per step, in turn", () => {
    let machine = fresh();
    const rows: number[] = [];
    for (let i = 0; i < MATRIX.rows + 2; i++) {
      machine = stepRow(machine);
      rows.push(machine.row);
    }
    expect(rows).toEqual([0, 1, 2, 3, 4, 5, 0, 1]);
  });

  it("pulls a key's column low only while its row is driven", () => {
    const key = keyOf("KeyA");
    let machine = pressKey(fresh(), key.index);
    for (let i = 0; i < MATRIX.rows * 2; i++) {
      machine = stepRow(machine);
      expect(machine.columnsLow[key.column]).toBe(machine.row === key.row);
    }
  });

  it("writes a typed character into memory and onto the screen", () => {
    const machine = tap(fresh(), "KeyA");
    expect(machine.memory[0]).toBe(0x61);
    expect(machine.head).toBe(1);
    expect(machine.text).toBe("a");
    expect(machine.last).toMatchObject({ down: false, character: null });
    expect(machine.written).toMatchObject({ character: "a", address: MEMORY_BASE });
  });

  it("reports the event with the address it wrote", () => {
    const machine = scan(pressKey(fresh(), at("KeyB")));
    expect(machine.last).toMatchObject({ index: at("KeyB"), down: true, character: "b" });
    expect(machine.written).toMatchObject({ bytes: [0x62], address: MEMORY_BASE });
  });

  it("does not lose a tap shorter than one scan", () => {
    const machine = scan(releaseKey(pressKey(fresh(), at("KeyQ")), at("KeyQ")), MATRIX.rows * 4);
    expect(machine.text).toBe("q");
  });

  it("keeps quick keys in the order they went down", () => {
    let machine = fresh();
    // Z sits in a later row than A: without the queue the scan would report A first.
    for (const code of ["KeyZ", "KeyA", "KeyQ"]) machine = pressKey(machine, at(code));
    for (const code of ["KeyZ", "KeyA", "KeyQ"]) machine = releaseKey(machine, at(code));
    expect(scan(machine, MATRIX.rows * 12).text).toBe("zaq");
  });

  it("types a repeated letter twice", () => {
    let machine = fresh();
    for (let i = 0; i < 2; i++) {
      machine = pressKey(machine, at("KeyL"));
      machine = releaseKey(machine, at("KeyL"));
    }
    expect(scan(machine, MATRIX.rows * 12).text).toBe("ll");
  });

  it("applies Shift even if it is let go before the scan confirms the letter", () => {
    let machine = pressKey(fresh(), at("ShiftLeft"));
    machine = pressKey(machine, at("KeyA"));
    machine = releaseKey(machine, at("ShiftLeft"));
    machine = releaseKey(machine, at("KeyA"));
    machine = pressKey(machine, at("KeyB"));
    machine = releaseKey(machine, at("KeyB"));
    expect(scan(machine, MATRIX.rows * 12).text).toBe("Ab");
  });

  it("uses Shift on symbols through the layout's table", () => {
    const shifted = scan(pressKey(fresh(german), at("ShiftRight", german)));
    expect(tap(shifted, "Digit7", german).text).toBe("/");
  });

  it("flips letters but not digits with Caps Lock", () => {
    let machine = tap(fresh(), "CapsLock");
    expect(machine.caps).toBe(true);
    machine = tap(tap(machine, "KeyA"), "Digit1");
    expect(machine.text).toBe("A1");
    machine = tap(scan(pressKey(machine, at("ShiftLeft"))), "KeyB");
    expect(machine.text).toBe("A1b");
    machine = tap(scan(releaseKey(machine, at("ShiftLeft"))), "CapsLock");
    expect(machine.caps).toBe(false);
  });

  it("stores Enter and Backspace as bytes, and the screen acts on them", () => {
    let machine = tap(tap(tap(fresh(), "KeyA"), "Enter"), "KeyB");
    expect(machine.text).toBe("a\nb");
    machine = tap(machine, "Backspace");
    expect(machine.text).toBe("a\n");
    expect(machine.memory.slice(0, 4)).toEqual([0x61, 0x0a, 0x62, 0x08]);
  });

  it("writes nothing for a key without a character", () => {
    const machine = tap(tap(fresh(), "F5"), "ArrowLeft");
    expect(machine.head).toBe(0);
    expect(machine.text).toBe("");
  });

  it("stores a character beyond ASCII as its UTF-8 bytes", () => {
    const machine = tap(fresh(german), "BracketLeft", german);
    expect(machine.memory.slice(0, 2)).toEqual([0xc3, 0xbc]);
    expect(machine.head).toBe(2);
    expect(machine.text).toBe("ü");
  });

  it("wraps at the end of the buffer", () => {
    let machine = fresh();
    for (let i = 0; i < MEMORY_SIZE + 1; i++) machine = tap(machine, "KeyX");
    expect(machine.head).toBe(1);
    expect(machine.text).toBe("x".repeat(MEMORY_SIZE + 1));
  });

  it("ignores a press of a key already down, and a release of one already up", () => {
    const down = pressKey(fresh(), at("KeyA"));
    expect(pressKey(down, at("KeyA"))).toBe(down);
    const up = fresh();
    expect(releaseKey(up, at("KeyA"))).toBe(up);
  });

  it("empties memory and screen without touching a held key", () => {
    const held = scan(pressKey(tap(fresh(), "KeyA"), at("KeyB")));
    const cleared = clearMemory(held);
    expect(cleared.text).toBe("");
    expect(cleared.head).toBe(0);
    expect(cleared.closed[at("KeyB")]).toBe(true);
    expect(scan(cleared).text).toBe("");
  });
});
