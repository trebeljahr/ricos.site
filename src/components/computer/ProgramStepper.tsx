import clsx from "clsx";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  AND_JZ_PROGRAM,
  AND_OPCODE,
  assembleProgram,
  JZ_OPCODE,
  type MicrocodeProblem,
  parseMicrocodeJson,
  programProblems,
  validateMicrocode,
  withOpcodes,
} from "src/lib/computer/microcodeTable";
import {
  byteBits,
  type CompiledProgram,
  compileProgram,
  defaultMicrocode,
  describeOperand,
  hex,
  INTERRUPT_SAMPLES,
  INTERRUPT_VECTOR,
  type IsaEntry,
  isScreenAddress,
  KEY_HANDLER,
  type KeySchedule,
  type MicrocodeTable,
  microcodeIsa,
  RAM_STACK_SAMPLES,
  SAMPLE_PROGRAMS,
  type Snapshot,
  STACK_MODELS,
  type StackModel,
  traceProgram,
} from "src/lib/computerStepper";
import panel from "./ByteExplorer.module.css";
import { MicrocodeEditor } from "./MicrocodeEditor";
import styles from "./ProgramStepper.module.css";
import { ScreenGrid } from "./ScreenGrid";

const { EXAMPLE, OVERFLOW, LOOP, FUNCTION, SMILEY, CROSS } = SAMPLE_PROGRAMS;
const { RECURSION } = RAM_STACK_SAMPLES;
const { KEYBOARD } = INTERRUPT_SAMPLES;
/** A key press as the key port sees it: one byte, the character code. */
const keyLabel = (code: number) =>
  code >= 33 && code < 127 ? `“${String.fromCharCode(code)}” (${code})` : String(code);
const BIT_WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1];

/** How the program is written: the source language (default ISA) or assembly for the table. */
export type Language = "source" | "assembly";

type Tables = Record<StackModel, MicrocodeTable>;
const DEFAULT_TABLES: Tables = {
  hardware: defaultMicrocode("hardware"),
  ram: defaultMicrocode("ram"),
};
/** Edited microcode tables, per CPU, in this browser only. */
const TABLES_KEY = "computer.microcode.v1";

function loadTables(): Tables {
  const tables = { ...DEFAULT_TABLES };
  try {
    const saved = JSON.parse(localStorage.getItem(TABLES_KEY) ?? "{}");
    for (const stack of Object.keys(STACK_MODELS) as StackModel[]) {
      if (!saved?.[stack]) continue;
      const table = parseMicrocodeJson(JSON.stringify(saved[stack]));
      if (table.stack === stack) tables[stack] = table;
    }
  } catch {
    // Storage blocked or a bad saved table: keep the defaults.
  }
  return tables;
}

function saveTables(tables: Tables) {
  try {
    const edited = Object.fromEntries(
      Object.entries(tables).filter(
        ([stack, table]) => table !== DEFAULT_TABLES[stack as StackModel],
      ),
    );
    if (Object.keys(edited).length) localStorage.setItem(TABLES_KEY, JSON.stringify(edited));
    else localStorage.removeItem(TABLES_KEY);
  } catch {
    // Storage blocked: the edit still works until the page reloads.
  }
}
/** Whether the program has a key handler: the compiler then puts a jump at the interrupt vector. */
const hasHandler = (program: CompiledProgram | null) =>
  Boolean(program?.instructions.some(({ label }) => label === "INTERRUPT VECTOR"));

export function ProgramStepper() {
  const [source, setSource] = useState<string>(EXAMPLE);
  const [loaded, setLoaded] = useState<string>(EXAMPLE);
  const [step, setStep] = useState(0);
  const [stack, setStack] = useState<StackModel>("hardware");
  const [keys, setKeys] = useState<KeySchedule>({});
  const [language, setLanguage] = useState<Language>("source");
  const [tables, setTables] = useState<Tables>(DEFAULT_TABLES);
  const [editing, setEditing] = useState(false);
  const inRam = stack === "ram";
  const table = tables[stack];
  const isa = microcodeIsa(table);
  const { soundEnabled, toggleSound, playButton, playSwitch } = usePanelSound();
  useEffect(() => {
    const saved = loadTables();
    setTables(saved);
    if (saved.hardware !== DEFAULT_TABLES.hardware || saved.ram !== DEFAULT_TABLES.ram)
      setEditing(true);
  }, []);
  const compilation = useMemo(
    () => (language === "assembly" ? assembleSource(loaded, table) : compileSource(loaded, stack)),
    [loaded, stack, language, table],
  );
  const problems: MicrocodeProblem[] = useMemo(
    () => [
      ...validateMicrocode(table),
      ...(compilation.program ? programProblems(compilation.program, table) : []),
    ],
    [table, compilation.program],
  );
  const run = useMemo((): { trace: Snapshot[]; error: string | null } => {
    if (!compilation.program || problems.length) return { trace: [], error: null };
    try {
      return { trace: traceProgram(compilation.program, keys, table), error: null };
    } catch (error) {
      return { trace: [], error: (error as Error).message };
    }
  }, [compilation.program, keys, table, problems.length]);
  const trace = run.trace;
  const state = trace[Math.min(step, trace.length - 1)];
  const active =
    state?.activeAddress === null || state?.activeAddress === undefined
      ? null
      : (compilation.program?.instructions[Math.floor(state.activeAddress / 2)] ?? null);
  const changed = source !== loaded;
  const variables = compilation.program?.variables ?? [];
  const usesScreen = Boolean(
    compilation.program?.instructions.some(
      ({ opcode, operand }) =>
        isa.some((item) => item.opcode === opcode && item.operand === "RAM address") &&
        isScreenAddress(operand),
    ),
  );
  const setBitWeights = state
    ? BIT_WEIGHTS.filter((weight) => (state.accumulator & weight) !== 0)
    : [];
  const decodedOpcode =
    state?.ir === null || state?.ir === undefined
      ? null
      : (isa.find(({ opcode }) => opcode === state.ir) ?? null);
  const usesKeys =
    hasHandler(compilation.program) ||
    Boolean(
      compilation.program?.instructions.some(({ opcode }) =>
        isa.some((item) => item.opcode === opcode && ["IN", "EI"].includes(item.mnemonic)),
      ),
    );
  // The interrupt path, stage by stage, for this snapshot.
  const entering = state?.phase === "interrupt";
  const path = state
    ? {
        key: state.keyPress !== null || state.keyReady,
        irq: entering || (state.keyReady && state.interruptsOn),
        push: entering && state.pc !== INTERRUPT_VECTOR,
        handler: entering && state.pc === INTERRUPT_VECTOR,
      }
    : null;
  const operandMeaning =
    state?.ir === null || state?.ir === undefined || state.operand === null
      ? null
      : describeOperand(state.ir, state.operand, variables, isa);

  function compile() {
    setLoaded(source);
    setKeys({});
    setStep(0);
    playSwitch();
  }

  function preset(value: string, model: StackModel = stack, as: Language = "source") {
    setLanguage(as);
    setStack(model);
    setSource(value);
    setLoaded(value);
    setKeys({});
    setStep(0);
    playButton();
  }

  function chooseStack(model: StackModel) {
    setStack(model);
    setKeys({});
    setStep(0);
    playSwitch();
  }

  function changeTable(next: MicrocodeTable) {
    const updated = { ...tables, [next.stack]: next };
    setTables(updated);
    saveTables(updated);
    setKeys({});
    setStep(0);
  }

  /** The AND + JZ exercise: add both opcodes to this CPU's table and run a program that uses them. */
  function exercise() {
    changeTable(withOpcodes(table, AND_OPCODE, JZ_OPCODE));
    preset(AND_JZ_PROGRAM, stack, "assembly");
  }

  function chooseLanguage(next: Language) {
    setLanguage(next);
    setKeys({});
    setStep(0);
    playSwitch();
  }

  function moveStep(next: number) {
    setStep(next);
    playButton();
  }

  /**
   * Presses a key on the clock tick after this snapshot. Presses scheduled for
   * later ticks belonged to another run from here, so they are dropped. The
   * trace up to this snapshot stays the same, so the step index stays valid.
   */
  function pressKey(code: number) {
    if (!state || state.halted) return;
    const tick = state.tick + 1;
    setKeys((current) => ({
      ...Object.fromEntries(Object.entries(current).filter(([at]) => Number(at) < tick)),
      [tick]: code & 255,
    }));
    playSwitch();
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
        <ProgramSource
          source={source}
          onSourceChange={setSource}
          onCompile={compile}
          onPreset={preset}
          stack={stack}
          onStackChange={chooseStack}
          compilation={compilation}
          changed={changed}
          activeAddress={active?.address ?? null}
          isa={isa}
          language={language}
          onLanguageChange={chooseLanguage}
          onExercise={exercise}
        />

        <div className={styles.outputSide}>
          <div className={panel.sectionHead}>
            <span>03 / CPU CLOCK</span>
            <span>{state?.halted ? "HALTED" : (state?.phase.toUpperCase() ?? "READY")}</span>
          </div>
          {compilation.program && !state && (
            <p role="alert" className={styles.error}>
              {run.error ??
                `The CPU cannot run this: ${problems.length} microcode problem${problems.length === 1 ? "" : "s"}. Fix ${problems.length === 1 ? "it" : "them"} in the microcode table below.`}
            </p>
          )}
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
                  {entering
                    ? "NO FETCH"
                    : active
                      ? active.line
                        ? `SOURCE LINE ${active.line}`
                        : "GENERATED"
                      : "READY"}
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
              {usesKeys && path && (
                <div className={styles.keyPanel}>
                  <div className={styles.keyRow}>
                    <label className={styles.keyInput}>
                      <span>PRESS A KEY</span>
                      <input
                        type="text"
                        value=""
                        readOnly
                        disabled={state.halted}
                        placeholder="type here"
                        aria-label="Press a key on the next clock tick"
                        onKeyDown={(event) => {
                          if (event.key.length !== 1 || event.metaKey || event.ctrlKey) return;
                          event.preventDefault();
                          pressKey(event.key.charCodeAt(0));
                        }}
                      />
                    </label>
                    <span>
                      KEY <b>{keyLabel(state.key)}</b> · READY <b>{Number(state.keyReady)}</b> ·
                      INTERRUPTS <b>{state.interruptsOn ? "ON" : "OFF"}</b>
                    </span>
                  </div>
                  <ol className={styles.interruptPath} aria-label="Interrupt path">
                    {(
                      [
                        ["key", "KEY PRESS", "the key port latches the code; KEY READY goes on"],
                        ["irq", "IRQ", "KEY READY and interrupts on"],
                        ["push", "PUSH PC", "the return address goes on the stack"],
                        ["handler", `→ ${hex(INTERRUPT_VECTOR)}`, "PC jumps to the vector"],
                      ] as const
                    ).map(([stage, name, meaning]) => (
                      <li
                        key={stage}
                        className={clsx(path[stage] && styles.pathOn)}
                        aria-current={path[stage] ? "step" : undefined}
                        title={meaning}
                      >
                        {name}
                      </li>
                    ))}
                  </ol>
                  <small>
                    {state.keyPress !== null
                      ? `Key ${keyLabel(state.keyPress)} arrived during this step.`
                      : "A key you type arrives on the next clock tick. The CPU finishes its instruction first; if interrupts are on, it then pushes PC and jumps to the handler instead of fetching."}
                  </small>
                </div>
              )}
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
                    <>
                      <ScreenGrid
                        rows={state.screen}
                        label="Screen"
                        className={styles.pixelScreen}
                        written={state.screenWrite}
                      />
                      <div className={styles.flags}>
                        PIXEL X {state.pixelX} <span>·</span> Y {state.pixelY}
                      </div>
                    </>
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
      <div className={styles.controls}>
        <button
          type="button"
          aria-expanded={editing}
          onClick={() => {
            setEditing(!editing);
            playSwitch();
          }}
          className={editing ? styles.primaryButton : styles.button}
        >
          {editing ? "HIDE" : "EDIT"} MICROCODE TABLE
          {problems.length
            ? ` · ${problems.length} PROBLEM${problems.length === 1 ? "" : "S"}`
            : ""}
        </button>
      </div>
      {editing && (
        <MicrocodeEditor
          table={table}
          onChange={changeTable}
          problems={problems}
          onExercise={exercise}
        />
      )}
    </section>
  );
}

type Compilation = { program: CompiledProgram | null; error: string | null };

/** Assembles a program for a microcode table, turning an assembler error into a message. */
export function assembleSource(source: string, table: MicrocodeTable): Compilation {
  try {
    return { program: assembleProgram(source, table), error: null };
  } catch (error) {
    return { program: null, error: (error as Error).message };
  }
}

/** Compiles source for one CPU, turning a compile error into a message. */
export function compileSource(source: string, stack: StackModel = "hardware"): Compilation {
  try {
    return { program: compileProgram(source, { stack }), error: null };
  } catch (error) {
    return { program: null, error: (error as Error).message };
  }
}

type ProgramSourceProps = {
  source: string;
  onSourceChange: (value: string) => void;
  /** Compile the edited source and reset the machine. */
  onCompile: () => void;
  /** Load and compile a sample program, for the given CPU. */
  onPreset: (value: string, stack?: StackModel) => void;
  stack: StackModel;
  onStackChange: (stack: StackModel) => void;
  compilation: Compilation;
  /** The source differs from the compiled program. */
  changed: boolean;
  /** Code address of the instruction the CPU is running, if any. */
  activeAddress: number | null;
  /** The instruction set the tape decodes with; an edited microcode table's, or the CPU's. */
  isa?: readonly IsaEntry[];
  /** With `onLanguageChange`, the source can be switched to assembly for the microcode table. */
  language?: Language;
  onLanguageChange?: (language: Language) => void;
  /** Loads the AND + JZ microcode exercise. */
  onExercise?: () => void;
};

/** The CPU choice, source editor and instruction tape: write, compile, and see which line runs. */
export function ProgramSource({
  source,
  onSourceChange,
  onCompile,
  onPreset,
  stack,
  onStackChange,
  compilation,
  changed,
  activeAddress,
  isa = microcodeIsa(stack),
  language = "source",
  onLanguageChange,
  onExercise,
}: ProgramSourceProps) {
  const assembly = language === "assembly";
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const instructionListRef = useRef<HTMLOListElement>(null);
  const sourceMirrorRef = useRef<HTMLDivElement>(null);
  const sourceLines = source.split("\n");
  const inRam = stack === "ram";
  const active =
    activeAddress === null
      ? null
      : (compilation.program?.instructions.find(({ address }) => address === activeAddress) ??
        null);
  const highlightedLine = changed ? null : (hoveredLine ?? active?.line ?? null);
  const variables = compilation.program?.variables ?? [];

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
    setHoveredLine(null);
    onCompile();
  }

  function preset(value: string, model?: StackModel) {
    setHoveredLine(null);
    onPreset(value, model);
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
            onClick={() => onStackChange(model)}
            className={stack === model ? styles.primaryButton : styles.button}
          >
            {STACK_MODELS[model].label} · {STACK_MODELS[model].ramBytes}-BYTE RAM
          </button>
        ))}
      </fieldset>
      {onLanguageChange && (
        <fieldset className={styles.stackChoice}>
          <legend>LANGUAGE</legend>
          {(
            [
              ["source", "SOURCE CODE"],
              ["assembly", "ASSEMBLY"],
            ] as const
          ).map(([value, name]) => (
            <button
              key={value}
              type="button"
              aria-pressed={language === value}
              onClick={() => onLanguageChange(value)}
              className={language === value ? styles.primaryButton : styles.button}
            >
              {name}
            </button>
          ))}
        </fieldset>
      )}
      <label className={styles.label} htmlFor="program-source">
        {assembly ? "WRITE ASSEMBLY: ONE INSTRUCTION PER LINE" : "WRITE A PROGRAM"}
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
            onSourceChange(event.target.value);
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
          {assembly ? "ASSEMBLE + RESET" : "COMPILE + RESET"}
        </button>
        {onExercise && (
          <button type="button" onClick={onExercise} className={styles.button}>
            AND + JZ
          </button>
        )}
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
        <button type="button" onClick={() => preset(CROSS)} className={styles.button}>
          PLOT
        </button>
        <button
          type="button"
          onClick={() => preset(RECURSION, "ram")}
          className={styles.button}
          title="Needs the stack-in-RAM CPU; switches to it"
        >
          RECURSION
        </button>
        <button type="button" onClick={() => preset(KEYBOARD)} className={styles.button}>
          KEYBOARD
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
                  <b>
                    {isa.find(({ opcode }) => opcode === instruction.opcode)?.mnemonic ??
                      `?${hex(instruction.opcode)}`}
                  </b>{" "}
                  {describeOperand(instruction.opcode, instruction.operand, variables, isa).short}
                </span>
                <span>{instruction.line ? `L${instruction.line}` : "GEN"}</span>
              </li>
            ))}
          </ol>
          <p className={styles.hint}>
            Each instruction is two bytes: opcode, then operand. <b>#5</b> is the number 5 itself.{" "}
            <b>[00]</b> is RAM address 00, so the CPU uses the value stored there. <b>→0A</b> is a
            code address to jump to.
            {inRam && (
              <>
                {" "}
                <b>[SP+1]</b> is the byte at RAM address SP + 1, inside the current function's stack
                frame.
              </>
            )}{" "}
            {assembly
              ? "In assembly, every line is one instruction: L3 is line 3."
              : "GEN is code the compiler adds."}
            {hasHandler(compilation.program) && (
              <>
                {" "}
                <b>{KEY_HANDLER}</b> is the key handler: address {hex(INTERRUPT_VECTOR)} jumps to
                it, and it saves ACC and the carry flag before it runs your code.
              </>
            )}
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
  );
}
