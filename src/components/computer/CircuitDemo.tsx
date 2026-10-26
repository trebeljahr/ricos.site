import type { ReactNode } from "react";
import { useMemo } from "react";
import { demoStorageKey } from "../../lib/computer/demoStorage";
import type { Circuit } from "../../lib/computer/logic";
import { type LockedView, LogicBuilder } from "./LogicBuilder";

/** Editable chapter circuit with its own save slot, separate from the reader's lab. */
export function CircuitDemo({
  makeCircuit,
  children,
  label,
  initialFocus,
  revision,
  onFrame,
}: {
  makeCircuit: () => Circuit;
  children?: ReactNode;
  label: string;
  initialFocus?: readonly string[];
  /** A changed starter circuit gets a fresh slot; older reader edits stay saved. */
  revision?: string;
  onFrame?: (view: LockedView) => void;
}) {
  const circuit = useMemo(makeCircuit, [makeCircuit]);
  const defaultFocus = useMemo(() => circuit.nodes.map((node) => node.id), [circuit]);
  const storageKey = demoStorageKey(label, circuit.name, ...(revision ? [revision] : []));
  return (
    <section className="not-prose my-6" aria-label={label}>
      {children && <div className="mb-4 text-sm">{children}</div>}
      <div className="h-[80svh] min-h-[1000px] sm:min-h-[650px]">
        <LogicBuilder
          key={storageKey}
          initialCircuit={circuit}
          initialFocus={initialFocus ?? defaultFocus}
          storageKey={storageKey}
          onFrame={onFrame}
        />
      </div>
    </section>
  );
}
