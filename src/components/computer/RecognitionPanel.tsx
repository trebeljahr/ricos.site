import { useEffect, useId, useMemo, useRef, useState } from "react";
import { copyCircuit } from "../../lib/computer/circuitClipboard";
import { type Circuit, type CircuitPorts, moduleInputs } from "../../lib/computer/logic";
import {
  recognizeCircuit,
  recognitionComponent,
  recognitionComponents,
  type RecognitionResult,
  verifyCircuitIdentity,
} from "../../lib/computer/recognition";
import styles from "./RecognitionPanel.module.css";

export function RecognitionPanel({
  circuit,
  selection,
  wireSelection,
  onClose,
  onVerified,
}: {
  circuit: Circuit;
  selection: string[];
  wireSelection: string[];
  onClose: () => void;
  onVerified: (circuit: Circuit, selectionOnly: boolean) => void;
}) {
  const [selectionOnly, setSelectionOnly] = useState(
    selection.length > 0 || wireSelection.length > 0,
  );
  const source = useMemo(
    () => (selectionOnly ? copyCircuit(circuit, selection, wireSelection).circuit : circuit),
    [circuit, selection, wireSelection, selectionOnly],
  );
  const [ports, setPorts] = useState<CircuitPorts>({ inputs: [], outputs: [] });
  const [targetId, setTargetId] = useState("");
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(circuit.name);
  const controller = useRef<AbortController | null>(null);
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    controller.current?.abort();
    setBusy(false);
    setResult(null);
    setPorts({
      inputs: moduleInputs(source).map((n) => n.id),
      outputs: source.ports?.outputs.filter((id) => source.nodes.some((n) => n.id === id)) ?? [],
    });
    setName(selectionOnly ? `${source.name.slice(0, 60)} construction` : source.name);
    return () => controller.current?.abort();
  }, [source, selectionOnly]);
  const updatePorts = (next: CircuitPorts) => {
    controller.current?.abort();
    setBusy(false);
    setPorts(next);
    setResult(null);
  };
  const move = (kind: keyof CircuitPorts, index: number, delta: number) => {
    const ids = [...ports[kind]];
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    updatePorts({ ...ports, [kind]: ids });
  };
  const candidates = recognitionComponents().filter((c) => c.evaluate);
  const target = recognitionComponent(targetId);
  const check = async () => {
    const abort = new AbortController();
    controller.current?.abort();
    controller.current = abort;
    setBusy(true);
    setResult(null);
    try {
      const next = await recognizeCircuit(source, ports, {
        targetId: targetId || undefined,
        signal: abort.signal,
      });
      if (!abort.signal.aborted) setResult(next);
    } catch (error) {
      if (!abort.signal.aborted)
        setResult({
          status: "invalid",
          message: error instanceof Error ? error.message : "Check failed",
          rows: 0,
          matches: [],
          counterexamples: [],
        });
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  };
  return (
    <div
      className={styles.backdrop}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        tabIndex={-1}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") onClose();
          if (event.key === "Tab") {
            const fields = [
              ...event.currentTarget.querySelectorAll<HTMLElement>(
                "button:not(:disabled), input, select",
              ),
            ];
            const first = fields[0],
              last = fields[fields.length - 1];
            if (
              event.shiftKey &&
              (document.activeElement === first || document.activeElement === event.currentTarget)
            ) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <h2 id={titleId}>Recognize circuit</h2>
        <p>
          Choose public ports, then confirm their order. Every input combination is checked against
          registered components. No pin permutations or sampled proofs.
        </p>
        <label>
          Construction{" "}
          <select
            aria-label="Recognition scope"
            value={selectionOnly ? "selection" : "whole"}
            onChange={(e) => setSelectionOnly(e.target.value === "selection")}
          >
            <option value="whole">Complete circuit</option>
            <option value="selection" disabled={!selection.length && !wireSelection.length}>
              Selected parts and internal wires
            </option>
          </select>
        </label>
        {selectionOnly && (
          <p>
            Include the construction’s input switches and output lamps in your selection. Boundary
            wires are omitted.
          </p>
        )}
        <label>
          Compare with{" "}
          <select
            aria-label="Compare component"
            value={targetId}
            onChange={(e) => {
              controller.current?.abort();
              setBusy(false);
              setTargetId(e.target.value);
              setResult(null);
            }}
          >
            <option value="">All eligible components</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.inputs.length} in / {c.outputs.length} out)
              </option>
            ))}
          </select>
        </label>
        {(["inputs", "outputs"] as const).map((kind) => {
          const terminals = source.nodes.filter((n) =>
            kind === "inputs" ? ["switch", "clock", "pulse"].includes(n.type) : n.type === "lamp",
          );
          return (
            <fieldset key={kind}>
              <legend>{kind === "inputs" ? "Ordered inputs" : "Ordered public outputs"}</legend>
              {kind === "outputs" && <p>Unmarked lamps remain internal probes.</p>}
              {terminals.map((n) => (
                <label key={n.id} className={styles.terminal}>
                  <input
                    type="checkbox"
                    aria-label={`${kind === "inputs" ? "Input" : "Public output"} ${n.label || n.id}`}
                    checked={ports[kind].includes(n.id)}
                    onChange={(e) =>
                      updatePorts({
                        ...ports,
                        [kind]: e.target.checked
                          ? [...ports[kind], n.id]
                          : ports[kind].filter((id) => id !== n.id),
                      })
                    }
                  />
                  {n.label || n.id}
                </label>
              ))}
              {!terminals.length && (
                <p>
                  No {kind === "inputs" ? "input terminals" : "lamp terminals"} in this
                  construction.
                </p>
              )}
              <ol>
                {ports[kind].map((id, i) => (
                  <li key={id}>
                    {source.nodes.find((n) => n.id === id)?.label || id} →{" "}
                    {target?.[kind][i] || `${kind === "inputs" ? "Input" : "Output"} ${i + 1}`}
                    <button
                      type="button"
                      aria-label={`Move ${id} earlier`}
                      disabled={i === 0}
                      onClick={() => move(kind, i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${id} later`}
                      disabled={i === ports[kind].length - 1}
                      onClick={() => move(kind, i, 1)}
                    >
                      ↓
                    </button>
                  </li>
                ))}
              </ol>
            </fieldset>
          );
        })}
        <label>
          Part name{" "}
          <input
            aria-label="Recognized part name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className={styles.actions}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={() => void check()}>
            {busy ? "Checking…" : "Check behavior"}
          </button>
        </div>
        {result && (
          <div role="status">
            <p>{result.message}</p>
            {result.matches.map((match) => (
              <div key={match.componentId} className={styles.match}>
                <strong>{match.label}</strong>
                <p>
                  {[...match.inputs, ...match.outputs]
                    .map(
                      (pin) =>
                        `${source.nodes.find((n) => n.id === pin.nodeId)?.label || pin.nodeId} → ${pin.role}`,
                    )
                    .join(" · ")}
                </p>
                <button
                  type="button"
                  disabled={!name.trim()}
                  onClick={() => {
                    const verified = verifyCircuitIdentity(
                      { ...source, name: name.trim() },
                      ports,
                      match.componentId,
                    );
                    if (verified) onVerified(verified, selectionOnly);
                  }}
                >
                  {selectionOnly ? "Save verified construction" : "Use this verified identity"}
                </button>
              </div>
            ))}
            {(result.matches.length ? [] : result.counterexamples).map((example) => (
              <p key={example.componentId}>
                {recognitionComponent(example.componentId)?.label}: inputs{" "}
                {example.inputs.map(Number).join(" ")} → expected{" "}
                {example.expected.map(Number).join(" ")}; got {example.actual.map(Number).join(" ")}
                .
              </p>
            ))}
          </div>
        )}
        <p>
          Limits: 8 inputs, 512 nested nodes, 65,536 node evaluations. Stateful circuits require
          reset and temporal checks and currently report unsupported.
        </p>
      </div>
    </div>
  );
}
