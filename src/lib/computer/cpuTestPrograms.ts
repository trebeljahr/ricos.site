// Programs the CPU lockstep tests run: every sample program plus raw-byte
// programs for opcodes and branches the compiler never emits, and seeded
// random programs. Shared by the folded (cpuPreset) and gate-netlist
// (cpuNetlist) lockstep tests.
import {
  type CompiledProgram,
  compileProgram,
  INTERRUPT_SAMPLES,
  type KeySchedule,
  OPCODES,
  RAM_STACK_SAMPLES,
  SAMPLE_PROGRAMS,
  type StackModel,
  type Tick,
  traceTicks,
} from "../computerStepper";

/** A program given as raw bytes, for opcodes and branches the compiler never emits. */
export const raw = (...pairs: [number, number][]): CompiledProgram => rawFor("hardware", ...pairs);
/** Raw bytes for one CPU variant. */
export const rawFor = (stack: StackModel, ...pairs: [number, number][]): CompiledProgram => ({
  stack,
  instructions: pairs.map(([opcode, operand], i) => ({
    address: i * 2,
    opcode,
    operand,
    label: "",
    line: 0,
  })),
  bytes: pairs.flat(),
  variables: [],
});

const { LDI, LDM, STM, ADDI, ADDM, SUBI, SUBM, OUT, JMP, JNC, CALL, RET, HALT } = OPCODES;
const { LDS, STS, ADDS, SUBS, ADDSP } = OPCODES;
const { IN, EI, DI, RETI } = OPCODES;

/** EI, DI, IN and RETI with no key pressed: nothing interrupts, RETI returns like RET. */
const interruptOpcodes = (stack: StackModel) =>
  rawFor(
    stack,
    [EI, 0],
    [DI, 0],
    [IN, 0], // no key yet: reads 0
    [OUT, 0],
    [CALL, 12],
    [HALT, 0],
    [LDI, 7], // address 12
    [RETI, 0], // interrupts back on
  );

/** Seeded PRNG (mulberry32), so a failing random program can be rerun. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A random straight-line program over every non-stack opcode, with forward-only
 * JMP/JNC so it always reaches HALT. Operands are any byte, so RAM addresses
 * above 15 wrap, F0–FF reach the screen, and adds and subtracts carry and borrow.
 */
function randomProgram(seed: number, length = 40, stack: StackModel = "hardware"): CompiledProgram {
  const next = random(seed);
  const byte = () => Math.floor(next() * 256);
  const opcodes: number[] = [LDI, LDM, STM, ADDI, ADDM, SUBI, SUBM, OUT, JMP, JNC];
  // SP stays at 32, so SP + offset wraps around all 32 bytes of RAM.
  if (stack === "ram") opcodes.push(LDS, STS, ADDS, SUBS);
  const pairs: [number, number][] = [];
  for (let i = 0; i < length; i++) {
    const opcode = opcodes[Math.floor(next() * opcodes.length)];
    const forward = 2 * (i + 1 + Math.floor(next() * 4));
    pairs.push([opcode, opcode === JMP || opcode === JNC ? Math.min(forward, 2 * length) : byte()]);
  }
  pairs.push([HALT, 0]);
  return rawFor(stack, ...pairs);
}

export const PROGRAMS: Record<string, CompiledProgram> = {
  ...Object.fromEntries(
    Object.entries(SAMPLE_PROGRAMS).map(([name, source]) => [name, compileProgram(source)]),
  ),
  "every opcode": raw(
    [LDI, 200],
    [STM, 3],
    [ADDI, 100], // carry out
    [OUT, 0],
    [ADDM, 3],
    [SUBI, 250], // borrow
    [SUBM, 3],
    [LDM, 3],
    [JNC, 20], // carry clear: taken
    [HALT, 0],
    [CALL, 26], // address 20
    [OUT, 0],
    [HALT, 0],
    [SUBI, 1], // address 26
    [RET, 0],
  ),
  "JNC not taken": raw([LDI, 1], [SUBI, 2], [JNC, 10], [LDI, 7], [OUT, 0], [HALT, 0]),
  "nested CALL/RET": raw(
    [CALL, 8],
    [OUT, 0],
    [JMP, 22],
    [HALT, 0], // never reached
    [LDI, 1], // address 8
    [CALL, 16],
    [ADDI, 1],
    [RET, 0],
    [ADDI, 10], // address 16
    [CALL, 24],
    [RET, 0],
    [HALT, 0], // address 22
    [ADDI, 100], // address 24
    [RET, 0],
  ),
  "countdown loop": raw(
    [LDI, 5],
    [STM, 0],
    [LDM, 0], // address 4
    [OUT, 0],
    [SUBI, 1],
    [STM, 0],
    [JNC, 4],
    [HALT, 0],
  ),
  "unknown opcode halts": raw([LDI, 9], [0x00, 0], [OUT, 0]),
  "pixel port": raw(
    [LDI, 0xff],
    [STM, 0xf6], // a full row
    [LDI, 0x0d], // x = 5 (low 3 bits)
    [STM, 0xf8],
    [LDI, 0x0e], // y = 6
    [STM, 0xf9],
    [LDI, 0], // colour 0: pixel off
    [STM, 0xfa],
    [ADDM, 0xfb], // any port address reads the cursor's row: DF
    [OUT, 0],
    [LDI, 3],
    [STM, 0xfc], // FC repeats F8: x = 3
    [STM, 0xff], // FF repeats FA: ACC bit 0 is 1, pixel stays on
    [LDI, 2],
    [STM, 0xfa], // pixel (3, 6) off
    [LDM, 0xf6],
    [OUT, 0],
    [HALT, 0],
  ),
  "interrupt opcodes, no key": interruptOpcodes("hardware"),
  "compiled calls in a loop": compileProgram(
    "fn twice(n) {\n  return n + n;\n}\nfn add3(n) {\n  let m = twice(n);\n  return m + 3;\n}\nlet total = 0;\nfor (let i = 0; i < 5; i = i + 2) {\n  let t = add3(i);\n  total = total + t;\n  print(total);\n}\nprint(total);",
  ),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((seed) => [`random ${seed}`, randomProgram(seed)])),
};

export const ram = (source: string) => compileProgram(source, { stack: "ram" });

/** Programs for the stack-in-RAM CPU: the same samples, recursion, and every new opcode. */
export const RAM_PROGRAMS: Record<string, CompiledProgram> = {
  ...Object.fromEntries(
    Object.entries({ ...SAMPLE_PROGRAMS, ...RAM_STACK_SAMPLES }).map(([name, source]) => [
      name,
      ram(source),
    ]),
  ),
  "every stack opcode": rawFor(
    "ram",
    [LDI, 200],
    [ADDSP, 256 - 3], // SP 32 → 29
    [STS, 0],
    [STS, 2],
    [ADDS, 0], // carry out
    [SUBS, 2], // borrow
    [LDS, 2],
    [CALL, 22],
    [ADDSP, 3], // SP back to 32
    [OUT, 0],
    [HALT, 0],
    [SUBI, 1], // address 22
    [RET, 0],
  ),
  "recursive countdown": ram(
    "fn down(n) {\n  print(n);\n  if (0 < n) {\n    let next = n - 1;\n    down(next);\n  }\n  return;\n}\nlet start = 5;\ndown(start);",
  ),
  "nested CALL/RET": ram(
    "fn twice(n) {\n  return n + n;\n}\nfn add3(n) {\n  let m = twice(n);\n  return m + 3;\n}\nlet total = 0;\nfor (let i = 0; i < 5; i = i + 2) {\n  let t = add3(i);\n  total = total + t;\n  print(total);\n}\nprint(total);",
  ),
  "loop inside a recursive function": ram(
    "fn tri(n) {\n  let s = 0;\n  for (let i = 0; i < n; i++) {\n    s = s + 1;\n  }\n  if (1 < n) {\n    let m = n - 1;\n    let r = tri(m);\n    s = s + r;\n  }\n  return s;\n}\nprint(tri(3));",
  ),
  "hardware-only opcode halts": rawFor("ram", [LDI, 9], [0x00, 0], [OUT, 0]),
  "interrupt opcodes, no key": interruptOpcodes("ram"),
  ...Object.fromEntries(
    [1, 2, 3, 4].map((seed) => [`random ${seed}`, randomProgram(seed, 40, "ram")]),
  ),
};

/** A program and the keys pressed while it runs. */
export type KeyedProgram = { program: CompiledProgram; keys: KeySchedule };

/** The tick index of the first tick that matches, in a run without key presses. */
const tickWhere = (program: CompiledProgram, match: (tick: Tick) => boolean) =>
  traceTicks(program).find(match)!.index;

/** A key handler that counts presses and keeps the last key; main does arithmetic between JNCs. */
const COUNTER = `let count = 0;
let last = 0;
fn on_key(k) {
  last = k;
  count = count + 1;
}
let sum = 0;
for (let i = 0; i < 12; i++) {
  sum = sum + i;
  if (sum > 20) {
    sum = sum - 20;
  }
}
print(sum);
print(count);
print(last);`;

const keyed = (stack: StackModel): Record<string, KeyedProgram> => {
  const counter = compileProgram(COUNTER, { stack });
  const recursive = ram(
    "let last = 0;\nfn on_key(k) {\n  let twice = k + k;\n  last = twice;\n}\nfn sum(n) {\n  if (n > 0) {\n    let less = n - 1;\n    let rest = sum(less);\n    return rest + n;\n  }\n  return 0;\n}\nprint(sum(4));\nprint(last);",
  );
  // The first ADDM: four execute ticks, so T5 is mid-instruction.
  const midAdd = tickWhere(counter, (tick) => tick.registers.ir === ADDM && tick.t === 5);
  // A tick inside the handler: the press waits while interrupts are off.
  const inHandler = (first: number) =>
    traceTicks(counter, undefined, { [first]: 1 }).find(
      (tick) => tick.index > first && tick.registers.ir === ADDI && tick.t === 4,
    )!.index;
  const endsInstruction = tickWhere(
    counter,
    (tick) => tick.index > 40 && tick.control.includes("STEP_RESET"),
  );
  const programs: Record<string, KeyedProgram> = {
    "key arriving mid-instruction": { program: counter, keys: { [midAdd]: 65 } },
    "key on the tick an instruction ends": { program: counter, keys: { [endsInstruction]: 9 } },
    "nested press while interrupts are off": {
      program: counter,
      keys: { [midAdd]: 65, [inHandler(midAdd)]: 66 },
    },
    "two presses before the handler reads the key": {
      program: counter,
      keys: { [midAdd]: 65, [midAdd + 1]: 67 },
    },
    "DI holds a key until EI": {
      program: rawFor(
        stack,
        [JMP, 6],
        [JMP, 20], // vector (address 2)
        [HALT, 0],
        [DI, 0], // address 6
        [LDI, 1],
        [ADDI, 2],
        [OUT, 0], // the key arrives here, interrupts off
        [EI, 0], // interrupt right after EI
        [OUT, 0],
        [HALT, 0],
        [IN, 0], // address 20: handler
        [OUT, 0],
        [RETI, 0],
      ),
      keys: { 22: 42 },
    },
    "keyboard sample": {
      program: compileProgram(INTERRUPT_SAMPLES.KEYBOARD, { stack }),
      keys: { 30: 3, 300: 24, 700: 60 },
    },
  };
  if (stack === "ram")
    programs["key during recursion"] = {
      program: recursive,
      keys: { [tickWhere(recursive, (tick) => tick.registers.sp <= 24)]: 21 },
    };
  return programs;
};

/** Key handler programs for each CPU, run with a schedule of key presses. */
export const KEYED_PROGRAMS: Record<StackModel, Record<string, KeyedProgram>> = {
  hardware: keyed("hardware"),
  ram: keyed("ram"),
};

/** The probe values the stepper's registers should show after `tick`. */
export function expectedProbes(tick: Tick) {
  const r = tick.registers;
  return {
    PC: r.pc,
    CMAR: r.cmar,
    IR: r.ir,
    OPERAND: r.opr,
    DMAR: r.dmar,
    ACC: r.acc,
    FLAGS: (r.carry ? 1 : 0) | (r.zero ? 2 : 0),
    SP: r.sp,
    OUT: r.out,
    KEY: r.key,
    IRQ: (r.keyReady ? 1 : 0) | (r.ie ? 2 : 0) | (r.int ? 4 : 0),
  };
}
