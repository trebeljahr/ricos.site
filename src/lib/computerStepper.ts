export type Instruction = {
  address: number;
  opcode: number;
  operand: number;
  label: string;
  line: number;
};

export type CompiledProgram = {
  instructions: Instruction[];
  bytes: number[];
  variables: { name: string; address: number }[];
};

export type Phase = "ready" | "fetch" | "decode" | "execute";

export type Snapshot = {
  phase: Phase;
  pc: number;
  ir: number | null;
  operand: number | null;
  accumulator: number;
  zero: boolean;
  carry: boolean;
  ram: number[];
  stack: number[];
  output: number[];
  activeAddress: number | null;
  touchedAddress: number | null;
  explanation: string;
  halted: boolean;
};

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
  HALT: 0xf0,
} as const;

export const ISA = [
  { mnemonic: "LDI", opcode: OPCODES.LDI, operand: "literal", effect: "ACC ← operand" },
  { mnemonic: "LDM", opcode: OPCODES.LDM, operand: "RAM address", effect: "ACC ← RAM[address]" },
  { mnemonic: "STM", opcode: OPCODES.STM, operand: "RAM address", effect: "RAM[address] ← ACC" },
  { mnemonic: "ADDI", opcode: OPCODES.ADDI, operand: "literal", effect: "ACC ← ACC + operand" },
  {
    mnemonic: "ADDM",
    opcode: OPCODES.ADDM,
    operand: "RAM address",
    effect: "ACC ← ACC + RAM[address]",
  },
  { mnemonic: "SUBI", opcode: OPCODES.SUBI, operand: "literal", effect: "ACC ← ACC − operand" },
  {
    mnemonic: "SUBM",
    opcode: OPCODES.SUBM,
    operand: "RAM address",
    effect: "ACC ← ACC − RAM[address]",
  },
  { mnemonic: "OUT", opcode: OPCODES.OUT, operand: "unused", effect: "output ← ACC" },
  { mnemonic: "JMP", opcode: OPCODES.JMP, operand: "code address", effect: "PC ← address" },
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
  { mnemonic: "RET", opcode: OPCODES.RET, operand: "unused", effect: "PC ← popped return PC" },
  { mnemonic: "HALT", opcode: OPCODES.HALT, operand: "unused", effect: "stop" },
] as const;

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

function fail(line: number, message: string): never {
  throw new Error(`Line ${line}: ${message}`);
}

type Expression =
  | { kind: "value"; value: string }
  | { kind: "binary"; left: string; operator: "+" | "-"; right: string }
  | { kind: "call"; name: string; argument: string | null };

type Statement =
  | { kind: "assign"; line: number; declaration: boolean; name: string; expression: Expression }
  | { kind: "print"; line: number; expression: Expression }
  | { kind: "call"; line: number; name: string; argument: string | null }
  | { kind: "return"; line: number; expression: Expression | null }
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
const VALUE = `(?:${NAME}|\\d+)`;

function parseExpression(text: string, line: number): Expression {
  const value = text.trim();
  const call = new RegExp(`^(${NAME})\\s*\\(\\s*(${VALUE})?\\s*\\)$`).exec(value);
  if (call) return { kind: "call", name: call[1], argument: call[2] ?? null };
  const binary = new RegExp(`^(${VALUE})\\s*([+-])\\s*(${VALUE})$`).exec(value);
  if (binary)
    return { kind: "binary", left: binary[1], operator: binary[2] as "+" | "-", right: binary[3] };
  if (new RegExp(`^${VALUE}$`).test(value)) return { kind: "value", value };
  fail(line, "Expected a byte, variable, simple +/− expression, or function call.");
}

function parseProgram(source: string): { main: Statement[]; functions: FunctionDefinition[] } {
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
      if (/^for\b/.test(text))
        fail(line, "Use for (let i = 0; i < 3; i++) { with the closing brace on its own line.");
      const print = /^print\s*\((.*)\)\s*;$/.exec(text);
      if (print) {
        statements.push({ kind: "print", line, expression: parseExpression(print[1], line) });
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
      const assignment = new RegExp(`^(let\\s+)?(${NAME})\\s*=\\s*(.+)\\s*;$`).exec(text);
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
        statements.push({ kind: "call", line, name: call[1], argument: call[2] ?? null });
        continue;
      }
      fail(line, "Use let, assignment, print, for, function call, or return.");
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

export function compileProgram(source: string): CompiledProgram {
  const ast = parseProgram(source);
  const instructions: Instruction[] = [];
  const variables: { name: string; address: number }[] = [];
  const globals = new Map<string, number>();
  const functionStarts = new Map<string, number>();
  const callPatches: { address: number; name: string; line: number }[] = [];
  const functions = new Map(ast.functions.map((definition) => [definition.name, definition]));
  const functionCalls = new Map<string, Set<string>>();

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
  const allocate = (name: string, scope: Map<string, number>, display: string, line: number) => {
    if (scope.has(name)) fail(line, `“${name}” is already declared.`);
    if (variables.length >= 16) fail(line, "At most 16 variables fit in RAM.");
    const address = variables.length;
    scope.set(name, address);
    variables.push({ name: display, address });
    return address;
  };
  const resolve = (value: string, scope: Map<string, number>, line: number) => {
    if (/^\d+$/.test(value)) {
      const number = Number(value);
      if (number > 255) fail(line, "Numbers must be between 0 and 255.");
      return { literal: true, value: number };
    }
    const address = scope.get(value) ?? globals.get(value);
    if (address === undefined) fail(line, `Unknown variable “${value}”.`);
    return { literal: false, value: address };
  };
  const load = (value: string, scope: Map<string, number>, line: number) => {
    const result = resolve(value, scope, line);
    emit(result.literal ? OPCODES.LDI : OPCODES.LDM, result.value, `LOAD ${value}`, line);
  };
  const call = (
    name: string,
    argument: string | null,
    scope: Map<string, number>,
    line: number,
    caller: string,
  ) => {
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
  };
  const compileExpression = (
    expression: Expression,
    scope: Map<string, number>,
    line: number,
    caller: string,
  ) => {
    if (expression.kind === "value") {
      load(expression.value, scope, line);
    } else if (expression.kind === "call") {
      call(expression.name, expression.argument, scope, line, caller);
    } else {
      load(expression.left, scope, line);
      const result = resolve(expression.right, scope, line);
      const opcode =
        expression.operator === "+"
          ? result.literal
            ? OPCODES.ADDI
            : OPCODES.ADDM
          : result.literal
            ? OPCODES.SUBI
            : OPCODES.SUBM;
      emit(
        opcode,
        result.value,
        `${expression.operator === "+" ? "ADD" : "SUB"} ${expression.right}`,
        line,
      );
    }
  };
  const compileStatements = (
    statements: Statement[],
    scope: Map<string, number>,
    caller: string,
  ) => {
    for (const statement of statements) {
      const line = statement.line;
      if (statement.kind === "assign") {
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
        const address = statement.declaration
          ? allocate(
              statement.name,
              scope,
              caller === "main" ? statement.name : `${caller}.${statement.name}`,
              line,
            )
          : resolve(statement.name, scope, line).value;
        if (!statement.declaration && /^\d+$/.test(statement.name))
          fail(line, "Assignment target must be a variable.");
        compileExpression(statement.expression, scope, line, caller);
        emit(OPCODES.STM, address, `STORE ${statement.name}`, line);
      } else if (statement.kind === "print") {
        compileExpression(statement.expression, scope, line, caller);
        emit(OPCODES.OUT, 0, "PRINT ACC", line);
      } else if (statement.kind === "call") {
        call(statement.name, statement.argument, scope, line, caller);
      } else if (statement.kind === "return") {
        if (caller === "main") fail(line, "return is only valid inside a function.");
        if (statement.expression) compileExpression(statement.expression, scope, line, caller);
        emit(OPCODES.RET, 0, "RETURN", line);
      } else {
        if (statement.declaration && statement.initial === statement.name)
          fail(line, `“${statement.name}” has no value yet.`);
        const address = statement.declaration
          ? allocate(
              statement.name,
              scope,
              caller === "main" ? statement.name : `${caller}.${statement.name}`,
              line,
            )
          : resolve(statement.name, scope, line).value;
        load(statement.initial, scope, line);
        emit(OPCODES.STM, address, `INIT ${statement.name}`, line);
        const testAddress = instructions.length * 2;
        emit(OPCODES.LDM, address, `TEST ${statement.name}`, line);
        const limit = resolve(statement.limit, scope, line);
        emit(
          limit.literal ? OPCODES.SUBI : OPCODES.SUBM,
          limit.value,
          `COMPARE < ${statement.limit}`,
          line,
        );
        const exitAddress = emit(OPCODES.JNC, 0, "EXIT IF ≥", line);
        compileStatements(statement.body, scope, caller);
        emit(OPCODES.LDM, address, `LOAD ${statement.name}`, line);
        const increment = resolve(statement.increment, scope, line);
        emit(
          increment.literal ? OPCODES.ADDI : OPCODES.ADDM,
          increment.value,
          `INCREMENT ${statement.name}`,
          line,
        );
        emit(OPCODES.STM, address, `STORE ${statement.name}`, line);
        emit(OPCODES.JMP, testAddress, "REPEAT LOOP", line);
        patch(exitAddress, instructions.length * 2);
      }
    }
  };

  for (const definition of ast.functions) functionCalls.set(definition.name, new Set());
  compileStatements(ast.main, globals, "main");
  emit(OPCODES.HALT, 0, "HALT", 0);
  for (const definition of ast.functions) {
    functionStarts.set(definition.name, instructions.length * 2);
    const scope = new Map<string, number>();
    if (definition.parameter)
      allocate(
        definition.parameter,
        scope,
        `${definition.name}.${definition.parameter}`,
        definition.line,
      );
    if (definition.parameter)
      emit(
        OPCODES.STM,
        scope.get(definition.parameter)!,
        `ARG ${definition.parameter}`,
        definition.line,
      );
    compileStatements(definition.body, scope, definition.name);
    emit(OPCODES.LDI, 0, "DEFAULT RETURN 0", 0);
    emit(OPCODES.RET, 0, "RETURN", 0);
  }
  for (const callSite of callPatches) patch(callSite.address, functionStarts.get(callSite.name)!);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (name: string) => {
    if (visiting.has(name))
      fail(functions.get(name)!.line, "Recursive calls are not supported by this toy RAM model.");
    if (visited.has(name)) return;
    visiting.add(name);
    for (const callee of functionCalls.get(name) ?? []) visit(callee);
    visiting.delete(name);
    visited.add(name);
  };
  for (const name of functions.keys()) visit(name);
  return {
    instructions,
    bytes: instructions.flatMap(({ opcode, operand }) => [opcode, operand]),
    variables,
  };
}

export function traceProgram(program: CompiledProgram): Snapshot[] {
  const snapshots: Snapshot[] = [];
  let state: Snapshot = {
    phase: "ready",
    pc: 0,
    ir: null,
    operand: null,
    accumulator: 0,
    zero: true,
    carry: false,
    ram: Array(16).fill(0),
    stack: [],
    output: [],
    activeAddress: null,
    touchedAddress: null,
    explanation: "Program compiled. Step to fetch the first instruction byte.",
    halted: false,
  };
  const record = (patch: Partial<Snapshot>) => {
    state = {
      ...state,
      ...patch,
      ram: patch.ram ?? [...state.ram],
      stack: patch.stack ?? [...state.stack],
      output: patch.output ?? [...state.output],
    };
    snapshots.push(state);
  };
  record({});
  for (let count = 0; count < 512; count++) {
    const address = state.pc;
    const instruction = program.instructions[address / 2];
    if (!instruction || instruction.address !== address) {
      record({
        phase: "execute",
        halted: true,
        explanation: `No instruction at code address ${address}. Execution stopped.`,
      });
      break;
    }
    const { opcode, operand, label } = instruction;
    record({
      phase: "fetch",
      ir: opcode,
      operand: null,
      activeAddress: address,
      touchedAddress: null,
      explanation: `PC points to code address ${address}. Fetch opcode ${hex(opcode)} into the instruction register.`,
    });
    record({
      phase: "decode",
      operand,
      activeAddress: address + 1,
      explanation: `Decode ${hex(opcode)} as ${label}; the next byte, ${hex(operand)}, is its operand.`,
    });
    let accumulator = state.accumulator;
    let ram = state.ram;
    let stack = state.stack;
    let output = state.output;
    let carry = state.carry;
    let zero = state.zero;
    let touchedAddress: number | null = null;
    let pc = address + 2;
    let effect = "";
    if (opcode === OPCODES.LDI || opcode === OPCODES.LDM) {
      accumulator = opcode === OPCODES.LDI ? operand : ram[operand];
      zero = accumulator === 0;
      if (opcode === OPCODES.LDM) touchedAddress = operand;
      effect =
        opcode === OPCODES.LDI
          ? `Load literal ${operand} into ACC.`
          : `Read RAM[${operand}] into ACC.`;
    } else if (opcode === OPCODES.STM) {
      ram = [...ram];
      ram[operand] = accumulator;
      touchedAddress = operand;
      effect = `Write ACC (${accumulator}) to RAM[${operand}].`;
    } else if (
      opcode === OPCODES.ADDI ||
      opcode === OPCODES.ADDM ||
      opcode === OPCODES.SUBI ||
      opcode === OPCODES.SUBM
    ) {
      const immediate = opcode === OPCODES.ADDI || opcode === OPCODES.SUBI;
      const subtract = opcode === OPCODES.SUBI || opcode === OPCODES.SUBM;
      const value = immediate ? operand : ram[operand];
      const result = subtract ? accumulator - value : accumulator + value;
      carry = subtract ? result < 0 : result > 255;
      accumulator = result & 255;
      zero = accumulator === 0;
      if (!immediate) touchedAddress = operand;
      effect = `ALU ${subtract ? "subtracts" : "adds"} ${value}; ACC becomes ${accumulator}${carry ? (subtract ? " (borrow)" : " (carry out)") : ""}.`;
    } else if (opcode === OPCODES.OUT) {
      output = [...output, accumulator];
      effect = `Copy ACC (${accumulator}) to the output device.`;
    } else if (opcode === OPCODES.JMP) {
      pc = operand;
      effect = `Jump to code address ${operand}.`;
    } else if (opcode === OPCODES.JNC) {
      if (!carry) pc = operand;
      effect = carry
        ? `Borrow is set: enter the loop body at ${pc}.`
        : `No borrow: leave the loop at ${operand}.`;
    } else if (opcode === OPCODES.CALL) {
      if (stack.length >= 16) {
        record({
          phase: "execute",
          halted: true,
          explanation: "Return stack is full. Execution stopped.",
        });
        break;
      }
      stack = [...stack, pc];
      pc = operand;
      effect = `Push return address ${stack.at(-1)}; jump to function at ${operand}.`;
    } else if (opcode === OPCODES.RET) {
      if (stack.length === 0) {
        record({
          phase: "execute",
          halted: true,
          explanation: "Return stack is empty. Execution stopped.",
        });
        break;
      }
      pc = stack.at(-1)!;
      stack = stack.slice(0, -1);
      effect = `Pop return address ${pc}; resume caller with ACC = ${accumulator}.`;
    } else if (opcode === OPCODES.HALT) {
      effect = "HALT stops the CPU clock in this toy model.";
    } else {
      effect = `Unknown opcode ${hex(opcode)}. Execution stopped.`;
    }
    const halted = opcode === OPCODES.HALT || !ISA.some((item) => item.opcode === opcode);
    record({
      phase: "execute",
      pc,
      accumulator,
      zero,
      carry,
      ram,
      stack,
      output,
      touchedAddress,
      activeAddress: address,
      explanation: `${effect} PC is now ${pc}.`,
      halted,
    });
    if (halted) break;
    if (count === 511)
      record({
        phase: "execute",
        halted: true,
        explanation: "Stopped after 512 instructions. Check for a loop that never ends.",
      });
  }
  return snapshots;
}
