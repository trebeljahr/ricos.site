// Edited microcode tables: checks that a table can run, an assembler for
// programs that use its opcodes, and JSON in and out for sharing.
//
// The source compiler stays on the default instruction set: it relies on what
// each default opcode does (JNC after a SUB, the key handler saving carry), and
// an edited table can change exactly that. Programs for an edited table are
// written in assembly instead, one mnemonic per line, so every opcode the
// table defines is available and nothing assumes what it does.

import {
  BUS_DRIVERS,
  BUS_READERS,
  type CompiledProgram,
  type ControlWord,
  type ExecuteSteps,
  FETCH_STEPS,
  hex,
  INT_OPCODE,
  type Instruction,
  MAX_T_STATES,
  type MicrocodeOpcode,
  type MicrocodeTable,
  microcodeEntry,
  OPERAND_KINDS,
  type OperandKind,
  SIGNALS,
  type Signal,
  STACK_MODELS,
  type StackModel,
} from "../computerStepper";

/** A reason a table or program cannot run; `opcode` and `t` say where, when known. */
export type MicrocodeProblem = {
  /** The opcode the problem is in; INT_OPCODE for the interrupt entry. */
  opcode: number | null;
  t: number | null;
  /** For a conditional opcode, the branch: 0 with the flag clear, 1 with it set. */
  path?: 0 | 1;
  message: string;
};

/** Control lines with no part behind them on each CPU: the circuit has nothing to switch. */
export const ABSENT_SIGNALS: Record<StackModel, readonly Signal[]> = {
  hardware: ["SP_OUT", "SP_IN", "FRAME_OUT"],
  ram: ["STACK_IN", "STACK_OUT"],
};

/** Mnemonics the assembler accepts: a capital letter, then up to 7 capitals or digits. */
export const MNEMONIC_PATTERN = /^[A-Z][A-Z0-9]{0,7}$/;

const ENDS: readonly Signal[] = ["STEP_RESET", "HALT"];

/** Problems in one list of control words that starts at T`first`. */
function pathProblems(
  words: readonly ControlWord[],
  first: number,
  opcode: number,
  stack: StackModel,
  branch: string,
  path?: 0 | 1,
): MicrocodeProblem[] {
  const problems: MicrocodeProblem[] = [];
  const add = (t: number | null, message: string) =>
    problems.push({
      opcode,
      t,
      ...(path === undefined ? {} : { path }),
      message: `${branch}${message}`,
    });
  if (words.length === 0) {
    add(first, "has no steps. End it with STEP_RESET.");
    return problems;
  }
  if (first + words.length > MAX_T_STATES)
    add(
      MAX_T_STATES - 1,
      `needs T${first + words.length - 1}, but the ROM only has T0–T${MAX_T_STATES - 1}.`,
    );
  const end = words.findIndex((word) => word.some((signal) => ENDS.includes(signal)));
  words.forEach((word, index) => {
    const t = first + index;
    if (word.length === 0 && (end === -1 || index < end))
      add(t, `T${t} is empty. Give it a control line or end the instruction before it.`);
    const drivers = word.filter((signal) => BUS_DRIVERS[signal]);
    if (drivers.length > 1) add(t, `T${t}: ${drivers.join(" and ")} both drive the bus.`);
    const readers = word.filter((signal) => BUS_READERS.includes(signal));
    if (readers.length && drivers.length === 0)
      add(
        t,
        `T${t}: ${readers.join(" and ")} ${readers.length > 1 ? "read" : "reads"} the bus, but nothing drives it.`,
      );
    for (const signal of word)
      if (ABSENT_SIGNALS[stack].includes(signal))
        add(t, `T${t}: ${signal} has no part on the ${STACK_MODELS[stack].label} CPU.`);
  });
  if (end === -1) add(null, "never sends STEP_RESET, so the instruction never ends.");
  else if (end < words.length - 1)
    add(first + end + 1, `T${first + end + 1} never runs: it comes after STEP_RESET.`);
  return problems;
}

const stepLists = (steps: ExecuteSteps): [string, readonly ControlWord[], (0 | 1)?][] =>
  "flag" in steps
    ? [
        [`${steps.flag} 0: `, steps.clear, 0],
        [`${steps.flag} 1: `, steps.set, 1],
      ]
    : [["", steps]];

/** Everything that stops a table from running: bus conflicts, an empty bus read, no STEP_RESET. */
export function validateMicrocode(table: MicrocodeTable): MicrocodeProblem[] {
  const problems: MicrocodeProblem[] = [];
  const mnemonics = new Map<string, number>();
  const opcodes = new Set<number>();
  for (const entry of table.opcodes) {
    const add = (message: string) => problems.push({ opcode: entry.opcode, t: null, message });
    if (!Number.isInteger(entry.opcode) || entry.opcode < 0 || entry.opcode > 255)
      add(`Opcode ${entry.opcode} is not a byte.`);
    else if (entry.opcode === INT_OPCODE)
      add(`Opcode ${hex(INT_OPCODE)} is reserved for the interrupt entry.`);
    else if (opcodes.has(entry.opcode)) add(`Opcode ${hex(entry.opcode)} is defined twice.`);
    opcodes.add(entry.opcode);
    if (!MNEMONIC_PATTERN.test(entry.mnemonic))
      add(
        `“${entry.mnemonic}”: a mnemonic is 1–8 capital letters or digits, starting with a letter.`,
      );
    else if (mnemonics.has(entry.mnemonic)) add(`${entry.mnemonic} is defined twice.`);
    mnemonics.set(entry.mnemonic, entry.opcode);
    for (const [branch, words, path] of stepLists(entry.steps))
      problems.push(
        ...pathProblems(words, FETCH_STEPS.length, entry.opcode, table.stack, branch, path),
      );
  }
  problems.push(...pathProblems(table.interrupt, 0, INT_OPCODE, table.stack, "Interrupt entry "));
  return problems;
}

/** Opcodes in `program` the table does not define: the CPU halts when it reaches one. */
export function programProblems(
  program: CompiledProgram,
  table: MicrocodeTable,
): MicrocodeProblem[] {
  return program.instructions
    .filter(({ opcode }) => !microcodeEntry(table, opcode))
    .map(({ address, opcode }) => ({
      opcode,
      t: null,
      message: `Code address ${hex(address)} holds opcode ${hex(opcode)}, which the microcode table does not define: the CPU halts there.`,
    }));
}

// ---------------------------------------------------------------- exercises

/**
 * Exercise: AND with a literal. The ALU's AND line makes it output ACC AND
 * OPR; FLAGS_IN stores its carry, which is 0 for AND.
 */
export const AND_OPCODE: MicrocodeOpcode = {
  mnemonic: "AND",
  opcode: 0xd5,
  operand: "literal",
  effect: "ACC ← ACC AND operand; carry ← 0",
  steps: [["ALU_OUT", "ALU_AND", "ACC_IN", "FLAGS_IN", "STEP_RESET"]],
};

/** Exercise: jump if ACC is 0. It branches on the zero flag the way JNC branches on carry. */
export const JZ_OPCODE: MicrocodeOpcode = {
  mnemonic: "JZ",
  opcode: 0xd6,
  operand: "code address",
  effect: "if ACC = 0, PC ← address",
  steps: { flag: "zero", clear: [["STEP_RESET"]], set: [["OPR_OUT", "PC_IN", "STEP_RESET"]] },
};

/** `table` with `entries` added, or replacing the entries with the same opcode. */
export const withOpcodes = (
  table: MicrocodeTable,
  ...entries: MicrocodeOpcode[]
): MicrocodeTable => ({
  ...table,
  opcodes: [
    ...table.opcodes.filter((item) => !entries.some((entry) => entry.opcode === item.opcode)),
    ...entries,
  ],
});

/** An assembly program for the AND and JZ exercises: mask 3C down to 0C, then count down by 4. */
export const AND_JZ_PROGRAM = `; Needs AND and JZ in the microcode table.
  LDI 0x3C
  AND 0x0F   ; keep the low 4 bits: 0C
  OUT
loop:
  SUBI 4
  JZ done    ; ACC is 0: leave the loop
  OUT
  JMP loop
done:
  OUT
  HALT`;

// ---------------------------------------------------------------- assembler

const LABEL = /^[A-Za-z_]\w*$/;

function parseNumber(text: string): number | null {
  if (/^-?\d+$/.test(text)) return Number(text);
  if (/^0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(2), 16);
  if (/^\$[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(1), 16);
  return null;
}

/**
 * Assembles one instruction per line for a microcode table: `MNEMONIC operand`,
 * with an optional `label:` in front. Operands are decimal, hex (0x0C or $0C),
 * −128 to −1 for two's complement, or a label for a code address. An operand
 * of kind "unused" may be left out. `;` and `//` start a comment.
 */
export function assembleProgram(source: string, table: MicrocodeTable): CompiledProgram {
  const fail = (line: number, message: string): never => {
    throw new Error(`Line ${line}: ${message}`);
  };
  const byMnemonic = new Map(table.opcodes.map((entry) => [entry.mnemonic, entry]));
  const labels = new Map<string, number>();
  const pending: { line: number; text: string; entry: MicrocodeOpcode; operand: string | null }[] =
    [];
  source.split("\n").forEach((raw, index) => {
    const line = index + 1;
    let text = raw.replace(/(;|\/\/).*$/, "").trim();
    const label = /^([A-Za-z_]\w*)\s*:\s*(.*)$/.exec(text);
    if (label) {
      if (labels.has(label[1])) fail(line, `Label “${label[1]}” is already defined.`);
      labels.set(label[1], pending.length * 2);
      text = label[2];
    }
    if (!text) return;
    const [word, operand, ...rest] = text.split(/[\s,]+/);
    if (rest.length) fail(line, "An instruction takes at most one operand.");
    const entry = byMnemonic.get(word.toUpperCase());
    if (!entry)
      fail(
        line,
        `Unknown instruction “${word}”. This table has ${table.opcodes.map((item) => item.mnemonic).join(", ")}.`,
      );
    if (operand === undefined && entry!.operand !== "unused")
      fail(line, `${entry!.mnemonic} needs an operand (${entry!.operand}).`);
    if (pending.length >= 128) fail(line, "Program exceeds 256 code bytes.");
    pending.push({ line, text, entry: entry!, operand: operand ?? null });
  });
  const instructions: Instruction[] = pending.map(({ line, text, entry, operand }, index) => {
    let value = 0;
    if (operand !== null) {
      const number = parseNumber(operand);
      if (number !== null) {
        if (number < -128 || number > 255) fail(line, "Operands are bytes: −128 to 255.");
        value = number & 255;
      } else if (LABEL.test(operand)) {
        const address = labels.get(operand);
        if (address === undefined) fail(line, `Unknown label “${operand}”.`);
        value = address!;
      } else fail(line, `“${operand}” is not a number or a label.`);
    }
    return { address: index * 2, opcode: entry.opcode, operand: value, label: text, line };
  });
  return {
    instructions,
    bytes: instructions.flatMap(({ opcode, operand }) => [opcode, operand]),
    variables: [],
    stack: table.stack,
  };
}

// ---------------------------------------------------------------- JSON

/** A table as JSON, for sharing; `parseMicrocodeJson` reads it back. */
export const microcodeJson = (table: MicrocodeTable) => JSON.stringify(table, null, 1);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readWords(value: unknown, where: string): ControlWord[] {
  if (!Array.isArray(value)) throw new Error(`${where}: expected a list of control words.`);
  return value.map((word, t) => {
    if (!Array.isArray(word)) throw new Error(`${where}, step ${t}: expected a list of signals.`);
    for (const signal of word)
      if (!SIGNALS.includes(signal as Signal))
        throw new Error(`${where}, step ${t}: unknown control line “${String(signal)}”.`);
    return [...new Set(word as Signal[])];
  });
}

/**
 * Reads a shared table. Throws when the JSON does not have a table's shape;
 * a table that has the shape but cannot run comes back, and
 * `validateMicrocode` lists its problems.
 */
export function parseMicrocodeJson(text: string): MicrocodeTable {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Not valid JSON.");
  }
  if (!isObject(data)) throw new Error("Expected a JSON object with stack, opcodes and interrupt.");
  if (typeof data.stack !== "string" || !Object.hasOwn(STACK_MODELS, data.stack))
    throw new Error(`stack must be one of ${Object.keys(STACK_MODELS).join(", ")}.`);
  if (!Array.isArray(data.opcodes)) throw new Error("opcodes must be a list.");
  const opcodes = data.opcodes.map((item, index): MicrocodeOpcode => {
    const where = `opcodes[${index}]`;
    if (!isObject(item)) throw new Error(`${where}: expected an object.`);
    const { mnemonic, opcode, operand, effect, steps } = item;
    if (typeof mnemonic !== "string") throw new Error(`${where}: mnemonic must be text.`);
    if (typeof opcode !== "number") throw new Error(`${where}: opcode must be a number.`);
    if (!OPERAND_KINDS.includes(operand as OperandKind))
      throw new Error(`${where}: operand must be one of ${OPERAND_KINDS.join(", ")}.`);
    if (effect !== undefined && typeof effect !== "string")
      throw new Error(`${where}: effect must be text.`);
    let parsed: ExecuteSteps;
    if (isObject(steps)) {
      if (steps.flag !== "carry" && steps.flag !== "zero")
        throw new Error(`${where}: a branch's flag must be carry or zero.`);
      parsed = {
        flag: steps.flag,
        clear: readWords(steps.clear, `${where} ${steps.flag} 0`),
        set: readWords(steps.set, `${where} ${steps.flag} 1`),
      };
    } else parsed = readWords(steps, where);
    return {
      mnemonic,
      opcode,
      operand: operand as OperandKind,
      effect: (effect as string | undefined) ?? "",
      steps: parsed,
    };
  });
  return {
    stack: data.stack as StackModel,
    opcodes,
    interrupt: readWords(data.interrupt, "interrupt"),
  };
}
