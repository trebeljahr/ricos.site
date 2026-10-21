import { busPorts, CircuitKit, type Source } from "../kit";
import type { Level, LevelPort, SequenceTick } from "../types";
import { constructionHints } from "./constructionHints";
import { boxed, CHAPTERS, once, port } from "./shared";

const SECTION = "Memory";
const SELECT = port("select", "SELECT");
const READ = port("read", "READ ENABLE");
const WRITE = port("write", "WRITE ENABLE");
const REFRESH = port("refresh", "REFRESH ROW");
const PROGRAM = port("program", "PROGRAM");
const ERASE = port("erase", "ERASE ALL TO 1");
const DATA = port("data", "DATA");
const OUT = port("out", "DATA OUT");
const CLOCK: LevelPort = { id: "clock", label: "CLOCK", clock: true };
const ADDRESS = [port("a0", "ADDRESS 0"), port("a1", "ADDRESS 1")];
const DATA4 = busPorts("d", "DATA IN ", 4);
const OUT4 = busPorts("q", "DATA OUT ", 4);
const nibble = (prefix: string, value: number) =>
  Object.fromEntries(
    Array.from({ length: 4 }, (_, bit) => [`${prefix}${bit}`, Boolean(value & (1 << bit))]),
  );
const address = (value: number) => ({ a0: Boolean(value & 1), a1: Boolean(value & 2) });

const dramCellReference = once(() => {
  const kit = new CircuitKit("DRAM cell", [SELECT, READ, WRITE, REFRESH, DATA, CLOCK], [OUT]);
  const write = kit.gate("and", ["select", "write"]);
  const refresh = kit.gate("and", ["select", "refresh"]);
  const update = kit.gate("or", [write, refresh]);
  const edge = kit.gate("and", [update, "clock"]);
  const cell = kit.gate("dramcell", ["data", edge]);
  const notWrite = kit.gate("not", ["write"]);
  const inputData = kit.gate("and", ["data", "write"]);
  const keepData = kit.gate("and", [cell, notWrite]);
  kit.wire(kit.gate("or", [inputData, keepData]), cell);
  const selected = kit.gate("and", [cell, "select"]);
  return kit.out("out", kit.gate("and", [selected, "read"])).build();
});

const flashCellReference = once(() => {
  const kit = new CircuitKit("Flash cell", [SELECT, READ, PROGRAM, ERASE, DATA, CLOCK], [OUT]);
  const program = kit.gate("and", ["select", "program"]);
  const update = kit.gate("or", [program, "erase"]);
  const edge = kit.gate("and", [update, "clock"]);
  const cell = kit.gate("dff", []);
  kit.wire(edge, cell, 1);
  const addCharge = kit.gate("and", [program, kit.gate("not", ["data"])]);
  const charged = kit.gate("or", [cell, addCharge]);
  kit.wire(kit.gate("and", [charged, kit.gate("not", ["erase"])]), cell);
  const sensed = kit.gate("not", [cell]);
  const selected = kit.gate("and", [sensed, "select"]);
  return kit.out("out", kit.gate("and", [selected, "read"])).build();
});

const arrayReference = (kind: "dram" | "flash") =>
  once(() => {
    const dram = kind === "dram";
    const inputs = [
      ...ADDRESS,
      READ,
      CLOCK,
      dram ? WRITE : PROGRAM,
      dram ? REFRESH : ERASE,
      ...DATA4,
    ];
    const kit = new CircuitKit(dram ? "4 × 4 DRAM" : "4 × 4 flash memory", inputs, OUT4);
    const decoder = kit.part("decoder", boxed("decoder"), ["a0", "a1"]);
    const cellPart = dram ? "dram-cell" : "flash-cell";
    const cell = boxed(cellPart);
    const reads: Source[][] = Array.from({ length: 4 }, () => []);
    for (let row = 0; row < 4; row++) {
      for (let bit = 0; bit < 4; bit++) {
        const bitCell = kit.part(
          cellPart,
          cell,
          [
            [decoder, row],
            "read",
            dram ? "write" : "program",
            dram ? "refresh" : "erase",
            `d${bit}`,
            "clock",
          ],
          { label: dram ? "DRAM CELL" : "FLASH CELL" },
        );
        reads[bit].push([bitCell, 0]);
      }
    }
    reads.forEach((bits, bit) => {
      const low = kit.gate("or", [bits[0], bits[1]]);
      const high = kit.gate("or", [bits[2], bits[3]]);
      kit.out(`q${bit}`, kit.gate("or", [low, high]));
    });
    return kit.build();
  });

const dramCellTicks: SequenceTick[] = [
  {
    set: { select: true, read: true, write: true, data: true },
    expect: { out: false },
    note: "Prepare to write 1; wait for CLOCK.",
  },
  { clock: true, expect: { out: true }, note: "Rising edge charges the selected cell." },
  {
    clock: false,
    set: { write: false, data: false },
    expect: { out: true },
    note: "Stop writing; changing DATA cannot clear the cell.",
  },
  { clock: true, expect: { out: true }, note: "First idle clock; charge remains." },
  { clock: false, expect: { out: true }, note: "Falling edge holds charge." },
  { clock: true, expect: { out: true }, note: "Second idle clock; charge remains." },
  {
    clock: false,
    set: { refresh: true },
    expect: { out: true },
    note: "Select the charged row for refresh.",
  },
  { clock: true, expect: { out: true }, note: "Refresh restores the stored 1 and resets its age." },
  { clock: false, set: { refresh: false }, expect: { out: true }, note: "Stop refreshing." },
  ...Array.from({ length: 3 }, (_, index): SequenceTick[] => [
    {
      clock: true,
      expect: { out: true },
      note: `Idle clock ${index + 1} after refresh: charge remains.`,
    },
    { clock: false, expect: { out: true }, note: "Falling edge leaves charge unchanged." },
  ]).flat(),
  {
    clock: true,
    expect: { out: false },
    note: "Fourth idle clock after refresh: the stored 1 fades.",
  },
  {
    clock: false,
    set: { select: false, write: true, data: true },
    expect: { out: false },
    note: "Unselected cell cannot be written.",
  },
  { clock: true, expect: { out: false }, note: "Write to another row does not charge this cell." },
  {
    clock: false,
    set: { select: true, read: false },
    expect: { out: false },
    note: "READ off hides the cell.",
  },
];

const flashCellTicks: SequenceTick[] = [
  { set: { select: true, read: true }, expect: { out: true }, note: "Erased flash starts at 1." },
  {
    set: { program: true, data: false },
    expect: { out: true },
    note: "Prepare to program 0; wait for CLOCK.",
  },
  { clock: true, expect: { out: false }, note: "Rising edge programs 0." },
  {
    clock: false,
    set: { data: true },
    expect: { out: false },
    note: "Changing DATA to 1 does not restore the bit.",
  },
  { clock: true, expect: { out: false }, note: "Programming 1 cannot erase a stored 0." },
  {
    clock: false,
    set: { program: false, erase: true },
    expect: { out: false },
    note: "Prepare erase; wait for CLOCK.",
  },
  { clock: true, expect: { out: true }, note: "ERASE restores 1." },
  {
    clock: false,
    set: { erase: false, select: false, program: true, data: false },
    expect: { out: false },
    note: "Unselected cells cannot be programmed.",
  },
  {
    clock: true,
    expect: { out: false },
    note: "Unselected program pulse leaves stored 1 unchanged.",
  },
  {
    clock: false,
    set: { select: true },
    expect: { out: true },
    note: "Reselect and read the still-erased bit.",
  },
  { set: { read: false }, expect: { out: false }, note: "READ off hides the stored bit." },
];

const dramArrayTicks: SequenceTick[] = [
  {
    set: { ...address(0), ...nibble("d", 5), read: true, write: true },
    expect: nibble("q", 0),
    note: "Prepare to write 5 at address 0.",
  },
  { clock: true, expect: nibble("q", 5), note: "Clock stores 5 in row 0." },
  {
    clock: false,
    set: { write: false, ...address(1), ...nibble("d", 10) },
    expect: nibble("q", 0),
    note: "Select row 1 without writing yet.",
  },
  { set: { write: true }, expect: nibble("q", 0), note: "WRITE waits for a clock edge." },
  { clock: true, expect: nibble("q", 10), note: "Clock stores 10 in row 1." },
  {
    clock: false,
    set: { write: true, ...address(2), ...nibble("d", 3) },
    expect: nibble("q", 0),
    note: "Select row 2 and prepare a different word.",
  },
  { clock: true, expect: nibble("q", 3), note: "Clock stores 3 in row 2." },
  {
    clock: false,
    set: { ...address(3), ...nibble("d", 12) },
    expect: nibble("q", 0),
    note: "Select row 3 and prepare another word.",
  },
  { clock: true, expect: nibble("q", 12), note: "Clock stores 12 in row 3." },
  {
    clock: false,
    set: { write: false, ...address(1) },
    expect: nibble("q", 10),
    note: "Row 1 still holds 10.",
  },
  {
    set: address(2),
    expect: nibble("q", 3),
    note: "Row 2 still holds 3.",
  },
  {
    set: address(0),
    expect: nibble("q", 5),
    note: "Row 0 still holds 5.",
  },
  {
    clock: false,
    set: { refresh: true },
    expect: nibble("q", 5),
    note: "Select row 0 for refresh.",
  },
  { clock: true, expect: nibble("q", 5), note: "Refresh row 0 before charge expires." },
  { clock: false, set: { refresh: false }, expect: nibble("q", 5), note: "Stop refreshing row 0." },
  ...Array.from({ length: 3 }, (): SequenceTick[] => [
    {
      clock: true,
      expect: nibble("q", 5),
      note: "An idle clock ages charge but does not yet erase it.",
    },
    { clock: false, expect: nibble("q", 5), note: "Falling edge holds the row." },
  ]).flat(),
  {
    clock: true,
    expect: nibble("q", 0),
    note: "Without refresh, row 0 loses its 1 bits after four idle clocks.",
  },
  { clock: false, set: { read: false }, expect: nibble("q", 0), note: "READ off hides all rows." },
];

const flashArrayTicks: SequenceTick[] = [
  {
    set: { read: true, ...address(0), ...nibble("d", 5) },
    expect: nibble("q", 15),
    note: "Erased row 0 starts at 1111.",
  },
  { set: { program: true }, expect: nibble("q", 15), note: "Prepare PROGRAM; no edge yet." },
  { clock: true, expect: nibble("q", 5), note: "Program the zero bits of 0101 in row 0." },
  {
    clock: false,
    set: { ...address(1), ...nibble("d", 10) },
    expect: nibble("q", 15),
    note: "Row 1 remains erased before its program pulse.",
  },
  { clock: true, expect: nibble("q", 10), note: "Program 1010 in row 1." },
  {
    clock: false,
    set: { ...address(2), ...nibble("d", 3) },
    expect: nibble("q", 15),
    note: "Row 2 starts erased too.",
  },
  { clock: true, expect: nibble("q", 3), note: "Program 0011 in row 2." },
  {
    clock: false,
    set: { ...address(3), ...nibble("d", 12) },
    expect: nibble("q", 15),
    note: "Row 3 starts erased too.",
  },
  { clock: true, expect: nibble("q", 12), note: "Program 1100 in row 3." },
  {
    clock: false,
    set: { program: false, ...address(0), ...nibble("d", 15) },
    expect: nibble("q", 5),
    note: "Changing PROGRAM BIT cannot restore 1s.",
  },
  { clock: true, expect: nibble("q", 5), note: "Without PROGRAM, row 0 still holds 0101." },
  {
    clock: false,
    set: { program: true },
    expect: nibble("q", 5),
    note: "Prepare to program ones over stored zeros.",
  },
  { clock: true, expect: nibble("q", 5), note: "Programming 1 leaves stored zeros unchanged." },
  {
    clock: false,
    set: { program: false, ...address(1) },
    expect: nibble("q", 10),
    note: "Row 1 still holds 1010.",
  },
  { set: address(2), expect: nibble("q", 3), note: "Row 2 still holds 0011." },
  { set: address(3), expect: nibble("q", 12), note: "Row 3 still holds 1100." },
  { set: address(0), expect: nibble("q", 5), note: "Row 0 still holds 0101." },
  {
    clock: false,
    set: { program: false, erase: true },
    expect: nibble("q", 5),
    note: "Prepare global erase.",
  },
  { clock: true, expect: nibble("q", 15), note: "ERASE ALL restores row 0 to 1111." },
  {
    clock: false,
    set: { erase: false, ...address(1) },
    expect: nibble("q", 15),
    note: "ERASE ALL also restored row 1.",
  },
  { set: address(2), expect: nibble("q", 15), note: "ERASE ALL restored row 2." },
  { set: address(3), expect: nibble("q", 15), note: "ERASE ALL restored row 3." },
  { set: { read: false }, expect: nibble("q", 0), note: "READ off hides the stored word." },
];

export const dramCellLevel: Level = {
  id: "dram-cell",
  title: "DRAM cell and refresh",
  section: SECTION,
  chapter: CHAPTERS.ram,
  optional: true,
  goal: "Write on a selected clock edge, read only while selected and enabled, refresh a stored 1, and let it fade after four idle clocks.",
  intro:
    "A DRAM capacitor loses charge. Reading alone does not restore it; refresh rewrites the stored value before it fades.",
  spec: {
    kind: "sequence",
    inputs: [SELECT, READ, WRITE, REFRESH, DATA, CLOCK],
    outputs: [OUT],
    ticks: dramCellTicks,
  },
  palette: ["dramcell", "part:not", "part:and", "part:or"],
  makes: { part: "dram-cell", label: "DRAM CELL", builtIn: { reference: true } },
  reference: dramCellReference,
  hints: constructionHints(
    "The capacitor changes only on an active write or refresh clock edge. Each unrefreshed global clock ages its charge.",
    "Place one DRAM CAPACITOR. Gate its clock with SELECT and either WRITE ENABLE or REFRESH ROW.",
    "UPDATE = SELECT AND (WRITE OR REFRESH); capacitor clock = CLOCK AND UPDATE. Its data takes DATA during writes or its own stored Q during refresh. Gate its read path with SELECT and READ ENABLE.",
    "Write 1, wait three clock pulses, refresh, then wait four more. The first three retain 1; the fourth loses it.",
  ),
};

export const flashCellLevel: Level = {
  id: "flash-cell",
  title: "Flash cell: program and erase",
  section: SECTION,
  chapter: CHAPTERS.ram,
  optional: true,
  goal: "Program a selected 0 on a clock edge. Programming 1 cannot restore it; ERASE restores 1, even when not selected.",
  intro:
    "The stored bit represents charge, so an erased cell reads 1. Programming can add charge (read 0); erasing clears charge globally.",
  spec: {
    kind: "sequence",
    inputs: [SELECT, READ, PROGRAM, ERASE, DATA, CLOCK],
    outputs: [OUT],
    ticks: flashCellTicks,
  },
  palette: ["dff", "part:not", "part:and", "part:or"],
  makes: { part: "flash-cell", label: "FLASH CELL", builtIn: { reference: true } },
  reference: flashCellReference,
  hints: constructionHints(
    "Store charge, then invert it for the readable bit. Charge=0 means erased 1; charge=1 means programmed 0.",
    "Place a D flip-flop for charge. Let selected PROGRAM or global ERASE enable its clock edge.",
    "PROGRAM ZERO = SELECT AND PROGRAM AND NOT DATA. NEXT CHARGE = (old charge OR PROGRAM ZERO) AND NOT ERASE. Clock the storage when PROGRAM or ERASE is active. Sense with NOT charge, then gate by SELECT and READ.",
    "Program 0, then try programming 1: it stays 0. ERASE returns it to 1. PROGRAM on another row must not affect it.",
  ),
};

export const dramArrayLevel: Level = {
  id: "dram-array",
  title: "4 × 4 DRAM",
  section: SECTION,
  chapter: CHAPTERS.ram,
  optional: true,
  goal: "Store four bits per addressed row on clock edges; read one row at a time; refresh a row before its charge fades.",
  intro:
    "A decoder selects one of four rows. Sixteen DRAM cells hold the bits, with shared data and clock lines but separate row selection.",
  spec: {
    kind: "sequence",
    inputs: [...ADDRESS, READ, CLOCK, WRITE, REFRESH, ...DATA4],
    outputs: OUT4,
    ticks: dramArrayTicks,
  },
  palette: ["part:decoder", "part:dram-cell", "part:or"],
  makes: { part: "dram-array", label: "4 × 4 DRAM", builtIn: { preset: "4 × 4 DRAM" } },
  reference: arrayReference("dram"),
  hints: constructionHints(
    "Two address bits choose one row. Only its four cells write or refresh; four output columns combine one selected cell from each row.",
    "Connect ADDRESS 0 and 1 to a decoder. Place one DRAM CELL at each of four bit positions in four rows.",
    "For row r and bit b, feed decoder Yr, READ, WRITE, REFRESH, DATA IN b, and CLOCK into its DRAM CELL. OR each column’s four outputs into DATA OUT b.",
    "Write different bit patterns to rows 0 and 1. Refresh row 0, then leave it idle for four clock pulses and watch it fade.",
  ),
};

export const flashArrayLevel: Level = {
  id: "flash-array",
  title: "4 × 4 flash memory",
  section: SECTION,
  chapter: CHAPTERS.ram,
  optional: true,
  goal: "Program zeros into a selected row on a clock edge. Only ERASE ALL can restore ones across every row.",
  intro:
    "A decoder chooses the row to program. Erase reaches all sixteen cells, independent of the address.",
  spec: {
    kind: "sequence",
    inputs: [...ADDRESS, READ, CLOCK, PROGRAM, ERASE, ...DATA4],
    outputs: OUT4,
    ticks: flashArrayTicks,
  },
  palette: ["part:decoder", "part:flash-cell", "part:or"],
  makes: { part: "flash-array", label: "4 × 4 FLASH", builtIn: { preset: "4 × 4 flash memory" } },
  reference: arrayReference("flash"),
  hints: constructionHints(
    "PROGRAM acts only on the addressed row. ERASE ALL reaches every row. Stored zeros remain zero through later attempts to program one.",
    "Connect ADDRESS 0 and 1 to a decoder. Place four FLASH CELLs in each of four rows.",
    "For row r and bit b, feed decoder Yr, READ, PROGRAM, global ERASE ALL, PROGRAM BIT b, and CLOCK to the cell. OR each output column into DATA OUT b.",
    "Program 0101 into row 0 and 1010 into row 1, then erase while row 0 is selected. Both rows must read 1111 afterward.",
  ),
};

export const MEMORY_TECHNOLOGY_LEVELS: Level[] = [
  dramCellLevel,
  dramArrayLevel,
  flashCellLevel,
  flashArrayLevel,
];
