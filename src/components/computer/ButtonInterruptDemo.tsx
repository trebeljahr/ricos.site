import clsx from "clsx";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BUTTON_POLICY,
  BUTTON_PROGRAM,
  buttonBench,
  buttonCounterDisplay,
  buttonCpuCircuit,
  buttonCpuScreen,
  checkButtonProgram,
  compileButtonProgram,
} from "../../lib/computer/buttonInterrupt";
import { CPU_PARTS } from "../../lib/computer/cpuPreset";
import { readProbes } from "../../lib/computer/probes";
import { type CompiledProgram, hex, SIGNALS } from "../../lib/computerStepper";
import {
  builderClass,
  buttonClass,
  captionClass,
  controlsClass,
  noteClass,
  Readings,
  summaryClass,
} from "./DeviceDemoParts";
import { type LockedClock, type LockedView, LogicBuilder } from "./LogicBuilder";
import { ManualButton } from "./ManualInputs";
import { ScreenGrid } from "./ScreenGrid";

const CircuitView = memo(LogicBuilder);
const bench = buttonBench();
const countDisplay = buttonCounterDisplay();
export function ButtonInterruptDemo() {
  const [source, setSource] = useState(BUTTON_PROGRAM);
  const [loaded, setLoaded] = useState(BUTTON_PROGRAM);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"pulse" | "held">("pulse");
  const [view, setView] = useState<LockedView | null>(null);
  const [running, setRunning] = useState(false);
  const [hint, setHint] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const clock = useRef<LockedClock | null>(null);
  const circuit = useMemo(() => buttonCpuCircuit(loaded), [loaded]);
  const compiled = useMemo(() => compileButtonProgram(loaded), [loaded]);
  const onFrame = useCallback((next: LockedView) => setView(next), []);
  const locked = useMemo(() => ({ circuit, clockRef: clock, onFrame }), [circuit, onFrame]);
  const snapshot = view?.frame.snapshot;
  const probes = snapshot ? readProbes(circuit, snapshot) : {};
  const control = snapshot?.outputs[CPU_PARTS.control] ?? [];
  const screen = snapshot ? buttonCpuScreen(circuit, snapshot) : [];
  const lines = SIGNALS.filter((_, i) => control[i]);
  const input = (high: boolean) => clock.current?.input({ "button-raw": high });
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => clock.current?.cycle(), 80);
    return () => clearInterval(timer);
  }, [running]);
  const reset = () => {
    setRunning(false);
    clock.current?.reset();
    setEpoch((n) => n + 1);
  };
  const load = () => {
    try {
      compileButtonProgram(source);
      setLoaded(source);
      setError("");
      reset();
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
      <section className="flow-para">
        <h2>Count presses through the shared circuit parts</h2>
        <p>
          Start with a direct button → 8-bit counter → binary-to-BCD converter → three seven-segment
          digits. Each click counts once; held mode counts only on its rising edge. Values wrap from
          255 to 0.
        </p>
        <details>
          <summary className={summaryClass}>Run and unfold the button-to-display circuit</summary>
          <div className={builderClass}>
            <CircuitView initialCircuit={countDisplay} storageKey={null} />
          </div>
        </details>
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
          clocks; a brief press can leave it low. REQUEST samples the capture instead. Open the
          module to inspect its flip-flops.
        </p>
        <details>
          <summary className={summaryClass}>
            Experiment with capture, acknowledge and reset wiring
          </summary>
          <div className={builderClass}>
            <CircuitView initialCircuit={bench} storageKey={null} />
          </div>
        </details>
        <p>
          <Link href="/computer/build-from-nand?level=button-capture">
            Construct the input latch and interface →
          </Link>
        </p>
      </section>
      <section className="flow-para" aria-label="Button interrupt CPU">
        <h2>Let a real CPU service the request</h2>
        <p>
          One ideal input supplies code 1. The CPU executes its background loop. Between
          instructions, KEY READY and IE request interrupt entry. Entry saves PC and masks
          interrupts. The handler reads IN, acknowledges the mailbox, writes screen row 3 and OUT,
          restores ACC and carry, then RETI resumes the saved PC.
        </p>
        <div className={controlsClass}>
          <ManualButton
            key={epoch}
            label="CPU input"
            mode={mode}
            onHeldChange={input}
            onPulse={() => {
              input(false);
              input(true);
              input(false);
            }}
          />
          <label className={clsx("flex items-center gap-tight", captionClass)}>
            Button mode
            <select
              aria-label="CPU input button mode"
              className={buttonClass}
              value={mode}
              onChange={(event) => setMode(event.target.value as "pulse" | "held")}
            >
              <option value="pulse">Click pulse</option>
              <option value="held">While held</option>
            </select>
          </label>
          <button type="button" className={buttonClass} onClick={() => clock.current?.cycle()}>
            CPU tick
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              for (let i = 0; i < 200; i++) clock.current?.cycle();
            }}
          >
            Advance 200 ticks
          </button>
          <button
            type="button"
            className={buttonClass}
            aria-pressed={running}
            onClick={() => setRunning((on) => !on)}
          >
            {running ? "Pause CPU" : "Run CPU"}
          </button>
          <button type="button" className={buttonClass} onClick={reset}>
            Reset CPU
          </button>
        </div>
        <Readings
          label="Interrupt signals"
          items={[
            ["RAW", snapshot?.values["button-raw"] ? 1 : 0],
            ["CAPTURED", snapshot?.outputs["button-interface"]?.[0] ? 1 : 0],
            ["SAMPLED HOLD", snapshot?.outputs["button-interface"]?.[1] ? 1 : 0],
            ["REQUEST", snapshot?.outputs["button-interface"]?.[2] ? 1 : 0],
            ["PENDING", (probes.IRQ ?? 0) & 1],
            ["IE", ((probes.IRQ ?? 0) >> 1) & 1],
            ["INT", ((probes.IRQ ?? 0) >> 2) & 1],
            ["ACK / IN", lines.includes("KEY_OUT") ? 1 : 0],
            ["PC", hex(probes.PC ?? 0)],
            ["OUT", probes.OUT ?? 0],
            ["FLAGS", probes.FLAGS ?? 0],
          ]}
        />
        <ScreenGrid rows={screen} label="CPU screen" />
        <p role="status">
          Active control lines: {lines.join(" · ") || "reset"}. OUT counts serviced events; a held
          button must leave it unchanged after its first service.
        </p>
        <p>
          Before EI, a pending request waits. Multiple presses before IN coalesce; this is one event
          mailbox, not a queue. IN clears it. A new press after ACK can wait while the handler is
          masked. The existing key-interrupt stepper also lets you compare polling with key().
        </p>
        <details>
          <summary className={summaryClass}>Inspect the running CPU and unfold its blocks</summary>
          <div className={builderClass}>
            <CircuitView locked={locked} />
          </div>
        </details>
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
            Compile and reset
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
    </div>
  );
}
function assembly(program: CompiledProgram) {
  return program.instructions
    .map((i) => `${hex(i.address)}  ${hex(i.opcode)} ${hex(i.operand)}  ${i.label}`)
    .join("\n");
}
