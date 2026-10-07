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
 * Memory-mapped screen: data addresses F0–F7 are the 8×8 screen's rows 0–7. Any
 * address with high nibble F selects the screen (row = low 3 bits); every other
 * address reaches the 16-byte RAM through its low 4 bits.
 */
export const SCREEN_BASE = 0xf0;
export const SCREEN_ROWS = 8;
export const isScreenAddress = (address: number) => (address & 0xf0) === SCREEN_BASE;

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

export function encodeInstruction(opcode: number, operand: number): [number, number] {
  if (!ISA.some((item) => item.opcode === opcode)) throw new Error("Unknown opcode.");
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

/** Says whether an operand byte is a number, a RAM address, or a code address. */
export function describeOperand(
  opcode: number,
  operand: number,
  variables: CompiledProgram["variables"],
): OperandMeaning {
  const kind = ISA.find((item) => item.opcode === opcode)?.operand;
  if (kind === "literal") return { short: `#${operand}`, long: `number ${operand}` };
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
/** `screen[3]`: screen row 3, at data address F3. */
const SCREEN_ROW = "screen\\[\\s*\\d+\\s*\\]";
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
      fail(line, "Use let, assignment, print, for, loop, if, function call, or return.");
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
      if (BUILTINS.has(header[1])) fail(line, `${header[1]} is built in.`);
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

/** The key handler: a function with this name runs when a key is pressed. */
export const KEY_HANDLER = "on_key";
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
    const row = /^screen\[\s*(\d+)\s*\]$/.exec(value);
    if (row) {
      if (Number(row[1]) >= SCREEN_ROWS) fail(line, `Screen rows are 0 to ${SCREEN_ROWS - 1}.`);
      return { mode: "ram", value: SCREEN_BASE + Number(row[1]) };
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
    if (name.startsWith("screen["))
      return { frame: false, address: resolve(name, scope, line).value };
    const place = scope.get(name) ?? globals.get(name);
    if (place === undefined) fail(line, `Unknown variable “${name}”.`);
    return place;
  };
  const compileStatements = (statements: Statement[], scope: Scope, caller: string) => {
    for (const statement of statements) {
      const line = statement.line;
      if (statement.kind === "assign") {
        if (statement.declaration && statement.name.startsWith("screen["))
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
  if (handler && !inRam) {
    // Every function variable has one fixed address: a key press inside a function the
    // handler also runs would overwrite the interrupted call's variables.
    const reach = (names: Iterable<string>, seen = new Set<string>()): Set<string> => {
      for (const name of names)
        if (!seen.has(name)) {
          seen.add(name);
          reach(functionCalls.get(name) ?? [], seen);
        }
      return seen;
    };
    const fromMain = reach([...mainCalls].map(({ name }) => name));
    const shared = [...reach(functionCalls.get(KEY_HANDLER) ?? [])].find((name) =>
      fromMain.has(name),
    );
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
  return {
    instructions,
    bytes: instructions.flatMap(({ opcode, operand }) => [opcode, operand]),
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

/** Programs for the stack-in-RAM CPU: they recurse, so the other CPU rejects them. */
export const RAM_STACK_SAMPLES = {
  RECURSION:
    "fn sum(n) {\n  if (n > 0) {\n    let less = n - 1;\n    let rest = sum(less);\n    return rest + n;\n  }\n  return 0;\n}\nprint(sum(4));",
} as const;

// ---------------------------------------------------------------------------
// Control unit: one clock tick = one micro-step.
//
// Harvard split: code ROM (256 bytes, addressed by CMAR), data RAM (16 bytes,
// addressed by DMAR; F0–F7 reach the screen instead) and a 16-entry return stack (addressed by SP). One 8-bit
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
] as const;

export type Signal = (typeof SIGNALS)[number];
export type ControlWord = readonly Signal[];
export type Mnemonic = (typeof ISA)[number]["mnemonic"];
/** Execute steps for one opcode, starting at T4. JNC branches on the carry flag. */
export type ExecuteSteps =
  | readonly ControlWord[]
  | { carryClear: readonly ControlWord[]; carrySet: readonly ControlWord[] };

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
    carryClear: [["OPR_OUT", "PC_IN", "STEP_RESET"]],
    carrySet: [["STEP_RESET"]],
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

/** The microcode lookup: (opcode, T-state, carry flag) → control word. */
export function controlWord(
  opcode: number,
  t: number,
  carry: boolean,
  stack: StackModel = "hardware",
): ControlWord {
  if (opcode === INT_OPCODE) return INTERRUPT_STEPS[stack][t] ?? [];
  if (t < FETCH_STEPS.length) return FETCH_STEPS[t];
  const mnemonic = ISA.find((item) => item.opcode === opcode)?.mnemonic;
  const steps = (mnemonic && MICROCODE[stack][mnemonic]) || UNKNOWN_STEPS;
  const list = "carrySet" in steps ? (carry ? steps.carrySet : steps.carryClear) : steps;
  return list[t - FETCH_STEPS.length] ?? [];
}

export function encodeControlWord(word: ControlWord): number {
  return word.reduce((bits, signal) => bits | (1 << SIGNALS.indexOf(signal)), 0);
}

export function decodeControlWord(bits: number): Signal[] {
  return SIGNALS.filter((_, index) => (bits & (1 << index)) !== 0);
}

/** ROM address for (opcode, T-state, carry): opcode byte, then 3 T bits, then carry. */
export function microcodeAddress(opcode: number, t: number, carry: boolean): number {
  return (opcode << 4) | (t << 1) | (carry ? 1 : 0);
}

/** Microcode ROM contents generated from the table, so the two cannot drift apart. */
export function microcodeRom(stack: StackModel = "hardware"): number[] {
  const rom = Array<number>(256 * MAX_T_STATES * 2).fill(0);
  for (let opcode = 0; opcode < 256; opcode++)
    for (let t = 0; t < MAX_T_STATES; t++)
      for (const carry of [false, true])
        rom[microcodeAddress(opcode, t, carry)] = encodeControlWord(
          controlWord(opcode, t, carry, stack),
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

const BUS_DRIVERS: Partial<Record<Signal, BusDriver>> = {
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

const BUS_READERS: readonly Signal[] = [
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
): Tick[] {
  const stack = stackModelOf(program);
  const inRam = stack === "ram";
  const rom = Array.from({ length: 256 }, (_, index) => program.bytes[index] ?? 0);
  const ram = Array<number>(STACK_MODELS[stack].ramBytes).fill(0);
  const screen = Array<number>(SCREEN_ROWS).fill(0);
  // DMAR holds the full 8-bit address; RAM_OUT and RAM_IN reach RAM or the screen.
  const data = (address: number): [number[], number] =>
    isScreenAddress(address)
      ? [screen, address & (SCREEN_ROWS - 1)]
      : [ram, address & (ram.length - 1)];
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
  };
  let t = 0;
  let instruction = 0;
  let address = 0;
  while (instruction < maxInstructions) {
    if (t === 0) address = registers.pc;
    if (t >= MAX_T_STATES) throw new Error(`Microcode for ${hex(registers.ir)} never resets.`);
    const interrupt = registers.int;
    const control = controlWord(interrupt ? INT_OPCODE : registers.ir, t, registers.carry, stack);
    if (control.length === 0)
      throw new Error(`Microcode for ${hex(registers.ir)} has no control word at T${t}.`);
    const on = new Set(control);
    const drivers = control.filter((signal) => BUS_DRIVERS[signal]);
    if (drivers.length > 1) throw new Error(`Bus conflict at T${t}: ${drivers.join(", ")}.`);
    const busDriver = drivers.length ? BUS_DRIVERS[drivers[0]]! : null;
    const subtract = on.has("ALU_SUB");
    const sum = subtract ? registers.acc - registers.opr : registers.acc + registers.opr;
    const busValues: Record<BusDriver, () => number> = {
      PC: () => registers.pc,
      ROM: () => rom[registers.cmar],
      OPR: () => registers.opr,
      RAM: () => {
        const [memory, row] = data(registers.dmar);
        return memory[row];
      },
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
    if (!fault && bus !== null) {
      if (on.has("CMAR_IN")) next.cmar = bus;
      if (on.has("IR_IN")) next.ir = bus;
      if (on.has("OPR_IN")) next.opr = bus;
      if (on.has("PC_IN")) next.pc = bus;
      if (on.has("DMAR_IN")) next.dmar = bus;
      if (on.has("SP_IN")) next.sp = bus;
      if (on.has("ACC_IN")) next.acc = bus;
      if (on.has("RAM_IN")) {
        const [memory, row] = data(registers.dmar);
        memory[row] = bus;
      }
      if (on.has("STACK_IN")) stackMemory[registers.sp] = bus;
      if (on.has("OUT_IN")) {
        next.out = bus;
        output.push(bus);
      }
    }
    if (!fault) {
      if (on.has("PC_INC")) next.pc = (registers.pc + 1) & 255;
      if (on.has("SP_INC")) next.sp = registers.sp + 1;
      if (on.has("SP_DEC")) next.sp = registers.sp - 1;
      if (on.has("FLAGS_IN")) next.carry = subtract ? sum < 0 : sum > 255;
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
): string {
  const mnemonic = ISA.find((item) => item.opcode === opcode)?.mnemonic;
  switch (mnemonic) {
    case "LDI":
      return `Load the number ${operand} itself into ACC.`;
    case "LDM":
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

export function traceProgram(program: CompiledProgram, keys: KeySchedule = {}): Snapshot[] {
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
  };
  const record = (patch: Partial<Snapshot>) => {
    state = {
      ...state,
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
  for (const tick of traceTicks(program, MAX_INSTRUCTIONS, keys))
    (groups[tick.instruction] ??= []).push(tick);
  /** Key port, tick and machine state after `ticks`, for any snapshot. */
  const port = (ticks: Tick[]): Partial<Snapshot> => {
    const last = ticks.at(-1)!;
    return {
      tick: last.index,
      key: last.registers.key,
      keyReady: last.registers.keyReady,
      interruptsOn: last.registers.ie,
      keyPress: ticks.find((tick) => tick.keyPress !== null)?.keyPress ?? null,
    };
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
    const mnemonic = ISA.find((item) => item.opcode === opcode)?.mnemonic ?? hex(opcode);
    const meaning = describeOperand(opcode, operand, program.variables).long;
    record({
      phase: "fetch",
      ir: opcode,
      operand: null,
      activeAddress: address,
      touchedAddress: null,
      explanation: `PC points to code address ${hex(address)}. Fetch opcode ${hex(opcode)} into the instruction register.`,
      ...port(group.slice(0, 2)),
    });
    record({
      phase: "decode",
      operand,
      activeAddress: address + 1,
      explanation: `Decode ${hex(opcode)} as ${mnemonic} (${instruction.label}); the next byte, ${hex(operand)}, is its operand: ${meaning}.`,
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
      group.some(({ control }) => control.includes("RAM_OUT") || control.includes("RAM_IN"));
    const effect = explainExecute(opcode, operand, meaning, state, after, last.stack, inRam);
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
      explanation: `${effect} PC is now ${hex(after.pc)}.${after.int ? " A key is waiting and interrupts are on: next comes the interrupt, not a fetch." : ""}`,
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
