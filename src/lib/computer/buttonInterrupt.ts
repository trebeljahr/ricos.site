import { compileProgram, OPCODES, SIGNALS, type StackModel, traceTicks } from "../computerStepper";
import { Builder } from "./blockBuilder";
import { syncBlockStates } from "./blockFolding";
import { counterComponent } from "./counterCircuits";
import { CPU_PARTS, cpuCircuit, KEY_SWITCHES } from "./cpuPreset";
import type { Circuit, Snapshot } from "./logic";
import { builtinCircuit, registerRecognitionComponent } from "./recognition";
import { decimalSegmentDemo } from "./sevenSegment";

export const BUTTON_PROGRAM = `let presses = 0;
fn on_key(k) {
  screen[3] = k;
  presses = presses + 1;
  print(presses);
}
let work = 0;
interrupts_on();
loop {
  work = work + 1;
}`;

export const BUTTON_POLICY =
  "Ideal switches do not bounce. A rising raw edge captures a request even between CPU clocks. Two flip-flops sample the captured request; they illustrate clock-domain synchronization, not analog metastability. Requests coalesce in one mailbox until IN acknowledges. ACK and RESET clear capture with priority: presses during ACK/RESET are ignored. Release then press after ACK creates another event; holding never repeats. Reset restarts runtime state.";

/** Edge-clocked capture plus a two-stage request synchronizer. All storage is visible gates. */
export function buttonInputCircuit(): Circuit {
  const b = new Builder();
  b.add("raw", "switch", 30, 30, "RAW BUTTON");
  b.add("clock", "clock", 30, 180, "SAMPLE CLOCK");
  b.add("ack", "switch", 30, 330, "ACKNOWLEDGE");
  b.add("reset", "switch", 30, 480, "RESET");
  b.add("one", "high", 260, 30, "ONE");
  const clear = b.gate("clear", "or", 260, 330, "ack", "reset", "ACK OR RESET");
  b.add("capture", "dff", 480, 30, "EDGE CAPTURE", { resettable: true });
  b.connect("one", "capture");
  b.connect("raw", "capture", 1);
  b.connect(clear, "capture", 2);
  for (const [id, data, x, y] of [
    ["sync1", "capture", 700, 30],
    ["sync2", "sync1", 920, 30],
    ["held1", "raw", 480, 650],
    ["held2", "held1", 700, 650],
  ] as const) {
    b.add(id, "dff", x, y, id.toUpperCase(), { resettable: true });
    b.connect(data, id);
    b.connect("clock", id, 1);
    b.connect("reset", id, 2);
  }
  // ACK clears the unsampled capture immediately, so stale synchronizer state cannot retrigger IN.
  const request = b.gate("qualified", "and", 1140, 180, "capture", "sync2", "SAMPLED REQUEST");
  const active = b.gate("not-clear", "not", 920, 350, clear);
  const ready = b.gate("ready", "and", 1350, 180, request, active);
  for (const [index, [id, label, source]] of (
    [
      ["captured", "CAPTURED EVENT", "capture"],
      ["sampled", "SAMPLED HOLD", "held2"],
      ["request", "REQUEST", ready],
    ] as const
  ).entries())
    b.gate(id, "lamp", 1570, 30 + index * 190, source, undefined, label);
  return {
    ...b.circuit("Button request capture"),
    ports: {
      inputs: ["raw", "clock", "ack", "reset"],
      outputs: ["captured", "sampled", "request"],
    },
  };
}
registerRecognitionComponent({
  id: "button-request",
  label: "Button request capture",
  inputs: ["RAW BUTTON", "SAMPLE CLOCK", "ACKNOWLEDGE", "RESET"],
  outputs: ["CAPTURED EVENT", "SAMPLED HOLD", "REQUEST"],
  symbol: "register",
});
export const buttonInputComponent = () =>
  builtinCircuit("button-request", buttonInputCircuit(), "register");

/** Explicit EI lets source initialize handler-owned globals before accepting a pending request. */
export const compileButtonProgram = (source: string, stack: StackModel = "hardware") =>
  compileProgram(source, { stack, autoEnableInterrupts: false });

/** Existing CPU key port, ISA, vector and microcode; only its ideal input source changes. */
export function buttonCpuCircuit(source = BUTTON_PROGRAM, stack: StackModel = "hardware"): Circuit {
  const compiled = compileButtonProgram(source, stack);
  const cpu = cpuCircuit(compiled.bytes, "Button → interrupt → CPU output", stack);
  const b = new Builder();
  b.add("button-raw", "pulse", 30, 5300, "BUTTON", { manualMode: "held" });
  b.add("button-reset", "switch", 30, 5650, "INPUT RESET");
  b.add("button-interface", "module", 300, 5300, "CAPTURE AND SYNCHRONIZE", {
    module: buttonInputComponent(),
  });
  b.connect("button-raw", "button-interface", 0);
  b.connect("clock", "button-interface", 1);
  b.connect([CPU_PARTS.control, SIGNALS.indexOf("KEY_OUT")], "button-interface", 2);
  b.connect("button-reset", "button-interface", 3);
  b.connect("button-reset", CPU_PARTS.keyReady, 2);
  for (const [i, label] of ["CAPTURED", "SAMPLED HOLD", "REQUEST"].entries())
    b.gate(`button-${i}`, "lamp", 750, 5300 + i * 160, ["button-interface", i], undefined, label);
  // The fixed input code 1 lights a pixel and is read by the real IN instruction.
  const replaced = new Set<string>([KEY_SWITCHES.press, ...KEY_SWITCHES.bits]);
  const nodes = cpu.nodes
    .filter((n) => !replaced.has(n.id))
    .map((n) => (n.id === CPU_PARTS.keyReady ? { ...n, resettable: true } : n));
  KEY_SWITCHES.bits.forEach((id, bit) =>
    nodes.push({
      id,
      type: bit === 0 ? "high" : "ground",
      x: 30,
      y: 6000 + bit * 70,
      label: `CODE BIT ${bit}`,
    }),
  );
  return {
    ...cpu,
    nodes: [...nodes, ...b.nodes],
    wires: [
      ...cpu.wires.map((w) =>
        w.from === KEY_SWITCHES.press ? { ...w, from: "button-interface", output: 2 } : w,
      ),
      ...b.wires,
    ],
    groups: cpu.groups?.map((g) =>
      g.id === "interrupt"
        ? {
            ...g,
            nodeIds: [
              ...g.nodeIds.filter((id) => id !== KEY_SWITCHES.press),
              ...b.nodes.map((n) => n.id),
            ],
          }
        : g,
    ),
  };
}

export function buttonBench(): Circuit {
  const circuit = buttonInputCircuit();
  return {
    ...circuit,
    name: "Capture a brief button press",
    nodes: circuit.nodes.map((n) =>
      n.id === "raw" || n.id === "ack" || n.id === "reset"
        ? { ...n, type: "pulse", manualMode: n.id === "raw" ? "held" : "pulse" }
        : n,
    ),
  };
}

/** Shared button → counter → decimal converter → raw segment wiring integration bench. */
export function buttonCounterDisplay(): Circuit {
  const display = decimalSegmentDemo(3, 8);
  const b = new Builder();
  b.add("count", "pulse", 30, 30, "COUNT", { manualMode: "pulse" });
  b.add("reset", "pulse", 30, 300, "RESET");
  b.add("counter", "module", 300, 30, "8-BIT PRESS COUNT", { module: counterComponent(8, "up") });
  b.connect("count", "counter", 0);
  b.connect("reset", "counter", 1);
  const nodes = display.nodes.filter((n) => n.id !== "number").map((n) => ({ ...n, x: n.x + 500 }));
  return {
    name: "Button → counter → three decimal digits",
    nodes: [...b.nodes, ...nodes],
    wires: [
      ...b.wires,
      ...display.wires.map((w) => (w.from === "number" ? { ...w, from: "counter" } : w)),
    ],
  };
}

const CAPTURE_PRESET = "Button request capture";
/** Builder examples for the button lessons. */
export const BUTTON_PRESETS: Record<string, Circuit> = {
  [CAPTURE_PRESET]: buttonBench(),
  "Button counter display": buttonCounterDisplay(),
};
export const BUTTON_HINTS: Record<string, string> = { [CAPTURE_PRESET]: BUTTON_POLICY };

/** Behavioral program exercise: the same ISA interpreter used by the CPU lockstep tests. */
export function checkButtonProgram(source: string): string {
  const ticks = traceTicks(compileButtonProgram(source), 200, { 40: 1, 500: 1 });
  const end = ticks.at(-1);
  if (ticks.some((t) => t.fault))
    return "A stack fault stopped the program. Check handler return and saved state.";
  const entries = ticks.filter((t) => t.interrupt && t.t === 0);
  const returns = ticks.filter(
    (t) => t.registers.ir === OPCODES.RETI && t.control.includes("STEP_RESET"),
  );
  const reads = ticks.filter((t) => t.control.includes("KEY_OUT"));
  if (!entries.length)
    return "No interrupt entry ran. Define on_key, enable interrupts after initialization, and keep the background program running.";
  if (entries.length !== 2 || returns.length !== 2 || reads.length !== 2)
    return "Each request needs one interrupt entry, one IN acknowledge, and one RETI return.";
  for (let i = 0; i < entries.length; i++) {
    const before = ticks[entries[i].index - 1]?.registers,
      after = returns[i].registers;
    if (
      !before ||
      after.pc !== entries[i].address ||
      after.sp !== before.sp ||
      after.acc !== before.acc ||
      after.carry !== before.carry
    )
      return "The handler must restore the interrupted PC, stack, accumulator and carry state.";
  }
  if (JSON.stringify(end?.output) !== "[1,2]" || end?.screen[3] !== 1)
    return "Goal: two separate requests produce OUT 1 then 2, and screen row 3 holds input code 1. Count in the handler and read its parameter.";
  return "Pass: two interrupt entries read and acknowledge input, update the outputs, restore state and return. This checks two requests, not every possible program.";
}

/** Read display memory through the shared fold adapter, including when its gates are open. */
export function buttonCpuScreen(circuit: Circuit, snapshot: Snapshot): number[] {
  const folded = syncBlockStates(circuit, snapshot, new Set());
  return (folded.blocks?.[CPU_PARTS.screen] as { bytes: number[] } | undefined)?.bytes ?? [];
}
