import clsx from "clsx";
import { useState } from "react";
import {
  ABSENT_SIGNALS,
  type MicrocodeProblem,
  microcodeJson,
  parseMicrocodeJson,
} from "src/lib/computer/microcodeTable";
import {
  type BranchFlag,
  BUS_DRIVERS,
  BUS_READERS,
  type ControlWord,
  defaultMicrocode,
  type ExecuteSteps,
  FETCH_STEPS,
  hex,
  INT_OPCODE,
  MAX_T_STATES,
  type MicrocodeOpcode,
  type MicrocodeTable,
  microcodeEntry,
  OPERAND_KINDS,
  type OperandKind,
  SIGNALS,
  type Signal,
  STACK_MODELS,
} from "src/lib/computerStepper";
import panel from "./ByteExplorer.module.css";
import styles from "./MicrocodeEditor.module.css";
import stepper from "./ProgramStepper.module.css";

/** The entry being edited: an index into the table's opcodes, or the interrupt entry. */
type Selection = number | "interrupt";

const FETCH = FETCH_STEPS.length;
/** Opcodes a new entry may take first: the ranges no extension has claimed. */
const FREE_OPCODES = [
  ...Array.from({ length: 11 }, (_, i) => 0xd5 + i),
  ...Array.from({ length: 11 }, (_, i) => 0xe4 + i),
];

const pathsOf = (steps: ExecuteSteps): (readonly ControlWord[])[] =>
  "flag" in steps ? [steps.clear, steps.set] : [steps];
const sameSteps = (a: ExecuteSteps, b: ExecuteSteps) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Sets a path's length. A step added after the last one takes over its
 * STEP_RESET; removing the step that held STEP_RESET moves it to the new last step.
 */
function resize(words: readonly ControlWord[], length: number): ControlWord[] {
  const next = words.slice(0, length).map((word) => [...word]);
  while (next.length < length) {
    const last = next.at(-1);
    const resets = last?.includes("STEP_RESET");
    if (last && resets) next[next.length - 1] = last.filter((signal) => signal !== "STEP_RESET");
    next.push(resets || !last ? ["STEP_RESET"] : []);
  }
  if (length < words.length && words.slice(length).some((word) => word.includes("STEP_RESET"))) {
    const last = next.at(-1);
    if (last && !last.includes("STEP_RESET")) last.push("STEP_RESET");
  }
  return next;
}

type Props = {
  table: MicrocodeTable;
  onChange: (table: MicrocodeTable) => void;
  /** The table's problems and the program's, from `validateMicrocode` and `programProblems`. */
  problems: MicrocodeProblem[];
  /** Adds the AND and JZ exercise opcodes and loads a program that uses them. */
  onExercise: () => void;
};

/**
 * The microcode table as a grid per opcode: one row per control line, one
 * column per T-state, a toggle in each cell. Opcodes can be added, renamed,
 * branched on carry or zero, shared as JSON and reset to the CPU's default.
 */
export function MicrocodeEditor({ table, onChange, problems, onExercise }: Props) {
  const [selected, setSelected] = useState<Selection>(0);
  const [opcodeDraft, setOpcodeDraft] = useState<string | null>(null);
  const [json, setJson] = useState("");
  const [jsonMessage, setJsonMessage] = useState<{ error: boolean; text: string } | null>(null);
  const defaults = defaultMicrocode(table.stack);
  const index = selected === "interrupt" ? -1 : Math.min(selected, table.opcodes.length - 1);
  const entry: MicrocodeOpcode | undefined = table.opcodes[index];
  const isInterrupt = selected === "interrupt" || !entry;
  const opcode = isInterrupt ? INT_OPCODE : entry.opcode;
  const first = isInterrupt ? 0 : FETCH;
  const steps: ExecuteSteps = isInterrupt ? table.interrupt : entry.steps;
  const paths = pathsOf(steps);
  const flag: BranchFlag | null = "flag" in steps ? steps.flag : null;
  const signals = SIGNALS.filter((signal) => !ABSENT_SIGNALS[table.stack].includes(signal));
  const edited = JSON.stringify(table) !== JSON.stringify(defaults);
  const ownProblems = problems.filter((problem) => problem.opcode === opcode);
  /** T-states with a problem in path `path`; a problem without a path is in every path. */
  const problemAt = (path: number, t: number) =>
    ownProblems.some(
      (problem) => problem.t === t && (problem.path === undefined || problem.path === path),
    );
  const original = isInterrupt ? undefined : microcodeEntry(defaults, entry.opcode);

  const select = (next: Selection) => {
    setSelected(next);
    setOpcodeDraft(null);
  };
  const setSteps = (next: ExecuteSteps) =>
    onChange(
      isInterrupt
        ? { ...table, interrupt: next as ControlWord[] }
        : {
            ...table,
            opcodes: table.opcodes.map((item, i) =>
              i === index ? { ...item, steps: next } : item,
            ),
          },
    );
  const setPaths = (next: ControlWord[][]) =>
    setSteps(flag ? { flag, clear: next[0], set: next[1] } : next[0]);
  const patchEntry = (patch: Partial<MicrocodeOpcode>) =>
    onChange({
      ...table,
      opcodes: table.opcodes.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });

  function toggle(path: number, step: number, signal: Signal) {
    setPaths(
      paths.map((words, p) =>
        words.map((word, s) =>
          p === path && s === step
            ? word.includes(signal)
              ? word.filter((item) => item !== signal)
              : SIGNALS.filter((item) => item === signal || word.includes(item))
            : [...word],
        ),
      ),
    );
  }

  function setLength(length: number) {
    setPaths(paths.map((words) => resize(words, length)));
  }

  function setBranch(next: BranchFlag | null) {
    if (isInterrupt) return;
    if (next === null) setSteps(paths[0]);
    else setSteps({ flag: next, clear: paths[0], set: paths[1] ?? paths[0] });
  }

  function addOpcode() {
    const used = new Set(table.opcodes.map((item) => item.opcode));
    const free =
      FREE_OPCODES.find((value) => !used.has(value)) ??
      Array.from({ length: 256 }, (_, i) => i).find((i) => !used.has(i) && i !== INT_OPCODE);
    if (free === undefined) return;
    let n = 1;
    while (table.opcodes.some((item) => item.mnemonic === `NEW${n}`)) n++;
    onChange({
      ...table,
      opcodes: [
        ...table.opcodes,
        {
          mnemonic: `NEW${n}`,
          opcode: free,
          operand: "unused",
          effect: "",
          steps: [["STEP_RESET"]],
        },
      ],
    });
    select(table.opcodes.length);
  }

  function removeOpcode() {
    if (isInterrupt) return;
    onChange({ ...table, opcodes: table.opcodes.filter((_, i) => i !== index) });
    select(Math.max(0, index - 1));
  }

  function loadJson() {
    try {
      const loaded = parseMicrocodeJson(json);
      if (loaded.stack !== table.stack) {
        setJsonMessage({
          error: true,
          text: `This table is for the ${STACK_MODELS[loaded.stack].label} CPU. Switch the CPU first.`,
        });
        return;
      }
      onChange(loaded);
      select(0);
      setJsonMessage({ error: false, text: "Table loaded." });
    } catch (error) {
      setJsonMessage({ error: true, text: (error as Error).message });
    }
  }

  async function copyJson() {
    const text = microcodeJson(table);
    setJson(text);
    try {
      await navigator.clipboard.writeText(text);
      setJsonMessage({ error: false, text: "JSON copied. Paste it here to load it again." });
    } catch {
      setJsonMessage({ error: false, text: "JSON is in the box below; copy it from there." });
    }
  }

  const columns = Array.from(
    { length: first + Math.max(...paths.map((p) => p.length)) },
    (_, t) => t,
  );
  const tooLong = columns.length > MAX_T_STATES;

  return (
    <section className={styles.editor} aria-label="Microcode editor">
      <div className={panel.sectionHead}>
        <span>04 / MICROCODE TABLE · {STACK_MODELS[table.stack].label}</span>
        <span>
          {edited ? "EDITED" : "DEFAULT"} ·{" "}
          {problems.length ? `${problems.length} PROBLEM${problems.length > 1 ? "S" : ""}` : "OK"}
        </span>
      </div>
      <div className={stepper.controls}>
        <button type="button" className={stepper.button} onClick={addOpcode}>
          + NEW OPCODE
        </button>
        <button type="button" className={stepper.button} onClick={onExercise}>
          EXERCISE: AND + JZ
        </button>
        <button
          type="button"
          className={stepper.button}
          disabled={!edited}
          onClick={() => {
            onChange(defaults);
            select(0);
          }}
        >
          RESET TO DEFAULT
        </button>
      </div>

      {problems.length > 0 && (
        <ul className={styles.problems} aria-label="Microcode problems">
          {problems.map((problem, i) => {
            const target =
              problem.opcode === INT_OPCODE
                ? "interrupt"
                : table.opcodes.findIndex((item) => item.opcode === problem.opcode);
            const name =
              problem.opcode === INT_OPCODE
                ? "INT"
                : (microcodeEntry(table, problem.opcode ?? -1)?.mnemonic ??
                  (problem.opcode === null ? "" : hex(problem.opcode)));
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: problems have no identity beyond their order.
              <li key={i}>
                {target !== -1 ? (
                  <button type="button" onClick={() => select(target)}>
                    {name}
                  </button>
                ) : (
                  <b>{name}</b>
                )}{" "}
                {problem.message}
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.layout}>
        <ul className={styles.opcodeList} aria-label="Opcodes">
          {table.opcodes.map((item, i) => {
            const base = microcodeEntry(defaults, item.opcode);
            const changed =
              !base ||
              base.mnemonic !== item.mnemonic ||
              base.operand !== item.operand ||
              !sameSteps(base.steps, item.steps);
            const broken = problems.some((problem) => problem.opcode === item.opcode);
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: two entries may share an opcode while one is being edited.
              <li key={`${i}-${item.opcode}`}>
                <button
                  type="button"
                  aria-current={!isInterrupt && i === index ? "true" : undefined}
                  className={clsx(!isInterrupt && i === index && styles.current)}
                  onClick={() => select(i)}
                >
                  <span>{hex(item.opcode)}</span> {item.mnemonic}
                  {changed && <i title="Edited"> *</i>}
                  {broken && <em title="Has problems"> !</em>}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-current={isInterrupt ? "true" : undefined}
              className={clsx(isInterrupt && styles.current)}
              onClick={() => select("interrupt")}
            >
              <span>{hex(INT_OPCODE)}</span> INT ENTRY
              {problems.some((problem) => problem.opcode === INT_OPCODE) && <em> !</em>}
            </button>
          </li>
        </ul>

        <div className={styles.detail}>
          {isInterrupt ? (
            <p className={stepper.hint}>
              The interrupt entry runs from T0 instead of a fetch when a key is waiting and
              interrupts are on. It must push PC, turn interrupts off and load the vector.
            </p>
          ) : (
            <div className={styles.fields}>
              <label>
                <span>MNEMONIC</span>
                <input
                  value={entry.mnemonic}
                  maxLength={8}
                  spellCheck={false}
                  onChange={(event) => patchEntry({ mnemonic: event.target.value.toUpperCase() })}
                />
              </label>
              <label>
                <span>OPCODE (HEX)</span>
                <input
                  value={opcodeDraft ?? hex(entry.opcode)}
                  maxLength={2}
                  spellCheck={false}
                  aria-invalid={opcodeDraft !== null}
                  onChange={(event) => {
                    const text = event.target.value.toUpperCase();
                    if (/^[0-9A-F]{1,2}$/.test(text)) {
                      setOpcodeDraft(text.length === 2 ? null : text);
                      patchEntry({ opcode: Number.parseInt(text, 16) });
                    } else setOpcodeDraft(text);
                  }}
                  onBlur={() => setOpcodeDraft(null)}
                />
              </label>
              <label>
                <span>OPERAND</span>
                <select
                  value={entry.operand}
                  onChange={(event) => patchEntry({ operand: event.target.value as OperandKind })}
                >
                  {OPERAND_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.effect}>
                <span>EFFECT</span>
                <input
                  value={entry.effect}
                  onChange={(event) => patchEntry({ effect: event.target.value })}
                />
              </label>
            </div>
          )}

          <div className={stepper.controls}>
            <span className={styles.counter}>
              T-STATES
              <button
                type="button"
                className={stepper.button}
                aria-label="One T-state fewer"
                disabled={paths[0].length <= 1}
                onClick={() => setLength(paths[0].length - 1)}
              >
                −
              </button>
              <b>{first + paths[0].length}</b>
              <button
                type="button"
                className={stepper.button}
                aria-label="One T-state more"
                disabled={first + paths[0].length >= MAX_T_STATES}
                onClick={() => setLength(paths[0].length + 1)}
              >
                +
              </button>
            </span>
            {!isInterrupt && (
              <label className={styles.counter}>
                BRANCH ON
                <select
                  value={flag ?? "none"}
                  onChange={(event) =>
                    setBranch(
                      event.target.value === "none" ? null : (event.target.value as BranchFlag),
                    )
                  }
                >
                  <option value="none">nothing</option>
                  <option value="carry">carry flag</option>
                  <option value="zero">zero flag</option>
                </select>
              </label>
            )}
            {original && !sameSteps(original.steps, entry.steps) && (
              <button
                type="button"
                className={stepper.button}
                onClick={() => patchEntry({ ...original })}
              >
                RESTORE {original.mnemonic}
              </button>
            )}
            {!isInterrupt && (
              <button type="button" className={stepper.button} onClick={removeOpcode}>
                REMOVE OPCODE
              </button>
            )}
          </div>

          {paths.map((words, path) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: path 0 is the flag-clear branch, path 1 the flag-set one.
            <div key={path} className={styles.gridFrame}>
              {flag && (
                <div className={styles.branchHead}>
                  {flag.toUpperCase()} = {path} · {path ? "flag set" : "flag clear"}
                </div>
              )}
              <table className={styles.grid}>
                <caption className={styles.srOnly}>
                  Control lines for {isInterrupt ? "the interrupt entry" : entry.mnemonic}
                  {flag ? ` with ${flag} ${path}` : ""}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">LINE</th>
                    {columns.map((t) => (
                      <th
                        key={t}
                        scope="col"
                        className={clsx(
                          t < first && styles.fetch,
                          problemAt(path, t) && styles.problemColumn,
                          t >= MAX_T_STATES && styles.problemColumn,
                        )}
                      >
                        T{t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {signals.map((signal) => (
                    <tr key={signal}>
                      <th scope="row">
                        {signal}
                        {BUS_DRIVERS[signal] && <small> →BUS</small>}
                        {BUS_READERS.includes(signal) && <small> BUS→</small>}
                      </th>
                      {columns.map((t) => {
                        if (t < first)
                          return (
                            <td key={t} className={styles.fetch}>
                              {FETCH_STEPS[t].includes(signal) ? "●" : ""}
                            </td>
                          );
                        const word = words[t - first];
                        if (!word) return <td key={t} />;
                        const on = word.includes(signal);
                        return (
                          <td key={t}>
                            <button
                              type="button"
                              aria-pressed={on}
                              aria-label={`${signal} at T${t}`}
                              className={clsx(styles.cell, on && styles.on)}
                              onClick={() => toggle(path, t - first, signal)}
                            >
                              {on ? "●" : ""}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {tooLong && <p className={stepper.error}>More T-states than the ROM has.</p>}
          <p className={stepper.hint}>
            T0–T{FETCH - 1} fetch the opcode and operand for every instruction and cannot be edited.
            One line per T-state may drive the bus (→BUS); a line that reads it (BUS→) needs a
            driver in the same T-state. STEP_RESET ends the instruction. ALU_AND makes the ALU
            output ACC AND OPR.
          </p>
        </div>
      </div>

      <div className={styles.share}>
        <div className={stepper.controls}>
          <button type="button" className={stepper.button} onClick={copyJson}>
            COPY TABLE AS JSON
          </button>
          <button
            type="button"
            className={stepper.button}
            disabled={!json.trim()}
            onClick={loadJson}
          >
            LOAD JSON BELOW
          </button>
        </div>
        <textarea
          className={styles.json}
          value={json}
          spellCheck={false}
          rows={4}
          placeholder="Paste a shared microcode table here"
          aria-label="Microcode table JSON"
          onChange={(event) => {
            setJson(event.target.value);
            setJsonMessage(null);
          }}
        />
        {jsonMessage && (
          <p
            role={jsonMessage.error ? "alert" : "status"}
            className={jsonMessage.error ? stepper.error : stepper.hint}
          >
            {jsonMessage.text}
          </p>
        )}
      </div>
    </section>
  );
}
