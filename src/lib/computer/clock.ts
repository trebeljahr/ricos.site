/**
 * The numbers behind the clock demos of chapter 1.4: how big a clock speed is,
 * what one tick means in time and distance, and the signal a gate has to read.
 */

// ---------------------------------------------------------------- frequencies

export const MIN_HZ = 1;
export const MAX_HZ = 5e9;
/** Positions of the frequency slider; it runs on a log scale from MIN_HZ to MAX_HZ. */
export const SLIDER_STEPS = 1000;
/** Up to here a lamp and a scrolling trace can show every tick as it happens. */
export const REAL_TIME_MAX_HZ = 15;
/** Metres per second, exact by the definition of the metre. */
export const SPEED_OF_LIGHT = 299_792_458;
/** The chapter's jet engine: the core of a turbofan at full power. */
export const JET_CORE_RPM = 15_000;
/** The scope screen is ten divisions wide, like a real one. */
export const DIVISIONS = 10;

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

const LOG_MAX = Math.log10(MAX_HZ / MIN_HZ);

export function clampHz(hz: number) {
  return Math.min(MAX_HZ, Math.max(MIN_HZ, hz));
}

/** Rounds to a number of significant figures, without float noise. */
export function roundSignificant(value: number, digits = 3) {
  if (value === 0 || !Number.isFinite(value)) return value;
  return Number(value.toPrecision(digits));
}

/** Slider position → frequency, rounded to three figures so the readouts stay readable. */
export function sliderToHz(position: number) {
  const fraction = Math.min(1, Math.max(0, position / SLIDER_STEPS));
  return clampHz(roundSignificant(MIN_HZ * 10 ** (fraction * LOG_MAX), 3));
}

export function hzToSlider(hz: number) {
  return Math.round((Math.log10(clampHz(hz) / MIN_HZ) / LOG_MAX) * SLIDER_STEPS);
}

/** Where a frequency sits along the slider, 0 to 1. */
export function hzToFraction(hz: number) {
  return Math.log10(clampHz(hz) / MIN_HZ) / LOG_MAX;
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

// ---------------------------------------------------------------- the scope

/** 1, 2, 5, 10, 20, 50 … the steps of a real scope's time base knob. */
export function niceStep(value: number) {
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const mantissa = value / base;
  const steps = [1, 2, 5, 10];
  let best = steps[0];
  for (const step of steps)
    if (Math.abs(Math.log(mantissa / step)) < Math.abs(Math.log(mantissa / best))) best = step;
  return roundSignificant(best * base, 1);
}

export type Timebase = {
  secondsPerDivision: number;
  /** Ticks across the whole screen. */
  cycles: number;
  realTime: boolean;
};

/**
 * About four ticks on screen. In real time the screen holds at least a second,
 * so a slow trace scrolls by at a speed the eye can follow.
 */
export function scopeTimebase(hz: number): Timebase {
  const realTime = hz <= REAL_TIME_MAX_HZ;
  let secondsPerDivision = niceStep(0.4 / hz);
  if (realTime) secondsPerDivision = Math.max(secondsPerDivision, 0.1);
  return { secondsPerDivision, cycles: DIVISIONS * secondsPerDivision * hz, realTime };
}

export type SquareWave = {
  /** Flat stretches: from x, to x (0 to 1 across the screen), level 0 or 1. */
  flats: [number, number, 0 | 1][];
  /** Where the trace jumps, 0 to 1 across the screen. */
  edges: number[];
};

const fraction = (value: number) => ((value % 1) + 1) % 1;

/** The clock's level at a phase: high for the first half of every tick. */
export function levelAtPhase(phase: number): 0 | 1 {
  return fraction(phase) < 0.5 ? 1 : 0;
}

/**
 * A square wave across the screen. Phase counts ticks: the signal rises at each
 * whole number and falls half a tick later.
 */
export function squareWave(phaseAtLeft: number, cycles: number): SquareWave {
  const flats: SquareWave["flats"] = [];
  const edges: number[] = [];
  let level = levelAtPhase(phaseAtLeft);
  let from = 0;
  let edge = Math.floor(phaseAtLeft * 2 + 1) / 2;
  for (let guard = 0; guard < 400; guard++) {
    const x = (edge - phaseAtLeft) / cycles;
    if (x >= 1) break;
    flats.push([from, x, level]);
    edges.push(x);
    level = level === 1 ? 0 : 1;
    from = x;
    edge += 0.5;
  }
  flats.push([from, 1, level]);
  return { flats, edges };
}

/** The standing picture a triggered scope shows: the trace rises one division in. */
export function triggeredWave(timebase: Timebase) {
  return squareWave(-timebase.cycles / DIVISIONS, timebase.cycles);
}

// ---------------------------------------------------------------- signal edges

/** A gate reads 1 above HIGH_MIN and 0 below LOW_MAX, as a share of the supply. */
export const LOW_MAX = 0.3;
export const HIGH_MIN = 0.7;
export const SIGNAL_PERIODS = 2;
export const SAMPLE_COUNT = 16;
export const TRACE_POINTS = 480;
/** At full noise the wanted signal still keeps clear of both thresholds. */
export const NOISE_MAX = 0.25;

export type SignalKind = "wanted" | "unwanted";
export type GateReading = "0" | "1" | "?";
export type SampleVerdict = "right" | "undefined" | "wrong";

export function readGate(value: number): GateReading {
  if (value >= HIGH_MIN) return "1";
  if (value <= LOW_MAX) return "0";
  return "?";
}

/** The clock as drawn by hand: rises a quarter tick in, falls at three quarters. */
export function idealLevel(t: number): 0 | 1 {
  const phase = fraction(t);
  return phase >= 0.25 && phase < 0.75 ? 1 : 0;
}

// A rising edge rings: an underdamped step with 50% overshoot. Its first dip
// lands on the second sample after the edge.
const RING_PERIOD = 0.1875;
const RING_OMEGA = (2 * Math.PI) / RING_PERIOD;
const RING_DECAY = Math.PI / -Math.log(0.5) / RING_OMEGA;
// A falling edge crawls: a slow RC discharge.
const FALL_TAU = 0.1;
// A glitch: a short dip in the middle of the second high stretch.
const GLITCH_AT = 1.5625;
const GLITCH_WIDTH = 0.008;
const GLITCH_DEPTH = 0.8;

function rise(u: number) {
  const decay = Math.exp(-u / RING_DECAY);
  const omegaTau = RING_OMEGA * RING_DECAY;
  return 1 - decay * (Math.cos(RING_OMEGA * u) + Math.sin(RING_OMEGA * u) / omegaTau);
}

function fall(u: number) {
  return Math.exp(-u / FALL_TAU);
}

// Where each edge starts: the level the previous edge reached half a tick later.
const SETTLED_LOW = fall(0.5);
const SETTLED_HIGH = rise(0.5);

/**
 * A fixed, repeatable hiss: random knots, linearly joined, so every visit and the
 * server render draw the same picture. Seed 180 makes more noise turn more
 * unwanted samples into a "?", step by step, and never fixes the glitch.
 */
const NOISE_KNOTS = (() => {
  let seed = 180;
  const random = () => {
    // mulberry32
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: 129 }, () => random() * 2 - 1);
})();

function noiseAt(t: number) {
  const position = (Math.min(Math.max(t, 0), SIGNAL_PERIODS) / SIGNAL_PERIODS) * 128;
  const index = Math.min(127, Math.floor(position));
  const weight = position - index;
  return NOISE_KNOTS[index] * (1 - weight) + NOISE_KNOTS[index + 1] * weight;
}

/**
 * The voltage at time t (in ticks), as a share of the supply. `noise` runs 0 to 1.
 * Wanted: two flat levels and edges that jump. Unwanted: a rising edge that
 * overshoots and rings, a falling edge that crawls, and one glitch.
 */
export function signalAt(t: number, kind: SignalKind, noise: number) {
  const hiss = noiseAt(t) * NOISE_MAX * Math.min(1, Math.max(0, noise));
  if (kind === "wanted") return idealLevel(t) + hiss;
  const phase = fraction(t);
  const start = Math.floor(t);
  let clean: number;
  if (phase < 0.25) clean = SETTLED_HIGH * fall(t - (start - 0.25));
  else if (phase < 0.75) clean = SETTLED_LOW + (1 - SETTLED_LOW) * rise(t - (start + 0.25));
  else clean = SETTLED_HIGH * fall(t - (start + 0.75));
  const glitch = GLITCH_DEPTH * Math.exp(-(((t - GLITCH_AT) / GLITCH_WIDTH) ** 2) / 2);
  return clean - glitch + hiss;
}

export type SignalSample = {
  t: number;
  value: number;
  reading: GateReading;
  expected: "0" | "1";
  verdict: SampleVerdict;
};

export type SignalReport = {
  /** Evenly spaced across the screen, TRACE_POINTS + 1 of them. */
  trace: number[];
  samples: SignalSample[];
  right: number;
  undefined: number;
  wrong: number;
  /** Share of the time the signal spends between the thresholds, 0 to 1. */
  between: number;
};

export function sampleTimes() {
  return Array.from(
    { length: SAMPLE_COUNT },
    (_, index) => ((index + 0.5) / SAMPLE_COUNT) * SIGNAL_PERIODS,
  );
}

/** The trace, what a gate reads at each sample, and how long the signal sits in between. */
export function signalReport(kind: SignalKind, noise: number): SignalReport {
  const trace = Array.from({ length: TRACE_POINTS + 1 }, (_, index) =>
    signalAt((index / TRACE_POINTS) * SIGNAL_PERIODS, kind, noise),
  );
  const samples = sampleTimes().map((t): SignalSample => {
    const value = signalAt(t, kind, noise);
    const reading = readGate(value);
    const expected = idealLevel(t) === 1 ? "1" : "0";
    const verdict = reading === "?" ? "undefined" : reading === expected ? "right" : "wrong";
    return { t, value, reading, expected, verdict };
  });
  const count = (verdict: SampleVerdict) =>
    samples.filter((sample) => sample.verdict === verdict).length;
  const inBetween = trace.filter((value) => readGate(value) === "?").length;
  return {
    trace,
    samples,
    right: count("right"),
    undefined: count("undefined"),
    wrong: count("wrong"),
    between: inBetween / trace.length,
  };
}
