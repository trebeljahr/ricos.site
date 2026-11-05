import { SIGNALS, type Signal } from "../../../computerStepper";
import type { Ref } from "../../blockBuilder";
import { buttonCpuCircuit, buttonInputCircuit } from "../../buttonInterrupt";
import { CPU_PARTS } from "../../cpuPreset";
import { matrixRowCircuit, sampledEventCircuit } from "../../keyboardMatrix";
import { type Circuit, initialSnapshot, moduleInputs, moduleOutputs, step } from "../../logic";
import { listProbes, readProbes } from "../../probes";
import { CircuitKit } from "../kit";
import type { Level, SequenceTick } from "../types";
import { constructionHints } from "./constructionHints";

const section = "Buttons and keyboards";
const ports = (circuit: Circuit) => ({
  inputs: moduleInputs(circuit).map((n) => ({
    id: n.id,
    label: n.label!,
    clock: n.type === "clock",
    button: ["raw", "ack", "reset"].includes(n.id),
  })),
  outputs: moduleOutputs(circuit).map((n) => ({ id: n.id, label: n.label! })),
});
const captureTicks: SequenceTick[] = [
  { expect: { captured: false, sampled: false, request: false }, note: "Start with no request." },
  {
    set: { raw: true },
    expect: { captured: true, sampled: false, request: false },
    note: "Capture the raw rising edge before any CPU clock.",
  },
  {
    set: { raw: false },
    expect: { captured: true },
    note: "A brief press must remain captured after release.",
  },
  {
    clock: true,
    expect: { request: false },
    note: "First sample has not crossed both sampling stages.",
  },
  { clock: false, note: "Falling edge does not sample." },
  {
    clock: true,
    expect: { request: true, sampled: false },
    note: "Second sample exposes the remembered request, although the button is released.",
  },
  {
    set: { ack: true },
    expect: { captured: false, request: false },
    note: "Acknowledge clears capture immediately.",
  },
  {
    set: { ack: false, raw: true },
    expect: { captured: true },
    note: "A new press after acknowledge captures another event.",
  },
  { clock: false, note: "Prepare another sample." },
  { clock: true, note: "Sample a held button." },
  { clock: false, note: "Return clock low." },
  {
    clock: true,
    expect: { sampled: true, request: true },
    note: "Held level and request are now sampled.",
  },
  {
    set: { ack: true },
    expect: { captured: false, request: false },
    note: "Acknowledge while held clears the event.",
  },
  {
    set: { ack: false },
    expect: { captured: false, request: false },
    note: "Releasing acknowledge while still held must not create another event.",
  },
  { clock: false, note: "Return clock low while held." },
  {
    clock: true,
    expect: { captured: false, request: false },
    note: "A held button cannot retrigger.",
  },
  { set: { raw: false }, note: "Release rearms the raw edge." },
  { set: { raw: true }, expect: { captured: true }, note: "A new rising edge captures again." },
  {
    set: { reset: true },
    expect: { captured: false, sampled: false, request: false },
    note: "Reset clears every stage and wins over a held input.",
  },
  {
    set: { reset: false },
    expect: { captured: false, request: false },
    note: "Releasing reset with input high does not count as another press.",
  },
];
const capture: Level = {
  id: "button-capture",
  title: "Remember a brief button press",
  section,
  optional: true,
  goal: "Remember a rising button edge until ACK clears it, and sample it on the clock.",
  palette: ["high", "not", "and", "or", "dff"],
  reference: buttonInputCircuit,
  makes: { part: "button-request", label: "Button request capture", builtIn: { reference: true } },
  spec: { kind: "sequence", ...ports(buttonInputCircuit()), ticks: captureTicks },
  hints: [
    {
      title: "Core idea",
      text: "A sampled level and a remembered event solve different problems. Which storage element can see the button's own rising edge?",
    },
    {
      text: "A request must stay present after release. Separate that memory from the two clocked sampling stages.",
    },
    {
      text: "ACK must cancel the outstanding request even if the sampling pipeline still contains a 1. Consider both meanings when forming REQUEST.",
    },
    {
      text: "Reset must work without another button edge. The D flip-flop context menu exposes an asynchronous reset input.",
    },
    {
      title: "Last hint",
      text: "Clock one flip-flop from the raw button to remember each press, sample the level and the request through two more stages on the clock, and let ACK clear the memory.",
    },
  ],
};

export { sampledEventCircuit } from "../../keyboardMatrix";

function sampleTicks(): SequenceTick[] {
  const ticks: SequenceTick[] = [
    { expect: { stable: false, pressed: false, released: false }, note: "Start released." },
  ];
  let stable = false,
    previous = false,
    old = false;
  for (const raw of [true, false, true, true, true, true, false, true, false, false, false]) {
    ticks.push({ set: { raw }, clock: false, note: "Prepare the next completed frame." });
    const next: boolean = raw === previous ? raw : stable;
    old = stable;
    previous = raw;
    stable = next;
    ticks.push({
      clock: true,
      expect: { stable, pressed: stable && !old, released: !stable && old },
      note: "Accept only two equal samples; report each accepted transition once.",
    });
  }
  return ticks;
}
const samples: Level = {
  id: "sampled-key-events",
  title: "Filter samples and detect transitions",
  section,
  optional: true,
  goal: "Change STABLE after two equal samples, and pulse PRESS or RELEASE once for each change.",
  palette: ["dff", "and", "or", "not", "xor"],
  reference: sampledEventCircuit,
  makes: {
    part: "sampled-key-events",
    label: "Sample filter and key transitions",
    builtIn: { reference: true },
  },
  spec: { kind: "sequence", ...ports(sampledEventCircuit()), ticks: sampleTicks() },
  hints: constructionHints(
    "Two equal samples accept a new stable state. Event outputs describe a change in that stable state.",
    "Remember the previous raw sample and the previous stable value with flip-flops.",
    "Accept RAW as STABLE only when two samples agree, and compare STABLE with its previous value to make the two events.",
    "Apply one high sample then a low sample: STABLE must remain low. Two high samples produce one press event; holding high must not repeat it.",
  ),
};

const rows: Level[] = Array.from({ length: 14 }, (_, i) => i + 2).map((columns) => {
  const source = matrixRowCircuit(columns);
  const all = (on: boolean) => Array<boolean>(columns).fill(on);
  const patterns = [
    all(false),
    all(true),
    ...Array.from({ length: columns }, (_, c) => all(false).map((_, i) => i === c)),
    all(false).map((_, i) => i % 2 === 0),
  ];
  return {
    id: `matrix-row-${columns}`,
    title: "Sense an isolated matrix row",
    section,
    optional: true,
    practice: { family: "matrix-row", core: columns === 2, label: `${columns} columns` },
    goal: `Give each of ${columns} columns its own SENSE LOW output while this row is active.`,
    palette: ["and", "not", "nand", "or"],
    reference: () => source,
    makes: {
      part: `matrix-row-${columns}`,
      label: `${columns}-column isolated row`,
      builtIn: { reference: true },
    },
    spec: {
      kind: "truth",
      ...ports(source),
      fn: ([active, ...keys]: boolean[]) => keys.map((key) => active && key),
      ...(columns > 4
        ? {
            rows: patterns.flatMap((keys) => [
              [false, ...keys],
              [true, ...keys],
            ]),
          }
        : {}),
    },
    hints: constructionHints(
      "Each column responds independently to its own contact and the shared row-active condition.",
      "Choose one column. It reports SENSE LOW only when both the row and that contact are active.",
      "Give each column its own AND of ROW ACTIVE and that column's contact.",
      "Activate two contacts together, then deactivate the row. Both sense outputs must turn off without changing the contacts.",
    ),
  } satisfies Level;
});

const decoderInputs = [
  { id: "a0", label: "ROW ADDRESS 0" },
  { id: "a1", label: "ROW ADDRESS 1" },
];
const decoderOutputs = Array.from({ length: 4 }, (_, i) => ({
  id: `r${i}`,
  label: `ROW ${i} ACTIVE`,
}));
const decoder: Level = {
  id: "matrix-row-select",
  title: "Select one scan row",
  section,
  optional: true,
  goal: "Turn the two-bit row address into exactly one active row.",
  palette: ["not", "and", "nor", "nand"],
  spec: {
    kind: "truth",
    inputs: decoderInputs,
    outputs: decoderOutputs,
    fn: ([a, b]) => Array.from({ length: 4 }, (_, i) => i === Number(a) + 2 * Number(b)),
  },
  reference: () => {
    const k = new CircuitKit("Row selector", decoderInputs, decoderOutputs);
    const na = k.gate("not", ["a0"]),
      nb = k.gate("not", ["a1"]);
    for (let i = 0; i < 4; i++)
      k.out(`r${i}`, k.gate("and", [i & 1 ? "a0" : na, i & 2 ? "a1" : nb]));
    return k.build();
  },
  hints: constructionHints(
    "An address selects exactly one scan row. The outputs enable row drivers; they do not carry key data.",
    "Invert both address bits so each row can match either value of each bit.",
    "AND each row's true or inverted address bits, so each address turns on exactly one row.",
    "Try all four addresses. Exactly one row-active output must be high for each address.",
  ),
};
const shiftInputs = [
  { id: "event", label: "PRESS EVENT" },
  { id: "code", label: "POSITION (0=A, 1=B)" },
  { id: "shift", label: "SHIFT STATE" },
];
const shiftOutputs = Array.from({ length: 7 }, (_, i) => ({
  id: `bit${i}`,
  label: `CHARACTER BIT ${i}`,
}));
const mapping: Level = {
  id: "shift-character-map",
  title: "Map position and Shift to a character",
  section,
  optional: true,
  goal: "On a press event, output ASCII a/b or A/B by POSITION and SHIFT, and otherwise zero.",
  palette: ["high", "ground", "and", "not", "nand", "or"],
  spec: {
    kind: "truth",
    inputs: shiftInputs,
    outputs: shiftOutputs,
    fn: ([event, code, shift]) =>
      Array.from({ length: 7 }, (_, i) =>
        Boolean(((event ? (shift ? 65 : 97) + Number(code) : 0) >> i) & 1),
      ),
  },
  reference: () => {
    const k = new CircuitKit("Small character map", shiftInputs, shiftOutputs);
    const zero = k.gate("ground", []),
      nc = k.gate("not", ["code"]),
      ns = k.gate("not", ["shift"]);
    const source: Ref[] = [
      k.gate("and", ["event", nc]),
      k.gate("and", ["event", "code"]),
      zero,
      zero,
      zero,
      k.gate("and", ["event", ns]),
      "event",
    ];
    source.forEach((s, i) => {
      k.out(`bit${i}`, s);
    });
    return k.build();
  },
  hints: constructionHints(
    "ASCII a/b and A/B differ in a few bits. The press event gates every character so a held modifier emits nothing.",
    "Write 97,98,65,66 in binary. Compare which bits depend on POSITION and which depend on SHIFT.",
    "Write the four letter codes in binary, then let EVENT gate every 1 bit, with POSITION and SHIFT choosing the bits that differ.",
    "Try all four letter choices with EVENT high, then turn EVENT off. All character outputs must become zero.",
  ),
};

const cpuReference = () => buttonCpuCircuit();
export function gradeInterruptInterface(circuit: Circuit) {
  let snapshot = step(circuit, initialSnapshot(), false);
  const outputs: number[] = [];
  let entries = 0,
    priorInt = false;
  for (let tick = 0; tick < 700; tick++) {
    if (tick === 40 || tick === 400) {
      snapshot = step(circuit, snapshot, false, { "button-raw": true });
      snapshot = step(circuit, snapshot, false, { "button-raw": false });
    }
    const entered = Boolean(snapshot.values[CPU_PARTS.int]);
    if (entered && !priorInt) entries++;
    priorInt = entered;
    snapshot = step(circuit, snapshot, true);
    snapshot = step(circuit, snapshot, false);
    if (snapshot.unstable) return { pass: false, summary: "The circuit did not settle." };
    const out = readProbes(circuit, snapshot).OUT ?? 0;
    if (out !== (outputs.at(-1) ?? 0)) outputs.push(out);
  }
  const pass =
    JSON.stringify(outputs) === "[1,2]" && entries === 2 && !snapshot.values[CPU_PARTS.keyReady];
  return {
    pass,
    summary: pass
      ? "Two brief presses entered the real interrupt path, updated OUT to 1 then 2 and acknowledged both requests."
      : `Observed OUT ${outputs.join(", ") || "0"}; ${entries} interrupt entries. Each captured request must reach the key port, and IN must acknowledge it.`,
  };
}
const cpu: Level = {
  id: "cpu-button-interface",
  title: "Connect an interrupting input to the CPU",
  section,
  optional: true,
  goal: "Connect the input capture so two brief presses count OUT up to 1, then 2.",
  palette: ["junction", "and", "or", "not"],
  reference: cpuReference,
  start: () => {
    const full = cpuReference();
    return {
      circuit: {
        ...full,
        wires: full.wires.filter(
          (w) =>
            w.to !== "button-interface" &&
            !(w.from === "button-interface" && [CPU_PARTS.key, "ready-next"].includes(w.to)),
        ),
      },
      locked: full.nodes.map((n) => n.id),
    };
  },
  spec: {
    kind: "custom",
    describe: "Two brief button presses while a real CPU runs 700 clock ticks",
    grade: gradeInterruptInterface,
  },
  hints: [
    {
      title: "Core idea",
      text: "Follow the event backward from KEY READY. The interface request is a level held until the CPU reads it, not a direct jump in program code.",
    },
    {
      text: "The control unit's KEY_OUT line identifies IN's read. Acknowledge must clear the request before it can be taken again.",
    },
    {
      text: "A request needs the raw button edge and the sample clock for different jobs. Reversing those clocks can make short presses disappear.",
    },
    {
      title: "Last hint",
      text: "Give the capture part the raw button, the CPU clock and reset, send its request to the key port, and use KEY_OUT as its acknowledge.",
    },
  ],
};
/** The same program must keep its PC, stack and arithmetic state while servicing input. */
export function gradeInterruptCpu(circuit: Circuit) {
  const expected = cpuReference();
  const actualProbes = listProbes(circuit),
    referenceProbes = listProbes(expected);
  let actual = step(circuit, initialSnapshot(), false);
  let reference = step(expected, initialSnapshot(), false);
  for (let tick = 0; tick < 700; tick++) {
    if (tick === 40 || tick === 400) {
      for (const high of [true, false]) {
        actual = step(circuit, actual, false, { "button-raw": high });
        reference = step(expected, reference, false, { "button-raw": high });
      }
    }
    for (const high of [true, false]) {
      actual = step(circuit, actual, high);
      reference = step(expected, reference, high);
      if (actual.unstable)
        return { pass: false, summary: `The circuit did not settle at tick ${tick}.` };
      const mine = readProbes(circuit, actual, actualProbes),
        wanted = readProbes(expected, reference, referenceProbes);
      for (const name of ["PC", "ACC", "FLAGS", "SP", "KEY", "IRQ", "OUT"])
        if (mine[name] !== wanted[name])
          return {
            pass: false,
            summary: `At tick ${tick}, ${name} should be ${wanted[name]}, but reads ${mine[name] ?? "missing"}. Follow request → instruction boundary → saved PC → handler → RETI.`,
            table: {
              head: ["Register", "Expected", "Your CPU"],
              rows: [[name, String(wanted[name]), String(mine[name] ?? "missing")]],
            },
          };
    }
  }
  // Matching the complete reference trace also checks the handler's saved ACC/carry and resumed loop.
  return {
    pass: true,
    summary:
      "Two requests matched the CPU tick for tick: entry saved PC and masked interrupts, IN acknowledged input, and RETI resumed with PC, SP, ACC and carry intact.",
  };
}

const interruptCpu: Level = {
  id: "cpu-interrupt-entry",
  title: "Build interrupt entry and return",
  section,
  optional: true,
  goal: "Wire interrupt entry and return so the handler runs once per press and the loop resumes.",
  palette: ["junction", "and", "or", "not"],
  reference: cpuReference,
  start: () => {
    const full = cpuReference();
    return {
      circuit: { ...full, wires: full.wires.filter((wire) => !interruptWiring(wire)) },
      locked: full.nodes.map((node) => node.id),
    };
  },
  spec: {
    kind: "custom",
    describe:
      "Two presses over 700 CPU ticks, checking PC, SP, ACC, carry, input, interrupt state and OUT against the working CPU.",
    grade: gradeInterruptCpu,
  },
  hints: [
    {
      text: "KEY READY remembers unread input. IE allows entry. Their next-state signals feed IRQ, which INT may accept only at STEP_RESET.",
      anchor: { kind: "node", id: CPU_PARTS.irq },
    },
    {
      text: "INT feeds the control unit. Its interrupt entry must push PC, mask further interrupts, and load the vector before fetching handler code.",
      anchor: { kind: "node", id: CPU_PARTS.control },
    },
    {
      text: "KEY_OUT acknowledges input. RETI uses the ordinary stack-to-PC route and IE_SET. A missing return or mask wire can count a press and still corrupt background work.",
      anchor: { kind: "node", id: CPU_PARTS.pc },
    },
    {
      title: "Last hint",
      text: "Combine KEY READY and IE into IRQ, let INT take it at STEP_RESET, and connect the control unit's interrupt lines to the mask, vector and stack parts they name.",
    },
  ],
};

/** Wires the learner supplies; ordinary fetch and datapath wiring stay in place. */
export function interruptWiring(wire: Circuit["wires"][number]) {
  const control = (signal: Signal) =>
    wire.from === CPU_PARTS.control && wire.output === SIGNALS.indexOf(signal);
  return (
    [
      CPU_PARTS.irq,
      CPU_PARTS.int,
      "int-take",
      "int-mid",
      "int-hold",
      "int-next",
      "ie-kept",
      "ie-stays",
      "ie-next",
      CPU_PARTS.ie,
    ].includes(wire.to) ||
    (wire.from === CPU_PARTS.int && wire.to === CPU_PARTS.control) ||
    control("VEC_OUT") ||
    control("IE_CLR") ||
    control("IE_SET") ||
    control("STACK_IN") ||
    control("STACK_OUT") ||
    control("SP_INC") ||
    control("SP_DEC")
  );
}

export const INPUT_DEVICE_LEVELS: Level[] = [
  capture,
  samples,
  decoder,
  ...rows,
  mapping,
  cpu,
  interruptCpu,
];
