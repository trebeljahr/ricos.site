// The if-chain interpreter that traceProgram used before it was derived from
// the microcode ticks. Tests only: it is the reference the tick trace must match.
import {
  type CompiledProgram,
  describeOperand,
  hex,
  ISA,
  OPCODES,
  type Snapshot,
} from "./computerStepper";

export function legacyTraceProgram(program: CompiledProgram): Snapshot[] {
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
        explanation: `No instruction at code address ${hex(address)}. Execution stopped.`,
      });
      break;
    }
    const { opcode, operand, label } = instruction;
    const mnemonic = ISA.find((item) => item.opcode === opcode)?.mnemonic ?? hex(opcode);
    const meaning = describeOperand(opcode, operand, program.variables).long;
    record({
      phase: "fetch",
      ir: opcode,
      operand: null,
      activeAddress: address,
      touchedAddress: null,
      explanation: `PC points to code address ${hex(address)}. Fetch opcode ${hex(opcode)} into the instruction register.`,
    });
    record({
      phase: "decode",
      operand,
      activeAddress: address + 1,
      explanation: `Decode ${hex(opcode)} as ${mnemonic} (${label}); the next byte, ${hex(operand)}, is its operand: ${meaning}.`,
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
          ? `Load the number ${operand} itself into ACC.`
          : `Go to ${meaning}, read the ${accumulator} stored there, and load it into ACC.`;
    } else if (opcode === OPCODES.STM) {
      ram = [...ram];
      ram[operand] = accumulator;
      touchedAddress = operand;
      effect = `Write ACC (${accumulator}) to ${meaning}.`;
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
      effect = `Jump to code address ${hex(operand)}.`;
    } else if (opcode === OPCODES.JNC) {
      if (!carry) pc = operand;
      effect = carry
        ? `Borrow is set: enter the loop body at ${hex(pc)}.`
        : `No borrow: leave the loop at ${hex(operand)}.`;
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
      effect = `Push return address ${hex(stack.at(-1)!)}; jump to function at ${hex(operand)}.`;
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
      effect = `Pop return address ${hex(pc)}; resume caller with ACC = ${accumulator}.`;
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
      explanation: `${effect} PC is now ${hex(pc)}.`,
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
