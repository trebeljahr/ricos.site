import clsx from "clsx";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { bit } from "src/lib/computer/gateLogic";
import type { Circuit } from "src/lib/computer/logic";
import panel from "./ByteExplorer.module.css";
import toolbar from "./CircuitToolbar.module.css";
import gates from "./GateDemos.module.css";
import { type LockedClock, LogicBuilder } from "./LogicBuilder";
import { ToolbarMenu } from "./ToolbarMenu";
import table from "./TruthTables.module.css";

/** A key for one input, with its name above. */
export function InputKey({ name, on, onFlip }: { name: string; on: boolean; onFlip: () => void }) {
  return (
    <div className={gates.key}>
      <span aria-hidden="true">{name}</span>
      <button
        type="button"
        className={panel.bitButton}
        onClick={onFlip}
        aria-pressed={on}
        aria-label={`Input ${name}: ${on ? "1" : "0"}. Flip.`}
      >
        {bit(on)}
      </button>
    </div>
  );
}

/** A lamp for one output, with its name above and its value below. */
export function OutputLamp({ name, on }: { name: string; on: boolean }) {
  return (
    <div className={gates.lampOut} role="img" aria-label={`Output ${name}: ${on ? "1" : "0"}`}>
      <span aria-hidden="true">{name}</span>
      <i data-on={on} aria-hidden="true" />
      <span aria-hidden="true">{bit(on)}</span>
    </div>
  );
}

/** The same menu surface used for the builder's File, View and Clock menus. */
export function CircuitPicker({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={clsx(toolbar.root, table.picker)}>
      <ToolbarMenu label={label} closeOnSelect>
        {children}
      </ToolbarMenu>
    </div>
  );
}

export const port = (name: string) => ({ id: name.toLowerCase(), label: name });

/** Use the builder's switches and timeline as the source of the selected row. */
export function useTableCircuit(circuit: Circuit, controls?: ReactNode) {
  const clock = useRef<LockedClock | null>(null);
  const switches = useMemo(() => circuit.nodes.filter((node) => node.type === "switch"), [circuit]);
  const [inputs, setInputs] = useState(() => switches.map((node) => Boolean(node.value)));
  const initialFocus = useMemo(() => circuit.nodes.map((node) => node.id), [circuit]);
  const render = (sidebar: ReactNode) => (
    <div className={table.circuit}>
      <LogicBuilder
        embedded
        storageKey={null}
        initialFocus={initialFocus}
        locked={{
          circuit,
          clockRef: clock,
          interactiveInputs: true,
          controls,
          panel: sidebar,
          panelLabel: "Truth table",
          onFrame: ({ frame }) => {
            const next = switches.map((node) => Boolean(frame.snapshot.values[node.id]));
            setInputs((current) =>
              next.every((value, index) => value === current[index]) &&
              next.length === current.length
                ? current
                : next,
            );
          },
        }}
      />
    </div>
  );
  const pick = (row: boolean[]) => {
    clock.current?.input(Object.fromEntries(switches.map((node, index) => [node.id, row[index]])));
  };
  return { render, inputs, pick };
}

export function withInputs(circuit: Circuit, inputs: boolean[]): Circuit {
  let index = 0;
  return {
    ...circuit,
    nodes: circuit.nodes.map((node) =>
      node.type === "switch" ? { ...node, value: inputs[index++] ?? false } : node,
    ),
  };
}
