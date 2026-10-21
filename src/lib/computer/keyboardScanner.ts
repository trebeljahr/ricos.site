import { Builder, type Ref } from "./blockBuilder";
import {
  checkSize,
  keyId,
  mapKey,
  matrixCircuit,
  matrixKeys,
  type MatrixSize,
  sampledEventCircuit,
} from "./keyboardMatrix";
import type { Circuit } from "./logic";

/** One-hot row ring, including an all-zero encoding for row 0. */
function rowSequencer(rows: number): Circuit {
  const b = new Builder();
  b.add("clock", "clock", 30, 30, "SCAN CLOCK");
  for (let r = 1; r < rows; r++) {
    b.add(`state${r}`, "dff", 300, r * 180, `ROW ${r} STATE`);
    b.connect(r === 1 ? "first" : `state${r - 1}`, `state${r}`);
    b.connect("clock", `state${r}`, 1);
  }
  const rest = b.orTree(
    "rest",
    Array.from({ length: rows - 1 }, (_, i) => `state${i + 1}`),
    600,
    30,
  );
  b.gate("first", "not", 850, 30, rest);
  for (let r = 0; r < rows; r++)
    b.gate(`row${r}`, "lamp", 1100, r * 180, r ? `state${r}` : "first", undefined, `R${r} ACTIVE`);
  return {
    ...b.circuit(`${rows}-row scan sequencer`),
    ports: { inputs: ["clock"], outputs: Array.from({ length: rows }, (_, r) => `row${r}`) },
  };
}

/** Every contact, sample, filter and character bit lives in the builder's shared timeline. */
export function keyboardScannerCircuit(
  size: MatrixSize = { rows: 2, columns: 2 },
  ansi = false,
): Circuit {
  checkSize(size);
  const b = new Builder();
  const matrix = matrixCircuit(size);
  // Latched switches let a single pointer hold chords. The builder can change any contact to held mode.
  const keys = matrixKeys(size, ansi);
  for (const node of matrix.nodes) {
    if (node.id.startsWith("key-")) {
      const [, row, col] = node.id.split("-").map(Number);
      const key = keys[row * size.columns + col];
      delete node.manualMode;
      node.type = key.label ? "switch" : "ground";
      node.label = `${key.label || "NO SWITCH"} R${row} C${col}`;
    }
  }
  b.nodes.push(...matrix.nodes.filter((node) => !/^row\d+$/.test(node.id)));
  b.wires.push(...matrix.wires.filter((wire) => !/^row\d+$/.test(wire.from)));
  b.add("clock", "clock", 30, -450, "SCAN CLOCK");
  b.add("rows", "module", 350, -450, "ROW SEQUENCER", { module: rowSequencer(size.rows) });
  b.connect("clock", "rows");
  const sampleClock = b.gate(
    "sample-clock",
    "not",
    700,
    -450,
    "clock",
    undefined,
    "SAMPLE ON FALLING EDGE",
  );
  b.add("scanned-frame", "dff", 1000, -450, "FIRST SCAN COMPLETE");
  const scanned = b.gate("scanned-next", "or", 800, -650, "scanned-frame", ["rows", size.rows - 1]);
  b.connect(scanned, "scanned-frame");
  b.connect("clock", "scanned-frame", 1);
  const boundary = b.gate("frame-boundary", "and", 1200, -450, "clock", ["rows", 0]);
  const frameClock = b.gate(
    "frame-clock",
    "and",
    1400,
    -450,
    boundary,
    "scanned-frame",
    "COMPLETE FRAME",
  );
  for (let r = 0; r < size.rows; r++) {
    b.connect(["rows", r], `contacts${r}`);
    b.gate(
      `active${r}`,
      "lamp",
      30,
      30 + r * 500,
      ["rows", r],
      undefined,
      `R${r} ACTIVE (0 ELSE Z)`,
    );
  }
  const columnSource = (column: number): Ref => {
    const wire = b.wires.find((wire) => wire.to === `sense${column}`)!;
    return wire.output === undefined ? wire.from : [wire.from, wire.output];
  };
  // All contacts use the same frame clock, so Shift and letters commit together.
  const shiftSources: Ref[] = [];
  const characterEvents: { source: Ref; plain: number; shifted: number }[] = [];
  for (let r = 0; r < size.rows; r++)
    for (let c = 0; c < size.columns; c++) {
      const index = r * size.columns + c;
      const key = keys[index];
      if (!key.label) continue;
      const id = keyId(r, c),
        x = 2100 + c * 750,
        y = 30 + r * 600;
      b.add(`${id}-events`, "module", x, y, `${key.label} SAMPLE / FILTER`, {
        module: sampledContactCircuit(),
      });
      b.connect(["rows", r], `${id}-events`, 0);
      b.connect(columnSource(c), `${id}-events`, 1);
      b.connect(sampleClock, `${id}-events`, 2);
      b.connect(frameClock, `${id}-events`, 3);
      b.gate(
        `${id}-stable`,
        "lamp",
        x,
        y + 220,
        [`${id}-events`, 0],
        undefined,
        `${key.label} STABLE`,
      );
      b.gate(
        `${id}-pressed`,
        "lamp",
        x + 180,
        y + 220,
        [`${id}-events`, 1],
        undefined,
        `${key.label} PRESS`,
      );
      b.gate(
        `${id}-released`,
        "lamp",
        x + 360,
        y + 220,
        [`${id}-events`, 2],
        undefined,
        `${key.label} RELEASE`,
      );
      if (key.modifier) shiftSources.push([`${id}-events`, 0]);
      const plain = mapKey(key, false),
        shifted = mapKey(key, true);
      if (plain !== null && shifted !== null)
        characterEvents.push({
          source: [`${id}-events`, 1],
          plain: plain.charCodeAt(0),
          shifted: shifted.charCodeAt(0),
        });
    }
  const bottom = size.rows * 600 + 200;
  b.add("zero", "ground", 30, bottom, "ZERO");
  const shift = shiftSources.length ? b.orTree("shift", shiftSources, 300, bottom) : "zero";
  b.gate("shift-state", "lamp", 700, bottom, shift, undefined, "SHIFT STATE");
  const chunks: string[] = [];
  for (let start = 0; start < characterEvents.length; start += 24) {
    const events = characterEvents.slice(start, start + 24);
    const id = `character-map${chunks.length}`;
    b.add(id, "module", 1000 + chunks.length * 350, bottom, "CHARACTER MAP", {
      module: characterMapCircuit(events),
    });
    b.connect(shift, id);
    events.forEach((event, i) => {
      b.connect(event.source, id, i + 1);
    });
    chunks.push(id);
  }
  let character: string = chunks[0];
  for (let i = 1; i < chunks.length; i++) {
    const id = `character-priority${i}`;
    b.add(id, "module", 1000 + i * 350, bottom + 500, "FIRST READY CHARACTER", {
      module: characterPriorityCircuit(),
    });
    for (let port = 0; port < 9; port++) {
      b.connect([character, port], id, port);
      b.connect([chunks[i], port], id, port + 9);
    }
    character = id;
  }
  b.add("character", "display8", 2100, bottom, "FRAME CHARACTER (ASCII)");
  for (let bit = 0; bit < 8; bit++) b.connect([character, bit + 1], "character", bit);
  b.gate(
    "character-ready",
    "lamp",
    2100,
    bottom + 250,
    [character, 0],
    undefined,
    "CHARACTER READY",
  );
  return b.circuit(`${ansi ? "US QWERTY" : `${size.rows} × ${size.columns}`} keyboard scanner`);
}

/** Hold each row's sample, then apply the shared two-frame contact filter. */
function sampledContactCircuit(): Circuit {
  const b = new Builder();
  for (const [i, id] of ["row", "column", "sample-clock", "frame-clock"].entries())
    b.add(id, i > 1 ? "clock" : "switch", 30, 30 + i * 180, id.toUpperCase());
  const selected = b.gate("selected", "and", 300, 30, "row", "column");
  const inactive = b.gate("inactive", "not", 300, 210, "row");
  const keep = b.gate("keep", "and", 500, 210, inactive, "sample");
  const data = b.gate("data", "or", 500, 30, selected, keep);
  b.add("sample", "dff", 700, 30, "SCANNED CONTACT");
  b.connect(data, "sample");
  b.connect("sample-clock", "sample", 1);
  b.add("filter", "module", 950, 30, "TWO-FRAME FILTER", { module: sampledEventCircuit() });
  b.connect("sample", "filter");
  b.connect("frame-clock", "filter", 1);
  for (const [i, id] of ["stable", "pressed", "released"].entries())
    b.gate(id, "lamp", 1250, 30 + i * 180, ["filter", i], undefined, id.toUpperCase());
  return {
    ...b.circuit("Scanned contact and frame events"),
    ports: {
      inputs: ["row", "column", "sample-clock", "frame-clock"],
      outputs: ["stable", "pressed", "released"],
    },
  };
}

type Character = { plain: number; shifted: number };
/** Priority is explicit hardware. Individual contact events remain available on the canvas. */
function characterMapCircuit(characters: Character[]): Circuit {
  const b = new Builder();
  b.add("shift", "switch", 30, 30, "SHIFT STATE");
  b.add("zero", "ground", 30, 210, "ZERO");
  const notShift = b.gate("not-shift", "not", 300, 30, "shift");
  let earlier: Ref = "zero";
  const selected = characters.map((key, i) => {
    b.add(`press${i}`, "switch", 30, 400 + i * 180, `POSITION ${i} PRESS`);
    const available = b.gate(`available${i}`, "not", 300 + i * 200, 400, earlier);
    const choose = b.gate(`choose${i}`, "and", 300 + i * 200, 600, available, `press${i}`);
    earlier = b.gate(`earlier${i}`, "or", 300 + i * 200, 800, earlier, `press${i}`);
    return { ...key, source: choose };
  });
  b.gate("ready", "lamp", 1000, 1000, earlier, undefined, "CHARACTER READY");
  for (let bit = 0; bit < 8; bit++) {
    const sources: Ref[] = [];
    selected.forEach((key, i) => {
      const plain = Boolean((key.plain >> bit) & 1),
        shifted = Boolean((key.shifted >> bit) & 1);
      if (plain && shifted) sources.push(key.source);
      else if (plain !== shifted)
        sources.push(
          b.gate(
            `char${bit}-${i}`,
            "and",
            1000 + i * 200,
            1200 + bit * 180,
            key.source,
            plain ? notShift : "shift",
          ),
        );
    });
    b.gate(
      `bit${bit}`,
      "lamp",
      1800,
      1000 + bit * 180,
      sources.length ? b.orTree(`char${bit}`, sources, 1400, 1200 + bit * 180) : "zero",
      undefined,
      `ASCII ${bit}`,
    );
  }
  return {
    ...b.circuit("Shift and character priority encoder"),
    ports: {
      inputs: ["shift", ...characters.map((_, i) => `press${i}`)],
      outputs: ["ready", ...Array.from({ length: 8 }, (_, bit) => `bit${bit}`)],
    },
  };
}

function characterPriorityCircuit(): Circuit {
  const b = new Builder();
  for (const [i, prefix] of ["first", "second"].entries())
    for (let bit = 0; bit < 9; bit++)
      b.add(
        `${prefix}${bit}`,
        "switch",
        30 + i * 250,
        30 + bit * 180,
        bit ? `${prefix.toUpperCase()} ASCII ${bit - 1}` : `${prefix.toUpperCase()} READY`,
      );
  const second = b.gate("use-second", "not", 600, 30, "first0");
  b.gate(
    "ready",
    "lamp",
    1400,
    30,
    b.gate("either", "or", 900, 30, "first0", "second0"),
    undefined,
    "READY",
  );
  for (let bit = 1; bit < 9; bit++) {
    const first = b.gate(`a${bit}`, "and", 600, bit * 180, "first0", `first${bit}`);
    const other = b.gate(`b${bit}`, "and", 850, bit * 180, second, `second${bit}`);
    const value = b.gate(`value${bit}`, "or", 1100, bit * 180, first, other);
    b.gate(`bit${bit}`, "lamp", 1400, bit * 180, value, undefined, `ASCII ${bit - 1}`);
  }
  return {
    ...b.circuit("First ready character"),
    ports: {
      inputs: ["first", "second"].flatMap((prefix) =>
        Array.from({ length: 9 }, (_, bit) => `${prefix}${bit}`),
      ),
      outputs: ["ready", ...Array.from({ length: 8 }, (_, bit) => `bit${bit + 1}`)],
    },
  };
}
