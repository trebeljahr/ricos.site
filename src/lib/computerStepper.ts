import { beamAt, frameBytes, rowBytes, SCREEN_SIZES } from "./computer/video";

export type Instruction = {
  address: number;
  opcode: number;
  operand: number;
  label: string;
  line: number;
};

/**
 * Where the CPU keeps return addresses. "hardware": a separate 16-entry return
 * stack, with every variable at a fixed address in 16 bytes of data RAM.
 * "ram": the stack lives in 32 bytes of data RAM, SP counts down from the top,
 * and function parameters and locals live in stack frames, so recursion works.
 */
export type StackModel = "hardware" | "ram";

export const STACK_MODELS: Record<StackModel, { label: string; ramBytes: number }> = {
  hardware: { label: "SEPARATE RETURN STACK", ramBytes: 16 },
  ram: { label: "STACK IN RAM", ramBytes: 32 },
};

/** SP after reset in the stack-in-RAM CPU: one past the top byte, so the first push lands at 1F. */
export const STACK_TOP = STACK_MODELS.ram.ramBytes;

export type CompiledProgram = {
  instructions: Instruction[];
  bytes: number[];
  /** Variables at fixed RAM addresses, from 0 up. With the stack in RAM, only main's. */
  variables: { name: string; address: number }[];
  /** Which CPU the bytes are for; absent means "hardware". */
  stack?: StackModel;
};

export const stackModelOf = (program: Pick<CompiledProgram, "stack">): StackModel =>
  program.stack ?? "hardware";

export type Phase = "ready" | "fetch" | "decode" | "execute" | "interrupt";

export type Snapshot = {
  phase: Phase;
  pc: number;
  ir: number | null;
  operand: number | null;
  accumulator: number;
  zero: boolean;
  carry: boolean;
  ram: number[];
  /** Screen rows 0–7, written by STM F0–F7. Bit i of a row is the pixel at x = i. */
  screen: number[];
  /** The pixel port's cursor, set by STM F8 (x) and STM F9 (y). */
  pixelX: number;
  pixelY: number;
  /** The last screen write in this snapshot's ticks, if any. */
  screenWrite: ScreenWrite | null;
  /** The blitter's registers after this snapshot's ticks. */
  blitter: BlitterState;
  /** The big screen's frame bytes, its bank register, and the last write in this snapshot's ticks. */
  frame: number[];
  bank: number;
  frameWrite: FrameWrite | null;
  /** The big screen's port: ADDR and whether DA moves it down a row. */
  portAddr: number;
  portDown: boolean;
  /** The big blitter after this snapshot's ticks. */
  bigBlitter: BigBlitter;
  stack: number[];
  output: number[];
  activeAddress: number | null;
  touchedAddress: number | null;
  explanation: string;
  halted: boolean;
  /** Stack pointer; only the stack-in-RAM CPU shows it. */
  sp?: number;
  /** Index of the last clock tick this snapshot includes; −1 before the first. */
  tick: number;
  /** Key port: the last key code and whether it waits to be read (the IRQ line). */
  key: number;
  keyReady: boolean;
  /** Interrupts enabled. */
  interruptsOn: boolean;
  /** Key pressed during this snapshot's ticks, if any. */
  keyPress: number | null;
};

/**
 * Memory-mapped screen: data addresses F0–F7 are the 8×8 screen's rows 0–7, and
 * F8–FF are its pixel port. Any address with high nibble F selects the screen;
 * every other address reaches RAM through its low 4 bits (5 with the stack in RAM).
 */
export const SCREEN_BASE = 0xf0;
export const SCREEN_ROWS = 8;
export const isScreenAddress = (address: number) => (address & 0xf0) === SCREEN_BASE;

/**
 * The pixel port draws one pixel without touching the rest of its row. STM F8
 * sets the cursor's x and STM F9 its y (low 3 bits each); STM FA writes ACC
 * bit 0 into the pixel at the cursor. The port decodes A0–A1 only, so FB–FF
 * repeat F8–FA. Reading a port address gives the cursor's row, screen[y],
 * except FB (and FF), which reads the video status: 1 while the scanout is in
 * vertical blank, else 0.
 */
export const PIXEL_PORT = { x: 0xf8, y: 0xf9, pixel: 0xfa } as const;
export const isPixelPort = (address: number) => (address & 0xf8) === 0xf8;
export type PixelPortRole = "x" | "y" | "pixel";
/** LDM FB reads 1 during vertical blank, 0 while the beam draws. Writes to FB still plot. */
export const VIDEO_STATUS = 0xfb;
export const isVideoStatus = (address: number) => isPixelPort(address) && (address & 3) === 3;
export const pixelPortRole = (address: number): PixelPortRole =>
  (address & 2) !== 0 ? "pixel" : (address & 1) !== 0 ? "y" : "x";

/**
 * A screen write: a whole row (STM F0–F7, `x` null) or one pixel through the
 * port. `by` is "blitter" when the blitter wrote it rather than the CPU.
 */
export type ScreenWrite = { y: number; x: number | null; row: number; by?: "blitter" };

/** `row` with the pixel at `x` set to `colour` bit 0: what the port's plotter computes. */
export const plotRow = (row: number, x: number, colour: number) =>
  colour & 1 ? (row | (1 << x)) & 255 : row & ~(1 << x) & 255;

/**
 * The blitter: a command processor that draws into the screen by itself while
 * the CPU runs on. Data addresses E0–EF reach it instead of RAM; it decodes
 * A0–A2, so E8–EF repeat E0–E7. STM E0 sets X, E1 Y (low 3 bits each), E2
 * COLOUR (a row pattern, or bit 0 for a pixel), E3 ARG (a line's length, or a
 * sprite's code ROM address), and STM E4 starts the command in ACC. Any read
 * gives BUSY in bit 0. While BUSY, the blitter ignores register writes and
 * owns the screen: each clock edge it writes one row, and CPU screen writes
 * are lost.
 */
export const BLITTER_BASE = 0xe0;

/**
 * The big screen: a 32×32 framebuffer beside the 8×8 one, 128 bytes, row y's
 * byte c at y * 4 + c. Data addresses D0–DF reach it instead of RAM. D0–D7
 * are a bank window: 8 bytes that show one 8×8 tile of the big screen, row r
 * at D0 + r, so code that draws the 8×8 screen draws any tile. STM D8 picks
 * the tile (BANK, low 4 bits): bits 0–1 its column, bits 2–3 its row of tiles.
 * The frame address is then just wires: BANK0, BANK1, A0, A1, A2, BANK2,
 * BANK3. Reading D8 gives BANK.
 *
 * D9–DB are an auto-increment port, as on the NES picture chip (PPUADDR and
 * PPUDATA): STM D9 sets ADDR (a frame byte, 0–127), and every read or write
 * of DA reaches the byte at ADDR and then moves ADDR on by 1 (across a row)
 * or, with DB bit 0 set, by 4 (down one pixel row). One store per byte, no
 * address arithmetic in the program. Reading D9 gives ADDR, DB the step bit.
 */
export const BIG_SCREEN = SCREEN_SIZES["32×32"];
export const BIG_FRAME_BYTES = frameBytes(BIG_SCREEN);
export const BIG_PORT = { window: 0xd0, bank: 0xd8, addr: 0xd9, data: 0xda, step: 0xdb } as const;
/** How far ADDR moves after a DA access: one byte across, or one row (4 bytes) down. */
export const portStep = (down: boolean) => (down ? rowBytes(BIG_SCREEN) : 1);
export const BIG_TILES = 16;
export const isBigScreenAddress = (address: number) => (address & 0xf0) === 0xd0;
export const isWindowAddress = (address: number) => (address & 0xf8) === BIG_PORT.window;
/** The big screen's byte that window row `r` shows while BANK is `bank`. */
export const windowByte = (bank: number, r: number) =>
  ((bank >> 2) * 8 + (r & 7)) * rowBytes(BIG_SCREEN) + (bank & 3);
/** A big-screen write: the frame byte and its new value; `by` is set when the big blitter wrote it. */
export type FrameWrite = { byte: number; value: number; by?: "blitter" };

/**
 * The big blitter, on the same card at DC–DF. It works on whole bytes of
 * the 32×32 frame: STM DC sets DST and STM DD SRC (frame byte addresses,
 * y * 4 + x / 8), STM DE sets SIZE (rows − 1 in bits 2–6, byte columns − 1 in
 * bits 0–1), and STM DF starts a command: 1 FILL writes SRC itself into every
 * byte of the DST rectangle, 2 COPY copies the SRC rectangle there. A COPY of
 * 2 columns and 16 rows stamps a 16×16 sprite drawn elsewhere in the frame.
 *
 * Each clock edge it writes one byte: it reads the source through the
 * framebuffer's second port and writes the destination through the first.
 * Reading any of DC–DF gives BUSY in bit 0. While BUSY it
 * ignores DC–DF, owns the frame's write port, and CPU window and DA writes
 * are lost, as with the 8×8 blitter.
 */
export const BIG_BLIT = { dst: 0xdc, src: 0xdd, size: 0xde, cmd: 0xdf } as const;
export const BIG_BLIT_COMMANDS = { fill: 1, copy: 2 } as const;
export const isBigBlitAddress = (address: number) => (address & 0xfc) === BIG_BLIT.dst;
export type BigBlitter = {
  dst: number;
  src: number;
  size: number;
  op: number;
  busy: boolean;
  /** Where the next byte goes and comes from, and its column and row in the rectangle. */
  dptr: number;
  sptr: number;
  i: number;
  j: number;
};
export const initialBigBlitter = (): BigBlitter => ({
  dst: 0,
  src: 0,
  size: 0,
  op: 0,
  busy: false,
  dptr: 0,
  sptr: 0,
  i: 0,
  j: 0,
});
/** Byte columns and rows in the rectangle SIZE describes. */
export const blitColumns = (size: number) => (size & 3) + 1;
export const blitRows = (size: number) => ((size >> 2) & 31) + 1;
const bigBlitCommand = (op: number) =>
  op === BIG_BLIT_COMMANDS.fill ? "fill" : op === BIG_BLIT_COMMANDS.copy ? "copy" : null;

/** The byte the big blitter writes at `dptr` this tick: SRC for FILL, the frame byte at `sptr` for COPY. */
export const bigBlitterData = (state: BigBlitter, frame: readonly number[]) =>
  state.op === BIG_BLIT_COMMANDS.copy ? (frame[state.sptr] ?? 0) : state.src & 255;

/**
 * One clock edge of the big blitter. While BUSY it moves on to the next byte:
 * right along the row, or, after its last column, down to the next row's
 * first column (4 − (columns − 1) bytes on). Otherwise `write` sets DST, SRC
 * or SIZE (register 0–2), or starts the command in register 3.
 */
export function bigBlitterClock(
  state: BigBlitter,
  write: { register: number; value: number } | null,
): BigBlitter {
  const wrap = (address: number) => address & (BIG_FRAME_BYTES - 1);
  if (state.busy) {
    const lastColumn = state.i === blitColumns(state.size) - 1;
    if (lastColumn && state.j === blitRows(state.size) - 1)
      return { ...state, busy: false, i: 0, j: 0 };
    const step = lastColumn ? rowBytes(BIG_SCREEN) - state.i : 1;
    return {
      ...state,
      dptr: wrap(state.dptr + step),
      sptr: wrap(state.sptr + step),
      i: lastColumn ? 0 : state.i + 1,
      j: lastColumn ? state.j + 1 : state.j,
    };
  }
  if (!write) return state;
  const value = write.value & 255;
  switch (write.register & 3) {
    case 0:
      return { ...state, dst: wrap(value) };
    case 1:
      return { ...state, src: value };
    case 2:
      return { ...state, size: value & 127 };
    default: {
      const op = value & 3;
      if (!bigBlitCommand(op)) return { ...state, op };
      return { ...state, op, busy: true, dptr: state.dst, sptr: wrap(state.src), i: 0, j: 0 };
    }
  }
}

/** The big blitter's state for a readout: "BUSY · COPY · ROW 3 OF 16" or "IDLE". */
export function describeBigBlitter(state: BigBlitter): string {
  if (!state.busy) return "IDLE";
  return `BUSY · ${bigBlitCommand(state.op)!.toUpperCase()} · ROW ${state.j + 1} OF ${blitRows(state.size)}`;
}
export const BLITTER_PORT = { x: 0xe0, y: 0xe1, colour: 0xe2, arg: 0xe3, cmd: 0xe4 } as const;
export const isBlitterAddress = (address: number) => (address & 0xf0) === BLITTER_BASE;
/** Register index (A0–A2) of each blitter port address; 5–7 are unused. */
export const BLITTER_REGISTERS = ["x", "y", "colour", "arg", "cmd"] as const;

/** Command codes for STM E4. 0 and 7 do nothing. */
export const BLIT_COMMANDS = {
  clear: 1,
  fill: 2,
  hline: 3,
  vline: 4,
  pixel: 5,
  sprite: 6,
} as const;
export type BlitCommand = keyof typeof BLIT_COMMANDS;
export const blitCommandName = (op: number): BlitCommand | null =>
  (Object.keys(BLIT_COMMANDS) as BlitCommand[]).find((name) => BLIT_COMMANDS[name] === op) ?? null;

/** The blitter's registers. `op` is the command, `i` the step it is on. */
export type BlitterState = {
  x: number;
  y: number;
  colour: number;
  arg: number;
  op: number;
  i: number;
  busy: boolean;
};
export const initialBlitter = (): BlitterState => ({
  x: 0,
  y: 0,
  colour: 0,
  arg: 0,
  op: 0,
  i: 0,
  busy: false,
});

/**
 * The index of a command's last step. CLEAR and SPRITE write all 8 rows;
 * FILL and PIXEL one; HLINE and VLINE ARG pixels (low 3 bits, 0 means 8).
 */
export function blitterLast({ op, arg }: BlitterState): number {
  const command = blitCommandName(op);
  if (command === "clear" || command === "sprite") return 7;
  if (command === "hline" || command === "vline") return (arg - 1) & 7;
  return 0;
}

/** The screen row step `i` writes. Rows wrap: a sprite at y = 6 ends on row 5. */
export function blitterRow(state: BlitterState): number {
  const command = blitCommandName(state.op);
  if (command === "clear") return state.i;
  if (command === "vline" || command === "sprite") return (state.y + state.i) & 7;
  return command ? state.y : 0;
}

/** The pixel column step `i` changes, or null when it writes a whole row. */
export function blitterColumn(state: BlitterState): number | null {
  const command = blitCommandName(state.op);
  if (command === "hline") return (state.x + state.i) & 7;
  if (command === "vline" || command === "pixel") return state.x;
  return null;
}

/** Code ROM address of the sprite byte for step `i`: ARG + i. */
export const blitterSource = (state: BlitterState) => (state.arg + state.i) & 255;

/**
 * The byte step `i` writes to its row. `row` is that row's current value
 * (the screen's read-back) and `rom` the code ROM byte at `blitterSource`.
 */
export function blitterData(state: BlitterState, row: number, rom: number): number {
  const command = blitCommandName(state.op);
  if (command === "sprite") return rom & 255;
  if (command === "clear" || command === "fill") return state.colour & 255;
  const column = blitterColumn(state);
  return column === null ? 0 : plotRow(row, column, state.colour);
}

/** The blitter's state in a few words for a readout: "BUSY · SPRITE · STEP 3 OF 8" or "IDLE". */
export function describeBlitter(state: BlitterState): string {
  if (!state.busy) return "IDLE";
  const command = blitCommandName(state.op)!.toUpperCase();
  return `BUSY · ${command} · STEP ${state.i + 1} OF ${blitterLast(state) + 1}`;
}

/**
 * One clock edge. While BUSY the blitter takes a step (the screen stores its
 * row on the same edge) and goes idle after the last one. Otherwise `write`,
 * a register index and a byte, sets a register; writing a valid command
 * starts it at step 0.
 */
export function blitterClock(
  state: BlitterState,
  write: { register: number; value: number } | null,
): BlitterState {
  if (state.busy) {
    const done = state.i === blitterLast(state);
    return { ...state, i: done ? 0 : state.i + 1, busy: !done };
  }
  if (!write) return state;
  const value = write.value & 255;
  switch (BLITTER_REGISTERS[write.register & 7]) {
    case "x":
      return { ...state, x: value & 7 };
    case "y":
      return { ...state, y: value & 7 };
    case "colour":
      return { ...state, colour: value };
    case "arg":
      return { ...state, arg: value };
    case "cmd": {
      const op = value & 7;
      return { ...state, op, i: 0, busy: blitCommandName(op) !== null };
    }
    default:
      return state;
  }
}

export const OPCODES = {
  LDI: 0x10,
  LDM: 0x20,
  STM: 0x30,
  ADDI: 0x40,
  ADDM: 0x50,
  SUBI: 0x60,
  SUBM: 0x70,
  OUT: 0x80,
  JMP: 0x90,
  JNC: 0xa0,
  CALL: 0xb0,
  RET: 0xc0,
  // Stack-in-RAM CPU only (item M): 0xD0–0xD4. 0xD5–0xEF stay free for later extensions.
  LDS: 0xd0,
  STS: 0xd1,
  ADDS: 0xd2,
  SUBS: 0xd3,
  ADDSP: 0xd4,
  // Keyboard and interrupts (item N), both CPUs: 0xE0–0xE3.
  IN: 0xe0,
  EI: 0xe1,
  DI: 0xe2,
  RETI: 0xe3,
  HALT: 0xf0,
} as const;

/**
 * Not an instruction: while an interrupt is being entered, the control unit
 * looks up this opcode instead of IR, and its microcode pushes PC and jumps to
 * the handler vector. A program should never contain it.
 */
export const INT_OPCODE = 0xef;

/** Code address the interrupt jumps to. The compiler puts a JMP to the key handler there. */
export const INTERRUPT_VECTOR = 0x02;

/** Tick index → key code: on that tick's clock edge the key port latches the code and raises KEY READY. */
export type KeySchedule = Readonly<Record<number, number>>;

export const ISA = [
  {
    mnemonic: "LDI",
    opcode: OPCODES.LDI,
    operand: "literal",
    effect: "ACC ← operand",
  },
  {
    mnemonic: "LDM",
    opcode: OPCODES.LDM,
    operand: "RAM address",
    effect: "ACC ← RAM[address]",
  },
  {
    mnemonic: "STM",
    opcode: OPCODES.STM,
    operand: "RAM address",
    effect: "RAM[address] ← ACC",
  },
  {
    mnemonic: "ADDI",
    opcode: OPCODES.ADDI,
    operand: "literal",
    effect: "ACC ← ACC + operand",
  },
  {
    mnemonic: "ADDM",
    opcode: OPCODES.ADDM,
    operand: "RAM address",
    effect: "ACC ← ACC + RAM[address]",
  },
  {
    mnemonic: "SUBI",
    opcode: OPCODES.SUBI,
    operand: "literal",
    effect: "ACC ← ACC − operand",
  },
  {
    mnemonic: "SUBM",
    opcode: OPCODES.SUBM,
    operand: "RAM address",
    effect: "ACC ← ACC − RAM[address]",
  },
  {
    mnemonic: "OUT",
    opcode: OPCODES.OUT,
    operand: "unused",
    effect: "output ← ACC",
  },
  {
    mnemonic: "JMP",
    opcode: OPCODES.JMP,
    operand: "code address",
    effect: "PC ← address",
  },
  {
    mnemonic: "JNC",
    opcode: OPCODES.JNC,
    operand: "code address",
    effect: "if no borrow, PC ← address",
  },
  {
    mnemonic: "CALL",
    opcode: OPCODES.CALL,
    operand: "code address",
    effect: "push return PC; jump",
  },
  {
    mnemonic: "RET",
    opcode: OPCODES.RET,
    operand: "unused",
    effect: "PC ← popped return PC",
  },
  {
    mnemonic: "LDS",
    opcode: OPCODES.LDS,
    operand: "stack offset",
    effect: "ACC ← RAM[SP + offset]",
    stack: "ram",
  },
  {
    mnemonic: "STS",
    opcode: OPCODES.STS,
    operand: "stack offset",
    effect: "RAM[SP + offset] ← ACC",
    stack: "ram",
  },
  {
    mnemonic: "ADDS",
    opcode: OPCODES.ADDS,
    operand: "stack offset",
    effect: "ACC ← ACC + RAM[SP + offset]",
    stack: "ram",
  },
  {
    mnemonic: "SUBS",
    opcode: OPCODES.SUBS,
    operand: "stack offset",
    effect: "ACC ← ACC − RAM[SP + offset]",
    stack: "ram",
  },
  {
    mnemonic: "ADDSP",
    opcode: OPCODES.ADDSP,
    operand: "SP change",
    effect: "SP ← SP + operand (80–FF count as negative)",
    stack: "ram",
  },
  {
    mnemonic: "IN",
    opcode: OPCODES.IN,
    operand: "unused",
    effect: "ACC ← key code; key ready ← 0",
  },
  {
    mnemonic: "EI",
    opcode: OPCODES.EI,
    operand: "unused",
    effect: "interrupts on",
  },
  {
    mnemonic: "DI",
    opcode: OPCODES.DI,
    operand: "unused",
    effect: "interrupts off",
  },
  {
    mnemonic: "RETI",
    opcode: OPCODES.RETI,
    operand: "unused",
    effect: "PC ← popped PC; interrupts on",
  },
  { mnemonic: "HALT", opcode: OPCODES.HALT, operand: "unused", effect: "stop" },
] as const;

/** The instructions one CPU decodes; the stack-in-RAM opcodes halt the other CPU. */
export const isaFor = (stack: StackModel) =>
  ISA.filter((item) => !("stack" in item) || item.stack === stack);

/** What an instruction's second byte means; `describeOperand` reads it this way. */
export const OPERAND_KINDS = [
  "literal",
  "RAM address",
  "code address",
  "stack offset",
  "SP change",
  "unused",
] as const;
export type OperandKind = (typeof OPERAND_KINDS)[number];

/** An instruction set entry, as the decoder, assembler and instruction views read it. */
export type IsaEntry = {
  readonly mnemonic: string;
  readonly opcode: number;
  readonly operand: OperandKind;
  readonly effect: string;
};

export function encodeInstruction(
  opcode: number,
  operand: number,
  isa: readonly IsaEntry[] = ISA,
): [number, number] {
  if (!isa.some((item) => item.opcode === opcode)) throw new Error("Unknown opcode.");
  if (!Number.isInteger(operand) || operand < 0 || operand > 255)
    throw new Error("Operand must be a byte.");
  return [opcode, operand];
}

export function decodeInstruction(bytes: readonly number[]): (typeof ISA)[number] | null {
  if (bytes.length !== 2) return null;
  return ISA.find((item) => item.opcode === bytes[0]) ?? null;
}

export function hex(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

export function byteBits(value: number): string {
  return value.toString(2).padStart(8, "0");
}

/** A byte read as two's complement: 80–FF are −128 to −1. */
export const signedByte = (value: number) => (value >= 128 ? value - 256 : value);

export type OperandMeaning = { short: string; long: string };

/**
 * Says whether an operand byte is a number, a RAM address, or a code address.
 * `isa` is the instruction set to read the opcode in; pass an edited table's
 * `microcodeIsa(table)` for opcodes the default set does not have.
 */
export function describeOperand(
  opcode: number,
  operand: number,
  variables: CompiledProgram["variables"],
  isa: readonly IsaEntry[] = ISA,
): OperandMeaning {
  const kind = isa.find((item) => item.opcode === opcode)?.operand;
  if (kind === "literal") return { short: `#${operand}`, long: `number ${operand}` };
  if (kind === "RAM address" && opcode !== OPCODES.STM && isVideoStatus(operand))
    return { short: `[${hex(operand)}] vblank`, long: `the video status (${hex(operand)})` };
  if (kind === "RAM address" && isPixelPort(operand)) {
    const role = pixelPortRole(operand);
    return role === "pixel"
      ? { short: `[${hex(operand)}] pixel`, long: `the pixel at the cursor (${hex(operand)})` }
      : { short: `[${hex(operand)}] pixel ${role}`, long: `pixel ${role} (${hex(operand)})` };
  }
  if (kind === "RAM address" && isWindowAddress(operand))
    return {
      short: `[${hex(operand)}] window ${operand & 7}`,
      long: `big-screen window row ${operand & 7} (${hex(operand)})`,
    };
  if (kind === "RAM address" && isBigBlitAddress(operand)) {
    const register = ["dst", "src", "size", "cmd"][operand & 3];
    return {
      short: `[${hex(operand)}] big blit ${register}`,
      long: `big blitter ${register} (${hex(operand)})`,
    };
  }
  if (kind === "RAM address" && operand === BIG_PORT.addr)
    return {
      short: `[${hex(operand)}] addr`,
      long: `the big screen's port ADDR (${hex(operand)})`,
    };
  if (kind === "RAM address" && operand === BIG_PORT.data)
    return {
      short: `[${hex(operand)}] data`,
      long: `the byte at the port's ADDR (${hex(operand)})`,
    };
  if (kind === "RAM address" && operand === BIG_PORT.step)
    return { short: `[${hex(operand)}] step`, long: `the port's step (${hex(operand)})` };
  if (kind === "RAM address" && operand === BIG_PORT.bank)
    return {
      short: `[${hex(operand)}] bank`,
      long: `the big screen's bank register (${hex(operand)})`,
    };
  if (kind === "RAM address" && isBlitterAddress(operand)) {
    const register = BLITTER_REGISTERS[operand & 7];
    return register
      ? {
          short: `[${hex(operand)}] blit ${register}`,
          long: `blitter ${register} (${hex(operand)})`,
        }
      : { short: `[${hex(operand)}] blit`, long: `the blitter (${hex(operand)})` };
  }
  if (kind === "RAM address" && isScreenAddress(operand)) {
    const row = operand & (SCREEN_ROWS - 1);
    return {
      short: `[${hex(operand)}] screen ${row}`,
      long: `screen row ${row} (${hex(operand)})`,
    };
  }
  if (kind === "RAM address") {
    const name = variables.find(({ address }) => address === operand)?.name;
    return {
      short: `[${hex(operand)}]${name ? ` ${name}` : ""}`,
      long: `RAM address ${hex(operand)}${name ? ` (${name})` : ""}`,
    };
  }
  if (kind === "code address")
    return { short: `→${hex(operand)}`, long: `code address ${hex(operand)}` };
  if (kind === "stack offset")
    return { short: `[SP+${operand}]`, long: `RAM address SP + ${operand} (stack frame)` };
  if (kind === "SP change") {
    const change = signedByte(operand);
    return {
      short: `SP${change < 0 ? "−" : "+"}${Math.abs(change)}`,
      long: `${change < 0 ? "allocate" : "free"} ${Math.abs(change)} stack byte${Math.abs(change) === 1 ? "" : "s"}`,
    };
  }
  return { short: "", long: "not used" };
}

function fail(line: number, message: string): never {
  throw new Error(`Line ${line}: ${message}`);
}

type Expression =
  | { kind: "value"; value: string }
  | { kind: "binary"; left: string; operator: "+" | "-"; right: string }
  | { kind: "call"; name: string; argument: string | null };

type Statement =
  | {
      kind: "assign";
      line: number;
      declaration: boolean;
      name: string;
      expression: Expression;
    }
  | { kind: "print"; line: number; expression: Expression }
  | { kind: "call"; line: number; name: string; argument: string | null }
  | { kind: "plot"; line: number; x: string; y: string; colour: string | null }
  | { kind: "bank"; line: number; tile: string }
  | { kind: "bigblit"; line: number; command: "fill" | "copy" | "wait"; args: number[] }
  | { kind: "sprite"; line: number; name: string; rows: number[] }
  | { kind: "blit"; line: number; command: string; args: string[] }
  | { kind: "return"; line: number; expression: Expression | null }
  | {
      kind: "if";
      line: number;
      left: string;
      operator: "<" | ">";
      right: string;
      body: Statement[];
    }
  | { kind: "loop"; line: number; body: Statement[] }
  | {
      kind: "for";
      line: number;
      declaration: boolean;
      name: string;
      initial: string;
      limit: string;
      increment: string;
      body: Statement[];
    };

type FunctionDefinition = {
  name: string;
  parameter: string | null;
  body: Statement[];
  line: number;
};
const NAME = "[A-Za-z_]\\w*";
/** `screen[3]`: screen row 3, at data address F3; `window[3]`: row 3 of the big screen's bank window, at D3. */
const SCREEN_ROW = "(?:screen|window)\\[\\s*\\d+\\s*\\]";
const VALUE = `(?:${SCREEN_ROW}|${NAME}|\\d+)`;

function parseExpression(text: string, line: number): Expression {
  const value = text.trim();
  const call = new RegExp(`^(${NAME})\\s*\\(\\s*(${VALUE})?\\s*\\)$`).exec(value);
  if (call) return { kind: "call", name: call[1], argument: call[2] ?? null };
  const binary = new RegExp(`^(${VALUE})\\s*([+-])\\s*(${VALUE})$`).exec(value);
  if (binary)
    return {
      kind: "binary",
      left: binary[1],
      operator: binary[2] as "+" | "-",
      right: binary[3],
    };
  if (new RegExp(`^${VALUE}$`).test(value)) return { kind: "value", value };
  fail(line, "Expected a byte, variable, simple +/− expression, or function call.");
}

function parseProgram(source: string): {
  main: Statement[];
  functions: FunctionDefinition[];
} {
  const lines = source.split("\n").map((raw) => raw.replace(/\/\/.*$/, "").trim());
  const functions: FunctionDefinition[] = [];
  let position = 0;
  const parseBlock = (inside: boolean): Statement[] => {
    const statements: Statement[] = [];
    while (position < lines.length) {
      const text = lines[position];
      const line = position + 1;
      position++;
      if (!text) continue;
      if (text === "}") {
        if (!inside) fail(line, "Unexpected closing brace.");
        return statements;
      }
      if (!inside && /^fn\b/.test(text)) {
        position--;
        return statements;
      }
      const loop = new RegExp(
        `^for\\s*\\(\\s*(let\\s+)?(${NAME})\\s*=\\s*(${VALUE})\\s*;\\s*\\2\\s*<\\s*(${VALUE})\\s*;\\s*\\2\\s*(?:\\+\\+|=\\s*\\2\\s*\\+\\s*(${VALUE}))\\s*\\)\\s*\\{$`,
      ).exec(text);
      if (loop) {
        statements.push({
          kind: "for",
          line,
          declaration: Boolean(loop[1]),
          name: loop[2],
          initial: loop[3],
          limit: loop[4],
          increment: loop[5] ?? "1",
          body: parseBlock(true),
        });
        continue;
      }
      const branch = new RegExp(
        `^if\\s*\\(\\s*(${VALUE})\\s*([<>])\\s*(${VALUE})\\s*\\)\\s*\\{$`,
      ).exec(text);
      if (branch) {
        statements.push({
          kind: "if",
          line,
          left: branch[1],
          operator: branch[2] as "<" | ">",
          right: branch[3],
          body: parseBlock(true),
        });
        continue;
      }
      if (/^loop\s*\{$/.test(text)) {
        statements.push({ kind: "loop", line, body: parseBlock(true) });
        continue;
      }
      if (/^loop\b/.test(text)) fail(line, "Use loop { with the closing brace on its own line.");
      if (/^if\b/.test(text))
        fail(line, "Use if (a < b) { or if (a > b) { with the closing brace on its own line.");
      if (/^for\b/.test(text))
        fail(line, "Use for (let i = 0; i < 3; i++) { with the closing brace on its own line.");
      const print = /^print\s*\((.*)\)\s*;$/.exec(text);
      if (print) {
        statements.push({
          kind: "print",
          line,
          expression: parseExpression(print[1], line),
        });
        continue;
      }
      const plot = new RegExp(
        `^plot\\s*\\(\\s*(${VALUE})\\s*,\\s*(${VALUE})\\s*(?:,\\s*(${VALUE})\\s*)?\\)\\s*;$`,
      ).exec(text);
      if (plot) {
        statements.push({ kind: "plot", line, x: plot[1], y: plot[2], colour: plot[3] ?? null });
        continue;
      }
      if (/^plot\b/.test(text))
        fail(line, "Use plot(x, y); or plot(x, y, colour); with numbers or variables.");
      const bank = new RegExp(`^bank\\s*\\(\\s*(${VALUE})\\s*\\)\\s*;$`).exec(text);
      if (bank) {
        statements.push({ kind: "bank", line, tile: bank[1] });
        continue;
      }
      if (/^bank\b/.test(text)) fail(line, "Use bank(tile); with a number or variable, 0 to 15.");
      const bigBlit = /^big_(fill|copy|wait)\s*\(([\d\s,]*)\)\s*;$/.exec(text);
      if (bigBlit) {
        const args = bigBlit[2]
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map(Number);
        statements.push({
          kind: "bigblit",
          line,
          command: bigBlit[1] as "fill" | "copy" | "wait",
          args,
        });
        continue;
      }
      if (/^big_(fill|copy|wait)\b/.test(text))
        fail(
          line,
          "Use big_fill(col, row, cols, rows, byte);, big_copy(fromCol, fromRow, toCol, toRow, cols, rows); or big_wait(); with numbers.",
        );
      const sprite = new RegExp(`^sprite\\s+(${NAME})\\s*=\\s*\\[([\\d\\s,]*)\\]\\s*;$`).exec(text);
      if (sprite) {
        const rows = sprite[2].split(",").map((item) => item.trim());
        if (rows.length !== SCREEN_ROWS || rows.some((row) => !/^\d+$/.test(row)))
          fail(
            line,
            `A sprite is ${SCREEN_ROWS} row bytes: sprite name = [n, n, n, n, n, n, n, n];`,
          );
        if (rows.some((row) => Number(row) > 255)) fail(line, "Numbers must be between 0 and 255.");
        statements.push({ kind: "sprite", line, name: sprite[1], rows: rows.map(Number) });
        continue;
      }
      if (/^sprite\b/.test(text))
        fail(line, `A sprite is ${SCREEN_ROWS} row bytes: sprite name = [n, n, n, n, n, n, n, n];`);
      const blit = new RegExp(`^blit\\s*\\(\\s*([a-z]+)\\s*((?:,\\s*${VALUE}\\s*)*)\\)\\s*;$`).exec(
        text,
      );
      if (blit) {
        const args = blit[2]
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        statements.push({ kind: "blit", line, command: blit[1], args });
        continue;
      }
      if (/^blit\b/.test(text))
        fail(line, "Use blit(command, …); for example blit(sprite, heart, 0); or blit(wait);");
      const returned = /^return(?:\s+(.+))?\s*;$/.exec(text);
      if (returned) {
        statements.push({
          kind: "return",
          line,
          expression: returned[1] ? parseExpression(returned[1], line) : null,
        });
        continue;
      }
      const assignment = new RegExp(`^(let\\s+)?(${SCREEN_ROW}|${NAME})\\s*=\\s*(.+)\\s*;$`).exec(
        text,
      );
      if (assignment) {
        statements.push({
          kind: "assign",
          line,
          declaration: Boolean(assignment[1]),
          name: assignment[2],
          expression: parseExpression(assignment[3], line),
        });
        continue;
      }
      const call = new RegExp(`^(${NAME})\\s*\\(\\s*(${VALUE})?\\s*\\)\\s*;$`).exec(text);
      if (call) {
        statements.push({
          kind: "call",
          line,
          name: call[1],
          argument: call[2] ?? null,
        });
        continue;
      }
      fail(
        line,
        "Use let, assignment, print, plot, blit, sprite, for, loop, if, function call, or return.",
      );
    }
    if (inside) fail(lines.length, "Missing closing brace.");
    return statements;
  };
  const main: Statement[] = [];
  while (position < lines.length) {
    const text = lines[position];
    const line = position + 1;
    const header = new RegExp(`^fn\\s+(${NAME})\\s*\\(\\s*(${NAME})?\\s*\\)\\s*\\{$`).exec(text);
    if (header) {
      position++;
      if (header[1] === "print") fail(line, "print is reserved for output.");
      if (header[1] === "plot") fail(line, "plot is reserved for the screen.");
      if (header[1] === "bank" || /^big_(fill|copy|wait)$/.test(header[1]))
        fail(line, `${header[1]} is reserved for the big screen.`);
      if (header[1] === "blit" || header[1] === "sprite")
        fail(line, `${header[1]} is reserved for the blitter.`);
      if (BUILTINS.has(header[1]) || header[1] === WAIT_VBLANK || PORT_CALLS.has(header[1]))
        fail(line, `${header[1]} is built in.`);
      if (functions.some((item) => item.name === header[1]))
        fail(line, `Function “${header[1]}” is already defined.`);
      functions.push({
        name: header[1],
        parameter: header[2] ?? null,
        body: parseBlock(true),
        line,
      });
      continue;
    }
    if (/^fn\b/.test(text))
      fail(line, "Use fn name(parameter) { with the closing brace on its own line.");
    const before = position;
    // Parse one top-level statement, including its nested loop body.
    const remainder = parseBlock(false);
    main.push(...remainder);
    if (position === before) break;
  }
  return { main, functions };
}

/** Each blit command's arguments, in order, and the blitter register each one sets. */
type BlitArg = {
  name: string;
  register: "x" | "y" | "colour" | "arg";
  min: number;
  max: number;
  /** The default when the argument is left out. */
  optional?: string;
};
const blitX: BlitArg = { name: "x", register: "x", min: 0, max: 7 };
const blitY: BlitArg = { name: "y", register: "y", min: 0, max: 7 };
const blitLength: BlitArg = { name: "length", register: "arg", min: 1, max: 8 };
const blitColour: BlitArg = { name: "colour", register: "colour", min: 0, max: 1, optional: "1" };
const BLIT_SPECS: Record<BlitCommand | "wait", BlitArg[]> = {
  wait: [],
  clear: [{ name: "pattern", register: "colour", min: 0, max: 255, optional: "0" }],
  fill: [blitY, { name: "pattern", register: "colour", min: 0, max: 255 }],
  hline: [blitX, blitY, blitLength, blitColour],
  vline: [blitX, blitY, blitLength, blitColour],
  pixel: [blitX, blitY, blitColour],
  sprite: [{ name: "sprite", register: "arg", min: 0, max: 255 }, blitY],
};

/** The key handler: a function with this name runs when a key is pressed. */
export const KEY_HANDLER = "on_key";
/**
 * The big screen's port as calls: vram_at(byte); sets ADDR, vram_step(1); or
 * vram_step(4); goes across or down, vram(value); writes the byte at ADDR and
 * vram_read() reads it; both then move ADDR on.
 */
const PORT_CALLS = new Set(["vram_at", "vram_step", "vram", "vram_read"]);
/**
 * wait_vblank(); returns at the start of the next vertical blank: it waits
 * while the beam is still in a blank, then until the next one begins. The CPU
 * has no branch on zero, so each poll adds 255 to the status: 1 + 255
 * carries, 0 + 255 does not, and JNC tests the carry.
 */
export const WAIT_VBLANK = "wait_vblank";
/** Built-in calls: key() reads the key port; the other two switch interrupts on and off. */
const BUILTINS = new Map<string, { opcode: number; label: string }>([
  ["key", { opcode: OPCODES.IN, label: "READ KEY" }],
  ["interrupts_on", { opcode: OPCODES.EI, label: "INTERRUPTS ON" }],
  ["interrupts_off", { opcode: OPCODES.DI, label: "INTERRUPTS OFF" }],
]);

/** Where a name lives: a fixed RAM address, or a byte in the current stack frame. */
type Place = { frame: boolean; address: number };
type Scope = Map<string, Place>;
type Operand = { mode: "literal" | "ram" | "frame"; value: number };

/** Declared names in a function body, in order: each one gets a frame byte. */
function declarations(statements: Statement[]): { name: string; line: number }[] {
  return statements.flatMap((statement) => {
    if (statement.kind === "assign" && statement.declaration)
      return [{ name: statement.name, line: statement.line }];
    if (statement.kind === "for")
      return [
        ...(statement.declaration ? [{ name: statement.name, line: statement.line }] : []),
        ...declarations(statement.body),
      ];
    if (statement.kind === "if" || statement.kind === "loop") return declarations(statement.body);
    return [];
  });
}

export function compileProgram(
  source: string,
  options: { stack?: StackModel } = {},
): CompiledProgram {
  const stack = options.stack ?? "hardware";
  const inRam = stack === "ram";
  const ramBytes = STACK_MODELS[stack].ramBytes;
  const ast = parseProgram(source);
  const instructions: Instruction[] = [];
  const variables: { name: string; address: number }[] = [];
  const globals: Scope = new Map();
  const functionStarts = new Map<string, number>();
  const callPatches: { address: number; name: string; line: number }[] = [];
  const functions = new Map(ast.functions.map((definition) => [definition.name, definition]));
  const functionCalls = new Map<string, Set<string>>();
  /** Stack-in-RAM frame size per function: parameter plus locals. */
  const frameSizes = new Map<string, number>();
  const mainCalls = new Set<{ name: string; line: number }>();
  /** Functions (and "main") whose own code plots a pixel. */
  const plotters = new Set<string>();
  /** Functions (and "main") whose own code sets BANK or uses the big screen's port or blitter. */
  const bigUsers = new Set<string>();
  /** Whether any code starts the big blitter, so HALT must wait for it. */
  let bigBlits = false;
  /** Functions (and "main") whose own code drives the blitter. */
  const blitters = new Set<string>();
  /** Sprites: 8 row bytes each, stored in code ROM after the code. */
  const sprites = new Map<string, number[]>();
  for (const statement of ast.main)
    if (statement.kind === "sprite") {
      if (sprites.has(statement.name))
        fail(statement.line, `Sprite “${statement.name}” is already declared.`);
      sprites.set(statement.name, statement.rows);
    }
  /** LDI instructions whose operand becomes a sprite's code ROM address. */
  const spritePatches: { index: number; name: string }[] = [];

  const emit = (opcode: number, operand: number, label: string, line: number): number => {
    if (instructions.length >= 128) fail(line, "Program exceeds 256 code bytes.");
    const address = instructions.length * 2;
    instructions.push({ address, opcode, operand, label, line });
    return address;
  };
  const patch = (address: number, target: number) => {
    if (target < 0 || target > 255 || target % 2 !== 0) throw new Error("Invalid branch target.");
    instructions[address / 2].operand = target;
  };
  /** Gives a declared name its home: a frame byte inside functions on the RAM-stack CPU. */
  const allocate = (name: string, scope: Scope, display: string, line: number, frame: boolean) => {
    if (scope.has(name)) fail(line, `“${name}” is already declared.`);
    if (frame) {
      const place = { frame: true, address: scope.size };
      scope.set(name, place);
      return place;
    }
    if (variables.length >= ramBytes) fail(line, `At most ${ramBytes} variables fit in RAM.`);
    const place = { frame: false, address: variables.length };
    scope.set(name, place);
    variables.push({ name: display, address: place.address });
    return place;
  };
  const resolve = (value: string, scope: Scope, line: number): Operand => {
    const row = /^(screen|window)\[\s*(\d+)\s*\]$/.exec(value);
    if (row) {
      const what = row[1] === "screen" ? "Screen rows" : "Window rows";
      if (Number(row[2]) >= SCREEN_ROWS) fail(line, `${what} are 0 to ${SCREEN_ROWS - 1}.`);
      return {
        mode: "ram",
        value: (row[1] === "screen" ? SCREEN_BASE : BIG_PORT.window) + Number(row[2]),
      };
    }
    if (/^\d+$/.test(value)) {
      const number = Number(value);
      if (number > 255) fail(line, "Numbers must be between 0 and 255.");
      return { mode: "literal", value: number };
    }
    const place = scope.get(value) ?? globals.get(value);
    if (place === undefined) fail(line, `Unknown variable “${value}”.`);
    return { mode: place.frame ? "frame" : "ram", value: place.address };
  };
  const pick = <T>(operand: Operand, literal: T, ram: T, frame: T) =>
    operand.mode === "literal" ? literal : operand.mode === "ram" ? ram : frame;
  const load = (value: string, scope: Scope, line: number) => {
    const result = resolve(value, scope, line);
    emit(pick(result, OPCODES.LDI, OPCODES.LDM, OPCODES.LDS), result.value, `LOAD ${value}`, line);
  };
  const add = (value: string, subtract: boolean, label: string, scope: Scope, line: number) => {
    const result = resolve(value, scope, line);
    const opcode = subtract
      ? pick(result, OPCODES.SUBI, OPCODES.SUBM, OPCODES.SUBS)
      : pick(result, OPCODES.ADDI, OPCODES.ADDM, OPCODES.ADDS);
    emit(opcode, result.value, label, line);
  };
  const store = (place: Place, label: string, line: number) =>
    emit(place.frame ? OPCODES.STS : OPCODES.STM, place.address, label, line);
  /** RAM bytes where the key handler saves the ACC and carry flag of the code it interrupted. */
  let saved: { acc: number; carry: number } | null = null;
  /**
   * Frees the frame and returns; ACC keeps the return value. The key handler
   * instead restores the interrupted code's carry flag and ACC, then RETI.
   */
  const leave = (caller: string, line: number) => {
    const size = frameSizes.get(caller) ?? 0;
    if (size) emit(OPCODES.ADDSP, size, `FREE FRAME (${size})`, line);
    if (caller !== KEY_HANDLER || !saved) {
      emit(OPCODES.RET, 0, "RETURN", line);
      return;
    }
    // 0 − saved carry borrows exactly when the saved carry was 1.
    emit(OPCODES.LDI, 0, "RESTORE CARRY", line);
    emit(OPCODES.SUBM, saved.carry, "RESTORE CARRY", line);
    emit(OPCODES.LDM, saved.acc, "RESTORE ACC", line);
    emit(OPCODES.RETI, 0, "RETURN FROM INTERRUPT", line);
  };
  const call = (
    name: string,
    argument: string | null,
    scope: Scope,
    line: number,
    caller: string,
  ) => {
    if (PORT_CALLS.has(name)) {
      bigUsers.add(caller);
      const needs = name !== "vram_read";
      if (Boolean(argument) !== needs)
        fail(line, needs ? `Use ${name}(value);` : `${name}() takes no arguments.`);
      if (name === "vram_read") {
        emit(OPCODES.LDM, BIG_PORT.data, "READ BYTE AT ADDR, ADDR MOVES ON", line);
        return;
      }
      const value = argument!;
      const literal = /^\d+$/.test(value) ? Number(value) : null;
      if (name === "vram_step") {
        if (literal !== 1 && literal !== 4)
          fail(line, "Use vram_step(1); to go across a row or vram_step(4); to go down.");
        emit(OPCODES.LDI, Number(literal === 4), `STEP ${literal}`, line);
        emit(OPCODES.STM, BIG_PORT.step, "SET STEP", line);
        return;
      }
      if (name === "vram_at" && literal !== null && literal >= BIG_FRAME_BYTES)
        fail(line, `Big-screen bytes are 0 to ${BIG_FRAME_BYTES - 1}.`);
      load(value, scope, line);
      if (name === "vram_at") emit(OPCODES.STM, BIG_PORT.addr, `ADDR ← ${value}`, line);
      else emit(OPCODES.STM, BIG_PORT.data, `BYTE AT ADDR ← ${value}, ADDR MOVES ON`, line);
      return;
    }
    if (name === WAIT_VBLANK) {
      if (argument) fail(line, `${name}() takes no arguments.`);
      const during = instructions.length * 2;
      emit(OPCODES.LDM, VIDEO_STATUS, "READ VBLANK", line);
      emit(OPCODES.ADDI, 255, "CARRY IF VBLANK", line);
      const over = emit(OPCODES.JNC, 0, "BLANK OVER", line);
      emit(OPCODES.JMP, during, "STILL IN BLANK", line);
      patch(over, instructions.length * 2);
      const until = instructions.length * 2;
      emit(OPCODES.LDM, VIDEO_STATUS, "READ VBLANK", line);
      emit(OPCODES.ADDI, 255, "CARRY IF VBLANK", line);
      emit(OPCODES.JNC, until, "WAIT FOR VBLANK", line);
      return;
    }
    const builtin = BUILTINS.get(name);
    if (builtin) {
      if (argument) fail(line, `${name}() takes no arguments.`);
      emit(builtin.opcode, 0, builtin.label, line);
      return;
    }
    if (name === KEY_HANDLER)
      fail(line, `${KEY_HANDLER} runs when a key is pressed; the program does not call it.`);
    const definition = functions.get(name);
    if (!definition) fail(line, `Unknown function “${name}”.`);
    if (Boolean(argument) !== Boolean(definition.parameter))
      fail(
        line,
        `Function “${name}” ${definition.parameter ? "needs one argument" : "takes no arguments"}.`,
      );
    if (argument) load(argument, scope, line);
    const address = emit(OPCODES.CALL, 0, `CALL ${name}`, line);
    callPatches.push({ address, name, line });
    if (caller !== "main") functionCalls.get(caller)?.add(name);
    else mainCalls.add({ name, line });
  };
  const compileExpression = (
    expression: Expression,
    scope: Scope,
    line: number,
    caller: string,
  ) => {
    if (expression.kind === "value") {
      load(expression.value, scope, line);
    } else if (expression.kind === "call") {
      if (expression.name === WAIT_VBLANK)
        fail(line, `${WAIT_VBLANK}() gives no value: write it as a statement.`);
      call(expression.name, expression.argument, scope, line, caller);
    } else {
      load(expression.left, scope, line);
      add(
        expression.right,
        expression.operator === "-",
        `${expression.operator === "+" ? "ADD" : "SUB"} ${expression.right}`,
        scope,
        line,
      );
    }
  };
  const declare = (name: string, scope: Scope, caller: string, line: number) =>
    allocate(
      name,
      scope,
      caller === "main" ? name : `${caller}.${name}`,
      line,
      inRam && caller !== "main",
    );
  const target = (name: string, scope: Scope, line: number): Place => {
    if (/^\d+$/.test(name)) fail(line, "Assignment target must be a variable.");
    if (name.startsWith("screen[") || name.startsWith("window["))
      return { frame: false, address: resolve(name, scope, line).value };
    const place = scope.get(name) ?? globals.get(name);
    if (place === undefined) fail(line, `Unknown variable “${name}”.`);
    return place;
  };
  /** Polls BUSY: LDM E4 reads 1 while busy, and 1 − 1 does not borrow, so JNC loops. */
  const waitForBlitter = (line: number) => {
    const start = instructions.length * 2;
    emit(OPCODES.LDM, BLITTER_PORT.cmd, "READ BLITTER BUSY", line);
    emit(OPCODES.SUBI, 1, "BUSY − 1", line);
    emit(OPCODES.JNC, start, "WAIT WHILE BUSY", line);
  };
  /**
   * blit(command, …): waits until the blitter is idle (it ignores register
   * writes while BUSY), stores each argument in its register, then the
   * command code. blit(wait) only waits.
   */
  const blit = (command: string, args: string[], scope: Scope, line: number, caller: string) => {
    const spec = BLIT_SPECS[command as keyof typeof BLIT_SPECS];
    if (!spec)
      fail(
        line,
        `Unknown blitter command “${command}”. Use ${Object.keys(BLIT_SPECS).join(", ")}.`,
      );
    const required = spec.filter((arg) => !arg.optional).length;
    if (args.length < required || args.length > spec.length)
      fail(
        line,
        `Use blit(${[command, ...spec.map((arg) => (arg.optional ? `${arg.name}?` : arg.name))].join(", ")});`,
      );
    blitters.add(caller);
    waitForBlitter(line);
    if (command === "wait") return;
    for (const [index, arg] of spec.entries()) {
      const value = args[index] ?? arg.optional ?? "0";
      if (arg.name === "sprite") {
        if (!sprites.has(value)) fail(line, `Unknown sprite “${value}”.`);
        spritePatches.push({ index: instructions.length, name: value });
        emit(OPCODES.LDI, 0, `SPRITE ${value} ADDRESS`, line);
      } else {
        if (/^\d+$/.test(value) && (Number(value) < arg.min || Number(value) > arg.max))
          fail(line, `Blitter ${arg.name} is ${arg.min} to ${arg.max}.`);
        load(value, scope, line);
      }
      emit(
        OPCODES.STM,
        BLITTER_PORT[arg.register],
        `BLIT ${arg.register.toUpperCase()} ← ${value}`,
        line,
      );
    }
    const code = BLIT_COMMANDS[command as BlitCommand];
    emit(OPCODES.LDI, code, `BLIT ${command.toUpperCase()}`, line);
    emit(OPCODES.STM, BLITTER_PORT.cmd, "START BLITTER", line);
  };
  /** Polls DF: 1 while the big blitter is busy, and 1 − 1 does not borrow, so JNC loops. */
  const waitForBigBlitter = (line: number) => {
    const start = instructions.length * 2;
    emit(OPCODES.LDM, BIG_BLIT.cmd, "READ BIG BLITTER BUSY", line);
    emit(OPCODES.SUBI, 1, "BUSY − 1", line);
    emit(OPCODES.JNC, start, "WAIT WHILE BUSY", line);
  };
  /**
   * big_fill(col, row, cols, rows, byte); and big_copy(fromCol, fromRow, toCol,
   * toRow, cols, rows); in byte columns (0–3, 8 pixels each) and pixel rows
   * (0–31). Each waits until the big blitter is idle, then sets DST, SRC and
   * SIZE and starts it. big_wait(); only waits.
   */
  const bigBlit = (command: "fill" | "copy" | "wait", args: number[], line: number) => {
    const arity = { fill: 5, copy: 6, wait: 0 }[command];
    if (args.length !== arity)
      fail(
        line,
        command === "fill"
          ? "Use big_fill(col, row, cols, rows, byte);"
          : command === "copy"
            ? "Use big_copy(fromCol, fromRow, toCol, toRow, cols, rows);"
            : "big_wait() takes no arguments.",
      );
    waitForBigBlitter(line);
    if (command === "wait") return;
    const check = (value: number, max: number, what: string, min = 0) => {
      if (value < min || value > max) fail(line, `Big blitter ${what} is ${min} to ${max}.`);
      return value;
    };
    const byteAt = (col: number, row: number) =>
      check(row, 31, "row") * rowBytes(BIG_SCREEN) + check(col, 3, "col");
    const [cols, rows] = command === "fill" ? args.slice(2, 4) : args.slice(4, 6);
    const size = ((check(rows, 32, "rows", 1) - 1) << 2) | (check(cols, 4, "cols", 1) - 1);
    const dst = command === "fill" ? byteAt(args[0], args[1]) : byteAt(args[2], args[3]);
    const src = command === "fill" ? check(args[4], 255, "byte") : byteAt(args[0], args[1]);
    for (const [value, register, label] of [
      [dst, BIG_BLIT.dst, "DST"],
      [src, BIG_BLIT.src, command === "fill" ? "FILL BYTE" : "SRC"],
      [size, BIG_BLIT.size, "SIZE"],
      [BIG_BLIT_COMMANDS[command], BIG_BLIT.cmd, `START ${command.toUpperCase()}`],
    ] as const) {
      emit(OPCODES.LDI, value, `${label} ${value}`, line);
      emit(OPCODES.STM, register, label.startsWith("START") ? label : `BIG BLIT ${label}`, line);
    }
  };
  const compileStatements = (statements: Statement[], scope: Scope, caller: string) => {
    for (const statement of statements) {
      const line = statement.line;
      if (statement.kind === "assign") {
        if (statement.declaration && /^(screen|window)\[/.test(statement.name))
          fail(line, "A screen row is not a variable: write screen[0] = 1; without let.");
        if (
          statement.declaration &&
          ((statement.expression.kind === "value" &&
            statement.expression.value === statement.name) ||
            (statement.expression.kind === "binary" &&
              (statement.expression.left === statement.name ||
                statement.expression.right === statement.name)) ||
            (statement.expression.kind === "call" &&
              statement.expression.argument === statement.name))
        )
          fail(line, `“${statement.name}” has no value yet.`);
        const place = statement.declaration
          ? declare(statement.name, scope, caller, line)
          : target(statement.name, scope, line);
        compileExpression(statement.expression, scope, line, caller);
        store(place, `STORE ${statement.name}`, line);
      } else if (statement.kind === "print") {
        compileExpression(statement.expression, scope, line, caller);
        emit(OPCODES.OUT, 0, "PRINT ACC", line);
      } else if (statement.kind === "call") {
        call(statement.name, statement.argument, scope, line, caller);
      } else if (statement.kind === "bigblit") {
        bigUsers.add(caller);
        bigBlits = true;
        bigBlit(statement.command, statement.args, line);
      } else if (statement.kind === "bank") {
        bigUsers.add(caller);
        // One store: BANK picks which 8×8 tile of the big screen window[0]–window[7] show.
        if (/^\d+$/.test(statement.tile) && Number(statement.tile) >= BIG_TILES)
          fail(line, `Big-screen tiles are 0 to ${BIG_TILES - 1}.`);
        load(statement.tile, scope, line);
        emit(OPCODES.STM, BIG_PORT.bank, `BANK ← ${statement.tile}`, line);
      } else if (statement.kind === "plot") {
        // Three stores to the pixel port: cursor x, cursor y, then the colour.
        const { x, y, colour } = statement;
        for (const [value, limit, what] of [
          [x, SCREEN_ROWS - 1, "x"],
          [y, SCREEN_ROWS - 1, "y"],
          [colour, 1, "colour"],
        ] as const)
          if (value && /^\d+$/.test(value) && Number(value) > limit)
            fail(line, `Pixel ${what} is 0 to ${limit}.`);
        plotters.add(caller);
        load(x, scope, line);
        emit(OPCODES.STM, PIXEL_PORT.x, `PIXEL X ← ${x}`, line);
        load(y, scope, line);
        emit(OPCODES.STM, PIXEL_PORT.y, `PIXEL Y ← ${y}`, line);
        load(colour ?? "1", scope, line);
        emit(
          OPCODES.STM,
          PIXEL_PORT.pixel,
          colour === null ? "PLOT" : `PLOT COLOUR ${colour}`,
          line,
        );
      } else if (statement.kind === "sprite") {
        if (!ast.main.includes(statement))
          fail(line, "Declare sprites at the top level, outside loops, ifs and functions.");
      } else if (statement.kind === "blit") {
        blit(statement.command, statement.args, scope, line, caller);
      } else if (statement.kind === "return") {
        if (caller === "main") fail(line, "return is only valid inside a function.");
        if (statement.expression) compileExpression(statement.expression, scope, line, caller);
        leave(caller, line);
      } else if (statement.kind === "if") {
        // a < b borrows exactly when it is true, so JNC skips the body when it is false.
        const [small, big] =
          statement.operator === "<"
            ? [statement.left, statement.right]
            : [statement.right, statement.left];
        load(small, scope, line);
        add(
          big,
          true,
          `COMPARE ${statement.left} ${statement.operator} ${statement.right}`,
          scope,
          line,
        );
        const skipAddress = emit(OPCODES.JNC, 0, "SKIP IF FALSE", line);
        compileStatements(statement.body, scope, caller);
        patch(skipAddress, instructions.length * 2);
      } else if (statement.kind === "loop") {
        const start = instructions.length * 2;
        compileStatements(statement.body, scope, caller);
        emit(OPCODES.JMP, start, "LOOP FOREVER", line);
      } else {
        if (statement.declaration && statement.initial === statement.name)
          fail(line, `“${statement.name}” has no value yet.`);
        const place = statement.declaration
          ? declare(statement.name, scope, caller, line)
          : target(statement.name, scope, line);
        load(statement.initial, scope, line);
        store(place, `INIT ${statement.name}`, line);
        const testAddress = instructions.length * 2;
        emit(
          place.frame ? OPCODES.LDS : OPCODES.LDM,
          place.address,
          `TEST ${statement.name}`,
          line,
        );
        add(statement.limit, true, `COMPARE < ${statement.limit}`, scope, line);
        const exitAddress = emit(OPCODES.JNC, 0, "EXIT IF ≥", line);
        compileStatements(statement.body, scope, caller);
        emit(
          place.frame ? OPCODES.LDS : OPCODES.LDM,
          place.address,
          `LOAD ${statement.name}`,
          line,
        );
        add(statement.increment, false, `INCREMENT ${statement.name}`, scope, line);
        store(place, `STORE ${statement.name}`, line);
        emit(OPCODES.JMP, testAddress, "REPEAT LOOP", line);
        patch(exitAddress, instructions.length * 2);
      }
    }
  };

  for (const definition of ast.functions) {
    functionCalls.set(definition.name, new Set());
    if (inRam)
      frameSizes.set(
        definition.name,
        (definition.parameter ? 1 : 0) + declarations(definition.body).length,
      );
  }
  const handler = functions.get(KEY_HANDLER);
  if (handler) {
    // Code address 02 is the interrupt vector: a jump to the key handler.
    emit(OPCODES.JMP, INTERRUPT_VECTOR + 2, "SKIP VECTOR", handler.line);
    const vector = emit(OPCODES.JMP, 0, "INTERRUPT VECTOR", handler.line);
    callPatches.push({ address: vector, name: KEY_HANDLER, line: handler.line });
    emit(OPCODES.EI, 0, "INTERRUPTS ON", handler.line);
  }
  compileStatements(ast.main, globals, "main");
  // HALT stops GCLK, and the blitters with it: let a running command finish first.
  if (blitters.size) waitForBlitter(0);
  if (bigBlits) waitForBigBlitter(0);
  emit(OPCODES.HALT, 0, "HALT", 0);
  for (const definition of ast.functions) {
    functionStarts.set(definition.name, instructions.length * 2);
    const scope: Scope = new Map();
    const size = frameSizes.get(definition.name) ?? 0;
    const line = definition.line;
    if (definition === handler) {
      // The interrupted code may sit between a SUB and its JNC: save ACC and carry first.
      const acc = allocate("#acc", globals, `${KEY_HANDLER}.acc`, line, false);
      const carry = allocate("#carry", globals, `${KEY_HANDLER}.carry`, line, false);
      saved = { acc: acc.address, carry: carry.address };
      emit(OPCODES.STM, acc.address, "SAVE ACC", line);
      const clear = emit(OPCODES.JNC, 0, "SAVE CARRY", line);
      emit(OPCODES.LDI, 1, "CARRY WAS 1", line);
      const join = emit(OPCODES.JMP, 0, "SAVE CARRY", line);
      patch(clear, instructions.length * 2);
      emit(OPCODES.LDI, 0, "CARRY WAS 0", line);
      patch(join, instructions.length * 2);
      emit(OPCODES.STM, carry.address, "SAVE CARRY", line);
      // Reading the key also clears KEY READY, so RETI does not re-enter the handler.
      emit(OPCODES.IN, 0, "READ KEY", line);
    }
    // The frame: SP + 0 is the parameter, then each local; above it, the return address.
    if (size) emit(OPCODES.ADDSP, 256 - size, `MAKE FRAME (${size})`, definition.line);
    if (definition.parameter) {
      const place = declare(definition.parameter, scope, definition.name, definition.line);
      store(place, `ARG ${definition.parameter}`, definition.line);
    }
    compileStatements(definition.body, scope, definition.name);
    if (definition !== handler) emit(OPCODES.LDI, 0, "DEFAULT RETURN 0", 0);
    leave(definition.name, 0);
  }
  for (const callSite of callPatches) patch(callSite.address, functionStarts.get(callSite.name)!);

  // Stack bytes one call to `name` needs, counting its return address; null when recursive.
  const visiting = new Set<string>();
  const depths = new Map<string, number | null>();
  const depth = (name: string): number | null => {
    if (visiting.has(name)) {
      if (!inRam)
        fail(
          functions.get(name)!.line,
          "Recursive calls need the stack-in-RAM CPU: every variable here has one fixed RAM address.",
        );
      return null;
    }
    if (depths.has(name)) return depths.get(name)!;
    visiting.add(name);
    let deepest: number | null = 0;
    for (const callee of functionCalls.get(name) ?? []) {
      const inner = depth(callee);
      deepest = inner === null || deepest === null ? null : Math.max(deepest, inner);
    }
    visiting.delete(name);
    const result = deepest === null ? null : 1 + (frameSizes.get(name) ?? 0) + deepest;
    depths.set(name, result);
    return result;
  };
  for (const name of functions.keys()) depth(name);
  if (handler) {
    const reach = (names: Iterable<string>, seen = new Set<string>()): Set<string> => {
      for (const name of names)
        if (!seen.has(name)) {
          seen.add(name);
          reach(functionCalls.get(name) ?? [], seen);
        }
      return seen;
    };
    const fromMain = reach([...mainCalls].map(({ name }) => name));
    // The cursor is one pair of registers: a key press between a plot's stores would move it.
    const handlerPlots = [...reach([KEY_HANDLER])].some((name) => plotters.has(name));
    // Same for the blitter's registers: a key press between two stores would mix commands.
    const handlerBlits = [...reach([KEY_HANDLER])].some((name) => blitters.has(name));
    if (handlerBlits && (blitters.has("main") || [...fromMain].some((name) => blitters.has(name))))
      fail(
        handler.line,
        `${KEY_HANDLER} and the main program both use the blitter. A key press between setting its registers would mix two commands, so blit in only one of them.`,
      );
    const handlerBig = [...reach([KEY_HANDLER])].some((name) => bigUsers.has(name));
    if (handlerBig && (bigUsers.has("main") || [...fromMain].some((name) => bigUsers.has(name))))
      fail(
        handler.line,
        `${KEY_HANDLER} and the main program both use the big screen's BANK or port. A key press between setting ADDR and writing would move the main program's address, so use them in only one of them.`,
      );
    if (handlerPlots && (plotters.has("main") || [...fromMain].some((name) => plotters.has(name))))
      fail(
        handler.line,
        `${KEY_HANDLER} and the main program both plot. A key press between setting a pixel's x and y would move the main program's cursor, so plot in only one of them.`,
      );
    // Every function variable has one fixed address: a key press inside a function the
    // handler also runs would overwrite the interrupted call's variables.
    const shared = inRam
      ? undefined
      : [...reach(functionCalls.get(KEY_HANDLER) ?? [])].find((name) => fromMain.has(name));
    if (shared)
      fail(
        handler.line,
        `${KEY_HANDLER} and the main program both call “${shared}”. Its variables have fixed RAM addresses, so a key press during that call would overwrite them. Use the stack-in-RAM CPU.`,
      );
  }
  if (inRam) {
    // Recursion depth is only known at run time; the trace stops on a collision then.
    // A key press can arrive at the deepest point, so the handler's stack bytes come on top.
    const deepest =
      Math.max(0, ...[...mainCalls].map(({ name }) => depths.get(name) ?? 0)) +
      (handler ? (depths.get(KEY_HANDLER) ?? 0) : 0);
    if (variables.length + deepest > ramBytes)
      fail(
        [...mainCalls].find(({ name }) => depths.get(name) === deepest)?.line ?? 1,
        `Stack and variables collide: ${variables.length} variable byte${variables.length === 1 ? "" : "s"} plus ${deepest} stack bytes do not fit in ${ramBytes} bytes of RAM.`,
      );
  }
  // Sprite rows follow the code in ROM; the blitter's COPY SPRITE reads them from there.
  const spriteBase = instructions.length * 2;
  const spriteNames = [...sprites.keys()];
  if (spriteBase + spriteNames.length * SCREEN_ROWS > 256)
    fail(
      ast.main.find((statement) => statement.kind === "sprite")?.line ?? 1,
      "Program and sprites exceed 256 code bytes.",
    );
  for (const { index, name } of spritePatches)
    instructions[index].operand = spriteBase + spriteNames.indexOf(name) * SCREEN_ROWS;
  return {
    instructions,
    bytes: [
      ...instructions.flatMap(({ opcode, operand }) => [opcode, operand]),
      ...spriteNames.flatMap((name) => sprites.get(name)!),
    ],
    variables,
    stack,
  };
}

/** The programs behind the stepper's preset buttons. */
export const SAMPLE_PROGRAMS = {
  EXAMPLE: "let x = 2;\nx = x + 3;\nprint(x);",
  OVERFLOW: "let x = 255;\nx = x + 1;\nprint(x);",
  LOOP: "let sum = 0;\nfor (let i = 0; i < 4; i++) {\n  sum = sum + i;\n}\nprint(sum);",
  FUNCTION:
    "fn bump(n) {\n  return n + 1;\n}\nlet x = 2;\nfor (let i = 0; i < 3; i++) {\n  x = bump(x);\n}\nprint(x);",
  // Each byte is one screen row; bit 0 is the leftmost pixel.
  SMILEY:
    "screen[0] = 60;\nscreen[1] = 66;\nscreen[2] = 165;\nscreen[3] = 129;\nscreen[4] = 165;\nscreen[5] = 153;\nscreen[6] = 66;\nscreen[7] = 60;",
  // Doubling the row byte moves its one lit pixel a step to the right.
  SWEEP:
    "let pixel = 1;\nfor (let i = 0; i < 8; i++) {\n  screen[3] = pixel;\n  pixel = pixel + pixel;\n}\nprint(screen[3]);",
  // plot(x, y) lights the pixel in column x of row y; two diagonals make an X.
  CROSS: "for (let i = 0; i < 8; i++) {\n  plot(i, i);\n  let j = 7 - i;\n  plot(i, j);\n}",
  // The blitter copies the heart into rows 0–7 while the CPU counts; the CPU
  // waits for it before drawing its own row.
  // bank(t) points window[0]–window[7] at tile t of the 32×32 big screen: 5 steps
  // through the 4 × 4 tiles is the diagonal, so four smileys run corner to corner.
  BANKS:
    "for (let t = 0; t < 16; t = t + 5) {\n  bank(t);\n  window[0] = 60;\n  window[1] = 66;\n  window[2] = 165;\n  window[3] = 129;\n  window[4] = 165;\n  window[5] = 153;\n  window[6] = 66;\n  window[7] = 60;\n}",
  // The port writes one byte per store: ADDR moves on by itself. A band across
  // the top row, then a line down column 8 with the step set to a whole row.
  PORT: "vram_at(0);\nfor (let i = 0; i < 4; i++) {\n  vram(255);\n}\nvram_step(4);\nvram_at(5);\nfor (let j = 0; j < 12; j++) {\n  vram(1);\n}",
  // The big blitter draws a 16×16 box with four fills, then stamps copies of it
  // while the CPU counts: two CPU stores start each command, then it writes
  // one byte per tick by itself.
  STAMP:
    "big_fill(0, 0, 2, 16, 255);\nbig_fill(0, 1, 2, 14, 0);\nbig_fill(0, 1, 1, 14, 1);\nbig_fill(1, 1, 1, 14, 128);\nbig_copy(0, 0, 2, 0, 2, 16);\nlet count = 0;\nfor (let i = 0; i < 3; i++) {\n  count = count + 1;\n  print(count);\n}\nbig_copy(0, 0, 0, 16, 2, 16);\nbig_copy(0, 0, 2, 16, 2, 16);",
  BLIT: "sprite heart = [102, 255, 255, 255, 126, 60, 24, 0];\nblit(sprite, heart, 0);\nlet count = 0;\nfor (let i = 0; i < 3; i++) {\n  count = count + 1;\n  print(count);\n}\nblit(wait);\nscreen[7] = 255;",
} as const;

/**
 * Programs with a key handler. They loop forever and wait for keys, so the
 * stepper stops them after MAX_INSTRUCTIONS.
 */
export const INTERRUPT_SAMPLES = {
  // Each key press draws its code as a row of pixels and counts the presses.
  KEYBOARD:
    "let presses = 0;\nfn on_key(k) {\n  screen[3] = k;\n  presses = presses + 1;\n  print(presses);\n}\nloop {\n}",
} as const;

const fillRows = (value: number) =>
  Array.from({ length: SCREEN_ROWS }, (_, y) => `  screen[${y}] = ${value};`).join("\n");
/**
 * Programs that redraw the screen forever while the scanout reads it. Each
 * frame they swap the left and right halves. TEARING writes whenever it gets
 * there, so the beam shows the top of one picture over the bottom of the
 * other; VSYNC starts each redraw in vertical blank and stays ahead of the beam.
 */
export const VIDEO_SAMPLES = {
  TEARING: `loop {\n${fillRows(15)}\n${fillRows(240)}\n}`,
  VSYNC: `loop {\n  ${WAIT_VBLANK}();\n${fillRows(15)}\n  ${WAIT_VBLANK}();\n${fillRows(240)}\n}`,
} as const;

/** Programs for the stack-in-RAM CPU: they recurse, so the other CPU rejects them. */
export const RAM_STACK_SAMPLES = {
  RECURSION:
    "fn sum(n) {\n  if (n > 0) {\n    let less = n - 1;\n    let rest = sum(less);\n    return rest + n;\n  }\n  return 0;\n}\nprint(sum(4));",
} as const;

// ---------------------------------------------------------------------------
// Control unit: one clock tick = one micro-step.
//
// Harvard split: code ROM (256 bytes, addressed by CMAR), data RAM (16 bytes,
// addressed by DMAR; F0–FF reach the screen and E0–EF the blitter instead) and a 16-entry return stack (addressed by SP). One 8-bit
// bus joins them; each tick at most one *_OUT signal drives it. The ALU always
// sees ACC and the operand register (OPR), so ADDM/SUBM first copy the RAM
// byte into OPR. The zero flag is wired to ACC (ACC === 0); FLAGS_IN latches
// the ALU's carry (or borrow, when ALU_SUB is on).
//
// The stack-in-RAM CPU has no return stack: data RAM grows to 32 bytes, SP
// counts down from 32, and two more parts drive the bus: SP itself (SP_OUT)
// and an adder for SP + OPR (FRAME_OUT), the address of a stack-frame byte.
// SP_IN loads SP from the bus, for ADDSP.
//
// Both CPUs have a key port and an interrupt line. A key press latches its
// code in the KEY register and raises KEY READY; KEY_OUT drives the code onto
// the bus and lowers KEY READY. IE (interrupts enabled) is set by IE_SET and
// cleared by IE_CLR. On the clock edge that ends an instruction (STEP_RESET),
// the INT latch takes KEY READY AND IE, both as they will be after that edge.
// While INT is on, the control unit looks up INT_OPCODE instead of IR, from T0:
// push PC, clear IE, and VEC_OUT drives the handler vector into PC.

export const SIGNALS = [
  "PC_OUT",
  "PC_INC",
  "PC_IN",
  "CMAR_IN",
  "ROM_OUT",
  "IR_IN",
  "OPR_IN",
  "OPR_OUT",
  "DMAR_IN",
  "RAM_OUT",
  "RAM_IN",
  "ACC_IN",
  "ACC_OUT",
  "ALU_OUT",
  "ALU_SUB",
  "FLAGS_IN",
  "SP_INC",
  "SP_DEC",
  "STACK_IN",
  "STACK_OUT",
  "OUT_IN",
  "HALT",
  "STEP_RESET",
  "SP_OUT",
  "SP_IN",
  "FRAME_OUT",
  "VEC_OUT",
  "KEY_OUT",
  "IE_SET",
  "IE_CLR",
  // The ALU outputs ACC AND OPR instead of the sum, and its carry is 0. No
  // default opcode uses it; it is there for opcodes added in the microcode editor.
  "ALU_AND",
] as const;

export type Signal = (typeof SIGNALS)[number];
export type ControlWord = readonly Signal[];
export type Mnemonic = (typeof ISA)[number]["mnemonic"];
/** The flag a conditional opcode branches on; both are microcode ROM address bits. */
export type BranchFlag = "carry" | "zero";
/**
 * Execute steps for one opcode, starting at T4. A conditional opcode has one
 * list for each value of `flag`: JNC branches on carry.
 */
export type ExecuteSteps =
  | readonly ControlWord[]
  | {
      readonly flag: BranchFlag;
      readonly clear: readonly ControlWord[];
      readonly set: readonly ControlWord[];
    };

/** T-states a single instruction may use; the microcode ROM has room for this many. */
export const MAX_T_STATES = 8;

/** T0–T3: fetch the opcode into IR, then the operand into OPR. Same for every opcode. */
export const FETCH_STEPS: readonly ControlWord[] = [
  ["PC_OUT", "CMAR_IN"],
  ["ROM_OUT", "IR_IN", "PC_INC"],
  ["PC_OUT", "CMAR_IN"],
  ["ROM_OUT", "OPR_IN", "PC_INC"],
];

/** Execute steps of the separate-return-stack CPU (the default). */
export const EXECUTE_STEPS: Partial<Record<Mnemonic, ExecuteSteps>> = {
  LDI: [["OPR_OUT", "ACC_IN", "STEP_RESET"]],
  LDM: [
    ["OPR_OUT", "DMAR_IN"],
    ["RAM_OUT", "ACC_IN", "STEP_RESET"],
  ],
  STM: [
    ["OPR_OUT", "DMAR_IN"],
    ["ACC_OUT", "RAM_IN", "STEP_RESET"],
  ],
  ADDI: [["ALU_OUT", "ACC_IN", "FLAGS_IN", "STEP_RESET"]],
  ADDM: [
    ["OPR_OUT", "DMAR_IN"],
    ["RAM_OUT", "OPR_IN"],
    ["ALU_OUT", "ACC_IN", "FLAGS_IN", "STEP_RESET"],
  ],
  SUBI: [["ALU_OUT", "ALU_SUB", "ACC_IN", "FLAGS_IN", "STEP_RESET"]],
  SUBM: [
    ["OPR_OUT", "DMAR_IN"],
    ["RAM_OUT", "OPR_IN"],
    ["ALU_OUT", "ALU_SUB", "ACC_IN", "FLAGS_IN", "STEP_RESET"],
  ],
  OUT: [["ACC_OUT", "OUT_IN", "STEP_RESET"]],
  JMP: [["OPR_OUT", "PC_IN", "STEP_RESET"]],
  JNC: {
    flag: "carry",
    clear: [["OPR_OUT", "PC_IN", "STEP_RESET"]],
    set: [["STEP_RESET"]],
  },
  CALL: [["PC_OUT", "STACK_IN"], ["SP_INC"], ["OPR_OUT", "PC_IN", "STEP_RESET"]],
  RET: [["SP_DEC"], ["STACK_OUT", "PC_IN", "STEP_RESET"]],
  IN: [["KEY_OUT", "ACC_IN", "STEP_RESET"]],
  EI: [["IE_SET", "STEP_RESET"]],
  DI: [["IE_CLR", "STEP_RESET"]],
  RETI: [["SP_DEC"], ["STACK_OUT", "PC_IN", "IE_SET", "STEP_RESET"]],
  HALT: [["HALT"]],
};

const FRAME_ADDRESS: ControlWord = ["FRAME_OUT", "DMAR_IN"];

/**
 * Execute steps of the stack-in-RAM CPU: CALL and RET move SP through data RAM
 * (SP − 1, then store PC at RAM[SP]; read RAM[SP] into PC and SP + 1), and the
 * stack-frame opcodes address RAM[SP + operand].
 */
export const RAM_STACK_STEPS: Record<Mnemonic, ExecuteSteps> = {
  ...(EXECUTE_STEPS as Record<
    Exclude<Mnemonic, "LDS" | "STS" | "ADDS" | "SUBS" | "ADDSP">,
    ExecuteSteps
  >),
  CALL: [
    ["SP_DEC"],
    ["SP_OUT", "DMAR_IN"],
    ["PC_OUT", "RAM_IN"],
    ["OPR_OUT", "PC_IN", "STEP_RESET"],
  ],
  RET: [
    ["SP_OUT", "DMAR_IN", "SP_INC"],
    ["RAM_OUT", "PC_IN", "STEP_RESET"],
  ],
  RETI: [
    ["SP_OUT", "DMAR_IN", "SP_INC"],
    ["RAM_OUT", "PC_IN", "IE_SET", "STEP_RESET"],
  ],
  LDS: [FRAME_ADDRESS, ["RAM_OUT", "ACC_IN", "STEP_RESET"]],
  STS: [FRAME_ADDRESS, ["ACC_OUT", "RAM_IN", "STEP_RESET"]],
  ADDS: [FRAME_ADDRESS, ["RAM_OUT", "OPR_IN"], ["ALU_OUT", "ACC_IN", "FLAGS_IN", "STEP_RESET"]],
  SUBS: [
    FRAME_ADDRESS,
    ["RAM_OUT", "OPR_IN"],
    ["ALU_OUT", "ALU_SUB", "ACC_IN", "FLAGS_IN", "STEP_RESET"],
  ],
  ADDSP: [["FRAME_OUT", "SP_IN", "STEP_RESET"]],
};

export const MICROCODE: Record<StackModel, Partial<Record<Mnemonic, ExecuteSteps>>> = {
  hardware: EXECUTE_STEPS,
  ram: RAM_STACK_STEPS,
};

/**
 * Interrupt entry, looked up as INT_OPCODE from T0 with no fetch: push PC the
 * way CALL does, clear IE so the handler is not interrupted, and load PC with
 * the vector. It takes the place of the next instruction's fetch.
 */
export const INTERRUPT_STEPS: Record<StackModel, readonly ControlWord[]> = {
  hardware: [["PC_OUT", "STACK_IN", "IE_CLR"], ["SP_INC"], ["VEC_OUT", "PC_IN", "STEP_RESET"]],
  ram: [
    ["SP_DEC", "IE_CLR"],
    ["SP_OUT", "DMAR_IN"],
    ["PC_OUT", "RAM_IN"],
    ["VEC_OUT", "PC_IN", "STEP_RESET"],
  ],
};

/** An opcode the decoder does not know stops the clock. */
const UNKNOWN_STEPS: readonly ControlWord[] = [["HALT"]];

/** One opcode of a microcode table: its instruction set entry and its execute steps. */
export type MicrocodeOpcode = IsaEntry & { readonly steps: ExecuteSteps };

/**
 * A microcode table: everything the control unit does, as plain data. The
 * trace, the generated control ROM and the CPU circuit all take one, so an
 * edited table runs the same way in the stepper and in the circuit. Fetch
 * (T0–T3) is wired and the same for every opcode; `interrupt` runs from T0
 * in place of a fetch. `stack` is the CPU the table is written for.
 */
export type MicrocodeTable = {
  readonly stack: StackModel;
  readonly opcodes: readonly MicrocodeOpcode[];
  readonly interrupt: readonly ControlWord[];
};

const defaultTables = new Map<StackModel, MicrocodeTable>();
/** The microcode table each CPU ships with: its instruction set and the execute steps above. */
export function defaultMicrocode(stack: StackModel = "hardware"): MicrocodeTable {
  let table = defaultTables.get(stack);
  if (!table) {
    table = {
      stack,
      opcodes: isaFor(stack).map(({ mnemonic, opcode, operand, effect }) => ({
        mnemonic,
        opcode,
        operand,
        effect,
        steps: MICROCODE[stack][mnemonic] ?? UNKNOWN_STEPS,
      })),
      interrupt: INTERRUPT_STEPS[stack],
    };
    defaultTables.set(stack, table);
  }
  return table;
}

/** A table, or the default table of a CPU. */
export type MicrocodeSource = StackModel | MicrocodeTable;
const tableOf = (source: MicrocodeSource) =>
  typeof source === "string" ? defaultMicrocode(source) : source;

/** The instruction set a table decodes, for the assembler and the instruction views. */
export const microcodeIsa = (source: MicrocodeSource): readonly IsaEntry[] =>
  tableOf(source).opcodes;

const opcodeIndex = new WeakMap<MicrocodeTable, Map<number, MicrocodeOpcode>>();
/** The table's entry for `opcode`, or undefined when the decoder does not know it. */
export function microcodeEntry(
  source: MicrocodeSource,
  opcode: number,
): MicrocodeOpcode | undefined {
  const table = tableOf(source);
  let index = opcodeIndex.get(table);
  if (!index) {
    index = new Map(table.opcodes.map((entry) => [entry.opcode, entry]));
    opcodeIndex.set(table, index);
  }
  return index.get(opcode);
}

/** The steps a conditional opcode takes for these flags; a plain list as it is. */
export const branchSteps = (steps: ExecuteSteps, carry: boolean, zero: boolean) =>
  "flag" in steps ? ((steps.flag === "zero" ? zero : carry) ? steps.set : steps.clear) : steps;

/**
 * The microcode lookup: (opcode, T-state, carry flag, zero flag) → control word.
 * `table` is the microcode table, or a CPU whose default table to use.
 */
export function controlWord(
  opcode: number,
  t: number,
  carry: boolean,
  table: MicrocodeSource = "hardware",
  zero = false,
): ControlWord {
  if (opcode === INT_OPCODE) return tableOf(table).interrupt[t] ?? [];
  if (t < FETCH_STEPS.length) return FETCH_STEPS[t];
  const steps = microcodeEntry(table, opcode)?.steps ?? UNKNOWN_STEPS;
  return branchSteps(steps, carry, zero)[t - FETCH_STEPS.length] ?? [];
}

export function encodeControlWord(word: ControlWord): number {
  return word.reduce((bits, signal) => bits | (1 << SIGNALS.indexOf(signal)), 0);
}

export function decodeControlWord(bits: number): Signal[] {
  return SIGNALS.filter((_, index) => (bits & (1 << index)) !== 0);
}

/**
 * ROM address for (opcode, T-state, carry, zero): zero flag, opcode byte, 3 T
 * bits, carry. The zero bit is the top bit, so with zero off every address is
 * where it was before the zero flag joined the address.
 */
export function microcodeAddress(opcode: number, t: number, carry: boolean, zero = false): number {
  return (zero ? 1 << 12 : 0) | (opcode << 4) | (t << 1) | (carry ? 1 : 0);
}

/** Words in the microcode ROM: every opcode, T-state, carry and zero. */
export const MICROCODE_ROM_SIZE = 256 * MAX_T_STATES * 4;

/** Microcode ROM contents generated from the table, so the two cannot drift apart. */
export function microcodeRom(source: MicrocodeSource = "hardware"): number[] {
  const table = tableOf(source);
  const rom = Array<number>(MICROCODE_ROM_SIZE).fill(0);
  for (let opcode = 0; opcode < 256; opcode++)
    for (let t = 0; t < MAX_T_STATES; t++)
      for (const carry of [false, true])
        for (const zero of [false, true])
          rom[microcodeAddress(opcode, t, carry, zero)] = encodeControlWord(
            controlWord(opcode, t, carry, table, zero),
          );
  return rom;
}

export type BusDriver =
  | "PC"
  | "ROM"
  | "OPR"
  | "RAM"
  | "ACC"
  | "ALU"
  | "STACK"
  | "SP"
  | "FRAME"
  | "VECTOR"
  | "KEY";

export const BUS_DRIVERS: Partial<Record<Signal, BusDriver>> = {
  PC_OUT: "PC",
  ROM_OUT: "ROM",
  OPR_OUT: "OPR",
  RAM_OUT: "RAM",
  ACC_OUT: "ACC",
  ALU_OUT: "ALU",
  STACK_OUT: "STACK",
  SP_OUT: "SP",
  FRAME_OUT: "FRAME",
  VEC_OUT: "VECTOR",
  KEY_OUT: "KEY",
};

export const BUS_READERS: readonly Signal[] = [
  "CMAR_IN",
  "IR_IN",
  "OPR_IN",
  "PC_IN",
  "DMAR_IN",
  "RAM_IN",
  "ACC_IN",
  "STACK_IN",
  "OUT_IN",
  "SP_IN",
];

export type Registers = {
  pc: number;
  cmar: number;
  ir: number;
  opr: number;
  dmar: number;
  acc: number;
  carry: boolean;
  zero: boolean;
  sp: number;
  out: number;
  /** Last key code the key port latched. */
  key: number;
  /** A key is waiting: set by a press, cleared by KEY_OUT (IN). This is the IRQ line. */
  keyReady: boolean;
  /** Interrupts enabled (IE). */
  ie: boolean;
  /** INT latch: the next ticks run the interrupt entry instead of an instruction. */
  int: boolean;
  /** The pixel port's cursor (0–7 each). */
  pixelX: number;
  pixelY: number;
  /** The big screen's bank register: which 8×8 tile D0–D7 show (0–15). */
  bank: number;
  /** The big screen's port: ADDR (0–127) and whether DA moves it down a row. */
  portAddr: number;
  portDown: boolean;
};

export type TickPhase = "fetch" | "decode" | "execute";

/** One clock tick. Registers and memories are the values after the clock edge. */
export type Tick = {
  index: number;
  /** Which instruction this tick belongs to, counting from 0 in execution order. */
  instruction: number;
  /** Code address the instruction was fetched from. */
  address: number;
  t: number;
  phase: TickPhase;
  control: ControlWord;
  bus: number | null;
  busDriver: BusDriver | null;
  registers: Registers;
  ram: number[];
  screen: number[];
  /** What this tick's clock edge wrote to the screen, if anything. */
  screenWrite: ScreenWrite | null;
  /** The CPU wrote to the screen while the blitter was BUSY, so the write was lost. */
  screenBlocked: boolean;
  /** The blitter's registers after the clock edge. */
  blitter: BlitterState;
  /** The big screen's 128 frame bytes after the clock edge. */
  frame: number[];
  /** What this tick's clock edge wrote to the big screen, if anything. */
  frameWrite: FrameWrite | null;
  /** The big blitter after the clock edge, and whether a CPU frame write was lost to it. */
  bigBlitter: BigBlitter;
  frameBlocked: boolean;
  /** Return stack entries, bottom first. With the stack in RAM: RAM[1F] down to RAM[SP]. */
  stack: number[];
  output: number[];
  halted: boolean;
  /** Set when the tick could not complete; no state changed on that tick. */
  fault: string | null;
  /** The tick runs the interrupt entry (INT_OPCODE), not an instruction. */
  interrupt: boolean;
  /** Key code pressed on this tick's clock edge, if any. */
  keyPress: number | null;
};

export const MAX_INSTRUCTIONS = 512;

/**
 * Why a stack-in-RAM tick cannot run, or null. SP must stay between the fixed
 * variables (below `floor`) and STACK_TOP; SP_IN reads its bus value as SP plus
 * a signed change, so 80–FF move SP down.
 */
function ramStackFault(
  sp: number,
  on: ReadonlySet<Signal>,
  bus: number | null,
  floor: number,
  variables: CompiledProgram["variables"],
): string | null {
  const next = on.has("SP_DEC")
    ? sp - 1
    : on.has("SP_INC")
      ? sp + 1
      : on.has("SP_IN") && bus !== null
        ? sp + signedByte((bus - sp) & 255)
        : sp;
  if (next > STACK_TOP) return "The stack is empty: nothing to pop. Execution stopped.";
  if (next >= floor) return null;
  const variable = variables[floor - 1];
  return variable
    ? `Stack overflow: the stack ran into variable “${variable.name}” at RAM ${hex(variable.address)}. Execution stopped.`
    : "Stack overflow: the stack filled all of data RAM. Execution stopped.";
}

/**
 * Runs a program from the microcode table alone, one tick at a time. Stops on
 * HALT, a stack fault, or after `maxInstructions` instructions.
 */
export function traceTicks(
  program: CompiledProgram,
  maxInstructions: number = MAX_INSTRUCTIONS,
  keys: KeySchedule = {},
  table: MicrocodeTable = defaultMicrocode(stackModelOf(program)),
): Tick[] {
  const stack = stackModelOf(program);
  const inRam = stack === "ram";
  if (table.stack !== stack)
    throw new Error(`The microcode table is for the ${STACK_MODELS[table.stack].label} CPU.`);
  const rom = Array.from({ length: 256 }, (_, index) => program.bytes[index] ?? 0);
  const ram = Array<number>(STACK_MODELS[stack].ramBytes).fill(0);
  const screen = Array<number>(SCREEN_ROWS).fill(0);
  const frame = Array<number>(BIG_FRAME_BYTES).fill(0);
  let blitter = initialBlitter();
  let bigBlitter = initialBigBlitter();
  /** While the big blitter is BUSY its destination is on the frame's address lines. */
  const frameByte = (byte: number) => frame[bigBlitter.busy ? bigBlitter.dptr : byte];
  // DMAR holds the full 8-bit address; RAM_OUT and RAM_IN reach RAM, a screen row, the
  // pixel port or the blitter. While the blitter is BUSY its row is on the screen's address
  // lines, so a screen read returns that row.
  // The scanout runs from reset alongside the CPU: on tick i its beam is at beamAt(i).
  const readData = (address: number, cursorY: number) =>
    isBigScreenAddress(address)
      ? isBigBlitAddress(address)
        ? Number(bigBlitter.busy)
        : isWindowAddress(address)
          ? frameByte(windowByte(registers.bank, address))
          : address === BIG_PORT.bank
            ? registers.bank
            : address === BIG_PORT.addr
              ? registers.portAddr
              : address === BIG_PORT.data
                ? frameByte(registers.portAddr)
                : address === BIG_PORT.step
                  ? Number(registers.portDown)
                  : 0
      : isBlitterAddress(address)
        ? Number(blitter.busy)
        : isVideoStatus(address)
          ? Number(beamAt(ticks.length).vblank)
          : isScreenAddress(address)
            ? screen[
                blitter.busy
                  ? blitterRow(blitter)
                  : isPixelPort(address)
                    ? cursorY
                    : address & (SCREEN_ROWS - 1)
              ]
            : ram[address & (ram.length - 1)];
  const stackMemory = Array<number>(16).fill(0);
  /** With the stack in RAM, SP may not move below the last fixed variable. */
  const floor = inRam ? program.variables.length : 0;
  const output: number[] = [];
  const ticks: Tick[] = [];
  let registers: Registers = {
    pc: 0,
    cmar: 0,
    ir: 0,
    opr: 0,
    dmar: 0,
    acc: 0,
    carry: false,
    zero: true,
    sp: inRam ? STACK_TOP : 0,
    out: 0,
    key: 0,
    keyReady: false,
    ie: false,
    int: false,
    pixelX: 0,
    pixelY: 0,
    bank: 0,
    portAddr: 0,
    portDown: false,
  };
  let t = 0;
  let instruction = 0;
  let address = 0;
  while (instruction < maxInstructions) {
    if (t === 0) address = registers.pc;
    if (t >= MAX_T_STATES) throw new Error(`Microcode for ${hex(registers.ir)} never resets.`);
    const interrupt = registers.int;
    const control = controlWord(
      interrupt ? INT_OPCODE : registers.ir,
      t,
      registers.carry,
      table,
      registers.zero,
    );
    if (control.length === 0)
      throw new Error(`Microcode for ${hex(registers.ir)} has no control word at T${t}.`);
    const on = new Set(control);
    const drivers = control.filter((signal) => BUS_DRIVERS[signal]);
    if (drivers.length > 1) throw new Error(`Bus conflict at T${t}: ${drivers.join(", ")}.`);
    const busDriver = drivers.length ? BUS_DRIVERS[drivers[0]]! : null;
    const subtract = on.has("ALU_SUB");
    const and = on.has("ALU_AND");
    const sum = and
      ? registers.acc & registers.opr
      : subtract
        ? registers.acc - registers.opr
        : registers.acc + registers.opr;
    const busValues: Record<BusDriver, () => number> = {
      PC: () => registers.pc,
      ROM: () => rom[registers.cmar],
      OPR: () => registers.opr,
      RAM: () => readData(registers.dmar, registers.pixelY),
      ACC: () => registers.acc,
      ALU: () => sum & 255,
      STACK: () => stackMemory[registers.sp],
      SP: () => registers.sp,
      FRAME: () => (registers.sp + registers.opr) & 255,
      VECTOR: () => INTERRUPT_VECTOR,
      KEY: () => registers.key,
    };
    const bus = busDriver ? busValues[busDriver]() : null;
    if (bus === null && control.some((signal) => BUS_READERS.includes(signal)))
      throw new Error(`Nothing drives the bus at T${t}.`);
    const fault = inRam
      ? ramStackFault(registers.sp, on, bus, floor, program.variables)
      : on.has("STACK_IN") && registers.sp >= stackMemory.length
        ? "Return stack is full. Execution stopped."
        : on.has("SP_DEC") && registers.sp === 0
          ? "Return stack is empty. Execution stopped."
          : null;
    const next = { ...registers };
    const keyPress = keys[ticks.length] ?? null;
    let screenWrite: ScreenWrite | null = null;
    let screenBlocked = false;
    let blitterWrite: { register: number; value: number } | null = null;
    let frameWrite: FrameWrite | null = null;
    let frameBlocked = false;
    let bigBlitterWrite: { register: number; value: number } | null = null;
    if (!fault && bus !== null) {
      if (on.has("CMAR_IN")) next.cmar = bus;
      if (on.has("IR_IN")) next.ir = bus;
      if (on.has("OPR_IN")) next.opr = bus;
      if (on.has("PC_IN")) next.pc = bus;
      if (on.has("DMAR_IN")) next.dmar = bus;
      if (on.has("SP_IN")) next.sp = bus;
      if (on.has("ACC_IN")) next.acc = bus;
      if (on.has("RAM_IN")) {
        const address = registers.dmar;
        const role = isPixelPort(address) ? pixelPortRole(address) : null;
        if (role === "x") next.pixelX = bus & (SCREEN_ROWS - 1);
        else if (role === "y") next.pixelY = bus & (SCREEN_ROWS - 1);
        else if (isBlitterAddress(address)) blitterWrite = { register: address & 7, value: bus };
        else if (isBigBlitAddress(address)) bigBlitterWrite = { register: address & 3, value: bus };
        else if (bigBlitter.busy && (isWindowAddress(address) || address === BIG_PORT.data))
          frameBlocked = true;
        else if (isWindowAddress(address)) {
          const byte = windowByte(registers.bank, address);
          frame[byte] = bus;
          frameWrite = { byte, value: bus };
        } else if (address === BIG_PORT.bank) next.bank = bus & (BIG_TILES - 1);
        else if (address === BIG_PORT.addr) next.portAddr = bus & (BIG_FRAME_BYTES - 1);
        else if (address === BIG_PORT.step) next.portDown = Boolean(bus & 1);
        else if (address === BIG_PORT.data) {
          const byte = registers.portAddr;
          frame[byte] = bus;
          frameWrite = { byte, value: bus };
        } else if (blitter.busy && isScreenAddress(address)) screenBlocked = true;
        else if (role === "pixel") {
          const { pixelX: x, pixelY: y } = registers;
          screen[y] = plotRow(screen[y], x, bus);
          screenWrite = { y, x, row: screen[y] };
        } else if (isScreenAddress(address)) {
          const y = address & (SCREEN_ROWS - 1);
          screen[y] = bus;
          screenWrite = { y, x: null, row: bus };
        } else if (!isBigScreenAddress(address)) ram[address & (ram.length - 1)] = bus;
      }
      if (on.has("STACK_IN")) stackMemory[registers.sp] = bus;
      if (on.has("OUT_IN")) {
        next.out = bus;
        output.push(bus);
      }
    }
    // A DA access, read or write, moves the port's ADDR on at the clock edge.
    if (
      !fault &&
      bus !== null &&
      registers.dmar === BIG_PORT.data &&
      (on.has("RAM_IN") || on.has("RAM_OUT"))
    )
      next.portAddr = (registers.portAddr + portStep(registers.portDown)) & (BIG_FRAME_BYTES - 1);
    // The blitter runs on GCLK too: no edge on a HALT or fault tick.
    if (!fault && !on.has("HALT")) {
      if (blitter.busy) {
        const y = blitterRow(blitter);
        screen[y] = blitterData(blitter, screen[y], rom[blitterSource(blitter)]);
        screenWrite = { y, x: blitterColumn(blitter), row: screen[y], by: "blitter" };
      }
      blitter = blitterClock(blitter, blitterWrite);
      // The big blitter sits on the big screen card, on GCLK as well.
      if (bigBlitter.busy) {
        const byte = bigBlitter.dptr;
        frame[byte] = bigBlitterData(bigBlitter, frame);
        frameWrite = { byte, value: frame[byte], by: "blitter" };
      }
      bigBlitter = bigBlitterClock(bigBlitter, bigBlitterWrite);
    }
    if (!fault) {
      if (on.has("PC_INC")) next.pc = (registers.pc + 1) & 255;
      if (on.has("SP_INC")) next.sp = registers.sp + 1;
      if (on.has("SP_DEC")) next.sp = registers.sp - 1;
      if (on.has("FLAGS_IN")) next.carry = !and && (subtract ? sum < 0 : sum > 255);
      next.zero = next.acc === 0;
      if (keyPress !== null) next.key = keyPress;
      next.keyReady = keyPress !== null || (registers.keyReady && !on.has("KEY_OUT"));
      next.ie = on.has("IE_SET") || (registers.ie && !on.has("IE_CLR"));
      if (on.has("STEP_RESET")) next.int = next.keyReady && next.ie;
      registers = next;
    }
    const halted = fault !== null || on.has("HALT");
    ticks.push({
      index: ticks.length,
      instruction,
      address,
      t,
      phase: t < 2 ? "fetch" : t < 4 ? "decode" : "execute",
      control,
      bus,
      busDriver,
      registers: { ...registers },
      ram: [...ram],
      screen: [...screen],
      screenWrite,
      screenBlocked,
      blitter: { ...blitter },
      frame: [...frame],
      frameWrite,
      bigBlitter: { ...bigBlitter },
      frameBlocked,
      stack: inRam ? ram.slice(registers.sp).reverse() : stackMemory.slice(0, registers.sp),
      output: [...output],
      halted,
      fault,
      interrupt,
      keyPress,
    });
    if (halted) break;
    if (on.has("STEP_RESET")) {
      t = 0;
      instruction++;
    } else t++;
  }
  return ticks;
}

function explainExecute(
  opcode: number,
  operand: number,
  meaning: string,
  before: Snapshot,
  after: Registers,
  stack: number[],
  inRam: boolean,
  write: ScreenWrite | null,
  blitterWasBusy = false,
  bigBlitterWasBusy = false,
): string {
  const mnemonic = ISA.find((item) => item.opcode === opcode)?.mnemonic;
  if (mnemonic === "STM" && isBigBlitAddress(operand)) {
    if (bigBlitterWasBusy)
      return `The big blitter is BUSY and ignores the write of ${after.acc} to ${meaning}.`;
    if (operand !== BIG_BLIT.cmd) return `Set ${meaning} to ${after.acc}.`;
    const command = bigBlitCommand(after.acc & 3);
    return command
      ? `Start the big blitter's ${command.toUpperCase()}: from the next clock edge it writes one big-screen byte per tick by itself, and DF reads 1 until it is done.`
      : `Command ${after.acc & 3} is not a big blitter command; it stays idle.`;
  }
  if (mnemonic === "LDM" && isBigBlitAddress(operand))
    return `Read the big blitter's BUSY flag into ACC: ${after.acc}${after.acc ? ", still writing" : ", done"}.`;
  if (
    bigBlitterWasBusy &&
    mnemonic === "STM" &&
    (isWindowAddress(operand) || operand === BIG_PORT.data)
  )
    return `The big blitter is BUSY and owns the big screen, so this write of ${after.acc} is lost.`;
  if (operand === BIG_PORT.data && (mnemonic === "STM" || mnemonic === "LDM")) {
    const moved = (after.portAddr - portStep(before.portDown)) & (BIG_FRAME_BYTES - 1);
    const what =
      mnemonic === "STM" ? `Write ACC (${after.acc}) to` : `Read the ${after.acc} stored in`;
    return `${what} big-screen byte ${moved} (row ${moved >> 2}, pixels ${(moved & 3) * 8}–${(moved & 3) * 8 + 7}); ADDR moves on by ${portStep(before.portDown)} to ${after.portAddr}.`;
  }
  if (mnemonic === "STM" && operand === BIG_PORT.addr)
    return `ADDR becomes ${after.portAddr}: the next DA access reaches big-screen byte ${after.portAddr}, row ${after.portAddr >> 2}.`;
  if (mnemonic === "STM" && operand === BIG_PORT.step)
    return after.portDown
      ? "STEP is now 4: after each DA access ADDR moves down one pixel row."
      : "STEP is now 1: after each DA access ADDR moves to the next byte across.";
  if (mnemonic === "STM" && operand === BIG_PORT.bank)
    return `BANK becomes ${after.bank}: window[0]–window[7] now show tile ${after.bank}, column ${after.bank & 3} and row ${after.bank >> 2} of the big screen's 4 × 4 tiles.`;
  if (mnemonic === "STM" && isWindowAddress(operand)) {
    const byte = windowByte(after.bank, operand);
    return `Write ACC (${after.acc}) to window row ${operand & 7}. With BANK ${after.bank} that is big-screen byte ${byte}: row ${byte >> 2}, pixels ${(byte & 3) * 8}–${(byte & 3) * 8 + 7}.`;
  }
  if (mnemonic === "STM" && isBlitterAddress(operand)) {
    if (blitterWasBusy)
      return `The blitter is BUSY and ignores the write of ${after.acc} to ${meaning}.`;
    if (BLITTER_REGISTERS[operand & 7] !== "cmd") return `Set ${meaning} to ${after.acc}.`;
    const command = blitCommandName(after.acc & 7);
    return command
      ? `Start the blitter's ${command.toUpperCase()} command (${after.acc & 7}). From the next clock edge it draws one row per tick by itself, and BUSY reads 1 until it is done.`
      : `Command ${after.acc & 7} is not a blitter command; the blitter stays idle.`;
  }
  if (
    (mnemonic === "LDM" || mnemonic === "ADDM" || mnemonic === "SUBM") &&
    isBlitterAddress(operand)
  )
    return mnemonic === "LDM"
      ? `Read the blitter's BUSY flag into ACC: ${after.acc}${after.acc ? ", still drawing" : ", done"}.`
      : `Read the blitter's BUSY flag (${after.opr}); ACC becomes ${after.acc}.`;
  if (mnemonic === "STM" && write && write.x !== null && write.by !== "blitter")
    return `ACC bit 0 is ${after.acc & 1}, so the plotter turns pixel (${write.x}, ${write.y}) ${after.acc & 1 ? "on" : "off"}; screen row ${write.y} becomes ${byteBits(write.row)}.`;
  if (mnemonic === "STM" && isPixelPort(operand) && pixelPortRole(operand) !== "pixel") {
    const role = pixelPortRole(operand);
    return `Set the pixel cursor's ${role} to ${role === "x" ? after.pixelX : after.pixelY} (ACC ${after.acc}, low 3 bits).`;
  }
  switch (mnemonic) {
    case "LDI":
      return `Load the number ${operand} itself into ACC.`;
    case "LDM":
      if (isVideoStatus(operand))
        return after.acc
          ? "The video status reads 1: the beam is in vertical blank, off the bottom of the screen."
          : "The video status reads 0: the beam is drawing the screen.";
      return `Go to ${meaning}, read the ${after.acc} stored there, and load it into ACC.`;
    case "STM":
      return `Write ACC (${after.acc}) to ${meaning}.`;
    case "ADDI":
    case "ADDM":
    case "SUBI":
    case "SUBM": {
      const subtract = mnemonic === "SUBI" || mnemonic === "SUBM";
      return `ALU ${subtract ? "subtracts" : "adds"} ${after.opr}; ACC becomes ${after.acc}${after.carry ? (subtract ? " (borrow)" : " (carry out)") : ""}.`;
    }
    case "OUT":
      return `Copy ACC (${after.acc}) to the output device.`;
    case "JMP":
      return `Jump to code address ${hex(operand)}.`;
    case "JNC":
      return before.carry
        ? `Borrow is set: enter the loop body at ${hex(after.pc)}.`
        : `No borrow: leave the loop at ${hex(operand)}.`;
    case "CALL":
      return `Push return address ${hex(stack.at(-1)!)}${inRam ? ` to RAM ${hex(after.sp)}` : ""}; jump to function at ${hex(operand)}.`;
    case "RET":
      return `Pop return address ${hex(after.pc)}${inRam ? ` from RAM ${hex(after.dmar)}` : ""}; resume caller with ACC = ${after.acc}.`;
    case "LDS":
      return `SP + ${operand} is RAM ${hex(after.dmar)}: read the ${after.acc} stored there into ACC.`;
    case "STS":
      return `SP + ${operand} is RAM ${hex(after.dmar)}: write ACC (${after.acc}) there.`;
    case "ADDS":
    case "SUBS":
      return `SP + ${operand} is RAM ${hex(after.dmar)}; the ALU ${mnemonic === "SUBS" ? "subtracts" : "adds"} its ${after.opr}; ACC becomes ${after.acc}${after.carry ? (mnemonic === "SUBS" ? " (borrow)" : " (carry out)") : ""}.`;
    case "ADDSP": {
      const change = signedByte(operand);
      return change < 0
        ? `Make a stack frame: SP moves down ${-change} byte${change === -1 ? "" : "s"} to ${hex(after.sp)}.`
        : `Free the stack frame: SP moves up ${change} byte${change === 1 ? "" : "s"} to ${hex(after.sp)}.`;
    }
    case "IN":
      return `Read key code ${after.key} from the key port into ACC; KEY READY goes off.`;
    case "EI":
      return "Interrupts on: a waiting key now interrupts the program after each instruction.";
    case "DI":
      return "Interrupts off: a key press waits in the key port until interrupts are on again.";
    case "RETI":
      return `Pop return address ${hex(after.pc)}${inRam ? ` from RAM ${hex(after.dmar)}` : ""} and turn interrupts back on; the interrupted code resumes.`;
    case "HALT":
      return "HALT stops the CPU clock in this toy model.";
    default:
      return `Unknown opcode ${hex(opcode)}. Execution stopped.`;
  }
}

/**
 * The stepper's three snapshots per instruction (fetch, decode, execute),
 * grouped from the per-tick trace: fetch shows the state after T1, decode
 * after T3, execute after the instruction's last tick.
 */
/** The interrupt entry's ticks, in words. */
function explainInterrupt(tick: Tick, inRam: boolean): string {
  const on = new Set(tick.control);
  if (on.has("VEC_OUT"))
    return `The control unit drives the interrupt vector ${hex(INTERRUPT_VECTOR)} into PC: the next fetch runs the key handler.`;
  if (on.has("STACK_IN") || (on.has("RAM_IN") && on.has("PC_OUT")))
    return `A key is waiting and interrupts are on, so instead of fetching, the control unit pushes PC (${hex(tick.bus ?? 0)})${inRam ? ` to RAM ${hex(tick.registers.dmar)}` : " to the return stack"}${on.has("IE_CLR") ? " and turns interrupts off" : ""}.`;
  if (on.has("SP_DEC"))
    return `A key is waiting and interrupts are on, so instead of fetching, the control unit starts the interrupt: SP moves down to ${hex(tick.registers.sp)} and interrupts go off.`;
  if (on.has("SP_OUT"))
    return `SP (${hex(tick.registers.sp)}) goes to DMAR: PC will be stored there.`;
  return `Interrupt: SP moves up to ${hex(tick.registers.sp)}.`;
}

/**
 * Whether `entry` is the CPU's own opcode, unedited: only then do the
 * stepper's hand-written explanations describe what its microcode does.
 */
function isDefaultEntry(entry: MicrocodeOpcode, stack: StackModel): boolean {
  const original = microcodeEntry(stack, entry.opcode);
  return (
    original !== undefined &&
    original.mnemonic === entry.mnemonic &&
    JSON.stringify(original.steps) === JSON.stringify(entry.steps)
  );
}

/** What an edited or added opcode did, read from the registers it changed. */
function explainEdited(entry: MicrocodeOpcode, before: Snapshot, after: Registers): string {
  const changes = [
    after.acc !== before.accumulator && `ACC becomes ${after.acc}`,
    after.carry !== before.carry && `carry becomes ${Number(after.carry)}`,
    after.zero !== before.zero && `zero becomes ${Number(after.zero)}`,
  ].filter(Boolean);
  return `${entry.mnemonic} runs edited microcode (${entry.effect || "no effect given"}): ${changes.length ? changes.join(", ") : "ACC and flags stay the same"}.`;
}

export function traceProgram(
  program: CompiledProgram,
  keys: KeySchedule = {},
  table: MicrocodeTable = defaultMicrocode(stackModelOf(program)),
): Snapshot[] {
  const inRam = stackModelOf(program) === "ram";
  const snapshots: Snapshot[] = [];
  let state: Snapshot = {
    phase: "ready",
    pc: 0,
    ir: null,
    operand: null,
    accumulator: 0,
    zero: true,
    carry: false,
    ram: Array(STACK_MODELS[stackModelOf(program)].ramBytes).fill(0),
    screen: Array(SCREEN_ROWS).fill(0),
    stack: [],
    output: [],
    activeAddress: null,
    touchedAddress: null,
    explanation: "Program compiled. Step to fetch the first instruction byte.",
    halted: false,
    ...(inRam ? { sp: STACK_TOP } : {}),
    tick: -1,
    key: 0,
    keyReady: false,
    interruptsOn: false,
    keyPress: null,
    pixelX: 0,
    pixelY: 0,
    screenWrite: null,
    blitter: initialBlitter(),
    frame: Array(BIG_FRAME_BYTES).fill(0),
    bank: 0,
    frameWrite: null,
    portAddr: 0,
    portDown: false,
    bigBlitter: initialBigBlitter(),
  };
  const record = (patch: Partial<Snapshot>) => {
    state = {
      ...state,
      screenWrite: null,
      frameWrite: null,
      ...patch,
      ram: patch.ram ?? [...state.ram],
      screen: patch.screen ?? [...state.screen],
      stack: patch.stack ?? [...state.stack],
      output: patch.output ?? [...state.output],
    };
    snapshots.push(state);
  };
  record({});
  const groups: Tick[][] = [];
  const ticks = traceTicks(program, MAX_INSTRUCTIONS, keys, table);
  for (const tick of ticks) (groups[tick.instruction] ??= []).push(tick);
  /** Key port, tick and machine state after `ticks`, for any snapshot. */
  const port = (ticks: Tick[]): Partial<Snapshot> => {
    const last = ticks.at(-1)!;
    return {
      tick: last.index,
      key: last.registers.key,
      keyReady: last.registers.keyReady,
      interruptsOn: last.registers.ie,
      keyPress: ticks.find((tick) => tick.keyPress !== null)?.keyPress ?? null,
      pixelX: last.registers.pixelX,
      pixelY: last.registers.pixelY,
      screenWrite: ticks.findLast((tick) => tick.screenWrite)?.screenWrite ?? null,
      blitter: last.blitter,
      // The blitter draws on any tick, fetch and decode included.
      screen: [...last.screen],
      frame: last.frame,
      bank: last.registers.bank,
      portAddr: last.registers.portAddr,
      portDown: last.registers.portDown,
      bigBlitter: last.bigBlitter,
      frameWrite: ticks.findLast((tick) => tick.frameWrite)?.frameWrite ?? null,
    };
  };
  /** What the blitter did during `ticks`, as a sentence to append, or "". */
  const blitterNote = (ticks: Tick[]): string => {
    const rows = ticks.flatMap(({ screenWrite }) =>
      screenWrite?.by === "blitter" ? [screenWrite.y] : [],
    );
    const lost = ticks.some((tick) => tick.screenBlocked);
    const bigBytes = ticks.filter(({ frameWrite }) => frameWrite?.by === "blitter").length;
    const big = ticks.at(-1)!.bigBlitter;
    const last = ticks.at(-1)!.blitter;
    const command = blitCommandName(last.op)?.toUpperCase();
    const parts: string[] = [];
    if (rows.length)
      parts.push(
        `Meanwhile the blitter ${last.busy ? "keeps drawing" : "finished"} its ${command}: it wrote screen row${rows.length === 1 ? "" : "s"} ${rows.join(", ")}${last.busy ? `, step ${last.i + 1} of ${blitterLast(last) + 1} is next` : ""}.`,
      );
    if (bigBytes)
      parts.push(
        `The big blitter ${big.busy ? "keeps going" : "finished"}: it wrote ${bigBytes} byte${bigBytes === 1 ? "" : "s"} of the big screen.`,
      );
    if (ticks.some((tick) => tick.frameBlocked))
      parts.push(
        "The big blitter was BUSY and owns the big screen, so the CPU's write to it was lost.",
      );
    if (lost)
      parts.push(
        "The blitter was BUSY and owns the screen, so the CPU's screen write was lost: wait with blit(wait); first.",
      );
    return parts.length ? ` ${parts.join(" ")}` : "";
  };
  for (const group of groups) {
    const address = group[0].address;
    if (group[0].interrupt) {
      for (const tick of group) {
        if (tick.fault) {
          record({ phase: "interrupt", halted: true, explanation: tick.fault, ...port([tick]) });
          return snapshots;
        }
        const after = tick.registers;
        record({
          phase: "interrupt",
          pc: after.pc,
          ram: [...tick.ram],
          stack: [...tick.stack],
          activeAddress: null,
          touchedAddress: tick.control.includes("RAM_IN")
            ? after.dmar & (state.ram.length - 1)
            : null,
          explanation: explainInterrupt(tick, inRam),
          ...(inRam ? { sp: after.sp } : {}),
          ...port([tick]),
        });
      }
      continue;
    }
    const instruction = program.instructions[address / 2];
    if (!instruction || instruction.address !== address) {
      record({
        phase: "execute",
        halted: true,
        explanation: `No instruction at code address ${hex(address)}. Execution stopped.`,
      });
      return snapshots;
    }
    const opcode = group[1].registers.ir;
    const operand = group[3].registers.opr;
    const entry = microcodeEntry(table, opcode);
    const mnemonic = entry?.mnemonic ?? hex(opcode);
    const meaning = describeOperand(opcode, operand, program.variables, table.opcodes).long;
    record({
      phase: "fetch",
      ir: opcode,
      operand: null,
      activeAddress: address,
      touchedAddress: null,
      explanation: `PC points to code address ${hex(address)}. Fetch opcode ${hex(opcode)} into the instruction register.${blitterNote(group.slice(0, 2))}`,
      ...port(group.slice(0, 2)),
    });
    record({
      phase: "decode",
      operand,
      activeAddress: address + 1,
      explanation: `Decode ${hex(opcode)} as ${mnemonic} (${instruction.label}); the next byte, ${hex(operand)}, is its operand: ${meaning}.${blitterNote(group.slice(2, 4))}`,
      ...port(group.slice(2, 4)),
    });
    const last = group.at(-1)!;
    if (last.fault) {
      record({ phase: "execute", halted: true, explanation: last.fault, ...port(group.slice(4)) });
      return snapshots;
    }
    const after = last.registers;
    const touchesRam =
      !isScreenAddress(last.registers.dmar) &&
      !isBlitterAddress(last.registers.dmar) &&
      group.some(({ control }) => control.includes("RAM_OUT") || control.includes("RAM_IN"));
    const effect =
      entry && !isDefaultEntry(entry, table.stack)
        ? explainEdited(entry, state, after)
        : explainExecute(
            opcode,
            operand,
            meaning,
            state,
            after,
            last.stack,
            inRam,
            last.screenWrite,
            group.some(
              ({ control, index }) => control.includes("RAM_IN") && ticks[index - 1]?.blitter.busy,
            ),
            group.some(
              ({ control, index }) =>
                control.includes("RAM_IN") && ticks[index - 1]?.bigBlitter.busy,
            ),
          );
    record({
      phase: "execute",
      pc: after.pc,
      accumulator: after.acc,
      zero: after.zero,
      carry: after.carry,
      ram: [...last.ram],
      screen: [...last.screen],
      stack: [...last.stack],
      output: [...last.output],
      touchedAddress: touchesRam ? after.dmar & (state.ram.length - 1) : null,
      activeAddress: address,
      explanation: `${effect} PC is now ${hex(after.pc)}.${after.int ? " A key is waiting and interrupts are on: next comes the interrupt, not a fetch." : ""}${blitterNote(group.slice(4))}`,
      halted: last.halted,
      ...(inRam ? { sp: after.sp } : {}),
      ...port(group.slice(4)),
    });
    if (last.halted) return snapshots;
  }
  if (groups.length >= MAX_INSTRUCTIONS)
    record({
      phase: "execute",
      halted: true,
      explanation: `Stopped after ${MAX_INSTRUCTIONS} instructions. Check for a loop that never ends.`,
    });
  return snapshots;
}

/** Stepper fields a circuit probe can fill; the rest stay undefined. */
export type ProbeSnapshot = Partial<Snapshot> & { bus?: number; sp?: number };

/**
 * Maps circuit probe values (from `readProbes`) onto the stepper's `Snapshot` fields, so one
 * register panel can show either source. FLAGS bit 0 is carry, bit 1 is zero. SP and BUS have
 * no stepper field yet and come back as `sp` and `bus`.
 */
export function probesToSnapshot(probes: Record<string, number>): ProbeSnapshot {
  const read = (name: string) => (Object.hasOwn(probes, name) ? probes[name] : undefined);
  const flags = read("FLAGS");
  const snapshot: ProbeSnapshot = {};
  if (read("ACC") !== undefined) snapshot.accumulator = read("ACC");
  if (read("PC") !== undefined) snapshot.pc = read("PC");
  if (read("IR") !== undefined) snapshot.ir = read("IR");
  if (read("OPERAND") !== undefined) snapshot.operand = read("OPERAND");
  if (flags !== undefined) {
    snapshot.carry = Boolean(flags & 1);
    snapshot.zero = Boolean(flags & 2);
  }
  if (read("SP") !== undefined) snapshot.sp = read("SP");
  if (read("BUS") !== undefined) snapshot.bus = read("BUS");
  return snapshot;
}
