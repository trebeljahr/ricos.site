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

function fail(line: number, message: string): never {
  throw new Error(`Line ${line}: ${message}`);
}

export function compileProgram(source: string): CompiledProgram {
  const instructions: Instruction[] = [];
  const variables: { name: string; address: number }[] = [];
  const symbol = new Map<string, number>();
  const emit = (opcode: number, operand: number, label: string, line: number) => {
    if (instructions.length >= 32) fail(line, "Program exceeds 64 code bytes.");
    instructions.push({ address: instructions.length * 2, opcode, operand, label, line });
  };
  const resolve = (
    value: string,
    line: number,
  ): { kind: "literal" | "variable"; value: number } => {
    if (/^\d+$/.test(value)) {
      const number = Number(value);
      if (number > 255) fail(line, "Numbers must be between 0 and 255.");
      return { kind: "literal", value: number };
    }
    const address = symbol.get(value);
    if (address === undefined) fail(line, `Unknown variable “${value}”.`);
    return { kind: "variable", value: address };
  };
  const load = (value: string, line: number) => {
    const resolved = resolve(value, line);
    emit(
      resolved.kind === "literal" ? OPCODES.LDI : OPCODES.LDM,
      resolved.value,
      `LOAD ${value}`,
      line,
    );
  };
  const lines = source.split("\n");
  lines.forEach((raw, index) => {
    const line = index + 1;
    const text = raw.replace(/\/\/.*$/, "").trim();
    if (!text) return;
    const print = /^print\s*\(\s*([A-Za-z_]\w*|\d+)\s*\)\s*;$/.exec(text);
    if (print) {
      load(print[1], line);
      emit(OPCODES.OUT, 0, "PRINT ACC", line);
      return;
    }
    const assignment =
      /^(let\s+)?([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*|\d+)(?:\s*([+-])\s*([A-Za-z_]\w*|\d+))?\s*;$/.exec(
        text,
      );
    if (!assignment) fail(line, "Use let, assignment, or print with a semicolon.");
    const [, declaration, name, first, operator, second] = assignment;
    if (declaration && (first === name || second === name)) {
      fail(line, `“${name}” has no value yet.`);
    }
    if (declaration) {
      if (symbol.has(name)) fail(line, `“${name}” is already declared.`);
      if (variables.length >= 16) fail(line, "At most 16 variables fit in RAM.");
      symbol.set(name, variables.length);
      variables.push({ name, address: variables.length });
    } else if (!symbol.has(name)) {
      fail(line, `Declare “${name}” with let first.`);
    }
    load(first, line);
    if (operator && second) {
      const resolved = resolve(second, line);
      const opcode =
        operator === "+"
          ? resolved.kind === "literal"
            ? OPCODES.ADDI
            : OPCODES.ADDM
          : resolved.kind === "literal"
            ? OPCODES.SUBI
            : OPCODES.SUBM;
      emit(opcode, resolved.value, `${operator === "+" ? "ADD" : "SUB"} ${second}`, line);
    }
    emit(OPCODES.STM, symbol.get(name)!, `STORE ${name}`, line);
  });
  emit(OPCODES.HALT, 0, "HALT", 0);
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
      output: patch.output ?? [...state.output],
    };
    snapshots.push(state);
  };
  record({});
  for (
    let instructionIndex = 0;
    instructionIndex < program.instructions.length;
    instructionIndex++
  ) {
    const instruction = program.instructions[instructionIndex];
    const { address, opcode, operand, label } = instruction;
    record({
      phase: "fetch",
      pc: address,
      ir: opcode,
      operand: null,
      activeAddress: address,
      touchedAddress: null,
      explanation: `PC points to code address ${address}. Fetch opcode ${hex(opcode)} into the instruction register.`,
    });
    record({
      phase: "decode",
      pc: address,
      operand,
      activeAddress: address + 1,
      explanation: `Decode ${hex(opcode)} as ${label}; the next byte, ${hex(operand)}, is its operand.`,
    });
    let accumulator = state.accumulator;
    let ram = state.ram;
    let output = state.output;
    let carry = false;
    let touchedAddress: number | null = null;
    let effect = "";
    if (opcode === OPCODES.LDI) {
      accumulator = operand;
      effect = `Load literal ${operand} into ACC.`;
    } else if (opcode === OPCODES.LDM) {
      accumulator = ram[operand];
      touchedAddress = operand;
      effect = `Read RAM[${operand}] into ACC.`;
    } else if (opcode === OPCODES.STM) {
      ram = [...ram];
      ram[operand] = accumulator;
      touchedAddress = operand;
      effect = `Write ACC (${accumulator}) to RAM[${operand}].`;
    } else if (opcode === OPCODES.ADDI || opcode === OPCODES.ADDM) {
      const value = opcode === OPCODES.ADDI ? operand : ram[operand];
      const result = accumulator + value;
      carry = result > 255;
      accumulator = result & 255;
      if (opcode === OPCODES.ADDM) touchedAddress = operand;
      effect = `ALU adds ${value}; ACC becomes ${accumulator}${carry ? " (carry out)" : ""}.`;
    } else if (opcode === OPCODES.SUBI || opcode === OPCODES.SUBM) {
      const value = opcode === OPCODES.SUBI ? operand : ram[operand];
      const result = accumulator - value;
      carry = result < 0;
      accumulator = result & 255;
      if (opcode === OPCODES.SUBM) touchedAddress = operand;
      effect = `ALU subtracts ${value}; ACC becomes ${accumulator}${carry ? " (borrow)" : ""}.`;
    } else if (opcode === OPCODES.OUT) {
      output = [...output, accumulator];
      effect = `Copy ACC (${accumulator}) to the output device.`;
    } else {
      effect = "HALT stops the CPU clock in this toy model.";
    }
    record({
      phase: "execute",
      pc: address + 2,
      accumulator,
      zero: accumulator === 0,
      carry,
      ram,
      output,
      touchedAddress,
      activeAddress: address,
      explanation: `${effect} PC advances to ${address + 2}.`,
      halted: opcode === OPCODES.HALT,
    });
    if (opcode === OPCODES.HALT) break;
  }
  return snapshots;
}

export function hex(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, "0");
}
