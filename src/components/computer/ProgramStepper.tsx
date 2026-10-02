import clsx from "clsx";
import { useMemo, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { compileProgram, hex, ISA, traceProgram } from "src/lib/computerStepper";
import panel from "./ByteExplorer.module.css";
import styles from "./ProgramStepper.module.css";

const EXAMPLE = "let x = 2;\nx = x + 3;\nprint(x);";
const OVERFLOW = "let x = 255;\nx = x + 1;\nprint(x);";
const BIT_WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1];

export function ProgramStepper() {
  const [source, setSource] = useState(EXAMPLE);
  const [loaded, setLoaded] = useState(EXAMPLE);
  const [step, setStep] = useState(0);
  const { soundEnabled, toggleSound, playButton, playSwitch } = usePanelSound();
  const compilation = useMemo(() => {
    try {
      return { program: compileProgram(loaded), error: null };
    } catch (error) {
      return { program: null, error: (error as Error).message };
    }
  }, [loaded]);
  const trace = useMemo(
    () => (compilation.program ? traceProgram(compilation.program) : []),
    [compilation.program],
  );
  const state = trace[Math.min(step, trace.length - 1)];
  const active =
    state?.activeAddress === null || state?.activeAddress === undefined
      ? null
      : (compilation.program?.instructions[Math.floor(state.activeAddress / 2)] ?? null);
  const changed = source !== loaded;

  function compile() {
    setLoaded(source);
    setStep(0);
    playSwitch();
  }

  function preset(value: string) {
    setSource(value);
    setLoaded(value);
    setStep(0);
    playButton();
  }

  function moveStep(next: number) {
    setStep(next);
    playButton();
  }

  return (
    <section
      className={`not-prose ${panel.machine} ${styles.machine}`}
      aria-label="Program execution instrument"
    >
      <div className={panel.screw} aria-hidden="true" />
      <div className={`${panel.screw} ${panel.screwRight}`} aria-hidden="true" />
      <div className={panel.nameplate}>
        <div>
          <strong>PROGRAM EXECUTION UNIT</strong>
          <span className={styles.model}>8-BIT · MODEL 01</span>
        </div>
        <button
          type="button"
          className={panel.soundButton}
          onClick={toggleSound}
          aria-pressed={soundEnabled}
          aria-label={`Sound ${soundEnabled ? "on" : "off"}. Toggle sound.`}
        >
          <i aria-hidden="true" /> SOUND {soundEnabled ? "ON" : "OFF"}
        </button>
      </div>

      <div className={styles.workbench}>
        <div className={styles.inputSide}>
          <div className={panel.sectionHead}>
            <span>01 / SOURCE CODE</span>
            <span>C-LIKE · TOY LANGUAGE</span>
          </div>
          <label className={styles.label} htmlFor="program-source">
            WRITE A PROGRAM
          </label>
          <textarea
            id="program-source"
            spellCheck={false}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className={styles.sourceScreen}
            aria-describedby="program-syntax"
          />
          <div className={styles.sourceLines}>
            {loaded.split("\n").map((line, index) => (
              <span
                key={`${index}:${line}`}
                className={clsx(
                  styles.sourceLine,
                  active?.line === index + 1 && styles.activeSource,
                )}
              >
                <b>{String(index + 1).padStart(2, "0")}</b> {line.trim() || "·"}
              </span>
            ))}
          </div>
          <div className={styles.controls}>
            <button type="button" onClick={compile} className={styles.primaryButton}>
              COMPILE + RESET
            </button>
            <button type="button" onClick={() => preset(EXAMPLE)} className={styles.button}>
              2 + 3
            </button>
            <button type="button" onClick={() => preset(OVERFLOW)} className={styles.button}>
              OVERFLOW
            </button>
          </div>
          <p id="program-syntax" className={styles.hint}>
            {changed ? <strong>EDIT NOT COMPILED · </strong> : null}
            Use let, assignment, +, − and print(). One statement per line.
          </p>
          {compilation.error && (
            <p role="alert" className={styles.error}>
              {compilation.error}
            </p>
          )}

          {compilation.program && (
            <div className={styles.instructions}>
              <div className={panel.sectionHead}>
                <span>02 / INSTRUCTION TAPE</span>
                <span>{compilation.program.bytes.length} BYTES</span>
              </div>
              <div className={styles.columnLabels} aria-hidden="true">
                <span>ADDR</span>
                <span>BYTES</span>
                <span>DECODED</span>
                <span>LINE</span>
              </div>
              <ol className={styles.instructionList} aria-label="Compiled instructions">
                {compilation.program.instructions.map((instruction) => (
                  <li
                    key={instruction.address}
                    className={clsx(
                      styles.instruction,
                      active?.address === instruction.address && styles.activeInstruction,
                    )}
                  >
                    <span>{hex(instruction.address)}</span>
                    <strong>
                      {hex(instruction.opcode)} {hex(instruction.operand)}
                    </strong>
                    <span className={styles.mnemonic}>{instruction.label}</span>
                    <span>{instruction.line ? `L${instruction.line}` : "GEN"}</span>
                  </li>
                ))}
              </ol>
              <p className={styles.hint}>
                Two bytes per instruction: opcode, then operand. GEN is the compiler-added halt.
              </p>
              <details className={styles.isaDetails}>
                <summary>INSTRUCTION SET / VIEW KEY</summary>
                <div className={styles.isaList}>
                  {ISA.map((item) => (
                    <div key={item.opcode}>
                      <b>{hex(item.opcode)}</b>
                      <b>{item.mnemonic}</b>
                      <span>{item.effect}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        <div className={styles.outputSide}>
          <div className={panel.sectionHead}>
            <span>03 / CPU CLOCK</span>
            <span>{state?.halted ? "HALTED" : (state?.phase.toUpperCase() ?? "READY")}</span>
          </div>
          {state && (
            <>
              <div className={styles.transport}>
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={() => moveStep(step - 1)}
                  className={styles.button}
                >
                  ← BACK
                </button>
                <button
                  type="button"
                  disabled={step >= trace.length - 1}
                  onClick={() => moveStep(step + 1)}
                  className={styles.primaryButton}
                >
                  NEXT PHASE →
                </button>
                <button type="button" onClick={() => moveStep(0)} className={styles.button}>
                  RESET
                </button>
                <span className={styles.stepCount}>
                  {String(step).padStart(2, "0")} / {String(trace.length - 1).padStart(2, "0")}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={trace.length - 1}
                value={step}
                onChange={(event) => setStep(Number(event.target.value))}
                className={styles.timeline}
                aria-label="Execution phase"
              />
              <div className={styles.phaseScreen}>
                <span>
                  {state.phase.toUpperCase()} ·{" "}
                  {active ? (active.line ? `SOURCE LINE ${active.line}` : "GENERATED") : "READY"}
                </span>
                <p aria-live="polite">{state.explanation}</p>
              </div>
              <div className={styles.registers}>
                {[
                  ["PC", hex(state.pc)],
                  ["IR", state.ir === null ? "—" : hex(state.ir)],
                  ["OPERAND", state.operand === null ? "—" : hex(state.operand)],
                  ["ACC", `${state.accumulator} / ${hex(state.accumulator)}`],
                ].map(([label, value]) => (
                  <div key={label} className={styles.register}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className={styles.lowerReadouts}>
                <div>
                  <div className={panel.sectionHead}>
                    <span>DATA MEMORY / RAM</span>
                  </div>
                  <div className={styles.ramList}>
                    {compilation.program?.variables.map(({ name, address }) => (
                      <div
                        key={address}
                        className={clsx(
                          styles.ramRow,
                          state.touchedAddress === address && styles.activeRam,
                        )}
                      >
                        <span>
                          [{hex(address)}] {name}
                        </span>
                        <strong>{state.ram[address]}</strong>
                      </div>
                    ))}
                    {compilation.program?.variables.length === 0 && (
                      <span className={styles.empty}>NO VARIABLES</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className={panel.sectionHead}>
                    <span>OUTPUT DEVICE</span>
                  </div>
                  <div className={styles.outputScreen}>{state.output.join(" ") || "—"}</div>
                  <div className={styles.flags}>
                    ZERO {Number(state.zero)} <span>·</span> CARRY {Number(state.carry)}
                  </div>
                </div>
              </div>
              <div className={styles.bitSection}>
                <div className={panel.sectionHead}>
                  <span>ACCUMULATOR / EIGHT BITS</span>
                </div>
                <div className={styles.bitBank}>
                  {BIT_WEIGHTS.map((weight) => (
                    <div key={weight} className={styles.bitUnit}>
                      <span>{weight}</span>
                      <b className={clsx(styles.bit, state.accumulator & weight && styles.bitOn)}>
                        {state.accumulator & weight ? "1" : "0"}
                      </b>
                    </div>
                  ))}
                </div>
                <p className={styles.hint}>
                  Bits stand for voltage ranges held in a register. Current paths depend on the
                  circuit.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
