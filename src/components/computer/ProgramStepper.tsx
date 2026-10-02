import clsx from "clsx";
import { useMemo, useState } from "react";
import { compileProgram, hex, ISA, traceProgram } from "src/lib/computerStepper";

const EXAMPLE = "let x = 2;\nx = x + 3;\nprint(x);";
const OVERFLOW = "let x = 255;\nx = x + 1;\nprint(x);";

export function ProgramStepper() {
  const [source, setSource] = useState(EXAMPLE);
  const [loaded, setLoaded] = useState(EXAMPLE);
  const [step, setStep] = useState(0);
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
  }

  function preset(value: string) {
    setSource(value);
    setLoaded(value);
    setStep(0);
  }

  return (
    <div className="not-prose overflow-hidden rounded-lg border border-slate-700 bg-[#101b22] text-slate-100 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-6">
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-300">
          Toy machine / 8 bit
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => preset(EXAMPLE)}
            className="rounded border border-slate-600 px-3 py-1.5 hover:bg-slate-700"
          >
            2 + 3
          </button>
          <button
            type="button"
            onClick={() => preset(OVERFLOW)}
            className="rounded border border-slate-600 px-3 py-1.5 hover:bg-slate-700"
          >
            Overflow
          </button>
        </div>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <section
          className="min-w-0 border-b border-slate-700 p-4 lg:border-b-0 lg:border-r sm:p-6"
          aria-label="Program source and instructions"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">01 / Write a program</h2>
            <span className="text-xs text-slate-400">C-like teaching language</span>
          </div>
          <label htmlFor="program-source" className="sr-only">
            Program source
          </label>
          <textarea
            id="program-source"
            spellCheck={false}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="h-36 w-full resize-y rounded border border-slate-600 bg-[#091219] p-3 font-mono text-sm leading-7 text-slate-100 outline-none focus:border-cyan-400"
          />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
            {loaded.split("\n").map((line, index) => (
              <span
                key={`${index}:${line}`}
                className={clsx(
                  "rounded px-1 py-0.5 text-slate-400",
                  active?.line === index + 1 && "bg-cyan-300/20 text-cyan-200",
                )}
              >
                {index + 1}: {line.trim() || "·"}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={compile}
              className="rounded bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
            >
              Compile & reset
            </button>
            {changed && <span className="text-xs text-amber-300">Edits are not compiled yet.</span>}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Use <code>let</code>, assignment, <code>+</code>, <code>-</code>, and{" "}
            <code>print(...)</code>. One statement per line. Values wrap at 255.
          </p>
          {compilation.error && (
            <p
              role="alert"
              className="mt-4 rounded border border-rose-500/50 bg-rose-950/40 p-3 text-sm text-rose-200"
            >
              {compilation.error}
            </p>
          )}
          {compilation.program && (
            <div className="mt-7">
              <h2 className="mb-3 text-sm font-semibold">02 / Instructions & bytes</h2>
              <ol
                className="max-h-72 overflow-y-auto border-y border-slate-700"
                aria-label="Compiled instructions"
              >
                {compilation.program.instructions.map((instruction) => (
                  <li
                    key={instruction.address}
                    className={clsx(
                      "grid grid-cols-[2.5rem_5.5rem_1fr_3rem] gap-2 border-b border-slate-800 px-2 py-2 font-mono text-xs last:border-b-0",
                      active?.address === instruction.address && "bg-cyan-300/15 text-cyan-200",
                    )}
                  >
                    <span className="text-slate-400">{hex(instruction.address)}</span>
                    <span>
                      {hex(instruction.opcode)} {hex(instruction.operand)}
                    </span>
                    <span className="truncate">{instruction.label}</span>
                    <span className="text-right text-slate-400">
                      {instruction.line ? `L${instruction.line}` : "gen"}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-slate-400">
                Each instruction occupies two code bytes: opcode, then operand. L = source line; gen
                = compiler-added halt.
              </p>
              <details className="mt-3 text-xs text-slate-300">
                <summary className="cursor-pointer text-cyan-300">
                  View this machine’s instruction set
                </summary>
                <div className="mt-2 grid grid-cols-[3rem_4rem_1fr] gap-x-3 gap-y-1 font-mono">
                  {ISA.map((item) => (
                    <div
                      key={item.opcode}
                      className="col-span-3 grid grid-cols-subgrid border-b border-slate-800 py-1"
                    >
                      <span>{hex(item.opcode)}</span>
                      <span>{item.mnemonic}</span>
                      <span>{item.effect}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </section>
        <section className="min-w-0 p-4 sm:p-6" aria-label="CPU execution">
          <h2 className="mb-3 text-sm font-semibold">03 / Step through the CPU</h2>
          {state && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                  className="rounded border border-slate-500 px-4 py-2 text-sm disabled:opacity-40 hover:bg-slate-700"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={step >= trace.length - 1}
                  onClick={() => setStep(step + 1)}
                  className="rounded bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40 hover:bg-cyan-200"
                >
                  Next phase →
                </button>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-2 py-2 text-sm text-slate-300 hover:text-white"
                >
                  Reset
                </button>
                <span className="ml-auto font-mono text-xs text-slate-400">
                  {step} / {trace.length - 1}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={trace.length - 1}
                value={step}
                onChange={(event) => setStep(Number(event.target.value))}
                className="mt-4 w-full accent-cyan-300"
                aria-label="Execution phase"
              />
              <div className="mt-4 min-h-24 border-l-2 border-cyan-300 pl-4">
                <div className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-300">
                  {state.phase} · {active ? `source line ${active.line}` : "ready"}
                </div>
                <p aria-live="polite" className="mt-2 text-sm leading-6">
                  {state.explanation}
                </p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["PC", hex(state.pc)],
                  ["IR", state.ir === null ? "—" : hex(state.ir)],
                  ["Operand", state.operand === null ? "—" : hex(state.operand)],
                  ["ACC", `${state.accumulator} / ${hex(state.accumulator)}`],
                ].map(([label, value]) => (
                  <div key={label} className="border-t border-slate-600 pt-2">
                    <div className="text-xs text-slate-400">{label}</div>
                    <div className="mt-1 font-mono text-base font-semibold text-white">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    RAM · variables
                  </h3>
                  <div className="mt-2 space-y-1 font-mono text-sm">
                    {compilation.program?.variables.map(({ name, address }) => (
                      <div
                        key={address}
                        className={clsx(
                          "flex justify-between border-b border-slate-700 py-1",
                          state.touchedAddress === address && "text-cyan-200",
                        )}
                      >
                        <span>
                          [{hex(address)}] {name}
                        </span>
                        <strong>{state.ram[address]}</strong>
                      </div>
                    ))}
                    {compilation.program?.variables.length === 0 && (
                      <span className="text-slate-500">No variables</span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Output
                  </h3>
                  <div className="mt-2 min-h-12 border-b border-slate-700 font-mono text-2xl text-cyan-200">
                    {state.output.join(" ") || "—"}
                  </div>
                  <div className="mt-3 font-mono text-xs text-slate-400">
                    ZERO {Number(state.zero)} · CARRY {Number(state.carry)}
                  </div>
                </div>
              </div>
              <div className="mt-6 border-t border-slate-700 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Electrical abstraction · ACC bits
                </h3>
                <div className="mt-2 flex flex-wrap gap-1 font-mono text-sm">
                  {state.accumulator
                    .toString(2)
                    .padStart(8, "0")
                    .split("")
                    .map((bit, index) => (
                      <span
                        key={128 >> index}
                        className={clsx(
                          "grid h-8 w-8 place-items-center rounded-sm",
                          bit === "1"
                            ? "bg-cyan-300 text-slate-950"
                            : "bg-slate-700 text-slate-300",
                        )}
                      >
                        {bit}
                      </span>
                    ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  These bits represent voltage ranges held in registers. Real current paths depend
                  on the circuit; source code does not directly become electrical current.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
