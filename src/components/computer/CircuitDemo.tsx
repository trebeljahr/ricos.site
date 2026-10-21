import type { ReactNode } from "react";
import { useMemo } from "react";
import type { Circuit } from "../../lib/computer/logic";
import { LogicBuilder } from "./LogicBuilder";

/** Editable chapter circuit. Each instance starts fresh and never claims the reader's saved lab. */
export function CircuitDemo({
  makeCircuit,
  children,
  label,
  initialFocus,
}: {
  makeCircuit: () => Circuit;
  children?: ReactNode;
  label: string;
  initialFocus?: readonly string[];
}) {
  const circuit = useMemo(makeCircuit, [makeCircuit]);
  const defaultFocus = useMemo(() => circuit.nodes.map((node) => node.id), [circuit]);
  return (
    <section className="not-prose my-6" aria-label={label}>
      {children && <div className="mb-4 text-sm">{children}</div>}
      <div className="h-[80svh] min-h-[1000px] sm:min-h-[650px]">
        <LogicBuilder
          key={circuit.name}
          initialCircuit={circuit}
          initialFocus={initialFocus ?? defaultFocus}
          storageKey={null}
        />
      </div>
    </section>
  );
}
