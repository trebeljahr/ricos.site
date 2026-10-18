import {
  COUNTER_MODES,
  COUNTER_WIDTHS,
  counterCircuit,
  counterPart,
  counterTitle,
  type CounterMode,
  type CounterWidth,
} from "../../counterCircuits";
import { moduleInputs, moduleOutputs } from "../../logic";
import type { Level, SequenceTick } from "../types";
import { CHAPTERS } from "./shared";

/** A reset contract followed by full-range, hold, falling-edge and wrap checks. */
export function counterTicks(width: CounterWidth, mode: CounterMode): SequenceTick[] {
  const max = 2 ** width;
  const bits = (q: number) =>
    Object.fromEntries(
      Array.from({ length: width }, (_, bit) => [`q${bit}`, Boolean(q & (2 ** bit))]),
    );
  const ticks: SequenceTick[] = [
    {
      set: { inc: false, dec: false, reset: false },
      expect: bits(0),
      note: "Power-on state is zero.",
    },
    { set: { reset: true }, expect: bits(0), note: "RESET clears every stored bit." },
    { set: { reset: false }, expect: bits(0), note: "Releasing RESET keeps zero." },
  ];
  let q = 0;
  const count = (input: "inc" | "dec") => {
    q = (q + (input === "inc" ? 1 : -1) + max) % max;
    ticks.push(
      {
        set: { [input]: true },
        expect: bits(q),
        note: `${input === "inc" ? "Increment" : "Decrement"} edge gives ${q}.`,
      },
      { expect: bits(q), note: "Holding high does not repeat." },
      { set: { [input]: false }, expect: bits(q), note: "Falling edge keeps the count." },
    );
  };
  if (mode !== "down") for (let i = 0; i <= max; i++) count("inc");
  if (mode !== "up") for (let i = 0; i <= max; i++) count("dec");
  if (mode === "up-down")
    ticks.push(
      { set: { inc: true, dec: true }, expect: bits(q), note: "Both inputs high: no change." },
      { expect: bits(q), note: "Both held high: no repeat." },
      { set: { inc: false }, expect: bits(q), note: "Releasing one input is not a count edge." },
      {
        set: { inc: true },
        expect: bits(q),
        note: "A second high input still holds. Release both to rearm.",
      },
      {
        set: { inc: false, dec: false },
        expect: bits(q),
        note: "Both low rearm the shared clock.",
      },
    );
  const input = mode === "down" ? "dec" : "inc";
  count(input);
  ticks.push(
    { set: { [input]: true, reset: true }, expect: bits(0), note: "Reset wins over a count edge." },
    { expect: bits(0), note: "Reset held high keeps zero." },
    {
      set: { reset: false },
      expect: bits(0),
      note: "Releasing reset while COUNT is held does not count.",
    },
    { set: { [input]: false }, expect: bits(0), note: "Release COUNT to rearm." },
    {
      set: { [input]: true },
      expect: bits(input === "inc" ? 1 : max - 1),
      note: "Next fresh count edge works after reset.",
    },
    {
      set: { reset: true },
      expect: bits(0),
      note: "Reset clears even while COUNT is already high.",
    },
  );
  return ticks;
}

export const COUNTER_LEVELS: Level[] = COUNTER_WIDTHS.flatMap((width) =>
  COUNTER_MODES.map((mode): Level => {
    const reference = () => counterCircuit(width, mode);
    const source = reference();
    return {
      id: counterPart(width, mode),
      title: counterTitle(width, mode),
      section: "Manual counters",
      practice: {
        family: "manual-counter",
        core: width === 2 && mode === "up",
        label: `${width} bits · ${mode}`,
      },
      optional: true,
      chapter: CHAPTERS.counter,
      goal: `Store ${width} bits on Q0–Q${width - 1}, start at zero, and count ${mode === "up-down" ? "up or down" : mode} on a rising button edge. Wrap modulo ${2 ** width}. RESET clears immediately.`,
      intro: `Q0 is the least significant bit. Each count input is a manual button: try pulse and held modes. A held button counts once. ${mode === "up-down" ? "Both buttons high holds; release both before the next count. " : ""}RESET wins over counting. The check covers every value, wrap, holding and reset; passing this sequence is not exhaustive temporal equivalence.`,
      spec: {
        kind: "sequence",
        inputs: moduleInputs(source).map((n) => ({
          id: n.id,
          label: n.label!,
          button: n.type === "pulse",
        })),
        outputs: moduleOutputs(source).map((n) => ({ id: n.id, label: n.label! })),
        ticks: counterTicks(width, mode),
      },
      palette: ["dff", "not", "and", "or", "xor"],
      makes: {
        part: counterPart(width, mode),
        label: counterTitle(width, mode),
        builtIn: { reference: true },
      },
      reference,
      hints: [
        {
          text: "Separate the stored value from the next value. Each output bit needs memory; counting changes that memory only on an edge.",
        },
        {
          text:
            mode === "down"
              ? "Subtracting one flips a bit when all lower bits are zero. What condition tells you a borrow reaches that bit?"
              : "Adding one flips a bit when all lower bits are one. What condition tells you a carry reaches that bit?",
        },
        ...(mode === "up-down"
          ? [
              {
                text: "Think about carry and borrow separately. Both buttons high must select neither change. A shared clock must return low before another rising edge.",
              },
            ]
          : []),
        {
          text: "RESET must work with COUNT held high. The D flip-flop context menu offers an asynchronous RESET pin; ordinary data gating waits for a clock edge.",
        },
      ],
    };
  }),
);
