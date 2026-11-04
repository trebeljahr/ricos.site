/**
 * The same logic gates wired in different styles. A small switch-level solver:
 * a device is a closed or open switch, a resistor is a weak link, and a level
 * passed by the wrong kind of transistor arrives short of the rail.
 */
export const WIRING_GATES = ["not", "nand", "and", "xor"] as const;
export type WiringGate = (typeof WIRING_GATES)[number];
export const WIRING_STYLES = ["bjt", "nmos", "cmos", "pass", "tgate"] as const;
export type WiringStyle = (typeof WIRING_STYLES)[number];

export const STYLE_LABELS: Record<WiringStyle, string> = {
  bjt: "BJT + RESISTORS",
  nmos: "NMOS + RESISTOR",
  cmos: "CMOS",
  pass: "PASS TRANSISTOR",
  tgate: "TRANSMISSION GATE",
};

export type SwitchKind = "npn" | "nmos" | "pmos";
export type Element =
  | {
      id: string;
      kind: SwitchKind;
      x: number;
      y: number;
      gate: string;
      top: string;
      bottom: string;
    }
  | { id: string; kind: "res"; x: number; y1: number; y2: number; top: string; bottom: string };
export type Pt = readonly [number, number];
export type Schematic = {
  elements: Element[];
  wires: { net: string; points: Pt[] }[];
  /** Where a net that is an input enters the drawing, away from the left-hand gate tags. */
  tags?: { net: string; x: number; y: number }[];
  output: string;
  outputAt: Pt;
};

const device = (
  id: string,
  kind: SwitchKind,
  x: number,
  y: number,
  gate: string,
  top: string,
  bottom: string,
): Element => ({ id, kind, x, y, gate, top, bottom });
const res = (
  id: string,
  x: number,
  y1: number,
  y2: number,
  top: string,
  bottom: string,
): Element => ({
  id,
  kind: "res",
  x,
  y1,
  y2,
  top,
  bottom,
});
const wire = (net: string, ...points: Pt[]) => ({ net, points });
const RIGHT = 470;

function loadedNot(kind: "npn" | "nmos"): Schematic {
  return {
    elements: [
      res("r", 240, 40, 110, "vcc", "out"),
      device("q", kind, 240, 180, "a", "out", "gnd"),
    ],
    wires: [
      wire("out", [240, 110], [240, 156]),
      wire("out", [240, 133], [RIGHT, 133]),
      wire("gnd", [240, 204], [240, 310]),
    ],
    output: "out",
    outputAt: [RIGHT, 133],
  };
}

function loadedNand(kind: "npn" | "nmos"): Schematic {
  return {
    elements: [
      res("r", 240, 40, 90, "vcc", "out"),
      device("qa", kind, 240, 150, "a", "out", "mid"),
      device("qb", kind, 240, 230, "b", "mid", "gnd"),
    ],
    wires: [
      wire("out", [240, 90], [240, 126]),
      wire("out", [240, 108], [RIGHT, 108]),
      wire("mid", [240, 174], [240, 206]),
      wire("gnd", [240, 254], [240, 310]),
    ],
    output: "out",
    outputAt: [RIGHT, 108],
  };
}

/** Low when the inputs match: two series pairs under one load. Ā and B̄ come from inverters. */
function loadedXor(kind: "npn" | "nmos"): Schematic {
  return {
    elements: [
      res("r", 240, 40, 80, "vcc", "out"),
      device("q1", kind, 150, 160, "a", "out", "m1"),
      device("q2", kind, 150, 250, "b", "m1", "gnd"),
      device("q3", kind, 330, 160, "na", "out", "m2"),
      device("q4", kind, 330, 250, "nb", "m2", "gnd"),
    ],
    wires: [
      wire("out", [240, 80], [240, 100]),
      wire("out", [150, 100], [RIGHT, 100]),
      wire("out", [150, 100], [150, 136]),
      wire("out", [330, 100], [330, 136]),
      wire("m1", [150, 184], [150, 226]),
      wire("m2", [330, 184], [330, 226]),
      wire("gnd", [150, 274], [150, 310]),
      wire("gnd", [330, 274], [330, 310]),
    ],
    output: "out",
    outputAt: [RIGHT, 100],
  };
}

const cmosNot: Schematic = {
  elements: [
    device("p", "pmos", 240, 90, "a", "vcc", "out"),
    device("n", "nmos", 240, 230, "a", "out", "gnd"),
  ],
  wires: [
    wire("vcc", [240, 40], [240, 66]),
    wire("out", [240, 114], [240, 206]),
    wire("out", [240, 160], [RIGHT, 160]),
    wire("gnd", [240, 254], [240, 310]),
  ],
  output: "out",
  outputAt: [RIGHT, 160],
};

const cmosNand = (
  x: number,
  spread: number,
  out: string,
): Pick<Schematic, "elements" | "wires"> => ({
  elements: [
    device(`pa${out}`, "pmos", x - spread, 90, "a", "vcc", out),
    device(`pb${out}`, "pmos", x + spread, 90, "b", "vcc", out),
    device(`na${out}`, "nmos", x, 190, "a", out, "mid"),
    device(`nb${out}`, "nmos", x, 265, "b", "mid", "gnd"),
  ],
  wires: [
    wire("vcc", [x - spread, 40], [x - spread, 66]),
    wire("vcc", [x + spread, 40], [x + spread, 66]),
    wire(out, [x - spread, 114], [x - spread, 140], [x + spread, 140], [x + spread, 114]),
    wire(out, [x, 140], [x, 166]),
    wire("mid", [x, 214], [x, 241]),
    wire("gnd", [x, 289], [x, 310]),
  ],
});

const SCHEMATICS: Record<WiringStyle, Record<WiringGate, Schematic>> = {
  bjt: {
    xor: loadedXor("npn"),
    not: loadedNot("npn"),
    nand: loadedNand("npn"),
    and: {
      elements: [
        device("qa", "npn", 240, 90, "a", "vcc", "mid"),
        device("qb", "npn", 240, 170, "b", "mid", "out"),
        res("r", 240, 240, 310, "out", "gnd"),
      ],
      wires: [
        wire("vcc", [240, 40], [240, 66]),
        wire("mid", [240, 114], [240, 146]),
        wire("out", [240, 194], [240, 240]),
        wire("out", [240, 217], [RIGHT, 217]),
      ],
      output: "out",
      outputAt: [RIGHT, 217],
    },
  },
  nmos: {
    xor: loadedXor("nmos"),
    not: loadedNot("nmos"),
    nand: loadedNand("nmos"),
    and: {
      elements: [
        res("r1", 170, 40, 90, "vcc", "x"),
        device("qa", "nmos", 170, 150, "a", "x", "mid"),
        device("qb", "nmos", 170, 230, "b", "mid", "gnd"),
        res("r2", 360, 40, 110, "vcc", "out"),
        device("qx", "nmos", 360, 180, "x", "out", "gnd"),
      ],
      wires: [
        wire("x", [170, 90], [170, 126]),
        wire("mid", [170, 174], [170, 206]),
        wire("gnd", [170, 254], [170, 310]),
        wire("out", [360, 110], [360, 156]),
        wire("out", [360, 133], [RIGHT, 133]),
        wire("gnd", [360, 204], [360, 310]),
      ],
      output: "out",
      outputAt: [RIGHT, 133],
    },
  },
  cmos: {
    not: cmosNot,
    nand: {
      ...cmosNand(240, 80, "out"),
      wires: [...cmosNand(240, 80, "out").wires, wire("out", [240, 140], [RIGHT, 140])],
      output: "out",
      outputAt: [RIGHT, 140],
    },
    and: {
      elements: [
        ...cmosNand(150, 60, "x").elements,
        device("px", "pmos", 370, 90, "x", "vcc", "out"),
        device("nx", "nmos", 370, 230, "x", "out", "gnd"),
      ],
      wires: [
        ...cmosNand(150, 60, "x").wires,
        wire("vcc", [370, 40], [370, 66]),
        wire("out", [370, 114], [370, 206]),
        wire("out", [370, 160], [RIGHT, 160]),
        wire("gnd", [370, 254], [370, 310]),
      ],
      output: "out",
      outputAt: [RIGHT, 160],
    },
    xor: {
      elements: [
        device("p1", "pmos", 150, 70, "na", "vcc", "up"),
        device("p2", "pmos", 330, 70, "nb", "vcc", "up"),
        device("p3", "pmos", 150, 140, "a", "up", "out"),
        device("p4", "pmos", 330, 140, "b", "up", "out"),
        device("n1", "nmos", 150, 212, "a", "out", "m1"),
        device("n2", "nmos", 150, 274, "b", "m1", "gnd"),
        device("n3", "nmos", 330, 212, "na", "out", "m2"),
        device("n4", "nmos", 330, 274, "nb", "m2", "gnd"),
      ],
      wires: [
        wire("vcc", [150, 40], [150, 46]),
        wire("vcc", [330, 40], [330, 46]),
        wire("up", [150, 94], [150, 116]),
        wire("up", [330, 94], [330, 116]),
        wire("up", [150, 105], [330, 105]),
        wire("out", [150, 164], [150, 188]),
        wire("out", [330, 164], [330, 188]),
        wire("out", [150, 176], [RIGHT, 176]),
        wire("m1", [150, 236], [150, 250]),
        wire("m2", [330, 236], [330, 250]),
        wire("gnd", [150, 298], [150, 310]),
        wire("gnd", [330, 298], [330, 310]),
      ],
      output: "out",
      outputAt: [RIGHT, 176],
    },
  },
  pass: {
    // A pass transistor cannot invert: it only chooses a rail, and choosing needs Ā.
    not: {
      elements: [
        device("hi", "nmos", 240, 90, "na", "vcc", "out"),
        device("lo", "nmos", 240, 230, "a", "out", "gnd"),
      ],
      wires: [
        wire("vcc", [240, 40], [240, 66]),
        wire("out", [240, 114], [240, 206]),
        wire("out", [240, 160], [RIGHT, 160]),
        wire("gnd", [240, 254], [240, 310]),
      ],
      output: "out",
      outputAt: [RIGHT, 160],
    },
    nand: {
      elements: [
        device("pa", "nmos", 170, 120, "a", "nb", "out"),
        device("pb", "nmos", 340, 120, "na", "vcc", "out"),
      ],
      wires: [
        wire("nb", [170, 66], [170, 96]),
        wire("vcc", [340, 40], [340, 96]),
        wire("out", [170, 144], [170, 190], [340, 190], [340, 144]),
        wire("out", [255, 190], [RIGHT, 190]),
      ],
      tags: [{ net: "nb", x: 170, y: 60 }],
      output: "out",
      outputAt: [RIGHT, 190],
    },
    and: {
      elements: [
        device("pass", "nmos", 240, 110, "a", "b", "out"),
        device("pull", "nmos", 240, 230, "na", "out", "gnd"),
      ],
      wires: [
        wire("b", [240, 56], [240, 86]),
        wire("out", [240, 134], [240, 206]),
        wire("out", [240, 170], [RIGHT, 170]),
        wire("gnd", [240, 254], [240, 310]),
      ],
      tags: [{ net: "b", x: 240, y: 50 }],
      output: "out",
      outputAt: [RIGHT, 170],
    },
    xor: {
      elements: [
        device("pa", "nmos", 170, 120, "a", "nb", "out"),
        device("pb", "nmos", 340, 120, "na", "b", "out"),
      ],
      wires: [
        wire("nb", [170, 66], [170, 96]),
        wire("b", [340, 66], [340, 96]),
        wire("out", [170, 144], [170, 190], [340, 190], [340, 144]),
        wire("out", [255, 190], [RIGHT, 190]),
      ],
      tags: [
        { net: "nb", x: 170, y: 60 },
        { net: "b", x: 340, y: 60 },
      ],
      output: "out",
      outputAt: [RIGHT, 190],
    },
  },
  tgate: {
    not: {
      elements: [
        device("hin", "nmos", 190, 90, "na", "vcc", "out"),
        device("hip", "pmos", 300, 90, "a", "vcc", "out"),
        device("lon", "nmos", 190, 230, "a", "out", "gnd"),
        device("lop", "pmos", 300, 230, "na", "out", "gnd"),
      ],
      wires: [
        wire("vcc", [190, 40], [190, 66]),
        wire("vcc", [300, 40], [300, 66]),
        wire("out", [190, 114], [190, 206]),
        wire("out", [300, 114], [300, 206]),
        wire("out", [190, 160], [RIGHT, 160]),
        wire("gnd", [190, 254], [190, 310]),
        wire("gnd", [300, 254], [300, 310]),
      ],
      output: "out",
      outputAt: [RIGHT, 160],
    },
    nand: {
      elements: [
        device("t1n", "nmos", 110, 120, "a", "nb", "out"),
        device("t1p", "pmos", 200, 120, "na", "nb", "out"),
        device("t2n", "nmos", 310, 120, "na", "vcc", "out"),
        device("t2p", "pmos", 400, 120, "a", "vcc", "out"),
      ],
      wires: [
        wire("nb", [110, 96], [110, 70], [200, 70], [200, 96]),
        wire("vcc", [310, 96], [310, 70], [400, 70], [400, 96]),
        wire("vcc", [355, 40], [355, 70]),
        wire("out", [110, 144], [110, 200], [400, 200], [400, 144]),
        wire("out", [200, 144], [200, 200]),
        wire("out", [310, 144], [310, 200]),
        wire("out", [400, 200], [RIGHT, 200]),
      ],
      tags: [{ net: "nb", x: 155, y: 62 }],
      output: "out",
      outputAt: [RIGHT, 200],
    },
    and: {
      elements: [
        device("tn", "nmos", 190, 110, "a", "b", "out"),
        device("tp", "pmos", 300, 110, "na", "b", "out"),
        device("pull", "nmos", 245, 230, "na", "out", "gnd"),
      ],
      wires: [
        wire("b", [190, 86], [190, 66], [300, 66], [300, 86]),
        wire("out", [190, 134], [190, 170], [300, 170], [300, 134]),
        wire("out", [245, 170], [245, 206]),
        wire("out", [300, 170], [RIGHT, 170]),
        wire("gnd", [245, 254], [245, 310]),
      ],
      tags: [{ net: "b", x: 245, y: 58 }],
      output: "out",
      outputAt: [RIGHT, 170],
    },
    xor: {
      elements: [
        device("t1n", "nmos", 110, 120, "a", "nb", "out"),
        device("t1p", "pmos", 200, 120, "na", "nb", "out"),
        device("t2n", "nmos", 310, 120, "na", "b", "out"),
        device("t2p", "pmos", 400, 120, "a", "b", "out"),
      ],
      wires: [
        wire("nb", [110, 96], [110, 70], [200, 70], [200, 96]),
        wire("b", [310, 96], [310, 70], [400, 70], [400, 96]),
        wire("out", [110, 144], [110, 200], [400, 200], [400, 144]),
        wire("out", [200, 144], [200, 200]),
        wire("out", [310, 144], [310, 200]),
        wire("out", [400, 200], [RIGHT, 200]),
      ],
      tags: [
        { net: "nb", x: 155, y: 62 },
        { net: "b", x: 355, y: 62 },
      ],
      output: "out",
      outputAt: [RIGHT, 200],
    },
  },
};

export const schematicFor = (style: WiringStyle, gate: WiringGate) => SCHEMATICS[style][gate];

const isSwitch = (element: Element): element is Extract<Element, { gate: string }> =>
  element.kind !== "res";

const RAIL_VOLTS = (style: WiringStyle) => (style === "bjt" ? 5 : 1);
const LOAD_OHMS = (style: WiringStyle) => (style === "bjt" ? 1000 : 10000);
const BASE_AMPS = 430e-6;

/** Which inverted inputs a circuit reads, each made by an inverter of its own style. */
function invertersIn(schematic: Schematic) {
  const nets = new Set(
    schematic.elements.filter(isSwitch).flatMap((element) => [element.gate, element.top]),
  );
  return (["a", "b"] as const).filter((input) => nets.has(`n${input}`));
}

/** Transistors and resistors, including the inverters that make the inverted inputs. */
export function partCounts(style: WiringStyle, gate: WiringGate) {
  const schematic = schematicFor(style, gate);
  const switches = schematic.elements.filter(isSwitch);
  const inverters = invertersIn(schematic).length;
  const loaded = style === "bjt" || style === "nmos";
  return {
    transistors: switches.length + inverters * (loaded ? 1 : 2),
    resistors:
      schematic.elements.length -
      switches.length +
      switches.filter((element) => element.kind === "npn").length +
      (style === "bjt" ? 2 : style === "nmos" ? 1 : 0) * inverters,
  };
}

export type WiringResult = {
  values: Record<string, boolean>;
  closed: Set<string>;
  output: boolean;
  outputVolts: number;
  railVolts: number;
  /** Nets carrying steady current from rail to rail, through a resistor. */
  currentNets: Set<string>;
  /** Steady current drawn from the supply, in amps. */
  idleAmps: number;
  /** Devices that are off, each leaking a little. */
  offDevices: number;
  /** Bases with steady current in them. */
  baseCurrent: Set<string>;
};

export function solveWiring(
  schematic: Schematic,
  style: WiringStyle,
  a: boolean,
  b: boolean,
): WiringResult {
  const inputs: Record<string, boolean> = { a, b, na: !a, nb: !b, vcc: true, gnd: false };
  const switches = schematic.elements.filter(isSwitch);
  const resistors = schematic.elements.filter((element) => element.kind === "res");
  const flood = (seeds: string[], closed: typeof switches) => {
    const reached = new Set(seeds);
    for (let changed = true; changed; ) {
      changed = false;
      for (const element of closed)
        if (reached.has(element.top) !== reached.has(element.bottom)) {
          reached.add(element.top);
          reached.add(element.bottom);
          changed = true;
        }
    }
    return reached;
  };
  let values: Record<string, boolean> = { ...inputs };
  let closed: typeof switches = [];
  let high = new Set<string>();
  let low = new Set<string>();
  // Later stages read an earlier stage's output, so settle over a few passes.
  for (let pass = 0; pass < 4; pass++) {
    const gateHigh = (net: string) => Boolean(values[net]);
    closed = switches.filter((element) =>
      element.kind === "pmos" ? !gateHigh(element.gate) : gateHigh(element.gate),
    );
    const seeds = (level: boolean) => Object.keys(inputs).filter((net) => inputs[net] === level);
    high = flood(seeds(true), closed);
    low = flood(seeds(false), closed);
    // A resistor lifts or lowers a net nothing else is driving.
    for (const resistor of resistors) {
      const [top, bottom] = [resistor.top, resistor.bottom];
      const driven = (net: string) => high.has(net) || low.has(net);
      if (driven(top) && !driven(bottom))
        for (const net of flood([bottom], closed)) (high.has(top) ? high : low).add(net);
      if (driven(bottom) && !driven(top))
        for (const net of flood([top], closed)) (high.has(bottom) ? high : low).add(net);
    }
    values = { ...inputs };
    for (const net of high) values[net] = true;
    for (const net of low) values[net] = false;
    for (const net of Object.keys(inputs)) values[net] = inputs[net];
  }
  const rail = RAIL_VOLTS(style);
  const output = Boolean(values[schematic.output]);
  // NMOS and NPN pass a high level short of the rail, PMOS a low one.
  const fullHigh = flood(
    Object.keys(inputs).filter((net) => inputs[net]),
    closed.filter((element) => element.kind === "pmos"),
  );
  const fullLow = flood(
    Object.keys(inputs).filter((net) => !inputs[net]),
    closed.filter((element) => element.kind !== "pmos"),
  );
  const pulledByResistor = resistors.some(
    (resistor) => resistor.bottom === schematic.output || resistor.top === schematic.output,
  );
  const usesNpn = switches.some((element) => element.kind === "npn");
  let outputVolts: number;
  if (output) {
    const throughSwitches = flood(["vcc", ...Object.keys(inputs).filter((n) => inputs[n])], closed);
    const direct =
      fullHigh.has(schematic.output) ||
      (pulledByResistor && !throughSwitches.has(schematic.output));
    outputVolts = direct ? rail : rail - (usesNpn ? 0.7 : 0.3);
  } else if (usesNpn) {
    // A saturated BJT stops just short of ground; a resistor alone reaches it.
    outputVolts = flood(["gnd"], closed).has(schematic.output) ? 0.2 : 0;
  } else {
    outputVolts = fullLow.has(schematic.output) ? 0 : 0.3;
  }
  const currentNets = new Set<string>();
  let idleAmps = 0;
  for (const resistor of resistors) {
    if (values[resistor.top] === values[resistor.bottom]) continue;
    idleAmps += rail / LOAD_OHMS(style);
    for (const net of flood([resistor.top], closed)) currentNets.add(net);
    for (const net of flood([resistor.bottom], closed)) currentNets.add(net);
  }
  const baseCurrent = new Set(
    closed.filter((element) => element.kind === "npn").map((element) => element.id),
  );
  idleAmps += baseCurrent.size * BASE_AMPS;
  // An inverter built with a load draws current while its input is high.
  if (style === "bjt" || style === "nmos")
    for (const input of invertersIn(schematic))
      if (inputs[input]) idleAmps += rail / LOAD_OHMS(style) + (style === "bjt" ? BASE_AMPS : 0);
  return {
    values,
    closed: new Set(closed.map((element) => element.id)),
    output,
    outputVolts,
    railVolts: rail,
    currentNets,
    idleAmps,
    offDevices: switches.length - closed.length,
    baseCurrent,
  };
}
