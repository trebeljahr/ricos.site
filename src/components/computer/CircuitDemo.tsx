import type { ReactNode } from "react";
import { useMemo, useRef } from "react";
import { demoStorageKey } from "../../lib/computer/demoStorage";
import type { Circuit } from "../../lib/computer/logic";
import { type LockedClock, type LockedView, LogicBuilder } from "./LogicBuilder";

/**
 * Chapter circuit on the shared builder. By default it is editable with its own save
 * slot, separate from the reader's lab. A `showcase` demo only shows how a circuit
 * works: no palette, toolbar, saving or editing; switches stay clickable and blocks
 * still unfold.
 */
export function CircuitDemo({
  makeCircuit,
  children,
  label,
  initialFocus,
  revision,
  onFrame,
  openModules = false,
  showcase = false,
}: {
  makeCircuit: () => Circuit;
  children?: ReactNode;
  label: string;
  initialFocus?: readonly string[];
  /** A changed starter circuit gets a fresh slot; older reader edits stay saved. */
  revision?: string;
  onFrame?: (view: LockedView) => void;
  /** Start one level down: the circuit's modules open, the gates inside them still closed. */
  openModules?: boolean;
  /** Read-only: readers operate the inputs but cannot change the circuit. */
  showcase?: boolean;
}) {
  const circuit = useMemo(makeCircuit, [makeCircuit]);
  const defaultFocus = useMemo(() => circuit.nodes.map((node) => node.id), [circuit]);
  const modules = useMemo(
    () => circuit.nodes.filter((node) => node.type === "module").map((node) => node.id),
    [circuit],
  );
  const clock = useRef<LockedClock | null>(null);
  const hasClock = useMemo(() => circuit.nodes.some((node) => node.type === "clock"), [circuit]);
  const storageKey = demoStorageKey(label, circuit.name, ...(revision ? [revision] : []));
  return (
    <section className="not-prose my-6" aria-label={label}>
      {children && <div className="mb-4 text-sm">{children}</div>}
      <div className="h-[80svh] min-h-[1000px] sm:min-h-[650px]">
        {showcase ? (
          <LogicBuilder
            key={storageKey}
            storageKey={null}
            initialFocus={initialFocus ?? defaultFocus}
            locked={{
              circuit,
              clockRef: clock,
              interactiveInputs: true,
              unfolded: openModules ? modules : undefined,
              onFrame,
              controls: hasClock && (
                <button type="button" onClick={() => clock.current?.cycle()}>
                  Clock pulse
                </button>
              ),
            }}
          />
        ) : (
          <LogicBuilder
            key={storageKey}
            initialCircuit={circuit}
            initialUnfolded={openModules ? modules : undefined}
            initialFocus={initialFocus ?? defaultFocus}
            storageKey={storageKey}
            onFrame={onFrame}
          />
        )}
      </div>
    </section>
  );
}
