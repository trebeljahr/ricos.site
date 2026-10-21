import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useDemoState } from "../../hooks/useDemoState";
import {
  BUTTON_POLICY,
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
import {
  builderClass,
  buttonClass,
  captionClass,
  controlsClass,
  noteClass,
  summaryClass,
} from "./DeviceDemoParts";
import { CircuitDemo } from "./CircuitDemo";
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
        <p>
          Press BUTTON on the canvas, then run or step the builder’s clock. BUTTON supplies input
          code 1. Follow CAPTURED → KEY READY → IRQ → INT. Between instructions, the CPU saves PC,
          masks interrupts and jumps through the handler vector.
        </p>
        <p>
          The handler reads IN to acknowledge the request, writes screen row 3 and increments OUT.
          It restores ACC and carry. RETI restores PC and enables interrupts, so the background loop
          resumes. Edit the handler below, or build the interrupt wiring in the construction
          section.
        </p>
        <div className={builderClass}>
          <LogicBuilder
            key={loaded}
            initialCircuit={circuit}
            initialFocus={interruptFocus}
            storageKey={demoStorageKey("button-cpu-builder", loaded)}
          />
        </div>
        <p>
          Before EI, a pending request waits. Multiple presses before IN coalesce; this is one event
          mailbox, not a queue. IN clears it. A new press after ACK can wait while the handler is
          masked. The existing key-interrupt stepper also lets you compare polling with key().
        </p>
        <p className={noteClass}>
          This demo uses explicit interrupt enabling: initialize shared variables, then execute
          interrupts_on(). A request arriving during initialization stays pending.
        </p>
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
        <p>
          Start with a direct button → 8-bit counter → binary-to-BCD converter → three seven-segment
          digits. Each click counts once; held mode counts only on its rising edge. Values wrap from
          255 to 0.
        </p>
        <CircuitDemo makeCircuit={buttonCounterDisplay} label="Button counter circuit" />
        <h2>Catch a press while the CPU is busy</h2>
        <p>{BUTTON_POLICY}</p>
        <p className={noteClass}>
          Physical switches need conditioning before this ideal capture input. See{" "}
          <a href="https://www.ti.com/document-viewer/lit/html/scea094">TI on contact bounce</a> and{" "}
          <a href="https://www.intel.com/content/www/us/en/docs/programmable/683068/18-1/metastability-analysis.html">
            Intel on synchronization chains
          </a>
          . Real circuits also need pulse-width and reset-release timing constraints.
        </p>
        <p>
          CAPTURED remembers a brief press. SAMPLED HOLD follows the held level after two sample
          clocks; a brief press can leave it low. REQUEST samples the capture instead. Inspect its
          flip-flops on the canvas.
        </p>
        <CircuitDemo makeCircuit={buttonBench} label="Button capture circuit" />
        <p>
          <Link href="/computer/build-from-nand?level=button-capture">
            Construct the input latch and interface →
          </Link>
        </p>
      </section>
      <section className="flow-para" aria-label="Build the interrupt path">
        <h2>Build this out</h2>
        <p>
          Build the capture latch, connect its request and acknowledge wires, then wire the CPU’s
          interrupt control. Each stage checks your circuit. The final stage runs the handler and
          checks that the CPU resumes its interrupted work.
        </p>
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
