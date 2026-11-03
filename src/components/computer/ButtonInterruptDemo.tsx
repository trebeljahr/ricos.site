import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemoState } from "../../hooks/useDemoState";
import {
  BUTTON_PROGRAM,
  buttonBench,
  buttonCounterDisplay,
  buttonCpuCircuit,
  checkButtonProgram,
  compileButtonProgram,
} from "../../lib/computer/buttonInterrupt";
import { CPU_PARTS } from "../../lib/computer/cpuPreset";
import { demoStorageKey } from "../../lib/computer/demoStorage";
import { type CompiledProgram, hex } from "../../lib/computerStepper";
import { CircuitDemo } from "./CircuitDemo";
import {
  builderClass,
  buttonClass,
  captionClass,
  controlsClass,
  summaryClass,
} from "./DeviceDemoParts";
import { LogicBuilder } from "./LogicBuilder";
import { LazyLogicTutorial } from "./tutorial/LazyLogicTutorial";

const interruptLessons = ["button-capture", "cpu-button-interface", "cpu-interrupt-entry"] as const;
const interruptFocus = [
  "button-raw",
  "button-interface",
  CPU_PARTS.key,
  CPU_PARTS.keyReady,
  CPU_PARTS.ie,
  CPU_PARTS.irq,
  CPU_PARTS.int,
  "irq-probe",
];
export function ButtonInterruptDemo() {
  const [source, setSource] = useDemoState("button-program:source", BUTTON_PROGRAM);
  const [loaded, setLoaded] = useDemoState("button-program:loaded", BUTTON_PROGRAM);
  const [error, setError] = useState("");
  const [hint, setHint] = useState(false);
  const circuit = useMemo(() => buttonCpuCircuit(loaded), [loaded]);
  const compiled = useMemo(() => compileButtonProgram(loaded), [loaded]);
  const load = () => {
    try {
      compileButtonProgram(source);
      setLoaded(source);
      setError("");
    } catch (cause) {
      setError((cause as Error).message);
    }
  };
  const programCheck = () => {
    try {
      const result = checkButtonProgram(source);
      setError(result);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };
  return (
    <div className="flex flex-col gap-section">
      <section className="flow-para" aria-label="Button interrupt CPU">
        <h2>Let a real CPU service the request</h2>
        <div className={builderClass}>
          <LogicBuilder
            key={loaded}
            initialCircuit={circuit}
            initialFocus={interruptFocus}
            storageKey={demoStorageKey("button-cpu-builder", loaded)}
          />
        </div>
        <div className={controlsClass}>
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              setSource(
                "let presses = 0;\nfn on_key(k) {\n}\nlet work = 0;\ninterrupts_on();\nloop {\n  work = work + 1;\n}",
              );
              setError(
                "Construction goal: count each handled input, write its code to screen row 3, then resume background work.",
              );
              setHint(false);
            }}
          >
            Start handler construction task
          </button>
          <button type="button" className={buttonClass} onClick={() => setHint(true)}>
            Request program hint
          </button>
        </div>
        {hint && (
          <p>
            Keep the count in a shared variable. The handler parameter comes from IN, which also
            acknowledges the request. Leave restoration and RETI to the compiler; initialize shared
            state before enabling interrupts.
          </p>
        )}
        <label className={clsx("not-prose grid gap-label", captionClass)}>
          Handler program
          <textarea
            className="min-h-[19rem] w-full rounded border border-gray-300 bg-gray-100 p-label font-mono text-sm font-normal leading-relaxed text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            aria-label="Button handler program"
            spellCheck={false}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </label>
        <div className={controlsClass}>
          <button type="button" className={buttonClass} onClick={load}>
            Compile into circuit
          </button>
          <button type="button" className={buttonClass} onClick={programCheck}>
            Check handler behavior
          </button>
        </div>
        <p>
          <Link href="/computer/key-interrupts">Compare polling and interrupt traces →</Link>
        </p>
        {error && <p role="status">{error}</p>}
        <details>
          <summary className={summaryClass}>
            Inspect the compiled handler and return instructions
          </summary>
          <pre>{assembly(compiled)}</pre>
        </details>
      </section>
      <section className="flow-para">
        <h2>Count presses through the shared circuit parts</h2>
        <CircuitDemo makeCircuit={buttonCounterDisplay} label="Button counter circuit" />
        <h2>Catch a press while the CPU is busy</h2>
        <CircuitDemo makeCircuit={buttonBench} label="Button capture circuit" />
        <p>
          <Link href="/computer/build-from-nand?level=button-capture">
            Construct the input latch and interface →
          </Link>
        </p>
      </section>
      <section className="flow-para" aria-label="Build the interrupt path">
        <h2>Build this out</h2>
        <LazyLogicTutorial
          title="Build the interrupt path"
          level="button-capture"
          levels={interruptLessons}
        />
      </section>
    </div>
  );
}
function assembly(program: CompiledProgram) {
  return program.instructions
    .map((i) => `${hex(i.address)}  ${hex(i.opcode)} ${hex(i.operand)}  ${i.label}`)
    .join("\n");
}
