import { useState } from "react";
import { hex, traceProgram, ISA, OPCODES, encodeInstruction, decodeInstruction, type CompiledProgram } from "../../lib/computerStepper";
import styles from "./InstructionEncoder.module.css";

type Operation = "LDI" | "ADDI" | "SUBI" | "OUT" | "HALT";

const TITLES: Record<Operation, string> = {
  LDI: "Load a number", ADDI: "Add a number", SUBI: "Subtract a number",
  OUT: "Send output", HALT: "Stop",
};

function byteBits(value: number) {
  return value.toString(2).padStart(8, "0");
}

export function InstructionEncoder() {
  const [operation, setOperation] = useState<Operation>("ADDI");
  const [operand, setOperand] = useState(3);
  const [phase, setPhase] = useState(0);
  const available = ISA.filter((item): item is Extract<(typeof ISA)[number], { mnemonic: Operation }> =>
    ["LDI", "ADDI", "SUBI", "OUT", "HALT"].includes(item.mnemonic),
  );
  const selected = available.find((item) => item.mnemonic === operation)!;
  const effectiveOperand = selected.operand === "unused" ? 0 : operand;
  const encoded = encodeInstruction(selected.opcode, effectiveOperand);
  const decoded = decodeInstruction(encoded);
  const program: CompiledProgram = {
    instructions: [
      { address: 0, opcode: OPCODES.LDI, operand: 2, label: "LOAD 2", line: 1 },
      { address: 2, opcode: selected.opcode, operand: effectiveOperand, label: `${operation} ${effectiveOperand}`, line: 2 },
      { address: 4, opcode: OPCODES.HALT, operand: 0, label: "HALT", line: 3 },
    ],
    bytes: [OPCODES.LDI, 2, ...encoded, OPCODES.HALT, 0],
    variables: [],
  };
  const trace = traceProgram(program);
  const snapshot = trace[phase + 4];

  return (
    <div className={styles.machine}>
      <div className={styles.screw} aria-hidden="true" />
      <div className={`${styles.screw} ${styles.screwRight}`} aria-hidden="true" />
      <div className={styles.nameplate}><strong>INSTRUCTION ENCODER</strong><span>TOY CPU · 8 BIT / 2 BYTE FORMAT</span></div>
      <div className={styles.body}>
        <section className={styles.control} aria-labelledby="encoder-controls">
          <h2 id="encoder-controls" className={styles.sectionHead}>01 / WRITE AN INSTRUCTION</h2>
          <p className={styles.hint}>The CPU first loads 2 into ACC. Choose what it does next.</p>
          <div className={styles.inputRow}>
            <label>Action
              <select value={operation} onChange={(event) => { setOperation(event.target.value as Operation); setPhase(0); }}>
                {available.map((item) => <option key={item.mnemonic} value={item.mnemonic}>{item.mnemonic} · {TITLES[item.mnemonic]}</option>)}
              </select>
            </label>
            <label>Operand
              <input type="number" min={0} max={255} disabled={selected.operand === "unused"} value={effectiveOperand} onChange={(event) => { setOperand(Math.max(0, Math.min(255, Number(event.target.value) || 0))); setPhase(0); }} />
            </label>
          </div>
          <p className={styles.assembly}>{operation} <b>{selected.operand === "unused" ? "—" : effectiveOperand}</b></p>
          <p className={styles.hint}>{decoded?.effect}. {selected.operand === "unused" ? "Its second byte is fixed at 00." : "The operand occupies the second byte."}</p>
        </section>
        <section className={styles.encoding} aria-labelledby="encoder-bytes">
          <h2 id="encoder-bytes" className={styles.sectionHead}>02 / ENCODE AS BYTES</h2>
          <div className={styles.bytePair}>
            <div><span>ADDRESS 02 · OPCODE</span><strong>{byteBits(selected.opcode)}</strong><small>0x{hex(selected.opcode)}</small></div>
            <div><span>ADDRESS 03 · OPERAND</span><strong>{byteBits(effectiveOperand)}</strong><small>0x{hex(effectiveOperand)}</small></div>
          </div>
          <p className={styles.hint}>Those two bytes sit in program memory. An assembler would make them before the CPU runs.</p>
        </section>
        <section className={styles.cpu} aria-labelledby="encoder-cpu">
          <h2 id="encoder-cpu" className={styles.sectionHead}>03 / CPU READS THEM</h2>
          <div className={styles.steps} role="group" aria-label="Execution phase">
            {["Fetch", "Decode", "Execute"].map((label, index) => <button key={label} type="button" className={phase === index ? styles.activeStep : ""} onClick={() => setPhase(index)} aria-pressed={phase === index}>{index + 1} {label}</button>)}
          </div>
          <div className={styles.readouts}>
            <div><span>PC</span><strong>{snapshot.pc.toString().padStart(2, "0")}</strong></div>
            <div><span>IR</span><strong>{snapshot.ir === null ? "—" : hex(snapshot.ir)}</strong></div>
            <div><span>ACC</span><strong>{snapshot.accumulator}</strong></div>
            <div><span>OUTPUT</span><strong>{snapshot.output.at(-1) ?? "—"}</strong></div>
          </div>
          <p className={styles.flags}>ZERO {snapshot.zero ? "ON" : "OFF"} · CARRY {snapshot.carry ? "ON" : "OFF"}{snapshot.halted ? " · HALTED" : ""}</p>
          <p className={styles.explanation} aria-live="polite">{snapshot.explanation}</p>
          <p className={styles.hint}>The decoder is in the CPU. It interprets the opcode according to this toy machine&apos;s instruction set.</p>
        </section>
      </div>
    </div>
  );
}
