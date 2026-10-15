/**
 * Switch-level model of the CMOS gates in chapter 1.2: which transistors are on,
 * which nets they connect, and which path carries 1 or 0 to the output.
 *
 * A pMOS conducts when its gate is 0, an nMOS when its gate is 1. Every stage has
 * a pull-up network of pMOS between the supply (1) and its output and a pull-down
 * network of nMOS between its output and ground (0).
 */

export const CMOS_GATES = ["not", "nand", "nor", "and", "or"] as const;
export type CmosGate = (typeof CMOS_GATES)[number];
export type Bit = 0 | 1;
export type Channel = "p" | "n";
export type StageKind = "not" | "nand" | "nor";

/** One transistor. `ends` lists its two channel terminals, top first as drawn. */
export type CmosTransistor = {
  id: string;
  channel: Channel;
  gate: "a" | "b" | "x";
  ends: readonly [string, string];
};

export type CmosStage = {
  kind: StageKind;
  output: "x" | "y";
  transistors: CmosTransistor[];
};

export const GATE_LABELS: Record<CmosGate, string> = {
  not: "NOT",
  nand: "NAND",
  nor: "NOR",
  and: "AND",
  or: "OR",
};

const fet = (
  channel: Channel,
  gate: CmosTransistor["gate"],
  top: string,
  bottom: string,
): CmosTransistor => ({
  id: `${channel}${gate.toUpperCase()}`,
  channel,
  gate,
  ends: [top, bottom],
});

function stage(kind: StageKind, output: "x" | "y", input: "a" | "x" = "a"): CmosStage {
  const transistors =
    kind === "not"
      ? [fet("p", input, "vdd", output), fet("n", input, output, "gnd")]
      : kind === "nand"
        ? // Two pMOS side by side, two nMOS stacked.
          [
            fet("p", "a", "vdd", output),
            fet("p", "b", "vdd", output),
            fet("n", "a", output, "m"),
            fet("n", "b", "m", "gnd"),
          ]
        : // NOR swaps them: two pMOS stacked, two nMOS side by side.
          [
            fet("p", "a", "vdd", "m"),
            fet("p", "b", "m", output),
            fet("n", "a", output, "gnd"),
            fet("n", "b", output, "gnd"),
          ];
  return { kind, output, transistors };
}

/** The stages of a gate, in signal order. AND and OR add an inverter after NAND and NOR. */
export function cmosStages(gate: CmosGate): CmosStage[] {
  switch (gate) {
    case "not":
      return [stage("not", "y")];
    case "nand":
      return [stage("nand", "y")];
    case "nor":
      return [stage("nor", "y")];
    case "and":
      return [stage("nand", "x"), stage("not", "y", "x")];
    case "or":
      return [stage("nor", "x"), stage("not", "y", "x")];
  }
}

export const inputCount = (gate: CmosGate) => (gate === "not" ? 1 : 2);

/** The gate's specification, independent of any wiring. */
export function gateTruth(gate: CmosGate, a: Bit, b: Bit): Bit {
  const bit = (value: boolean): Bit => (value ? 1 : 0);
  switch (gate) {
    case "not":
      return bit(!a);
    case "nand":
      return bit(!(a && b));
    case "nor":
      return bit(!(a || b));
    case "and":
      return bit(Boolean(a && b));
    case "or":
      return bit(Boolean(a || b));
  }
}

export type TruthRow = { a: Bit; b: Bit; y: Bit };

export function truthRows(gate: CmosGate): TruthRow[] {
  const inputs: Array<[Bit, Bit]> =
    inputCount(gate) === 1
      ? [
          [0, 0],
          [1, 0],
        ]
      : [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
        ];
  return inputs.map(([a, b]) => ({ a, b, y: gateTruth(gate, a, b) }));
}

export const conducts = (channel: Channel, gate: Bit | null) =>
  gate !== null && (channel === "n" ? gate === 1 : gate === 0);

export type NetState = {
  /** 1 or 0 when the net connects to exactly one rail, null when floating or shorted. */
  value: Bit | null;
  /** The rail value whose conducting path to a stage output passes through this net. */
  path: Bit | null;
};
export type TransistorState = { on: boolean; path: Bit | null };
export type StageState = {
  kind: StageKind;
  output: "x" | "y";
  value: Bit | null;
  pullUp: boolean;
  pullDown: boolean;
};
export type CmosState = {
  gate: CmosGate;
  a: Bit;
  b: Bit;
  output: Bit | null;
  /** True when some net connects to both rails at once. */
  short: boolean;
  nets: Record<string, NetState>;
  transistors: Record<string, TransistorState>;
  stages: StageState[];
};

const other = (transistor: CmosTransistor, net: string) =>
  transistor.ends[0] === net
    ? transistor.ends[1]
    : transistor.ends[1] === net
      ? transistor.ends[0]
      : null;

function reach(from: string, on: CmosTransistor[]) {
  const seen = new Set([from]);
  const queue = [from];
  for (let net = queue.shift(); net !== undefined; net = queue.shift())
    for (const transistor of on) {
      const next = other(transistor, net);
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  return seen;
}

/** Every transistor and net on some simple path from a rail to a target, through on transistors. */
function paths(from: "vdd" | "gnd", to: string, on: CmosTransistor[]) {
  const fets = new Set<string>();
  const nets = new Set<string>();
  const walk = (net: string, visited: string[], used: string[]) => {
    if (net === to) {
      for (const id of used) fets.add(id);
      for (const name of visited) nets.add(name);
      return;
    }
    for (const transistor of on) {
      const next = other(transistor, net);
      if (!next || used.includes(transistor.id) || visited.includes(next)) continue;
      // A path to one rail never runs through the other.
      if (next === "vdd" || next === "gnd") continue;
      walk(next, [...visited, next], [...used, transistor.id]);
    }
  };
  walk(from, [from], []);
  return { fets, nets };
}

/** Which transistors are on, what every net carries and which path drives each output. */
export function cmosState(gate: CmosGate, a: Bit, b: Bit): CmosState {
  const stages = cmosStages(gate);
  const all = stages.flatMap((item) => item.transistors);
  const values: Record<string, Bit | null> = { vdd: 1, gnd: 0, a, b, x: null };
  let on: CmosTransistor[] = [];
  let short = false;
  // A later stage reads an earlier stage's output, so settle one stage per pass.
  for (let pass = 0; pass <= stages.length; pass++) {
    on = all.filter((transistor) => conducts(transistor.channel, values[transistor.gate] ?? null));
    const up = reach("vdd", on);
    const down = reach("gnd", on);
    short = up.has("gnd");
    for (const transistor of all)
      for (const net of transistor.ends) {
        if (net === "vdd" || net === "gnd") continue;
        values[net] = up.has(net) && !down.has(net) ? 1 : down.has(net) && !up.has(net) ? 0 : null;
      }
  }

  const transistors: Record<string, TransistorState> = Object.fromEntries(
    all.map((transistor) => [transistor.id, { on: on.includes(transistor), path: null }]),
  );
  const nets: Record<string, NetState> = {};
  for (const [net, value] of Object.entries(values)) nets[net] = { value, path: null };

  const stageStates = stages.map((item): StageState => {
    const inStage = on.filter((transistor) => item.transistors.includes(transistor));
    const upPath = paths("vdd", item.output, inStage);
    const downPath = paths("gnd", item.output, inStage);
    for (const [rail, found] of [
      [1, upPath],
      [0, downPath],
    ] as const) {
      for (const id of found.fets) transistors[id].path = rail;
      for (const net of found.nets) if (nets[net]) nets[net].path = rail;
    }
    return {
      kind: item.kind,
      output: item.output,
      value: values[item.output] ?? null,
      pullUp: upPath.fets.size > 0,
      pullDown: downPath.fets.size > 0,
    };
  });
  // The rails are sources, not part of one gate's path.
  nets.vdd.path = null;
  nets.gnd.path = null;

  return {
    gate,
    a,
    b,
    output: values.y ?? null,
    short,
    nets,
    transistors,
    stages: stageStates,
  };
}

/** "pMOS A", "nMOS X". */
export const transistorName = (transistor: Pick<CmosTransistor, "channel" | "gate">) =>
  `${transistor.channel}MOS ${transistor.gate.toUpperCase()}`;

function listOf(items: CmosTransistor[]) {
  if (items.length === 2 && items[0].channel === items[1].channel)
    return `Both ${items[0].channel}MOS`;
  return items.map(transistorName).join(" and ");
}

export type StageExplanation = {
  /** NAND, NOR or NOT. */
  stage: string;
  /** The network that conducts and where it connects the stage output. */
  conducting: string;
  /** The network that is open, and why. */
  open: string;
};

/** Two short sentences per stage, one for each network. */
export function explainCmos(state: CmosState): StageExplanation[] {
  return cmosStages(state.gate).map((item, index) => {
    const value = state.stages[index].value;
    const name = item.output.toUpperCase();
    if (value === null)
      return { stage: item.kind.toUpperCase(), conducting: `${name} floats.`, open: "" };
    const driving = item.transistors.filter(
      (transistor) => state.transistors[transistor.id].path === value,
    );
    const blocked = item.transistors.filter(
      (transistor) =>
        transistor.channel === (value === 1 ? "n" : "p") && !state.transistors[transistor.id].on,
    );
    const verb = (items: CmosTransistor[]) => (items.length === 1 ? "is" : "are");
    return {
      stage: item.kind.toUpperCase(),
      conducting: `${listOf(driving)} ${verb(driving)} on, so ${name} connects to ${value}.`,
      open: `${listOf(blocked)} ${verb(blocked)} off, so ${name} has no path to ${1 - value}.`,
    };
  });
}

/** One sentence list for screen readers: what is on, what is off, what Y reads. */
export function describeCmos(state: CmosState): string {
  const all = cmosStages(state.gate).flatMap((item) => item.transistors);
  const names = (on: boolean) =>
    all
      .filter((transistor) => state.transistors[transistor.id].on === on)
      .map(transistorName)
      .join(", ") || "none";
  const inputs =
    inputCount(state.gate) === 1 ? `A is ${state.a}` : `A is ${state.a}, B is ${state.b}`;
  const steps = explainCmos(state)
    .map((item) => `${item.conducting} ${item.open}`.trim())
    .join(" ");
  return `${GATE_LABELS[state.gate]} gate from ${all.length} transistors. ${inputs}. On: ${names(true)}. Off: ${names(false)}. ${steps}`;
}
