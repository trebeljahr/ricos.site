import { useCallback, useEffect, useRef, useState } from "react";
import type { Circuit } from "../../lib/computer/logic";
import type { NetlistStats } from "../../lib/computer/netlist";
import type { NetlistRequest, NetlistResponse } from "../../lib/computer/netlistRunner";
import styles from "./GateRunPanel.module.css";

type RunState = Extract<NetlistResponse, { type: "state" }>;

/** Whether a circuit is a CPU: it has a control unit block. */
export const isCpuCircuit = (circuit: Circuit) =>
  circuit.nodes.some((node) => node.type === "module" && node.behaviour === "control");

const hex = (value: number) => `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
const format = (value: number) => value.toLocaleString("en-US");

/**
 * "Run as gates": compiles the whole circuit, every block unfolded, into a
 * gate netlist and runs it in a Web Worker, so the page stays responsive.
 * The canvas keeps its own folded simulation; this panel reads the netlist's
 * probes into a register panel.
 */
export function GateRunPanel({ circuit }: { circuit: Circuit }) {
  const [on, setOn] = useState(false);
  const [stats, setStats] = useState<NetlistStats | null>(null);
  const [state, setState] = useState<RunState | null>(null);
  const [running, setRunning] = useState(false);
  const [rate, setRate] = useState(0);
  const [error, setError] = useState("");
  const worker = useRef<Worker | null>(null);
  const runningRef = useRef(false);
  const recent = useRef({ ran: 0, ms: 0 });

  const send = useCallback((request: NetlistRequest) => worker.current?.postMessage(request), []);

  useEffect(() => {
    if (!on) return;
    if (typeof Worker === "undefined") {
      setError("This browser cannot run Web Workers.");
      return;
    }
    const next = new Worker(new URL("../../lib/computer/netlist.worker.ts", import.meta.url));
    worker.current = next;
    next.onmessage = (event: MessageEvent<NetlistResponse>) => {
      const response = event.data;
      if (response.type === "error") {
        setError(response.message);
        runningRef.current = false;
        setRunning(false);
        return;
      }
      if (response.type === "loaded") {
        setStats(response.stats);
        setError("");
        next.postMessage({ type: "read" } satisfies NetlistRequest);
        return;
      }
      setState(response);
      if (response.ran > 0 && response.ms > 0) {
        // Ticks per second over roughly the last second of running.
        const w = recent.current;
        if (w.ms > 1000) {
          w.ran /= 2;
          w.ms /= 2;
        }
        w.ran += response.ran;
        w.ms += response.ms;
        setRate(Math.round((w.ran / w.ms) * 1000));
      }
      if (runningRef.current && !response.halted)
        next.postMessage({ type: "step", ticks: 1e9, budgetMs: 40 } satisfies NetlistRequest);
      else if (runningRef.current) {
        runningRef.current = false;
        setRunning(false);
      }
    };
    const halt = circuit.nodes.some((node) => node.id === "halted") ? "halted" : undefined;
    next.postMessage({ type: "load", circuit, halt } satisfies NetlistRequest);
    return () => {
      next.terminate();
      worker.current = null;
      runningRef.current = false;
      setRunning(false);
      setStats(null);
      setState(null);
      setRate(0);
      recent.current = { ran: 0, ms: 0 };
    };
  }, [on, circuit]);

  const run = () => {
    if (runningRef.current) {
      runningRef.current = false;
      setRunning(false);
      return;
    }
    runningRef.current = true;
    setRunning(true);
    recent.current = { ran: 0, ms: 0 };
    send({ type: "step", ticks: 1e9, budgetMs: 40 });
  };

  return (
    <section className={styles.panel} aria-label="Run as gates">
      <label className={styles.toggle}>
        <input type="checkbox" checked={on} onChange={(event) => setOn(event.target.checked)} />
        Run as gates
      </label>
      {!on && (
        <small className={styles.note}>
          Unfold every block down to gates and run them in a background thread.
        </small>
      )}
      {on && error && <small className={styles.error}>{error}</small>}
      {on && !error && !stats && <small className={styles.note}>Compiling the netlist…</small>}
      {on && stats && (
        <>
          <small
            className={styles.stats}
            title={Object.entries(stats.byType)
              .map(([type, count]) => `${type.toUpperCase()} ${count}`)
              .join(" · ")}
          >
            <strong>{format(stats.gates)}</strong> gates ·{" "}
            <strong>{format(stats.flipFlops)}</strong> flip-flops · {format(stats.nets)} nets ·
            depth {stats.depth}
          </small>
          <div className={styles.controls}>
            <button type="button" onClick={run} disabled={state?.halted} aria-pressed={running}>
              {running ? "Pause" : "Run"}
            </button>
            <button
              type="button"
              onClick={() => send({ type: "step", ticks: 1 })}
              disabled={running || state?.halted}
            >
              Tick
            </button>
            <button
              type="button"
              onClick={() => send({ type: "step", ticks: 100 })}
              disabled={running || state?.halted}
            >
              +100
            </button>
            <button
              type="button"
              onClick={() => {
                runningRef.current = false;
                setRunning(false);
                send({ type: "reset" });
              }}
            >
              Reset
            </button>
            <small className={styles.rate} aria-live="off">
              tick {format(state?.tick ?? 0)}
              {rate > 0 && <> · {format(rate)} ticks/s</>}
              {state?.halted && <strong className={styles.halted}> · HALTED</strong>}
            </small>
          </div>
          {state && (
            <dl className={styles.registers} aria-label="Registers read from the gates">
              {Object.entries(state.probes).map(([name, value]) => (
                <div key={name} className={styles.register}>
                  <dt>{name}</dt>
                  <dd>
                    {value} <span>{hex(value)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </section>
  );
}
