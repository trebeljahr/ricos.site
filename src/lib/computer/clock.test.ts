import { describe, expect, it } from "vitest";
import {
  CLOCK_PRESETS,
  clockFacts,
  formatDistance,
  formatElapsed,
  formatHertz,
  formatLongDuration,
  formatNumber,
  formatSeconds,
  formatTicks,
  groupDigits,
  HIGH_MIN,
  hzToSlider,
  LOW_MAX,
  MAX_HZ,
  MIN_HZ,
  NOISE_MAX,
  niceStep,
  numberName,
  readGate,
  SAMPLE_COUNT,
  scopeTimebase,
  signalReport,
  sliderToHz,
  squareWave,
  ticksSince,
  triggeredWave,
} from "./clock";

describe("number formatting", () => {
  it("writes numbers out in full with digit grouping", () => {
    expect(groupDigits("4500000000")).toBe("4,500,000,000");
    expect(groupDigits("999")).toBe("999");
    expect(groupDigits("1234.5678")).toBe("1,234.5678");
    expect(formatNumber(4.5e9)).toBe("4,500,000,000");
    expect(formatNumber(1 / 4.5e9 / 1e-9)).toBe("0.222");
    expect(formatNumber(1_023_000, 6)).toBe("1,023,000");
    expect(formatNumber(0.004)).toBe("0.004");
    expect(formatNumber(0)).toBe("0");
  });

  it("names the size of a number", () => {
    expect(numberName(4.5e9)).toBe("4.5 billion");
    expect(numberName(18e6)).toBe("18 million");
    expect(numberName(999_999)).toBe("1 million");
    expect(numberName(740_000)).toBe("740 thousand");
    expect(numberName(999)).toBe("");
  });

  it("scales units sensibly", () => {
    expect(formatHertz(4.5e9)).toBe("4.5 GHz");
    expect(formatHertz(1_023_000)).toBe("1.023 MHz");
    expect(formatHertz(740_000, true)).toBe("740 kilohertz");
    expect(formatHertz(1)).toBe("1 Hz");
    expect(formatSeconds(1 / 4.5e9)).toBe("0.222 ns");
    expect(formatSeconds(1 / 740_000)).toBe("1.35 µs");
    expect(formatSeconds(1, true)).toBe("1 second");
    expect(formatSeconds(0.5)).toBe("500 ms");
    expect(formatDistance(0.0666)).toBe("6.66 cm");
    expect(formatDistance(62.85)).toBe("62.9 m");
    expect(formatDistance(299_792_458)).toBe("300,000 km");
    expect(formatLongDuration(4.5e9)).toBe("143 years");
    expect(formatLongDuration(740_000)).toBe("8.56 days");
    expect(formatLongDuration(1)).toBe("1 second");
    expect(formatLongDuration(7200)).toBe("2 hours");
    expect(formatElapsed(72_000)).toBe("1 min 12 s");
    expect(formatElapsed(3_725_000)).toBe("1 h 2 min");
    expect(formatElapsed(4_900)).toBe("4 s");
  });
});

describe("clock facts", () => {
  it("backs the chapter's numbers for a 4.5 GHz desktop CPU", () => {
    expect(clockFacts(4.5e9)).toEqual({
      perSecond: "4,500,000,000",
      perSecondName: "4.5 billion",
      tick: "0.222 ns",
      light: "6.66 cm",
      jetTicks: "18,000,000",
      slowed: "143 years",
    });
  });

  it("stays readable at one tick a second", () => {
    const facts = clockFacts(1);
    expect(facts.perSecond).toBe("1");
    expect(facts.tick).toBe("1 s");
    expect(facts.jetTicks).toBe("0.004");
    expect(facts.slowed).toBe("1 second");
  });

  it("counts ticks since the page opened without losing digits", () => {
    expect(ticksSince(1000, 4.5e9)).toBe(BigInt(4_500_000_000));
    expect(ticksSince(1500, 1)).toBe(BigInt(1));
    // Thirty days at 5 GHz is past 2^53; BigInt keeps every digit.
    const month = ticksSince(30 * 24 * 3600 * 1000, 5e9);
    expect(month).toBe(BigInt("12960000000000000"));
    expect(formatTicks(month)).toBe("12,960,000,000,000,000");
    expect(ticksSince(-50, 1e9)).toBe(BigInt(0));
  });

  it("presets hold the frequencies checked against their sources", () => {
    const byId = Object.fromEntries(CLOCK_PRESETS.map((preset) => [preset.id, preset.hz]));
    expect(byId).toMatchObject({
      "4004": 740_000,
      apple: 1_023_000,
      ibm: 4_770_000,
      pentium: 60_000_000,
      desktop: 4_500_000_000,
    });
    for (const preset of CLOCK_PRESETS) {
      expect(preset.hz).toBeGreaterThanOrEqual(MIN_HZ);
      expect(preset.hz).toBeLessThanOrEqual(MAX_HZ);
    }
  });
});

describe("frequency slider", () => {
  it("runs on a log scale from 1 Hz to 5 GHz", () => {
    expect(sliderToHz(0)).toBe(1);
    expect(sliderToHz(1000)).toBe(5e9);
    expect(sliderToHz(-20)).toBe(1);
    expect(sliderToHz(500)).toBe(70_700);
    expect(hzToSlider(1)).toBe(0);
    expect(hzToSlider(5e9)).toBe(1000);
    for (const position of [0, 123, 456, 789, 1000])
      expect(Math.abs(hzToSlider(sliderToHz(position)) - position)).toBeLessThanOrEqual(1);
  });
});

describe("scope", () => {
  it("steps the time base 1, 2, 5", () => {
    expect(niceStep(0.4 / 4.5e9)).toBe(1e-10);
    expect(niceStep(0.0267)).toBe(0.02);
    expect(niceStep(0.4)).toBe(0.5);
    expect(niceStep(0.13)).toBe(0.1);
  });

  it("keeps a few ticks on screen and runs in real time up to 15 Hz", () => {
    const desktop = scopeTimebase(4.5e9);
    expect(desktop.realTime).toBe(false);
    expect(formatSeconds(desktop.secondsPerDivision)).toBe("0.1 ns");
    expect(desktop.cycles).toBeCloseTo(4.5);

    const slow = scopeTimebase(1);
    expect(slow.realTime).toBe(true);
    expect(slow.secondsPerDivision).toBe(0.5);
    expect(scopeTimebase(15).realTime).toBe(true);
    // At least a second on screen in real time, so the trace does not race by.
    expect(scopeTimebase(15).secondsPerDivision).toBe(0.1);
    expect(scopeTimebase(16).realTime).toBe(false);

    for (const hz of [1, 3, 15, 16, 740_000, 4.77e6, 5e9]) {
      const { cycles } = scopeTimebase(hz);
      expect(cycles).toBeGreaterThanOrEqual(2);
      expect(cycles).toBeLessThanOrEqual(15);
    }
  });

  it("draws a square wave as flat stretches joined by edges", () => {
    const wave = squareWave(-0.5, 4);
    expect(wave.edges).toEqual([0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]);
    expect(wave.flats[0]).toEqual([0, 0.125, 0]);
    expect(wave.flats[1]).toEqual([0.125, 0.25, 1]);
    expect(wave.flats.at(-1)).toEqual([0.875, 1, 1]);

    const triggered = triggeredWave(scopeTimebase(4.5e9));
    // The trace rises one division in.
    expect(triggered.edges[0]).toBeCloseTo(0.1);
    expect(triggered.flats[0][2]).toBe(0);
  });
});

describe("signal edges", () => {
  it("reads 1 above the high threshold, 0 below the low one, ? in between", () => {
    expect(readGate(1)).toBe("1");
    expect(readGate(HIGH_MIN)).toBe("1");
    expect(readGate(0.5)).toBe("?");
    expect(readGate(LOW_MAX)).toBe("0");
    expect(readGate(-0.1)).toBe("0");
    expect(NOISE_MAX).toBeLessThan(LOW_MAX);
  });

  it("reads the wanted signal right at every noise level", () => {
    for (const noise of [0, 0.3, 0.6, 1]) {
      const report = signalReport("wanted", noise);
      expect(report.samples).toHaveLength(SAMPLE_COUNT);
      expect(report.right).toBe(SAMPLE_COUNT);
      expect(report.between).toBe(0);
      expect(report.samples.map((sample) => sample.reading).join("")).toBe("0011110000111100");
    }
  });

  it("leaves the unwanted signal in between and gets samples wrong", () => {
    const quiet = signalReport("unwanted", 0);
    expect(quiet.samples.map((sample) => sample.reading).join("")).toBe("001111?0001101?0");
    expect(quiet.undefined).toBe(2);
    // The glitch.
    expect(quiet.wrong).toBe(1);
    expect(quiet.between).toBeGreaterThan(0.08);

    const loud = signalReport("unwanted", 1);
    expect(loud.undefined + loud.wrong).toBeGreaterThan(quiet.undefined + quiet.wrong);
    expect(loud.between).toBeGreaterThan(quiet.between);
  });

  it("gets worse step by step as the noise grows", () => {
    let previous = -1;
    for (let noise = 0; noise <= 1; noise += 0.1) {
      const report = signalReport("unwanted", noise);
      expect(report.wrong).toBeGreaterThanOrEqual(1);
      expect(report.right + report.undefined + report.wrong).toBe(SAMPLE_COUNT);
      expect(report.undefined + report.wrong).toBeGreaterThanOrEqual(previous);
      previous = report.undefined + report.wrong;
    }
  });
});
