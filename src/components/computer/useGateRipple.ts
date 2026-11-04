import { useEffect, useMemo, useState } from "react";
import {
  type Circuit,
  initialSnapshot,
  type Ripple,
  rippleFrame,
  type Snapshot,
  stepWithDelays,
} from "src/lib/computer/logic";
import { isMosfet } from "src/lib/computer/transistorGeometry";

/** How long a voltage change takes to cross the longest gate wire of one delay step. */
export const WAVE_MS = 400;

type Inputs = { a: boolean; b: boolean };
type Run = {
  circuit: Circuit;
  key: string;
  previous: Snapshot;
  ripple: Ripple;
  at: number;
};

export type GateRipple = {
  /** What devices and the lamp show right now. */
  snapshot: Snapshot;
  /** The voltage each wire holds: a wire that is still changing keeps its old value. */
  voltages: Record<string, boolean>;
  /** Nets whose new voltage is on its way to their gates, with that new voltage. */
  waves: Map<string, boolean>;
  /** Changes each time a new set of waves starts, so their animations restart. */
  waveKey: number;
};

const prefersMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: no-preference)").matches === true;

/** The delay steps of this tick at which a net starts changing the gates it feeds. */
function waveSteps(circuit: Circuit, ripple: Ripple) {
  const byId = new Map(circuit.nodes.map((node) => [node.id, node]));
  const drivers = new Set(
    circuit.wires
      .filter((wire) => wire.input === 0 && isMosfet(byId.get(wire.to)!))
      .map((wire) => wire.from),
  );
  const steps = new Map<number, string[]>();
  for (const [id, at] of Object.entries(ripple.delays)) {
    if (!drivers.has(id)) continue;
    steps.set(at, [...(steps.get(at) ?? []), id]);
  }
  return steps;
}

const done = (ripple: Ripple) => ripple.steps + 1;

function settled(circuit: Circuit, key: string, inputs: Inputs): Run {
  const previous = initialSnapshot();
  const ripple = stepWithDelays(circuit, previous, false, {}, inputs);
  return { circuit, key, previous, ripple, at: done(ripple) };
}

/**
 * Replays one simulator tick with its real gate delays: a flipped input sends its
 * voltage down the wire, the transistors react when it arrives, and their output
 * sends the next wave. The settled values are exactly step()'s.
 */
export function useGateRipple(circuit: Circuit, inputs: Inputs, animate: boolean): GateRipple {
  const key = `${inputs.a}${inputs.b}`;
  const [run, setRun] = useState(() => settled(circuit, key, inputs));
  let current = run;
  if (run.circuit !== circuit) {
    current = settled(circuit, key, inputs);
    setRun(current);
  } else if (run.key !== key) {
    const ripple = stepWithDelays(circuit, run.ripple.snapshot, false, {}, inputs);
    current = {
      circuit,
      key,
      previous: run.ripple.snapshot,
      ripple,
      at: animate && prefersMotion() ? 0 : done(ripple),
    };
    setRun(current);
  }
  const { previous, ripple, at } = current;
  const steps = useMemo(() => waveSteps(circuit, ripple), [circuit, ripple]);
  useEffect(() => {
    if (at >= done(ripple)) return;
    const next = [...steps.keys()].filter((step) => step > at).sort((x, y) => x - y)[0];
    const timer = window.setTimeout(
      () =>
        setRun((value) =>
          value.ripple === ripple ? { ...value, at: next ?? done(ripple) } : value,
        ),
      WAVE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [at, ripple, steps]);
  return useMemo(() => {
    const snapshot = rippleFrame(previous, ripple, at);
    const voltages = { ...snapshot.values };
    const waves = new Map<string, boolean>();
    for (const id of steps.get(at) ?? []) {
      waves.set(id, Boolean(snapshot.values[id]));
      voltages[id] = Boolean(previous.values[id]);
    }
    return { snapshot, voltages, waves, waveKey: at };
  }, [previous, ripple, at, steps]);
}
