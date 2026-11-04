import clsx from "clsx";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useDemoState } from "src/hooks/useDemoState";
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
  PLAIN_PRESETS,
  type ProgramLanguage,
  partsUsed,
  type StepperPart,
  type StepperPreset,
} from "src/lib/computer/stepperDemos";
import {
  BIG_SCREEN,
  byteBits,
  type CompiledProgram,
  compileProgram,
  defaultMicrocode,
  describeBigBlitter,
  describeBlitter,
  describeOperand,
  hex,
  INTERRUPT_VECTOR,
  type IsaEntry,
  type KeySchedule,
  type MicrocodeTable,
  microcodeIsa,
  portStep,
  type Snapshot,
  STACK_MODELS,
  type StackModel,
  traceProgram,
} from "src/lib/computerStepper";
import panel from "./ByteExplorer.module.css";
import { MicrocodeEditor } from "./MicrocodeEditor";
import styles from "./ProgramStepper.module.css";
import { ScreenGrid } from "./ScreenGrid";

/** A key press as the key port sees it: one byte, the character code. */
const keyLabel = (code: number) =>
  code >= 33 && code < 127 ? `“${String.fromCharCode(code)}” (${code})` : String(code);
const BIT_WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1];

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
type Props = {
  /**
   * The part of the CPU this demo is about. Its readout always shows; the
   * readouts of other parts show only when the loaded program uses them.
   * Without a focus, the stepper is the plain CPU.
   */
  focus?: StepperPart;
  /** The preset programs. The first one is loaded at the start. */
  presets?: readonly StepperPreset[];
};

export function ProgramStepper({ focus, presets = PLAIN_PRESETS }: Props) {
  const start = presets[0];
  const draftId = `program-stepper:${focus ?? "plain"}:${start.label}`;
  const [source, setSource] = useDemoState(`${draftId}:source`, start.source);
  const [loaded, setLoaded] = useDemoState(`${draftId}:loaded`, start.source);
  const [step, setStep] = useState(0);
  const [stack, setStack] = useDemoState<StackModel>(
    `${draftId}:stack`,
    start.stack ?? "hardware",
    (value) => value === "hardware" || value === "ram",
  );
  const [keys, setKeys] = useState<KeySchedule>({});
  const [language, setLanguage] = useDemoState<ProgramLanguage>(
    `${draftId}:language`,
    start.language ?? "source",
    (value) => value === "source" || value === "assembly",
  );
  const [tables, setTables] = useState<Tables>(DEFAULT_TABLES);
  /** The microcode editor, assembly and edited tables belong to the demo about the table. */
  const microcode = focus === "microcode";
  const [editing, setEditing] = useState(microcode);
  const inRam = stack === "ram";
  const table = tables[stack];
  const isa = microcodeIsa(table);
  useEffect(() => {
    if (microcode) setTables(loadTables());
  }, [microcode]);
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
  const used = useMemo(
    () => (compilation.program ? partsUsed(compilation.program, table.opcodes) : null),
    [compilation.program, table],
  );
  /** A part's readout shows on the demo about that part, and when the program uses the part. */
  const shows = (part: StepperPart) => part === focus || Boolean(used?.has(part));
  // An interrupt pushes PC, so the key port brings the stack readout with it.
  const showStack = inRam || shows("calls") || shows("ramStack") || shows("interrupts");
  // The pixel port and the blitter draw on the screen; the port and the big blitter on the big one.
  const showScreen = shows("screen") || shows("pixelPort") || shows("blitter");
  const showBigScreen = shows("bankWindow") || shows("vramPort") || shows("bigBlitter");
  // The CPU switch belongs to the stack-in-RAM demo and to the microcode table,
  // which is one per CPU. Elsewhere it shows once a program is on the
  // stack-in-RAM CPU, or the compiler says it needs that CPU.
  const showCpuChoice =
    focus === "ramStack" || microcode || inRam || /stack-in-RAM CPU/.test(compilation.error ?? "");
  const setBitWeights = state
    ? BIT_WEIGHTS.filter((weight) => (state.accumulator & weight) !== 0)
    : [];
  const decodedOpcode =
    state?.ir === null || state?.ir === undefined
      ? null
      : (isa.find(({ opcode }) => opcode === state.ir) ?? null);
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
  }

  function preset({ source: value, stack: model = stack, language: as = "source" }: StepperPreset) {
    setLanguage(as);
    setStack(model);
    setSource(value);
    setLoaded(value);
    setKeys({});
    setStep(0);
  }

  function chooseStack(model: StackModel) {
    setStack(model);
    setKeys({});
    setStep(0);
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
    preset({ label: "AND + JZ", source: AND_JZ_PROGRAM, language: "assembly" });
  }

  function chooseLanguage(next: ProgramLanguage) {
    setLanguage(next);
    setKeys({});
    setStep(0);
  }

  function moveStep(next: number) {
    setStep(next);
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
      </div>

      <div className={styles.workbench}>
        <ProgramSource
          source={source}
          onSourceChange={setSource}
          onCompile={compile}
          onPreset={preset}
          presets={presets}
          stack={stack}
          onStackChange={showCpuChoice ? chooseStack : undefined}
          compilation={compilation}
          changed={changed}
          activeAddress={active?.address ?? null}
          isa={isa}
          language={language}
          onLanguageChange={microcode ? chooseLanguage : undefined}
          onExercise={microcode ? exercise : undefined}
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
              {shows("interrupts") && path && (
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
                  {state.keyPress !== null && (
                    <small>{`Key ${keyLabel(state.keyPress)} arrived during this step.`}</small>
                  )}
                </div>
              )}
              {showStack &&
                (inRam ? (
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
                  </div>
                ))}
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
                  {showScreen && (
                    <>
                      <ScreenGrid
                        rows={state.screen}
                        label="Screen"
                        className={styles.pixelScreen}
                        written={state.screenWrite}
                      />
                      {shows("pixelPort") && (
                        <div className={styles.flags} role="status" aria-label="Pixel cursor">
                          PIXEL X {state.pixelX} <span>·</span> Y {state.pixelY}
                        </div>
                      )}
                      {shows("blitter") && (
                        <div className={styles.flags} role="status" aria-label="Blitter">
                          BLITTER <span>·</span> {describeBlitter(state.blitter)}
                        </div>
                      )}
                    </>
                  )}
                  {showBigScreen && (
                    <>
                      <ScreenGrid
                        rows={state.frame}
                        size={BIG_SCREEN}
                        label="Big screen"
                        className={styles.pixelScreen}
                      />
                      {shows("bankWindow") && (
                        <div className={styles.flags} role="status" aria-label="Bank">
                          BANK {state.bank}
                        </div>
                      )}
                      {shows("vramPort") && (
                        <div className={styles.flags} role="status" aria-label="Port">
                          ADDR {state.portAddr} <span>·</span> STEP {portStep(state.portDown)}
                        </div>
                      )}
                      {shows("bigBlitter") && (
                        <div className={styles.flags} role="status" aria-label="Big blitter">
                          BIG BLITTER <span>·</span> {describeBigBlitter(state.bigBlitter)}
                        </div>
                      )}
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
      {microcode && (
        <>
          <div className={styles.controls}>
            <button
              type="button"
              aria-expanded={editing}
              onClick={() => {
                setEditing(!editing);
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
        </>
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
  /** Load and compile a preset program, on the CPU and in the language it names. */
  onPreset: (preset: StepperPreset) => void;
  /** The preset buttons, in order. */
  presets: readonly StepperPreset[];
  stack: StackModel;
  /** With this, the CPU can be switched between the two stack models. */
  onStackChange?: (stack: StackModel) => void;
  compilation: Compilation;
  /** The source differs from the compiled program. */
  changed: boolean;
  /** Code address of the instruction the CPU is running, if any. */
  activeAddress: number | null;
  /** The instruction set the tape decodes with; an edited microcode table's, or the CPU's. */
  isa?: readonly IsaEntry[];
  /** With `onLanguageChange`, the source can be switched to assembly for the microcode table. */
  language?: ProgramLanguage;
  onLanguageChange?: (language: ProgramLanguage) => void;
  /** Loads the AND + JZ microcode exercise. */
  onExercise?: () => void;
};

/** The source editor, preset buttons and instruction tape: write, compile, and see which line runs. */
export function ProgramSource({
  source,
  onSourceChange,
  onCompile,
  onPreset,
  presets,
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

  function preset(program: StepperPreset) {
    setHoveredLine(null);
    onPreset(program);
  }

  const presetButton = (program: StepperPreset) => (
    <button
      key={program.label}
      type="button"
      onClick={() => preset(program)}
      className={styles.button}
      title={program.title}
    >
      {program.label}
    </button>
  );

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
      {onStackChange && (
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
      )}
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
        {presets.map(presetButton)}
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
