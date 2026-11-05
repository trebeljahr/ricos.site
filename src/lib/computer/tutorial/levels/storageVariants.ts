import { busPorts, CircuitKit, type Source } from "../kit";
import type { Level, LevelPort, SequenceTick } from "../types";
import { constructionHints } from "./constructionHints";
import { boxed, CHAPTERS, once, port } from "./shared";

const SECTION = "Memory";
const CLOCK: LevelPort = { id: "clock", label: "CLOCK", clock: true };
const ENABLE = port("enable", "ENABLE");
const Q = port("q", "Q");
const NQ = port("nq", "Q̅");
const SET = port("set", "SET");
const RESET = port("reset", "RESET");
const DATA = port("data", "DATA");
const J = port("j", "J");
const K = port("k", "K");
const T = port("t", "TOGGLE");
const Q8 = busPorts("q", "Q", 8);

const stored = (q: boolean) => ({ q, nq: !q });
const byteOut = (value: number) =>
  Object.fromEntries(Q8.map((bit, index) => [bit.id, Boolean(value & (1 << index))]));

const gatedSrReference = once(() => {
  const kit = new CircuitKit("Gated SR latch", [SET, RESET, ENABLE], [Q, NQ]);
  const set = kit.gate("and", ["enable", "set"]);
  const reset = kit.gate("and", ["enable", "reset"]);
  const latch = kit.part("sr-latch", boxed("sr-latch"), [set, reset]);
  return kit.out("q", [latch, 0]).out("nq", [latch, 1]).build();
});

const jkData = (kit: CircuitKit, j: Source, k: Source, q: Source): Source => {
  const notQ = kit.gate("not", [q]);
  const notK = kit.gate("not", [k]);
  const set = kit.gate("and", [j, notQ]);
  const keep = kit.gate("and", [q, notK]);
  return kit.gate("or", [set, keep]);
};

const jkReference = (edge: boolean) =>
  once(() => {
    const kit = new CircuitKit(
      edge ? "JK flip-flop" : "JK latch",
      [edge ? CLOCK : ENABLE, J, K],
      [Q, NQ],
    );
    const cell = edge
      ? kit.part("d-flip-flop", boxed("d-flip-flop"), ["clock", null])
      : kit.part("d-latch", boxed("d-latch"), ["enable", null]);
    kit.wire(jkData(kit, "j", "k", [cell, 0]), cell, 1);
    return kit.out("q", [cell, 0]).out("nq", [cell, 1]).build();
  });

const toggleReference = (edge: boolean) =>
  once(() => {
    const kit = new CircuitKit(
      edge ? "T flip-flop" : "T latch",
      [edge ? CLOCK : ENABLE, T],
      [Q, NQ],
    );
    const cell = edge
      ? kit.part("d-flip-flop", boxed("d-flip-flop"), ["clock", null])
      : kit.part("d-latch", boxed("d-latch"), ["enable", null]);
    const next = kit.gate("xor", [[cell, 0], "t"]);
    kit.wire(next, cell, 1);
    return kit.out("q", [cell, 0]).out("nq", [cell, 1]).build();
  });

const srFlipFlopReference = once(() => {
  const kit = new CircuitKit("SR flip-flop", [CLOCK, SET, RESET], [Q, NQ]);
  const cell = kit.part("d-flip-flop", boxed("d-flip-flop"), ["clock", null]);
  const keep = kit.gate("and", [[cell, 0], kit.gate("not", ["reset"])]);
  kit.wire(kit.gate("or", ["set", keep]), cell, 1);
  return kit.out("q", [cell, 0]).out("nq", [cell, 1]).build();
});

const shiftReference = once(() => {
  const kit = new CircuitKit("8-bit shift register", [CLOCK, DATA], Q8);
  let previous: Source = "data";
  for (let bit = 0; bit < 8; bit++) {
    const cell = kit.part("d-flip-flop", boxed("d-flip-flop"), ["clock", previous], {
      label: `BIT ${bit}`,
    });
    kit.out(`q${bit}`, [cell, 0]);
    previous = [cell, 0];
  }
  return kit.build();
});

const gatedSrTicks: SequenceTick[] = [
  { set: { set: true }, expect: stored(false), note: "SET is ignored with ENABLE off." },
  { set: { enable: true }, expect: stored(true), note: "ENABLE lets SET store 1." },
  {
    set: { enable: false, set: false, reset: true },
    expect: stored(true),
    note: "RESET is ignored with ENABLE off.",
  },
  { set: { enable: true }, expect: stored(false), note: "ENABLE lets RESET store 0." },
  {
    set: { enable: false, reset: false },
    expect: stored(false),
    note: "Both controls off: hold 0.",
  },
  { set: { enable: true, set: true }, expect: stored(true), note: "Set again after reset." },
];

const jkLatchTicks: SequenceTick[] = [
  { set: { j: true }, expect: stored(false), note: "With ENABLE off, J cannot set Q." },
  { set: { enable: true }, expect: stored(true), note: "J sets Q while enabled." },
  {
    set: { enable: false, j: false, k: true },
    expect: stored(true),
    note: "With ENABLE off, K cannot reset Q.",
  },
  { set: { enable: true }, expect: stored(false), note: "K resets Q while enabled." },
  { set: { enable: false, k: false }, expect: stored(false), note: "Hold Q while disabled." },
];

const edgeTicks = (controls: {
  set: Record<string, boolean>;
  reset: Record<string, boolean>;
  toggle: Record<string, boolean>;
}): SequenceTick[] => [
  {
    set: controls.set,
    expect: stored(false),
    note: "Change the controls while CLOCK is low; Q waits.",
  },
  { clock: true, expect: stored(true), note: "The rising edge stores 1." },
  {
    set: controls.reset,
    expect: stored(true),
    note: "Changing controls while CLOCK is high does not change Q.",
  },
  { clock: false, expect: stored(true), note: "The falling edge holds Q." },
  { clock: true, expect: stored(false), note: "The next rising edge stores 0." },
  { clock: false, expect: stored(false), note: "The falling edge still holds 0." },
  { set: controls.toggle, expect: stored(false), note: "Prepare a toggle while CLOCK is low." },
  { clock: true, expect: stored(true), note: "The rising edge toggles 0 to 1." },
  { clock: false, expect: stored(true), note: "The falling edge holds 1." },
  { clock: true, expect: stored(false), note: "The next rising edge toggles 1 to 0." },
];

export const gatedSrLatchLevel: Level = {
  id: "gated-sr-latch",
  title: "Gated SR latch",
  section: SECTION,
  chapter: CHAPTERS.memory,
  optional: true,
  goal: "SET and RESET affect Q only while ENABLE is on.",
  spec: { kind: "sequence", inputs: [SET, RESET, ENABLE], outputs: [Q, NQ], ticks: gatedSrTicks },
  palette: ["part:and", "part:sr-latch"],
  makes: { part: "gated-sr-latch", label: "GATED SR LATCH", builtIn: { preset: "Gated SR latch" } },
  reference: gatedSrReference,
  hints: constructionHints(
    "A stored bit can ignore SET and RESET by blocking both control paths.",
    "Place an SR latch. Put one AND gate before SET and another before RESET.",
    "Put an AND gate with ENABLE in front of both SET and RESET on an SR latch.",
    "Set Q to 1, turn ENABLE off, then try RESET. Q must stay 1 until ENABLE returns.",
  ),
};

export const jkLatchLevel: Level = {
  id: "jk-latch",
  title: "JK latch",
  section: SECTION,
  chapter: CHAPTERS.memory,
  optional: true,
  goal: "While ENABLE is on, J sets Q and K resets it.",
  spec: { kind: "sequence", inputs: [ENABLE, J, K], outputs: [Q, NQ], ticks: jkLatchTicks },
  palette: ["part:not", "part:and", "part:or", "part:d-latch"],
  makes: { part: "jk-latch", label: "JK LATCH", builtIn: { preset: "JK latch" } },
  reference: jkReference(false),
  hints: constructionHints(
    "J asks to set; K asks to clear. Q feeds back so neither control can preserve or change the stored bit as needed.",
    "Place a D latch. Feed ENABLE directly to its enable input, then compute its DATA from J, K and Q.",
    "Compute a D latch's DATA from J, K and the stored Q, so J can turn it on and K can turn it off.",
    "With ENABLE off, change J and K. Then enable J alone and K alone. Avoid J=K=1 while transparent: feedback may race.",
  ),
};

export const tLatchLevel: Level = {
  id: "t-latch",
  title: "T latch",
  section: SECTION,
  chapter: CHAPTERS.memory,
  optional: true,
  goal: "While ENABLE is on, TOGGLE on asks Q to change.",
  spec: {
    kind: "sequence",
    inputs: [ENABLE, T],
    outputs: [Q, NQ],
    ticks: [
      { set: { t: true }, expect: stored(false), note: "Disabled latch holds 0." },
      {
        set: { t: false, enable: true },
        expect: stored(false),
        note: "Enabled with TOGGLE off holds 0.",
      },
      {
        set: { enable: false, t: true },
        expect: stored(false),
        note: "Disabled TOGGLE cannot change Q.",
      },
      {
        set: { t: false, enable: true },
        expect: stored(false),
        note: "Opening the latch with TOGGLE off still holds 0.",
      },
      {
        set: { t: true },
        expect: stored(true),
        note: "TOGGLE asks for the opposite stored bit while enabled.",
      },
      {
        set: { enable: false },
        expect: stored(true),
        note: "Close the latch immediately so Q holds the new 1.",
      },
      {
        set: { t: false },
        expect: stored(true),
        note: "Changing TOGGLE while disabled does not change Q.",
      },
      {
        set: { t: true },
        expect: stored(true),
        note: "Prepare a second toggle with the latch closed.",
      },
      {
        set: { enable: true },
        expect: stored(false),
        note: "Reopening the latch changes the previous 1 to 0.",
      },
      { set: { enable: false }, expect: stored(false), note: "Close the latch again to hold 0." },
    ],
  },
  palette: ["part:xor", "part:d-latch"],
  makes: { part: "t-latch", label: "T LATCH", builtIn: { preset: "T latch" } },
  reference: toggleReference(false),
  rules: (circuit) =>
    circuit.nodes.some((node) => node.type === "xor" || node.part === "xor")
      ? []
      : ["Use XOR feedback so TOGGLE can invert the stored bit."],
  hints: constructionHints(
    "XOR with 0 returns Q. XOR with 1 returns NOT Q.",
    "Place a D latch and XOR. Feed the latch’s Q back into XOR.",
    "Feed Q and TOGGLE through an XOR into a D latch's DATA.",
    "Keep TOGGLE off while ENABLE is on. A transparent latch with TOGGLE held on may race; compare the edge-triggered T flip-flop.",
  ),
};

export const srFlipFlopLevel: Level = {
  id: "sr-flip-flop",
  title: "SR flip-flop",
  section: SECTION,
  chapter: CHAPTERS.memory,
  optional: true,
  goal: "On a rising CLOCK edge, SET sets Q and RESET clears it, and SET wins.",
  spec: {
    kind: "sequence",
    inputs: [SET, RESET, CLOCK],
    outputs: [Q, NQ],
    ticks: [
      { set: { set: true }, expect: stored(false), note: "SET waits for CLOCK." },
      { clock: true, expect: stored(true), note: "Rising edge sets Q." },
      {
        set: { set: false, reset: true },
        expect: stored(true),
        note: "RESET waits while CLOCK stays high.",
      },
      { clock: false, expect: stored(true), note: "Falling edge holds Q." },
      { clock: true, expect: stored(false), note: "Next rising edge resets Q." },
      {
        clock: false,
        set: { set: true },
        expect: stored(false),
        note: "SET and RESET are now both on.",
      },
      { clock: true, expect: stored(true), note: "SET wins when both controls are on." },
      {
        clock: false,
        set: { set: false, reset: false },
        expect: stored(true),
        note: "Turn both controls off.",
      },
      { clock: true, expect: stored(true), note: "With neither on, the next edge holds Q." },
    ],
  },
  palette: ["part:not", "part:and", "part:or", "part:d-flip-flop"],
  makes: { part: "sr-flip-flop", label: "SR FLIP-FLOP", builtIn: { preset: "SR flip-flop" } },
  reference: srFlipFlopReference,
  hints: constructionHints(
    "The stored Q feeds the next DATA while neither SET nor RESET is active.",
    "Place a D flip-flop. Build a hold path from Q through NOT RESET and an AND gate.",
    "Feed a D flip-flop with SET, or with its own Q as long as RESET is off.",
    "Change SET or RESET while CLOCK stays high; Q waits for another rising edge.",
  ),
};

export const jkFlipFlopLevel: Level = {
  id: "jk-flip-flop",
  title: "JK flip-flop",
  section: SECTION,
  chapter: CHAPTERS.memory,
  optional: true,
  goal: "On a rising edge, J sets, K resets, neither holds and both toggle Q.",
  spec: {
    kind: "sequence",
    inputs: [CLOCK, J, K],
    outputs: [Q, NQ],
    ticks: edgeTicks({
      set: { j: true },
      reset: { j: false, k: true },
      toggle: { j: true, k: true },
    }),
  },
  palette: ["part:not", "part:and", "part:or", "part:d-flip-flop"],
  makes: { part: "jk-flip-flop", label: "JK FLIP-FLOP", builtIn: { preset: "JK flip-flop" } },
  reference: jkReference(true),
  hints: constructionHints(
    "When J and K are both on, the next value must be the opposite of stored Q.",
    "Place a D flip-flop. Use its Q and Q̅ outputs to build two branches for the next DATA.",
    "Feed a D flip-flop with J while Q is off and with NOT K while Q is on.",
    "Set J=K=1 and pulse CLOCK twice. Q must change on each rising edge and hold between edges.",
  ),
};

export const tFlipFlopLevel: Level = {
  id: "t-flip-flop",
  title: "T flip-flop",
  section: SECTION,
  chapter: CHAPTERS.memory,
  optional: true,
  goal: "On each rising CLOCK edge, TOGGLE=1 inverts Q and TOGGLE=0 holds it.",
  spec: {
    kind: "sequence",
    inputs: [CLOCK, T],
    outputs: [Q, NQ],
    ticks: [
      { set: { t: true }, expect: stored(false), note: "TOGGLE waits for the edge." },
      { clock: true, expect: stored(true), note: "First rising edge: 0 to 1." },
      { clock: false, expect: stored(true), note: "Falling edge holds 1." },
      { clock: true, expect: stored(false), note: "Second rising edge: 1 to 0." },
      { set: { t: false }, expect: stored(false), note: "Turn TOGGLE off while CLOCK is high." },
      { clock: false, expect: stored(false), note: "Falling edge holds 0." },
      { clock: true, expect: stored(false), note: "TOGGLE off makes the next edge hold 0." },
    ],
  },
  palette: ["part:xor", "part:d-flip-flop"],
  makes: { part: "t-flip-flop", label: "T FLIP-FLOP", builtIn: { preset: "T flip-flop" } },
  reference: toggleReference(true),
  hints: constructionHints(
    "Q XOR TOGGLE equals Q when TOGGLE is 0 and NOT Q when TOGGLE is 1.",
    "Connect Q from a D flip-flop back to one XOR input; TOGGLE goes to the other.",
    "Feed a D flip-flop with the XOR of its own Q and TOGGLE.",
    "Leave TOGGLE high for two clock pulses: Q flips twice, only on rising edges.",
  ),
};

export const shiftRegisterLevel: Level = {
  id: "shift-register8",
  title: "8-bit shift register",
  section: SECTION,
  chapter: CHAPTERS.register,
  optional: true,
  goal: "On each rising edge, SERIAL IN enters Q0 and every bit moves up one place.",
  spec: {
    kind: "sequence",
    inputs: [CLOCK, DATA],
    outputs: Q8,
    ticks: [
      { set: { data: true }, expect: byteOut(0), note: "Set SERIAL IN high before the edge." },
      { clock: true, expect: byteOut(1), note: "First edge moves 1 into Q0." },
      {
        set: { data: false },
        expect: byteOut(1),
        note: "Changing input while CLOCK is high does not shift.",
      },
      { clock: false, expect: byteOut(1), note: "Falling edge holds all bits." },
      { clock: true, expect: byteOut(2), note: "Second edge moves the 1 from Q0 to Q1." },
      { clock: false, expect: byteOut(2), note: "Hold between edges." },
      { clock: true, expect: byteOut(4), note: "Third edge moves the 1 to Q2." },
      { clock: false, expect: byteOut(4), note: "Hold between edges." },
      { set: { data: true }, expect: byteOut(4), note: "Set another 1 on SERIAL IN." },
      {
        clock: true,
        expect: byteOut(9),
        note: "Next edge shifts the first 1 and enters a new one.",
      },
      { clock: false, expect: byteOut(9), note: "Hold between edges." },
      { set: { data: false }, expect: byteOut(9), note: "Send zeros after the second 1." },
      ...Array.from(
        { length: 4 },
        (_, index) =>
          [
            {
              clock: true,
              expect: byteOut((9 << (index + 1)) & 255),
              note: "The word shifts one place on the rising edge.",
            },
            {
              clock: false,
              expect: byteOut((9 << (index + 1)) & 255),
              note: "The falling edge holds the word.",
            },
          ] as SequenceTick[],
      ).flat(),
    ],
  },
  palette: ["part:d-flip-flop"],
  makes: {
    part: "shift-register8",
    label: "8-BIT SHIFT REGISTER",
    builtIn: { preset: "8-bit shift register" },
  },
  reference: shiftReference,
  hints: constructionHints(
    "All eight bits sample their inputs on the same edge, so the old Q0 becomes new Q1 while SERIAL IN becomes new Q0.",
    "Place eight D flip-flops. Connect CLOCK to all of their clock inputs.",
    "Chain eight D flip-flops on one clock, so each takes the old value of the one before it.",
    "Send one 1 followed by zeros. Watch it move Q0, Q1, … Q7 on successive rising edges without changing between edges.",
  ),
};

export const STORAGE_VARIANT_LEVELS: Level[] = [
  gatedSrLatchLevel,
  jkLatchLevel,
  tLatchLevel,
  srFlipFlopLevel,
  jkFlipFlopLevel,
  tFlipFlopLevel,
  shiftRegisterLevel,
];
