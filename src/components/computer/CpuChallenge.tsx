import { Card } from "@components/Card";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatBus } from "../../lib/computer/bus";
import {
  type GradeFailure,
  type GradeResult,
  gradeCpu,
  type TickSide,
} from "../../lib/computer/cpuGrader";
import {
  CPU_LEVEL_SPECS,
  cpuLevelSetup,
  enforceLocks,
  restoreLevel,
  type SavedLevel,
  saveLevel,
  withProgram,
} from "../../lib/computer/cpuLevels";
import type { Circuit } from "../../lib/computer/logic";
import { compileProgram, hex } from "../../lib/computerStepper";
import { LogicBuilder, type LogicBuilderHandle } from "./LogicBuilder";

const STORAGE = "ricos-cpu-challenge-v1";

type Progress = { passed: number[]; circuits: Record<string, SavedLevel> };

function readProgress(): Progress {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as Partial<Progress> | null;
    return {
      passed: Array.isArray(parsed?.passed) ? parsed.passed.filter(Number.isInteger) : [],
      circuits: parsed?.circuits && typeof parsed.circuits === "object" ? parsed.circuits : {},
    };
  } catch {
    return { passed: [], circuits: {} };
  }
}

function writeProgress(progress: Progress) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(progress));
  } catch {
    // Storage full or blocked: progress lasts until the tab closes.
  }
}

/** Highest level the reader may open: one past the last level passed in a row. */
export const unlockedLevel = (passed: readonly number[]) => {
  let level = 1;
  while (passed.includes(level) && level < CPU_LEVEL_SPECS.length) level++;
  return level;
};

type CheckResult =
  | { kind: "pass"; programs: number }
  | { kind: "structure"; errors: string[] }
  | { kind: "failure"; program: string; bytes: number[]; failure: GradeFailure };

const byte = (value: number | undefined) => (value === undefined ? "—" : hex(value));
const bytes = (values: number[] | undefined) =>
  values ? values.map(hex).join(" ") || "empty" : "—";

function describeSide(side: TickSide, field: string): string {
  if (field === "control") return side.control.join(" ") || "no lines";
  if (field === "bus")
    return `${formatBus(side.bus.value)}${side.bus.drivers.length ? ` from ${side.bus.drivers.join(" + ")}` : ""}`;
  if (field === "RAM") return bytes(side.ram);
  if (field === "SCREEN") return bytes(side.screen);
  if (field === "STACK") return bytes(side.stack);
  if (field === "settle") return "settles";
  return byte(side.probes[field as keyof TickSide["probes"]]);
}

/** Half cycles to show a failure: before the tick's edge for control and bus, after it for state. */
const halfCyclesFor = (failure: GradeFailure) =>
  failure.wrong.every((field) => field === "control" || field === "bus")
    ? failure.tick * 2
    : failure.tick * 2 + 2;

function FailureReport({
  result,
  onShow,
}: {
  result: Extract<CheckResult, { kind: "failure" }>;
  onShow: () => void;
}) {
  const { failure, program } = result;
  return (
    <div className="rounded-lg border-2 border-red-300 bg-red-50 p-stack dark:border-red-800 dark:bg-red-950/40">
      <p className="flush-top font-semibold text-red-800 dark:text-red-200">
        Program “{program}” goes wrong at tick {failure.tick} (T{failure.t} of{" "}
        <code>{failure.instruction.text}</code> at {hex(failure.instruction.address)}).
      </p>
      <p className="mt-label">{failure.cause.message}</p>
      <table className="mt-label w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">What</th>
            <th className="text-left">Expected</th>
            <th className="text-left">Your CPU</th>
          </tr>
        </thead>
        <tbody>
          {failure.wrong.map((field) => (
            <tr key={field}>
              <td className="font-mono">{field}</td>
              <td className="font-mono">{describeSide(failure.expected, field)}</td>
              <td className="font-mono">{describeSide(failure.actual, field)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={onShow}
        className="mt-label rounded border border-red-400 bg-white px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-100"
      >
        Show me
      </button>
    </div>
  );
}

export function CpuChallenge({ level }: { level: number }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const setup = useMemo(() => cpuLevelSetup(level), [level]);
  const spec = CPU_LEVEL_SPECS[level - 1];
  const unlocked = progress ? unlockedLevel(progress.passed) : 1;
  const open = level <= unlocked;
  // Read once per level, after mount: later saves come from the builder itself.
  const [loaded, setLoaded] = useState<{ level: number; circuit: Circuit } | null>(null);
  const start = loaded?.level === level ? loaded.circuit : null;
  const circuit = useRef<Circuit | null>(null);
  const handle = useRef<LogicBuilderHandle | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [highlight, setHighlight] = useState<string>();
  const [source, setSource] = useState(
    "let x = 1;\nfor (let i = 0; i < 4; i++) {\n  x = x + x;\n}\nprint(x);",
  );
  const [runMessage, setRunMessage] = useState("");

  // A new level starts from its saved circuit, with no report.
  useEffect(() => {
    const saved = readProgress();
    setProgress(saved);
    setLoaded({ level, circuit: restoreLevel(saved.circuits[level], setup) });
    setResult(null);
    setHighlight(undefined);
    circuit.current = null;
  }, [level, setup]);

  const save = useCallback((next: Progress) => {
    setProgress(next);
    writeProgress(next);
  }, []);

  const onChange = useCallback(
    (next: Circuit) => {
      circuit.current = next;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        const current = readProgress();
        writeProgress({
          ...current,
          circuits: { ...current.circuits, [level]: saveLevel(next, setup) },
        });
      }, 300);
    },
    [level, setup],
  );
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);
  const enforce = useCallback((next: Circuit) => enforceLocks(next, setup), [setup]);

  const check = () => {
    const current = circuit.current ?? start;
    if (!current || !progress) return;
    setHighlight(undefined);
    let outcome: CheckResult = { kind: "pass", programs: setup.programs.length };
    for (const program of setup.programs) {
      const graded: GradeResult = gradeCpu(
        withProgram(current, program.compiled.bytes),
        program.compiled,
        { level: spec.grade },
      );
      if (graded.pass) continue;
      outcome =
        "structure" in graded
          ? { kind: "structure", errors: graded.structure }
          : {
              kind: "failure",
              program: program.name,
              bytes: program.compiled.bytes,
              failure: graded.failure,
            };
      break;
    }
    setResult(outcome);
    if (outcome.kind === "failure") setHighlight(outcome.failure.cause.part);
    if (outcome.kind === "pass" && !progress.passed.includes(level)) {
      const current = readProgress();
      save({ ...current, passed: [...new Set([...current.passed, level])] });
    }
  };

  const showFailure = () => {
    const current = circuit.current;
    if (result?.kind !== "failure" || !current) return;
    setHighlight(result.failure.cause.part);
    handle.current?.show(withProgram(current, result.bytes), halfCyclesFor(result.failure));
  };

  const runOwn = () => {
    const current = circuit.current;
    if (!current) return;
    try {
      const compiled = compileProgram(source);
      const graded = gradeCpu(withProgram(current, compiled.bytes), compiled, {
        level: spec.grade,
      });
      handle.current?.show(withProgram(current, compiled.bytes), 0);
      setHighlight(undefined);
      setRunMessage(
        graded.pass
          ? `Loaded ${compiled.bytes.length} bytes. Your CPU matches the stepper for all ${graded.ticks} ticks: press Run clock.`
          : "Loaded. Your CPU and the stepper disagree on this program; press Check my CPU to find out where.",
      );
    } catch (error) {
      setRunMessage(error instanceof Error ? error.message : "That program does not compile.");
    }
  };

  const passedHere = progress?.passed.includes(level);
  const finished =
    progress?.passed.includes(CPU_LEVEL_SPECS.length) && level === CPU_LEVEL_SPECS.length;

  return (
    <>
      <ol className="not-prose grid list-none gap-tight p-0 sm:grid-cols-3 lg:grid-cols-6">
        {CPU_LEVEL_SPECS.map((item, index) => {
          const id = index + 1;
          const state = progress?.passed.includes(id)
            ? "Passed"
            : id <= unlocked
              ? "Open"
              : "Locked";
          return (
            <li key={id}>
              <Card
                link={`/computer/build-a-cpu?level=${id}`}
                title={`${id}. ${item.title}`}
                typeLabel={state}
                size="compact"
                headingAs="h3"
                className={clsx(
                  id === level && "border-accent",
                  state === "Locked" && "opacity-60",
                )}
              />
            </li>
          );
        })}
      </ol>

      <section className="mt-group">
        <h2 className="flush-top">
          Level {level}: {spec.title}
        </h2>
        <p>{spec.goal}</p>
        <ul>
          {spec.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        <p className="text-sm">
          The parts and the wires already in place are locked. Shift-drag across a row of ports to
          select them, then drag onto another row to wire all eight lanes at once.
        </p>
        <details className="mt-label">
          <summary>Test programs ({setup.programs.length})</summary>
          {setup.programs.map((program) => (
            <div key={program.name} className="mt-label">
              <strong>{program.name}</strong>
              <pre className="mt-hair text-sm">{program.source}</pre>
            </div>
          ))}
        </details>
      </section>

      {!open ? (
        <p className="mt-para rounded-lg border-2 border-gray-300 p-stack dark:border-gray-700">
          Pass level {level - 1} to open this level.
        </p>
      ) : (
        <>
          <div className="not-prose mt-para flex flex-wrap items-center gap-tight">
            <button
              type="button"
              onClick={check}
              disabled={!start}
              className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              Check my CPU
            </button>
            {passedHere && !result && (
              <span className="text-sm text-green-700 dark:text-green-300">Passed before ✓</span>
            )}
          </div>
          <div className="not-prose mt-label" aria-live="polite">
            {result?.kind === "pass" && (
              <div className="rounded-lg border-2 border-green-300 bg-green-50 p-stack text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100">
                <p className="m-0 font-semibold">
                  Pass: all {result.programs} test programs match the stepper tick for tick.
                </p>
                {level < CPU_LEVEL_SPECS.length ? (
                  <a
                    className="mt-label inline-block"
                    href={`/computer/build-a-cpu?level=${level + 1}`}
                  >
                    Level {level + 1} is open →
                  </a>
                ) : (
                  <p className="m-0 mt-label">
                    Your CPU is complete. Type any program below and run it.
                  </p>
                )}
              </div>
            )}
            {result?.kind === "structure" && (
              <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-stack dark:border-amber-800 dark:bg-amber-950/40">
                <p className="m-0 font-semibold">The grader cannot find every part yet:</p>
                <ul className="mt-label">
                  {result.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {result?.kind === "failure" && <FailureReport result={result} onShow={showFailure} />}
          </div>

          {finished && (
            <section className="not-prose mt-para">
              <h3 className="flush-top text-lg font-semibold">Run your own program</h3>
              <textarea
                className="mt-label h-40 w-full rounded border border-gray-300 p-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                aria-label="Program source"
              />
              <button
                type="button"
                onClick={runOwn}
                className="mt-label rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-700"
              >
                Compile and load into my CPU
              </button>
              {runMessage && <p className="mt-label text-sm">{runMessage}</p>}
            </section>
          )}

          {/* Full bleed: the CPU is wider than the page column. */}
          <div className="not-prose mt-para ml-[calc(50%-50vw+0.75rem)] h-[85svh] min-h-[560px] w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl">
            {start && (
              <LogicBuilder
                key={level}
                challenge={{
                  circuit: start,
                  enforce,
                  palette: spec.palette,
                  highlight,
                  onChange,
                  handleRef: handle,
                }}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}
