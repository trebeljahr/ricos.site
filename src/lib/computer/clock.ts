/**
 * The numbers behind the clock demos of chapter 2.1: how big a clock speed is,
 * what one tick means in time and distance, and the signal a gate has to read.
 */

// ---------------------------------------------------------------- frequencies

export const MIN_HZ = 1;
export const MAX_HZ = 5e9;
/** Metres per second, exact by the definition of the metre. */
export const SPEED_OF_LIGHT = 299_792_458;
/** The chapter's jet engine: the core of a turbofan at full power. */
export const JET_CORE_RPM = 15_000;

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_YEAR = 365.25 * SECONDS_PER_DAY;

export type ClockPreset = {
  id: string;
  name: string;
  /** Empty for the 1 Hz key, which is no machine. */
  year: string;
  hz: number;
};

/**
 * Checked against the machines' Wikipedia infoboxes (October 2026): Intel 4004,
 * 15 Nov 1971, 740 kHz; Apple II, June 1977, 6502 at 1.023 MHz; IBM PC 5150,
 * 12 Aug 1981, 8088 at 4.77 MHz; Pentium (P5), 22 Mar 1993, 60 and 66 MHz.
 * 4.5 GHz is the desktop speed the chapter uses.
 */
export const CLOCK_PRESETS: readonly ClockPreset[] = [
  { id: "one", name: "1 PER SECOND", year: "", hz: 1 },
  { id: "4004", name: "INTEL 4004", year: "1971", hz: 740_000 },
  { id: "apple", name: "APPLE II", year: "1977", hz: 1_023_000 },
  { id: "ibm", name: "IBM PC", year: "1981", hz: 4_770_000 },
  { id: "pentium", name: "PENTIUM", year: "1993", hz: 60_000_000 },
  { id: "desktop", name: "DESKTOP CPU", year: "TODAY", hz: 4_500_000_000 },
];

/** Rounds to a number of significant figures, without float noise. */
export function roundSignificant(value: number, digits = 3) {
  if (value === 0 || !Number.isFinite(value)) return value;
  return Number(value.toPrecision(digits));
}

// ---------------------------------------------------------------- comparison

export type ClockScale = "log" | "linear";

/** The log scale runs from 1 Hz to 10 GHz, one step per power of ten. */
export const LOG_DECADES = 10;
/** The linear scale ends at the fastest clock the demos know, just past the fastest preset. */
export const LINEAR_MAX_HZ = MAX_HZ;

/** Where a frequency sits along a comparison bar, 0 to 1. */
export function barFraction(hz: number, scale: ClockScale) {
  if (scale === "linear") return Math.min(1, Math.max(0, hz / LINEAR_MAX_HZ));
  return Math.min(1, Math.max(0, Math.log10(Math.max(MIN_HZ, hz)) / LOG_DECADES));
}

/** How a clock compares to a base clock: "× 6,081", "÷ 740,000" or "=". */
export function compareTo(hz: number, baseHz: number) {
  if (hz === baseHz) return "=";
  return hz > baseHz ? `× ${formatNumber(hz / baseHz, 4)}` : `÷ ${formatNumber(baseHz / hz, 4)}`;
}

// ---------------------------------------------------------------- formatting

/** "4500000000" → "4,500,000,000". Keeps a decimal part as it is. */
export function groupDigits(digits: string) {
  const [whole, fraction] = digits.split(".");
  const negative = whole.startsWith("-");
  const body = negative ? whole.slice(1) : whole;
  const grouped = body.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

/** A number written out in full, rounded to `significant` figures: 4,500,000,000 or 0.222. */
export function formatNumber(value: number, significant = 3) {
  if (!Number.isFinite(value)) return "∞";
  if (value === 0) return "0";
  const rounded = roundSignificant(value, significant);
  const magnitude = Math.floor(Math.log10(Math.abs(rounded)));
  const decimals = Math.min(20, Math.max(0, significant - 1 - magnitude));
  let text = rounded.toFixed(decimals);
  if (text.includes(".")) text = text.replace(/0+$/, "").replace(/\.$/, "");
  return groupDigits(text);
}

type Unit = { size: number; short: string; long: string };

function inUnits(value: number, units: readonly Unit[], significant: number) {
  const unit = units.find((candidate) => value >= candidate.size) ?? units[units.length - 1];
  const amount = formatNumber(value / unit.size, significant);
  return { amount, unit };
}

const HERTZ: readonly Unit[] = [
  { size: 1e9, short: "GHz", long: "gigahertz" },
  { size: 1e6, short: "MHz", long: "megahertz" },
  { size: 1e3, short: "kHz", long: "kilohertz" },
  { size: 1, short: "Hz", long: "hertz" },
];

/** 4.5 GHz, 1.023 MHz, 740 kHz. */
export function formatHertz(hz: number, words = false) {
  const { amount, unit } = inUnits(hz, HERTZ, 4);
  return `${amount} ${words ? unit.long : unit.short}`;
}

const SECONDS: readonly Unit[] = [
  { size: 1, short: "s", long: "seconds" },
  { size: 1e-3, short: "ms", long: "milliseconds" },
  { size: 1e-6, short: "µs", long: "microseconds" },
  { size: 1e-9, short: "ns", long: "nanoseconds" },
];

/** A short time, never below nanoseconds: 0.222 ns, 1.35 µs, 500 ms. */
export function formatSeconds(seconds: number, words = false) {
  const { amount, unit } = inUnits(seconds, SECONDS, 3);
  const long = amount === "1" ? unit.long.replace(/s$/, "") : unit.long;
  return `${amount} ${words ? long : unit.short}`;
}

const DISTANCES: readonly Unit[] = [
  { size: 1000, short: "km", long: "kilometres" },
  { size: 1, short: "m", long: "metres" },
  { size: 0.01, short: "cm", long: "centimetres" },
];

/** 6.66 cm, 62.8 m, 300,000 km. */
export function formatDistance(metres: number, words = false) {
  const { amount, unit } = inUnits(metres, DISTANCES, 3);
  return `${amount} ${words ? unit.long : unit.short}`;
}

const LONG_DURATIONS: readonly Unit[] = [
  { size: SECONDS_PER_YEAR, short: "years", long: "years" },
  { size: SECONDS_PER_DAY, short: "days", long: "days" },
  { size: SECONDS_PER_HOUR, short: "hours", long: "hours" },
  { size: SECONDS_PER_MINUTE, short: "minutes", long: "minutes" },
  { size: 1, short: "seconds", long: "seconds" },
];

/** A long time in words: 143 years, 8.56 days, 1 second. */
export function formatLongDuration(seconds: number) {
  const { amount, unit } = inUnits(seconds, LONG_DURATIONS, 3);
  return `${amount} ${amount === "1" ? unit.long.replace(/s$/, "") : unit.long}`;
}

/** Time on the page so far: 12 s, 1 min 12 s, 2 h 5 min. */
export function formatElapsed(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / SECONDS_PER_HOUR);
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = total % SECONDS_PER_MINUTE;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}

const NUMBER_NAMES = [
  "thousand",
  "million",
  "billion",
  "trillion",
  "quadrillion",
  "quintillion",
  "sextillion",
] as const;

/** The spoken size of a number: 4.5 billion. Empty below a thousand. */
export function numberName(value: number) {
  if (!(value >= 1000)) return "";
  const group = Math.min(NUMBER_NAMES.length, Math.floor(Math.log10(value) / 3));
  let amount = roundSignificant(value / 10 ** (group * 3), 3);
  let index = group;
  // 999,999 rounds up to "1,000 thousand"; say "1 million" instead.
  if (amount >= 1000 && index < NUMBER_NAMES.length) {
    amount /= 1000;
    index += 1;
  }
  return `${formatNumber(amount, 3)} ${NUMBER_NAMES[index - 1]}`;
}

// ---------------------------------------------------------------- clock facts

export type ClockFacts = {
  /** Ticks every second, written out in full. */
  perSecond: string;
  perSecondName: string;
  tick: string;
  light: string;
  jetTicks: string;
  slowed: string;
};

/** Everything the readouts show for one frequency. */
export function clockFacts(hz: number): ClockFacts {
  return {
    perSecond: formatNumber(hz, 6),
    perSecondName: numberName(hz),
    tick: formatSeconds(1 / hz),
    light: formatDistance(SPEED_OF_LIGHT / hz),
    jetTicks: formatNumber(hz / (JET_CORE_RPM / SECONDS_PER_MINUTE), 3),
    // One tick slowed to a second: one second of ticks then lasts hz seconds.
    slowed: formatLongDuration(hz),
  };
}

/**
 * Ticks of a clock at `hz` in `elapsedMs`, exact for any page lifetime.
 * BigInt, because a tab left open at 5 GHz passes 2^53 ticks in three weeks.
 */
export function ticksSince(elapsedMs: number, hz: number) {
  const milliHertz = BigInt(Math.round(hz * 1000));
  const ms = BigInt(Math.max(0, Math.floor(elapsedMs)));
  return (milliHertz * ms) / BigInt(1_000_000);
}

export function formatTicks(ticks: bigint) {
  return groupDigits(ticks.toString());
}

// ---------------------------------------------------------------- signal edges

const fraction = (value: number) => ((value % 1) + 1) % 1;

/** A 5 V CMOS part: anything up to 30% of the supply is a 0, anything from 70% is a 1. */
export const SUPPLY_VOLTS = 5;
export const LOW_MAX_VOLTS = 1.5;
export const HIGH_MIN_VOLTS = 3.5;
export const SIGNAL_HZ = 1;
export const SCREEN_SECONDS = 3;
/** Stretched so the edge is visible at 1 Hz; real chips switch in nanoseconds or less. */
export const EDGE_SECONDS = 0.09;
/** Always less than the margin to either threshold, so noise alone never changes a bit. */
export const NOISE_VOLTS = 0.3;

const TRACE_STEP_SECONDS = 0.01;
const NOISE_KNOTS_PER_SECOND = 50;

export type Bit = "0" | "1" | "?";
export type TracePoint = { t: number; volts: number };
export type BitRun = { from: number; to: number; bit: Bit };

export function readBit(volts: number): Bit {
  if (volts >= HIGH_MIN_VOLTS) return "1";
  if (volts <= LOW_MAX_VOLTS) return "0";
  return "?";
}

/** The same random number in -1 to 1 for the same knot, so a scrolling trace keeps its shape. */
function knotNoise(knot: number) {
  // mulberry32, one round per knot
  let value = Math.imul(knot + 0x6d2b79f5, 0x6d2b79f5);
  value = Math.imul(value ^ (value >>> 15), 1 | value);
  value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
  return (((value ^ (value >>> 14)) >>> 0) / 4294967296) * 2 - 1;
}

function noiseAt(seconds: number) {
  const position = seconds * NOISE_KNOTS_PER_SECOND;
  const knot = Math.floor(position);
  const weight = position - knot;
  return (knotNoise(knot) * (1 - weight) + knotNoise(knot + 1) * weight) * NOISE_VOLTS;
}

const smoothstep = (share: number) => {
  const clamped = Math.min(1, Math.max(0, share));
  return clamped * clamped * (3 - 2 * clamped);
};

/** The clock without noise: it starts rising on each tick and starts falling half a tick later. */
function cleanVolts(seconds: number) {
  const phase = fraction(seconds * SIGNAL_HZ) / SIGNAL_HZ;
  const halfTick = 0.5 / SIGNAL_HZ;
  const level =
    phase < halfTick
      ? smoothstep(phase / EDGE_SECONDS)
      : 1 - smoothstep((phase - halfTick) / EDGE_SECONDS);
  return level * SUPPLY_VOLTS;
}

export function clockVolts(seconds: number) {
  return cleanVolts(seconds) + noiseAt(seconds);
}

/** The trace up to `end`, on a fixed time grid so that scrolling does not make it shimmer. */
export function signalTrace(end: number): TracePoint[] {
  const first = Math.floor((end - SCREEN_SECONDS) / TRACE_STEP_SECONDS);
  const last = Math.ceil(end / TRACE_STEP_SECONDS);
  const points: TracePoint[] = [];
  for (let step = first; step <= last; step++) {
    const t = step * TRACE_STEP_SECONDS;
    points.push({ t, volts: clockVolts(t) });
  }
  return points;
}

/** Joins a trace into stretches of the same bit. */
export function bitRuns(trace: TracePoint[]): BitRun[] {
  const runs: BitRun[] = [];
  for (const { t, volts } of trace) {
    const bit = readBit(volts);
    const current = runs[runs.length - 1];
    if (current?.bit === bit) current.to = t;
    else {
      if (current) current.to = t;
      runs.push({ from: t, to: t, bit });
    }
  }
  return runs;
}
