import { useEffect, useMemo, useRef } from "react";
import { gateDemo } from "../../lib/computer/demoCircuits";
import type { LogicGate } from "../../lib/computer/logic";
import { type LockedClock, LogicBuilder } from "./LogicBuilder";

/** A truth-table's inputs drive the same unfoldable gate view as the CPU bench. */
export function CircuitPreview({
  gate,
  a,
  b = false,
}: {
  gate: LogicGate;
  a: boolean;
  b?: boolean;
}) {
  const circuit = useMemo(() => gateDemo(gate), [gate]);
  const initialFocus = useMemo(() => circuit.nodes.map((node) => node.id), [circuit]);
  const clock = useRef<LockedClock | null>(null);
  // A gate change reloads the locked board; reapply even unchanged input levels.
  // biome-ignore lint/correctness/useExhaustiveDependencies: circuit changes reload the child runtime
  useEffect(() => {
    clock.current?.input({ a, b });
  }, [circuit, a, b]);
  return (
    <div className="not-prose h-[320px] min-w-0">
      <LogicBuilder
        storageKey={null}
        initialFocus={initialFocus}
        locked={{ circuit, clockRef: clock }}
      />
    </div>
  );
}
