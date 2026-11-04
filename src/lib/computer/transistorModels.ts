/**
 * Geometry and rough electrical behaviour of four transistor builds. Every part is
 * an axis-aligned box, so a slice cuts it into a smaller box with a solid face.
 * x runs from the electron source to the drain, y points up, z is the width.
 * Shapes are to no scale; currents are textbook orders of magnitude.
 */
export const DEVICES = ["bjt", "planar", "finfet", "gaa"] as const;
export type Device = (typeof DEVICES)[number];
export type Slice = "none" | "along" | "across";
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
    voltage: "VBE",
    size: "base ≈ 1 µm thick, die ≈ 500 µm (2N2222)",
    onAmps: 5e-3,
    camera: [9, 7, 13],
  },
  planar: {
    label: "PLANAR",
    control: "GATE",
    from: "SOURCE",
    to: "DRAIN",
    voltage: "VGS",
    size: "gate ≈ 30 nm long, insulator ≈ 1 nm",
    onAmps: 45e-6,
    swing: 0.11,
    camera: [9, 7, 13],
  },
  finfet: {
    label: "FINFET",
    control: "GATE",
    from: "SOURCE",
    to: "DRAIN",
    voltage: "VGS",
    size: "fin ≈ 7 nm wide, 50 nm tall",
    onAmps: 45e-6,
    swing: 0.07,
    camera: [8, 7, 14],
  },
  gaa: {
    label: "GATE-ALL-AROUND",
    control: "GATE",
    from: "SOURCE",
    to: "DRAIN",
    voltage: "VGS",
    size: "sheet ≈ 5 nm thick, 15–40 nm wide",
    onAmps: 45e-6,
    swing: 0.063,
    camera: [8, 7, 14],
  },
};

const THRESHOLD = 0.3;

export type DeviceState = {
  /** Current through the main path, in amps. */
  mainAmps: number;
  /** Steady current in the control wire, in amps. */
  controlAmps: number;
  /** 0 to 1, on a compressed scale, so a tiny leak is still a visible trickle. */
  flow: number;
  controlFlow: number;
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
  const controlFlow = controlAmps ? Math.min(1, (controlAmps / 430e-6) ** 0.25) : 0;
  return {
    mainAmps,
    controlAmps,
    flow,
    controlFlow,
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

/** What is left of a box on the kept side of a slice, or null when nothing is. */
export function clipBox(box: Box, slice: Slice): Box | null {
  const [x0, x1, y0, y1, z0, z1] = box;
  if (slice === "along") return z0 >= 0 ? null : [x0, x1, y0, y1, z0, Math.min(z1, 0)];
  if (slice === "across") return x0 >= 0 ? null : [x0, Math.min(x1, 0), y0, y1, z0, z1];
  return box;
}

export const keepsPoint = ([x, , z]: Vec3, slice: Slice) =>
  slice === "along" ? z <= 0 : slice === "across" ? x <= 0 : true;

/**
 * Electrons drawn over the model. A cross-section shows only those at the cut, or the
 * ones further back would seem to run through the gate.
 */
export const showsElectron = (point: Vec3, slice: Slice) =>
  slice === "across" ? point[0] <= 0 && point[0] >= -1.2 : keepsPoint(point, slice);

export const SLICE_CAMERAS: Record<Exclude<Slice, "none">, Vec3> = {
  along: [0, 2, 16],
  across: [16, 2, 0],
};

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
    part("collector-back", "n", [-3, 1.5, -1.6, 0, -2, -1.5]),
    part("collector-front", "n", [-3, 1.5, -1.6, 0, 1.5, 2]),
    part("base-floor", "p", [-3, 1.5, -1.6, -0.9, -1.5, 1.5]),
    part("base-left", "p", [-3, -2.2, -0.9, 0, -1.5, 1.5]),
    part("base-right", "p", [-0.4, 1.5, -0.9, 0, -1.5, 1.5]),
    part("base-back", "p", [-2.2, -0.4, -0.9, 0, -1.5, -1]),
    part("base-front", "p", [-2.2, -0.4, -0.9, 0, 1, 1.5]),
    part("emitter", "n", [-2.2, -0.4, -0.9, 0, -1, 1]),
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

/** Where each wire leaves the device, for its name tag. */
export function deviceTerminals(device: Device): { name: string; at: Vec3 }[] {
  const { from, control, to } = DEVICE_INFO[device];
  if (device === "bjt")
    return [
      { name: from, at: [-1.3, 1.6, 0] },
      { name: control, at: [0.6, 1.6, 0] },
      { name: to, at: [2.9, 1.6, 0] },
    ];
  const [top, gate] =
    device === "planar" ? [1.9, 1.9] : device === "finfet" ? [3.9, 3.9] : [4.4, 3.9];
  const side = device === "planar" ? 2.5 : 2.7;
  return [
    { name: from, at: [-side, top, 0] },
    { name: control, at: [0, gate, 0] },
    { name: to, at: [side, top, 0] },
  ];
}

/** Routes the main current's electrons take. A planar gate loses its grip deep down, so a leak runs low. */
export function electronPaths(device: Device, flow: number): Vec3[][] {
  if (device === "bjt")
    return [-0.6, 0, 0.6].map((z) => [
      [-1.3, 1.2, z * 0.5],
      [-1.3, -0.5, z],
      [-1.2, -1.3, z],
      [-1, -2.3, z],
      [2.9, -2.3, z * 0.5],
      [2.9, 1.2, z * 0.5],
    ]);
  if (device === "planar") {
    const y = -0.06 - (1 - flow) * 0.5;
    return [-1.4, -0.5, 0.5, 1.4].map((z) => [
      [-2.5, 1.5, z * 0.4],
      [-2.5, -0.06, z],
      [-1.2, y, z],
      [1.2, y, z],
      [2.5, -0.06, z],
      [2.5, 1.5, z * 0.4],
    ]);
  }
  if (device === "finfet")
    return (
      [
        [1.93, 0],
        [1.3, -0.33],
        [0.5, -0.33],
        [1.3, 0.33],
        [0.5, 0.33],
      ] as const
    ).map(([y, z]) => [
      [-2.7, 3.5, 0],
      [-2.7, y, z],
      [2.7, y, z],
      [2.7, 3.5, 0],
    ]);
  return SHEETS.flatMap(([y0, y1]) =>
    [-0.55, 0.55].map((z): Vec3[] => [
      [-2.7, 4, 0],
      [-2.7, (y0 + y1) / 2, z],
      [2.7, (y0 + y1) / 2, z],
      [2.7, 4, 0],
    ]),
  );
}

/** The steady current into the control terminal. Only the BJT's control touches the silicon. */
export const controlPaths = (device: Device): Vec3[][] =>
  device === "bjt"
    ? [
        [
          [0.6, 1.2, 0],
          [0.6, -0.5, 0],
          [-0.2, -1.1, 0],
        ],
      ]
    : [];

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
