/**
 * Geometry and rough electrical behaviour of four transistor builds, all n-type: electrons
 * are the carriers, so they run from the source (or emitter) at 0 V towards the positive
 * drain (or collector). Every part is an axis-aligned box. x runs from source to drain,
 * y points up, z is the width. Shapes are to no scale; currents are textbook orders of
 * magnitude.
 */
export const DEVICES = ["bjt", "planar", "finfet", "gaa"] as const;
export type Device = (typeof DEVICES)[number];
export type Vec3 = readonly [number, number, number];
export type Box = readonly [number, number, number, number, number, number];
export type Material = "n" | "p" | "oxide" | "gate" | "metal" | "channel";
export type Part = { id: string; material: Material; box: Box; gate?: boolean };

export const DEVICE_INFO: Record<
  Device,
  {
    label: string;
    control: string;
    from: string;
    to: string;
    voltage: string;
    size: string;
    onAmps: number;
    /** Volts per tenfold change of current below threshold, for the three MOS shapes. */
    swing?: number;
    camera: Vec3;
  }
> = {
  bjt: {
    label: "BJT",
    control: "BASE",
    from: "EMITTER",
    to: "COLLECTOR",
    voltage: "BASE VOLTAGE",
    size: "base ≈ 1 µm thick, die ≈ 500 µm (2N2222)",
    onAmps: 5e-3,
    camera: [7.5, 6, 18],
  },
  planar: {
    label: "PLANAR",
    control: "GATE",
    from: "SOURCE",
    to: "DRAIN",
    voltage: "GATE VOLTAGE",
    size: "gate ≈ 30 nm long, insulator ≈ 1 nm",
    onAmps: 45e-6,
    swing: 0.11,
    camera: [6, 5, 15],
  },
  finfet: {
    label: "FINFET",
    control: "GATE",
    from: "SOURCE",
    to: "DRAIN",
    voltage: "GATE VOLTAGE",
    size: "fin ≈ 7 nm wide, 50 nm tall",
    onAmps: 45e-6,
    swing: 0.07,
    camera: [8.5, 6.5, 18.5],
  },
  gaa: {
    label: "GATE-ALL-AROUND",
    control: "GATE",
    from: "SOURCE",
    to: "DRAIN",
    voltage: "GATE VOLTAGE",
    size: "sheet ≈ 5 nm thick, 15–40 nm wide",
    onAmps: 45e-6,
    swing: 0.063,
    camera: [9.5, 7, 20.5],
  },
};

const THRESHOLD = 0.3;
/** How far a zone stands proud of the face it colours, so the two do not fight for the pixel. */
const FACE = 2.005;
const SURFACE = 0.003;

export type DeviceState = {
  /** Current through the main path, in amps. */
  mainAmps: number;
  /** Steady current in the control wire, in amps. */
  controlAmps: number;
  /** 0 to 1, on a compressed scale, for the state name. */
  flow: number;
  /** Share of the full current, for how many electrons to draw: a leak of a few nA draws none. */
  rate: number;
  controlRate: number;
  state: "CUTOFF" | "PARTLY ON" | "ON";
};

/** A diode law for the BJT; for a MOSFET, an exponential below threshold and a power law above. */
export function deviceState(device: Device, volts: number): DeviceState {
  const { onAmps, swing } = DEVICE_INFO[device];
  let mainAmps: number;
  let controlAmps: number;
  if (swing === undefined) {
    mainAmps = Math.min(onAmps, 1e-14 * Math.exp(volts / 0.026));
    controlAmps = Math.min(430e-6, 1e-16 * Math.exp(volts / 0.026));
  } else {
    const below = 1e-6 * 10 ** ((Math.min(volts, THRESHOLD) - THRESHOLD) / swing);
    const above = 71e-6 * Math.max(0, volts - THRESHOLD) ** 1.3;
    mainAmps = below + above;
    controlAmps = 0;
  }
  const flow = Math.min(1, (mainAmps / onAmps) ** 0.25);
  return {
    mainAmps,
    controlAmps,
    flow,
    rate: Math.min(1, mainAmps / onAmps),
    controlRate: Math.min(1, controlAmps / 430e-6),
    state: flow < 0.25 ? "CUTOFF" : flow > 0.85 ? "ON" : "PARTLY ON",
  };
}

const UNITS = [
  [1, "A"],
  [1e-3, "mA"],
  [1e-6, "µA"],
  [1e-9, "nA"],
  [1e-12, "pA"],
] as const;

export function formatAmps(amps: number) {
  if (amps < 1e-13) return "0";
  const [scale, unit] = UNITS.find(([scale]) => amps >= scale) ?? UNITS[UNITS.length - 1];
  const value = amps / scale;
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

const part = (id: string, material: Material, box: Box, gate = false): Part => ({
  id,
  material,
  box,
  gate,
});

function bjtParts(): Part[] {
  return [
    part("collector-floor", "n", [-4, 4, -3, -1.6, -2, 2]),
    part("collector-left", "n", [-4, -3, -1.6, 0, -2, 2]),
    part("collector-right", "n", [1.5, 4, -1.6, 0, -2, 2]),
    part("base-floor", "p", [-3, 1.5, -1.6, -0.9, -2, 2]),
    part("base-left", "p", [-3, -2.2, -0.9, 0, -2, 2]),
    part("base-right", "p", [-0.4, 1.5, -0.9, 0, -2, 2]),
    part("emitter", "n", [-2.2, -0.4, -0.9, 0, -2, 2]),
    part("emitter-contact", "metal", [-1.8, -0.8, 0, 1.2, -0.5, 0.5]),
    part("base-contact", "metal", [0.2, 1, 0, 1.2, -0.5, 0.5]),
    part("collector-contact", "metal", [2.4, 3.4, 0, 1.2, -0.5, 0.5]),
  ];
}

function planarParts(): Part[] {
  return [
    part("body", "p", [-4, 4, -2, -0.7, -2, 2]),
    part("body-middle", "p", [-1.2, 1.2, -0.7, -0.12, -2, 2]),
    part("channel", "channel", [-1.2, 1.2, -0.12, 0, -2, 2]),
    part("source", "n", [-4, -1.2, -0.7, 0, -2, 2]),
    part("drain", "n", [1.2, 4, -0.7, 0, -2, 2]),
    part("oxide", "oxide", [-1.2, 1.2, 0, 0.1, -2, 2]),
    part("gate", "gate", [-1.2, 1.2, 0.1, 1, -2, 2], true),
    part("gate-contact", "metal", [-0.5, 0.5, 1, 1.5, -0.5, 0.5], true),
    part("source-contact", "metal", [-3, -2, 0, 1.5, -0.8, 0.8]),
    part("drain-contact", "metal", [2, 3, 0, 1.5, -0.8, 0.8]),
  ];
}

function finParts(): Part[] {
  return [
    part("body", "p", [-4, 4, -2, -1, -2.5, 2.5]),
    part("fin-root", "p", [-4, 4, -1, 0, -0.4, 0.4]),
    part("field-back", "oxide", [-4, 4, -1, 0, -2.5, -0.4]),
    part("field-front", "oxide", [-4, 4, -1, 0, 0.4, 2.5]),
    part("source", "n", [-4, -1.2, 0, 2, -0.4, 0.4]),
    part("drain", "n", [1.2, 4, 0, 2, -0.4, 0.4]),
    part("fin-core", "p", [-1.2, 1.2, 0, 1.85, -0.25, 0.25]),
    part("channel-top", "channel", [-1.2, 1.2, 1.85, 2, -0.4, 0.4]),
    part("channel-back", "channel", [-1.2, 1.2, 0, 1.85, -0.4, -0.25]),
    part("channel-front", "channel", [-1.2, 1.2, 0, 1.85, 0.25, 0.4]),
    part("oxide-top", "oxide", [-1.2, 1.2, 2, 2.1, -0.5, 0.5]),
    part("oxide-back", "oxide", [-1.2, 1.2, 0, 2, -0.5, -0.4]),
    part("oxide-front", "oxide", [-1.2, 1.2, 0, 2, 0.4, 0.5]),
    part("gate-top", "gate", [-1.2, 1.2, 2.1, 3, -1.6, 1.6], true),
    part("gate-back", "gate", [-1.2, 1.2, 0, 2.1, -1.6, -0.5], true),
    part("gate-front", "gate", [-1.2, 1.2, 0, 2.1, 0.5, 1.6], true),
    part("gate-contact", "metal", [-0.5, 0.5, 3, 3.5, -0.5, 0.5], true),
    part("source-contact", "metal", [-3.2, -2.2, 2, 3.5, -0.7, 0.7]),
    part("drain-contact", "metal", [2.2, 3.2, 2, 3.5, -0.7, 0.7]),
  ];
}

const SHEETS: readonly (readonly [number, number])[] = [
  [0.4, 0.8],
  [1.2, 1.6],
  [2, 2.4],
];

function gaaParts(): Part[] {
  const t = 0.06;
  const parts = [
    part("body", "p", [-4, 4, -2, -1, -2.5, 2.5]),
    part("field", "oxide", [-4, 4, -1, 0, -2.5, 2.5]),
    part("source", "n", [-4, -1.2, 0, 3, -1.2, 1.2]),
    part("drain", "n", [1.2, 4, 0, 3, -1.2, 1.2]),
    part("gate-contact", "metal", [-0.5, 0.5, 3, 3.5, -0.5, 0.5], true),
    part("source-contact", "metal", [-3.2, -2.2, 3, 4, -0.7, 0.7]),
    part("drain-contact", "metal", [2.2, 3.2, 3, 4, -0.7, 0.7]),
  ];
  let floor = 0;
  SHEETS.forEach(([y0, y1], index) => {
    const name = `sheet-${index}`;
    parts.push(
      part(name, "channel", [-1.2, 1.2, y0, y1, -1, 1]),
      part(`${name}-oxide-top`, "oxide", [-1.2, 1.2, y1, y1 + t, -1 - t, 1 + t]),
      part(`${name}-oxide-bottom`, "oxide", [-1.2, 1.2, y0 - t, y0, -1 - t, 1 + t]),
      part(`${name}-oxide-back`, "oxide", [-1.2, 1.2, y0, y1, -1 - t, -1]),
      part(`${name}-oxide-front`, "oxide", [-1.2, 1.2, y0, y1, 1, 1 + t]),
      part(`gate-under-${index}`, "gate", [-1.2, 1.2, floor, y0 - t, -1.5, 1.5], true),
      part(`gate-back-${index}`, "gate", [-1.2, 1.2, y0 - t, y1 + t, -1.5, -1 - t], true),
      part(`gate-front-${index}`, "gate", [-1.2, 1.2, y0 - t, y1 + t, 1 + t, 1.5], true),
    );
    floor = y1 + t;
  });
  parts.push(part("gate-top", "gate", [-1.2, 1.2, floor, 3, -1.5, 1.5], true));
  return parts;
}

export function deviceParts(device: Device): Part[] {
  if (device === "bjt") return bjtParts();
  if (device === "planar") return planarParts();
  return device === "finfet" ? finParts() : gaaParts();
}

/**
 * Routes of the main current's electrons, always source to drain. They run just under the
 * surfaces a reader can see, inside the metal and the silicon the whole way: an inversion
 * layer really does sit at the surface, under the insulator.
 */
export function electronPaths(device: Device): Vec3[][] {
  if (device === "bjt")
    return [1, -1].flatMap((side) =>
      [-0.4, 0, 0.4].map((dx): Vec3[] => {
        const face = side * 1.96;
        const low = -2.2 + dx * 0.5;
        return [
          [-1.3, 1.1, 0],
          [-1.3 + dx, -0.04, 0],
          [-1.3 + dx, -0.04, face],
          [-1.3 + dx, low, face],
          [2.9 + dx, low, face],
          [2.9 + dx, -0.04, face],
          [2.9 + dx, -0.04, 0],
          [2.9, 1.1, 0],
        ];
      }),
    );
  if (device === "planar")
    return [-1.4, -0.5, 0.5, 1.4].map((z) => [
      [-2.5, 1.4, z * 0.4],
      [-2.5, -0.04, z * 0.4],
      [-2, -0.04, z],
      [2, -0.04, z],
      [2.5, -0.04, z * 0.4],
      [2.5, 1.4, z * 0.4],
    ]);
  if (device === "finfet") {
    const top: Vec3[] = [
      [-2.7, 3.4, 0],
      [-2.7, 1.96, 0],
      [2.7, 1.96, 0],
      [2.7, 3.4, 0],
    ];
    const sides = (
      [
        [1.3, -0.36],
        [0.5, -0.36],
        [1.3, 0.36],
        [0.5, 0.36],
      ] as const
    ).map(([y, z]): Vec3[] => [
      [-2.7, 3.4, 0],
      [-2.7, 1.96, 0],
      [-2.7, y, z],
      [2.7, y, z],
      [2.7, 1.96, 0],
      [2.7, 3.4, 0],
    ]);
    return [top, ...sides];
  }
  return SHEETS.flatMap(([y0, y1]) =>
    [-1, 1].map((side): Vec3[] => {
      const y = (y0 + y1) / 2;
      return [
        [-2.7, 3.9, 0],
        [-2.7, 2.96, 0],
        [-2.7, 2.96, side * 1.16],
        [-2.7, y, side * 1.16],
        [-1.2, y, side * 0.96],
        [1.2, y, side * 0.96],
        [2.7, y, side * 1.16],
        [2.7, 2.96, side * 1.16],
        [2.7, 2.96, 0],
        [2.7, 3.9, 0],
      ];
    }),
  );
}

/** The holes a BJT's base wire feeds in. Only the BJT's control touches the silicon. */
export const controlPaths = (device: Device): Vec3[][] =>
  device === "bjt"
    ? [1, -1].map((side) => [
        [0.6, -0.04, 0],
        [0.6, -0.04, side * 1.96],
        [-0.35, -0.5, side * 1.96],
      ])
    : [];

/** How far the channel has formed: nothing up to the threshold, complete 0.1 V above it. */
export const channelFormed = (device: Device, volts: number) =>
  device === "bjt" ? 0 : Math.max(0, Math.min(1, (volts - THRESHOLD) / 0.1));

/** How far a gate has pushed the holes away, which is complete by the threshold. */
export const holesPushed = (device: Device, volts: number) =>
  device === "bjt" ? 0 : Math.min(1, volts / THRESHOLD);

/**
 * The depletion zones at this voltage: silicon with no free carriers, only fixed ions.
 * Each n/p junction has one. Heavily doped n silicon keeps nearly all of it on the p side,
 * and the junction with the positive drain or collector across it is the wider one. A rising
 * gate voltage digs one under the gate too (its depth goes as the square root of the voltage),
 * and a channel opens through the top of them at the threshold. In a BJT, a rising base
 * voltage thins the emitter's zone.
 */
export function depletionBoxes(device: Device, volts: number): Box[] {
  const boxes: Box[] = [];
  if (device === "bjt") {
    const width = 0.2 * Math.max(0.15, 1 - volts / 0.8);
    const add = (x0: number, x1: number, y0: number, y1: number) =>
      boxes.push([x0, x1, y0, y1, -FACE, FACE]);
    add(-2.2 - width, -0.4 + width, -0.9 - width, -0.9);
    add(-2.2 - width, -2.2, -0.9, SURFACE);
    add(-0.4, -0.4 + width, -0.9, SURFACE);
    add(-3.3, 1.8, -1.9, -1.52);
    add(-3.3, -2.92, -1.52, SURFACE);
    add(1.42, 1.8, -1.52, SURFACE);
    return boxes;
  }
  const open = channelFormed(device, volts) >= 1;
  if (device === "planar") {
    const add = (x0: number, x1: number, y0: number, y1: number) =>
      boxes.push([x0, x1, y0, y1, -FACE, FACE]);
    add(-4 - 0.005, -0.9, -1, -0.7);
    add(-1.2, -0.9, -0.7, -0.12);
    add(0.7, 4 + 0.005, -1.2, -0.7);
    add(0.7, 1.2, -0.7, -0.12);
    if (!open) {
      add(-1.2, -0.9, -0.12, SURFACE);
      add(0.7, 1.2, -0.12, SURFACE);
    }
    const depth = 0.55 * Math.sqrt(holesPushed(device, volts));
    if (depth > 0) add(-0.9, 0.7, -0.12 - depth, -0.12);
    return boxes;
  }
  if (device === "finfet") {
    const z = 0.405;
    boxes.push([-4 - 0.005, -0.95, -0.3, 0, -z, z], [0.85, 4 + 0.005, -0.5, 0, -z, z]);
    if (!open) boxes.push([-1.2, -0.95, 0, 2 + 0.005, -z, z], [0.85, 1.2, 0, 2 + 0.005, -z, z]);
    return boxes;
  }
  if (!open)
    for (const [y0, y1] of SHEETS)
      boxes.push(
        [-1.2, -0.95, y0 - 0.005, y1 + 0.005, -1.005, 1.005],
        [0.85, 1.2, y0 - 0.005, y1 + 0.005, -1.005, 1.005],
      );
  return boxes;
}

type Site = { at: Vec3; kind: "n" | "p" | "channel" };

/** A regular grid on a flat, axis-aligned patch of a surface, inset by half a step. */
function grid(
  sites: Site[],
  kind: Site["kind"],
  [x0, x1]: readonly [number, number],
  [y0, y1]: readonly [number, number],
  [z0, z1]: readonly [number, number],
  step: number,
) {
  const along = (from: number, to: number) => {
    if (from === to) return [from];
    const count = Math.max(1, Math.round((to - from) / step));
    return Array.from({ length: count }, (_, i) => from + ((i + 0.5) * (to - from)) / count);
  };
  for (const x of along(x0, x1))
    for (const y of along(y0, y1))
      for (const z of along(z0, z1)) sites.push({ at: [x, y, z], kind });
}

/** Both faces of a slab, at z and at -z. */
function faces(
  sites: Site[],
  kind: Site["kind"],
  xs: readonly [number, number],
  ys: readonly [number, number],
  z: number,
  step: number,
) {
  grid(sites, kind, xs, ys, [z, z], step);
  grid(sites, kind, xs, ys, [-z, -z], step);
}

function chargeSites(device: Device): Site[] {
  const sites: Site[] = [];
  if (device === "bjt") {
    faces(sites, "n", [-2.2, -0.4], [-0.9, 0], 2, 0.34);
    faces(sites, "n", [-4, 4], [-3, -1.6], 2, 0.4);
    faces(sites, "n", [-4, -3], [-1.6, 0], 2, 0.4);
    faces(sites, "n", [1.5, 4], [-1.6, 0], 2, 0.4);
    faces(sites, "p", [-3, 1.5], [-1.6, -0.9], 2, 0.34);
    faces(sites, "p", [-3, -2.2], [-0.9, 0], 2, 0.34);
    faces(sites, "p", [-0.4, 1.5], [-0.9, 0], 2, 0.34);
    return sites;
  }
  if (device === "planar") {
    for (const xs of [
      [-4, -1.2],
      [1.2, 4],
    ] as const) {
      faces(sites, "n", xs, [-0.7, 0], 2, 0.34);
      grid(sites, "n", xs, [0, 0], [-2, 2], 0.56);
    }
    faces(sites, "p", [-4, 4], [-2, -0.7], 2, 0.42);
    faces(sites, "p", [-1.2, 1.2], [-0.7, -0.12], 2, 0.3);
    faces(sites, "channel", [-1.2, 1.2], [-0.06, -0.06], 2, 0.3);
    return sites;
  }
  if (device === "finfet") {
    for (const xs of [
      [-4, -1.2],
      [1.2, 4],
    ] as const) {
      faces(sites, "n", xs, [0, 2], 0.4, 0.34);
      grid(sites, "n", xs, [2, 2], [-0.4, 0.4], 0.34);
    }
    faces(sites, "p", [-4, 4], [-2, -1], 2.5, 0.42);
    faces(sites, "channel", [-1.2, 1.2], [0, 2], 0.4, 0.3);
    grid(sites, "channel", [-1.2, 1.2], [2, 2], [-0.4, 0.4], 0.3);
    return sites;
  }
  for (const xs of [
    [-4, -1.2],
    [1.2, 4],
  ] as const) {
    faces(sites, "n", xs, [0, 3], 1.2, 0.36);
    grid(sites, "n", xs, [3, 3], [-1.2, 1.2], 0.48);
  }
  faces(sites, "p", [-4, 4], [-2, -1], 2.5, 0.42);
  for (const [y0, y1] of SHEETS) faces(sites, "channel", [-1.2, 1.2], [y0, y1], 1, 0.26);
  return sites;
}

const inBox = ([x, y, z]: Vec3, [x0, x1, y0, y1, z0, z1]: Box) =>
  x >= x0 && x <= x1 && y >= y0 && y <= y1 && z >= z0 && z <= z1;

export type Charges = {
  /** Free electrons sitting in n silicon or in a channel. */
  electrons: Vec3[];
  /** Holes, the free carriers of p silicon. */
  holes: Vec3[];
  /** Fixed ions in a depletion zone: negative on the p side, positive on the n side. */
  negative: Vec3[];
  positive: Vec3[];
};

/** What sits at each site at this voltage. One rule: a depletion zone leaves only the ions. */
export function chargesAt(device: Device, volts: number): Charges {
  const zones = depletionBoxes(device, volts);
  const charges: Charges = { electrons: [], holes: [], negative: [], positive: [] };
  const formed = channelFormed(device, volts);
  const pushed = holesPushed(device, volts);
  chargeSites(device).forEach(({ at, kind }, index) => {
    const spread = (index * 0.618) % 1;
    const depleted = zones.some((zone) => inBox(at, zone));
    if (kind === "n") (depleted ? charges.positive : charges.electrons).push(at);
    else if (kind === "p") (depleted ? charges.negative : charges.holes).push(at);
    else if (spread < formed) charges.electrons.push(at);
    else if (depleted || spread < pushed) charges.negative.push(at);
    else charges.holes.push(at);
  });
  return charges;
}

/** The positive charge on the gate plate, which grows with the gate voltage. */
export function gateCharges(device: Device, volts: number): Vec3[] {
  if (device === "bjt") return [];
  const sites: Site[] = [];
  if (device === "planar") faces(sites, "p", [-1.2, 1.2], [0.14, 0.58], 2.02, 0.24);
  else if (device === "finfet") faces(sites, "p", [-1.2, 1.2], [0.1, 2.1], 1.62, 0.34);
  else faces(sites, "p", [-1.2, 1.2], [0.1, 2.9], 1.52, 0.34);
  return sites
    .map(({ at }, index) => ({ at, order: (index * 0.618) % 1 }))
    .filter(({ order }) => order < volts)
    .map(({ at }) => at);
}

export type ModelLabel = {
  text: string;
  at: Vec3;
  /** The way the labelled surface faces. Turned away from the camera, the label goes too. */
  facing?: Vec3;
  /** Sits above its point on a short stick, for a part too thin to carry its name. */
  stick?: boolean;
  terminal?: boolean;
  /** Left out on a stage too small to hold every name. */
  minor?: boolean;
  hidden?: boolean;
};

const signedVolts = (volts: number) => (volts < 0.005 ? "0 V" : `+${volts.toFixed(2)} V`);
const FRONT: Vec3 = [0, 0, 1];
const UP: Vec3 = [0, 1, 0];

/** The names drawn on the model, with the voltages at the three wires. */
export function deviceLabels(device: Device, volts: number): ModelLabel[] {
  const { from, control, to } = DEVICE_INFO[device];
  const terminals = (fromAt: Vec3, controlAt: Vec3, toAt: Vec3): ModelLabel[] => [
    { text: `${from} 0 V`, at: fromAt, terminal: true },
    { text: `${control} ${signedVolts(volts)}`, at: controlAt, terminal: true },
    { text: `${to} +1 V`, at: toAt, terminal: true },
  ];
  const channel = channelFormed(device, volts) > 0 ? "CHANNEL" : "NO CHANNEL";
  if (device === "bjt")
    return [
      ...terminals([-1.3, 1.6, 0], [0.6, 2.2, 0], [2.9, 1.6, 0]),
      { text: "METAL", at: [2.9, 0.6, 0.5], facing: FRONT, minor: true },
      { text: "N SILICON", at: [-1.3, -0.3, 2], facing: FRONT },
      { text: "P SILICON, HOLES", at: [0.6, -0.3, 2], facing: FRONT },
      { text: "N SILICON", at: [2.75, -0.8, 2], facing: FRONT, minor: true },
      { text: "FREE ELECTRONS", at: [0, -2.6, 2], facing: FRONT, minor: true },
      { text: "DEPLETION ZONE", at: [-0.8, -1.7, 2], facing: FRONT },
    ];
  if (device === "planar")
    return [
      ...terminals([-2.5, 1.9, 0], [0, 2.5, 0], [2.5, 1.9, 0]),
      { text: "METAL", at: [2.5, 0.75, 0.8], facing: FRONT, minor: true },
      { text: "FREE ELECTRONS", at: [-2.6, 0, 1.2], facing: UP, minor: true },
      { text: "N SILICON", at: [-2.6, -0.35, 2], facing: FRONT },
      { text: "N SILICON", at: [2.6, -0.35, 2], facing: FRONT, minor: true },
      { text: "P SILICON, HOLES", at: [0, -1.65, 2], facing: FRONT },
      { text: "DEPLETION ZONE", at: [2.4, -0.95, 2], facing: FRONT },
      { text: channel, at: [0, -0.06, 2], facing: FRONT },
      { text: "INSULATOR", at: [1.2, 0.06, 2], facing: FRONT, stick: true },
    ];
  if (device === "finfet")
    return [
      ...terminals([-2.7, 3.9, 0], [0, 4.5, 0], [2.7, 3.9, 0]),
      { text: "METAL", at: [2.7, 2.8, 0.7], facing: FRONT, minor: true },
      { text: "N SILICON", at: [-2.6, 1.3, 0.4], facing: FRONT },
      { text: "N SILICON", at: [2.6, 1.3, 0.4], facing: FRONT, minor: true },
      { text: "FREE ELECTRONS", at: [-2.6, 0.5, 0.4], facing: FRONT, minor: true },
      { text: channel, at: [0, 1, 0.5], facing: FRONT },
      { text: "INSULATOR", at: [3, -0.8, 2.5], facing: FRONT },
      { text: "DEPLETION ZONE", at: [2.4, -0.25, 0.4], facing: FRONT, stick: true },
      { text: "P SILICON, HOLES", at: [0, -1.5, 2.5], facing: FRONT },
    ];
  return [
    ...terminals([-2.7, 4.4, 0], [0, 4.1, 0], [2.7, 4.4, 0]),
    { text: "METAL", at: [2.7, 3.5, 0.7], facing: FRONT, minor: true },
    { text: "N SILICON", at: [-2.6, 2, 1.2], facing: FRONT },
    { text: "N SILICON", at: [2.6, 2, 1.2], facing: FRONT, minor: true },
    { text: "FREE ELECTRONS", at: [-2.6, 0.8, 1.2], facing: FRONT, minor: true },
    { text: channel, at: [0, 1.4, 1], facing: FRONT },
    {
      text: "DEPLETION ZONE",
      at: [1.02, 2.2, 1],
      facing: FRONT,
      stick: true,
      hidden: channelFormed(device, volts) >= 1,
    },
    { text: "INSULATOR", at: [3, -0.5, 2.5], facing: FRONT },
    { text: "P SILICON, HOLES", at: [0, -1.5, 2.5], facing: FRONT },
  ];
}

/** The point a fraction of the way along a route, by distance. */
export function pointAlong(path: readonly Vec3[], fraction: number): Vec3 {
  const lengths = path
    .slice(1)
    .map((point, index) => Math.hypot(...point.map((value, axis) => value - path[index][axis])));
  let left = (lengths.reduce((sum, length) => sum + length, 0) * fraction) as number;
  for (const [index, length] of lengths.entries()) {
    if (left <= length) {
      const t = length ? left / length : 0;
      const [a, b] = [path[index], path[index + 1]];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
    left -= length;
  }
  return path[path.length - 1];
}
