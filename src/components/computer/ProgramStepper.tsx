import clsx from "clsx";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { byteBits, compileProgram, hex, ISA, OPCODES, traceProgram } from "src/lib/computerStepper";
import panel from "./ByteExplorer.module.css";
import styles from "./ProgramStepper.module.css";

const EXAMPLE = "let x = 2;\nx = x + 3;\nprint(x);";
const OVERFLOW = "let x = 255;\nx = x + 1;\nprint(x);";
const LOOP = "let sum = 0;\nfor (let i = 0; i < 4; i++) {\n  sum = sum + i;\n}\nprint(sum);";
const FUNCTION =
  "fn bump(n) {\n  return n + 1;\n}\nlet x = 2;\nfor (let i = 0; i < 3; i++) {\n  x = bump(x);\n}\nprint(x);";
const BIT_WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1];

export function ProgramStepper() {
  const [source, setSource] = useState(EXAMPLE);
  const [loaded, setLoaded] = useState(EXAMPLE);
  const [step, setStep] = useState(0);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const instructionListRef = useRef<HTMLOListElement>(null);
  const sourceMirrorRef = useRef<HTMLDivElement>(null);
  const sourceLines = source.split("\n");
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
  const highlightedLine = changed ? null : (hoveredLine ?? active?.line ?? null);
  const hasCalls = compilation.program?.instructions.some(({ opcode }) => opcode === OPCODES.CALL);
  const setBitWeights = state
    ? BIT_WEIGHTS.filter((weight) => (state.accumulator & weight) !== 0)
    : [];

  useEffect(() => {
    if (active?.address === undefined) return;
    const list = instructionListRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-address="${active.address}"]`);
    if (!list || !row) return;
    const top = row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = Math.max(0, top - list.clientHeight / 3);
    }
  }, [active?.address]);

  function compile() {
    setLoaded(source);
    setStep(0);
    setHoveredLine(null);
    playSwitch();
  }

  function preset(value: string) {
    setSource(value);
    setLoaded(value);
    setStep(0);
    setHoveredLine(null);
    playButton();
  }

  function moveStep(next: number) {
    setStep(next);
    playButton();
  }

  function hoverEditorLine(event: MouseEvent<HTMLTextAreaElement>) {
    if (changed) return;
    const editor = event.currentTarget;
    const style = window.getComputedStyle(editor);
    const y =
      event.clientY -
      editor.getBoundingClientRect().top -
      Number.parseFloat(style.borderTopWidth) -
      Number.parseFloat(style.paddingTop) +
      editor.scrollTop;
    const line = Math.floor(y / Number.parseFloat(style.lineHeight)) + 1;
    setHoveredLine(line >= 1 && line <= sourceLines.length ? line : null);
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
          <div className={styles.sourceFrame}>
            <div ref={sourceMirrorRef} className={styles.sourceMirror} aria-hidden="true">
              {sourceLines.map((_, index) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: mirror rows have no state and represent line positions.
                  key={index}
                  className={clsx(
                    styles.sourceMirrorLine,
                    highlightedLine === index + 1 && styles.highlightedSourceLine,
                  )}
                >
                  &nbsp;
                </span>
              ))}
            </div>
            <textarea
              id="program-source"
              spellCheck={false}
              wrap="off"
              value={source}
              rows={Math.max(4, Math.min(12, sourceLines.length))}
              onChange={(event) => {
                setSource(event.target.value);
                setHoveredLine(null);
              }}
              onMouseMove={hoverEditorLine}
              onMouseLeave={() => setHoveredLine(null)}
              onScroll={(event) => {
                if (sourceMirrorRef.current) {
                  sourceMirrorRef.current.scrollTop = event.currentTarget.scrollTop;
                }
              }}
              className={styles.sourceScreen}
              aria-describedby="program-syntax"
            />
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
            <button type="button" onClick={() => preset(LOOP)} className={styles.button}>
              FOR LOOP
            </button>
            <button type="button" onClick={() => preset(FUNCTION)} className={styles.button}>
              FUNCTION
            </button>
          </div>
          <p id="program-syntax" className={styles.hint}>
            {changed ? <strong>EDIT NOT COMPILED · </strong> : null}
            Hover source to trace its bytes. Use let, +, −, print(), for loops, and fn/return. One
            statement per line; one function argument at most. No recursion.
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
                <span>HEX</span>
                <span>BINARY / TWO BYTES</span>
                <span>DECODED</span>
                <span>LINE</span>
              </div>
              <ol
                ref={instructionListRef}
                className={styles.instructionList}
                aria-label="Compiled instructions"
              >
                {compilation.program.instructions.map((instruction) => (
                  <li
                    key={instruction.address}
                    data-address={instruction.address}
                    className={clsx(
                      styles.instruction,
                      active?.address === instruction.address && styles.activeInstruction,
                      highlightedLine !== null &&
                        highlightedLine > 0 &&
                        instruction.line === highlightedLine &&
                        styles.mappedInstruction,
                    )}
                  >
                    <span>{hex(instruction.address)}</span>
                    <strong>
                      {hex(instruction.opcode)} {hex(instruction.operand)}
                    </strong>
                    <span className={styles.binary}>
                      {byteBits(instruction.opcode)} {byteBits(instruction.operand)}
                    </span>
                    <span className={styles.mnemonic}>{instruction.label}</span>
                    <span>{instruction.line ? `L${instruction.line}` : "GEN"}</span>
                  </li>
                ))}
              </ol>
              <p className={styles.hint}>
                Each instruction is two bytes: opcode, then operand. Hover a line in the editor to
                see its instructions. GEN is the compiler-added halt.
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
              {hasCalls && (
                <div className={styles.stackReadout}>
                  <span>RETURN STACK / TOP AT RIGHT</span>
                  <strong>{state.stack.length ? state.stack.map(hex).join(" → ") : "EMPTY"}</strong>
                </div>
              )}
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
                  <span>ACC REGISTER / BITS TO VALUE</span>
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
                <div className={styles.bitEquation}>
                  <strong>{byteBits(state.accumulator)}</strong>
                  <span>
                    = {setBitWeights.length > 0 ? `${setBitWeights.join(" + ")} = ` : ""}
                    {state.accumulator}
                  </span>
                </div>
                <p className={styles.bitExplanation}>
                  ACC is this CPU&apos;s eight-bit working register. Each box shows one stored bit:
                  a 1 adds the number above it, while a 0 adds nothing. The total is the ACC value
                  shown above.
                </p>
                <p className={styles.bitPhysical}>
                  On a real chip, circuits represent these 0s and 1s with voltage ranges. This is a
                  diagram of the stored value, not an electrical measurement.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
