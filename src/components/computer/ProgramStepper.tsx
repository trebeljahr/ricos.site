import clsx from "clsx";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  byteBits,
  compileProgram,
  describeOperand,
  hex,
  ISA,
  isaFor,
  isScreenAddress,
  RAM_STACK_SAMPLES,
  SAMPLE_PROGRAMS,
  STACK_MODELS,
  type StackModel,
  traceProgram,
} from "src/lib/computerStepper";
import panel from "./ByteExplorer.module.css";
import styles from "./ProgramStepper.module.css";
import { ScreenGrid } from "./ScreenGrid";

const { EXAMPLE, OVERFLOW, LOOP, FUNCTION, SMILEY } = SAMPLE_PROGRAMS;
const { RECURSION } = RAM_STACK_SAMPLES;
const dataOpcodes = new Set<number>(
  ISA.filter((item) => item.operand === "RAM address").map((item) => item.opcode),
);
const BIT_WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1];

export function ProgramStepper() {
  const [source, setSource] = useState<string>(EXAMPLE);
  const [loaded, setLoaded] = useState<string>(EXAMPLE);
  const [step, setStep] = useState(0);
  const [stack, setStack] = useState<StackModel>("hardware");
  const inRam = stack === "ram";
  const isa = isaFor(stack);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const instructionListRef = useRef<HTMLOListElement>(null);
  const sourceMirrorRef = useRef<HTMLDivElement>(null);
  const sourceLines = source.split("\n");
  const { soundEnabled, toggleSound, playButton, playSwitch } = usePanelSound();
  const compilation = useMemo(() => {
    try {
      return { program: compileProgram(loaded, { stack }), error: null };
    } catch (error) {
      return { program: null, error: (error as Error).message };
    }
  }, [loaded, stack]);
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
  const variables = compilation.program?.variables ?? [];
  const usesScreen = Boolean(
    compilation.program?.instructions.some(
      ({ opcode, operand }) => dataOpcodes.has(opcode) && isScreenAddress(operand),
    ),
  );
  const setBitWeights = state
    ? BIT_WEIGHTS.filter((weight) => (state.accumulator & weight) !== 0)
    : [];
  const decodedOpcode =
    state?.ir === null || state?.ir === undefined
      ? null
      : (isa.find(({ opcode }) => opcode === state.ir) ?? null);
  const operandMeaning =
    state?.ir === null || state?.ir === undefined || state.operand === null
      ? null
      : describeOperand(state.ir, state.operand, variables);

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

  function preset(value: string, model: StackModel = stack) {
    setStack(model);
    setSource(value);
    setLoaded(value);
    setStep(0);
    setHoveredLine(null);
    playButton();
  }

  function chooseStack(model: StackModel) {
    setStack(model);
    setStep(0);
    playSwitch();
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
          </div>
          <fieldset className={styles.stackChoice}>
            <legend>CPU</legend>
            {(Object.keys(STACK_MODELS) as StackModel[]).map((model) => (
              <button
                key={model}
                type="button"
                aria-pressed={stack === model}
                onClick={() => chooseStack(model)}
                className={stack === model ? styles.primaryButton : styles.button}
              >
                {STACK_MODELS[model].label} · {STACK_MODELS[model].ramBytes}-BYTE RAM
              </button>
            ))}
          </fieldset>
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
              aria-describedby={changed ? "program-syntax" : undefined}
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
            <button type="button" onClick={() => preset(SMILEY)} className={styles.button}>
              SCREEN
            </button>
            <button
              type="button"
              onClick={() => preset(RECURSION, "ram")}
              className={styles.button}
              title="Needs the stack-in-RAM CPU; switches to it"
            >
              RECURSION
            </button>
          </div>
          {changed && (
            <p id="program-syntax" className={styles.hint}>
              <strong>EDIT NOT COMPILED</strong>
            </p>
          )}
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
                    <span className={styles.mnemonic} title={instruction.label}>
                      <b>{isa.find(({ opcode }) => opcode === instruction.opcode)?.mnemonic}</b>{" "}
                      {describeOperand(instruction.opcode, instruction.operand, variables).short}
                    </span>
                    <span>{instruction.line ? `L${instruction.line}` : "GEN"}</span>
                  </li>
                ))}
              </ol>
              <p className={styles.hint}>
                Each instruction is two bytes: opcode, then operand. <b>#5</b> is the number 5
                itself. <b>[00]</b> is RAM address 00, so the CPU uses the value stored there.{" "}
                <b>→0A</b> is a code address to jump to.
                {inRam && (
                  <>
                    {" "}
                    <b>[SP+1]</b> is the byte at RAM address SP + 1, inside the current function's
                    stack frame.
                  </>
                )}{" "}
                GEN is code the compiler adds.
              </p>
              <details className={styles.isaDetails}>
                <summary>INSTRUCTION SET / VIEW KEY</summary>
                <div className={styles.isaList}>
                  {isa.map((item) => (
                    <div key={item.opcode}>
                      <b>{hex(item.opcode)}</b>
                      <b>{item.mnemonic}</b>
                      <span>{item.operand}</span>
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
                  {
                    code: "PC",
                    name: "PROGRAM COUNTER",
                    value: hex(state.pc),
                    meaning: "next code address",
                  },
                  {
                    code: "IR",
                    name: "INSTRUCTION REG.",
                    value: state.ir === null ? "—" : hex(state.ir),
                    meaning: decodedOpcode ? `opcode = ${decodedOpcode.mnemonic}` : "no opcode yet",
                  },
                  {
                    code: "OPERAND",
                    name: "SECOND BYTE",
                    value: state.operand === null ? "—" : hex(state.operand),
                    meaning: operandMeaning?.long ?? "not decoded yet",
                  },
                  {
                    code: "ACC",
                    name: "ACCUMULATOR",
                    value: String(state.accumulator),
                    meaning: `working value · hex ${hex(state.accumulator)}`,
                  },
                ].map(({ code, name, value, meaning }) => (
                  <div key={code} className={styles.register}>
                    <span>
                      <b>{code}</b>
                      {name}
                    </span>
                    <strong>{value}</strong>
                    <small>{meaning}</small>
                  </div>
                ))}
              </div>
              {inRam ? (
                <div className={styles.stackReadout}>
                  <div>
                    <span>STACK IN RAM / SP = {hex(state.sp ?? 0)} / TOP AT RIGHT</span>
                    <strong className={styles.stackBytes}>
                      {state.stack.length
                        ? state.stack
                            .map((value, index) => `[${hex(31 - index)}]${hex(value)}`)
                            .join(" ")
                        : "EMPTY"}
                    </strong>
                  </div>
                  <small>
                    SP starts at 20, just past the last RAM byte, and counts down. CALL moves SP
                    down one byte and stores the return address there; RET reads it back and moves
                    SP up. Each function then moves SP down once more to make its frame: the
                    parameter at SP+0, then each local. Every call gets a fresh frame, so a function
                    can call itself. Too many calls and the stack runs into the variables at the
                    bottom of RAM.
                  </small>
                </div>
              ) : (
                <div className={styles.stackReadout}>
                  <div>
                    <span>CALL STACK / TOP AT RIGHT</span>
                    <strong>
                      {state.stack.length
                        ? state.stack.map((address) => `→${hex(address)}`).join("  ")
                        : "EMPTY"}
                    </strong>
                  </div>
                  <small>
                    CALL pushes the code address to come back to; RET pops it. The stack holds only
                    return addresses. Variables, parameters and loop counters each get one fixed RAM
                    address, which is why a function cannot call itself. Switch the CPU to STACK IN
                    RAM to compare.
                  </small>
                </div>
              )}
              <div className={styles.lowerReadouts}>
                <div>
                  <div className={panel.sectionHead}>
                    <span>DATA MEMORY / RAM</span>
                  </div>
                  {inRam ? (
                    <div className={styles.ramGrid}>
                      {state.ram.map((value, address) => {
                        const variable = variables.find((item) => item.address === address);
                        const onStack = address >= (state.sp ?? STACK_MODELS.ram.ramBytes);
                        return (
                          <div
                            // biome-ignore lint/suspicious/noArrayIndexKey: one cell per fixed RAM address.
                            key={address}
                            title={
                              variable
                                ? `${hex(address)}: variable ${variable.name}`
                                : onStack
                                  ? `${hex(address)}: stack`
                                  : `${hex(address)}: free`
                            }
                            className={clsx(
                              styles.ramCell,
                              variable && styles.ramVariable,
                              onStack && styles.ramStack,
                              address === state.sp && styles.ramTop,
                              state.touchedAddress === address && styles.activeRam,
                            )}
                          >
                            <span>{variable ? variable.name : hex(address)}</span>
                            <strong>{value}</strong>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.ramList}>
                      <div className={clsx(styles.ramRow, styles.ramHead)} aria-hidden="true">
                        <span>ADDR</span>
                        <span>VARIABLE</span>
                        <span>VALUE</span>
                      </div>
                      {compilation.program?.variables.map(({ name, address }) => (
                        <div
                          key={address}
                          className={clsx(
                            styles.ramRow,
                            state.touchedAddress === address && styles.activeRam,
                          )}
                        >
                          <span>[{hex(address)}]</span>
                          <span>{name}</span>
                          <strong>{state.ram[address]}</strong>
                        </div>
                      ))}
                      {compilation.program?.variables.length === 0 && (
                        <span className={styles.empty}>NO VARIABLES</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <div className={panel.sectionHead}>
                    <span>OUTPUT DEVICE</span>
                  </div>
                  <div className={styles.outputScreen}>{state.output.join(" ") || "—"}</div>
                  {usesScreen && (
                    <ScreenGrid rows={state.screen} label="Screen" className={styles.pixelScreen} />
                  )}
                  <div className={styles.flags}>
                    ZERO {Number(state.zero)} <span>·</span> CARRY {Number(state.carry)}
                  </div>
                </div>
              </div>
              <div className={styles.bitSection}>
                <div className={panel.sectionHead}>
                  <span>CPU REGISTER</span>
                </div>
                <div className={styles.bitScreen}>
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
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
