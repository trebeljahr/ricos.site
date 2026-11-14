import { describe, expect, it } from "vitest";
import {
  type ActionEvent,
  type ActionParts,
  GRAND,
  initialAction,
  keyTime,
  metresPerSecond,
  NO_PARTS,
  pressKey,
  stepAction,
  UPRIGHT,
} from "./action";
import {
  bebungCents,
  initialJack,
  initialTangent,
  PLUCK_MM,
  pressJack,
  pressTangent,
  stepJack,
  stepTangent,
} from "./earlyActions";
import { brightness, COVERINGS, contact, strikeSpectrum } from "./hammerHead";

/** Holds the key for `hold` seconds at `touch`, lets go for `rest`; returns the events. */
function play(parts: ActionParts, touch: number, hold = 0.4, rest = 0.6) {
  const s = initialAction();
  s.speed = 1 / keyTime(touch);
  const events: ActionEvent[] = [];
  pressKey(s, true);
  for (let t = 0; t < hold; t += 0.001) events.push(...stepAction(s, parts, 0.001));
  const held = { ...s };
  pressKey(s, false);
  for (let t = 0; t < rest; t += 0.001) events.push(...stepAction(s, parts, 0.001));
  return { events, held, end: s };
}

const strikes = (events: ActionEvent[]) => events.filter((e) => e.type === "strike");

/** Presses and lets go `rate` times a second for two seconds; returns strikes and presses. */
function trill(parts: ActionParts, rate: number) {
  const s = initialAction();
  s.speed = 1 / keyTime(0.7);
  const half = 0.5 / rate;
  for (let t = 0; t < 2; t += 2 * half) {
    pressKey(s, true);
    stepAction(s, parts, half);
    pressKey(s, false);
    stepAction(s, parts, half);
  }
  return { strikes: s.strikes, presses: s.presses };
}

describe("piano action", () => {
  it("without escapement, holds the hammer on the string and stops the key short", () => {
    const { events, held } = play(NO_PARTS, 0.6);
    expect(strikes(events)).toHaveLength(1);
    expect(held.holder).toBe("string");
    expect(held.k).toBeLessThan(1);
    expect(events.some((e) => e.type === "silence" && e.by === "hammer")).toBe(true);
  });

  it("with escapement, throws the hammer free and lets the key reach the keybed", () => {
    const { events, held } = play({ ...NO_PARTS, escapement: true }, 0.6);
    expect(strikes(events)).toHaveLength(1);
    expect(held.k).toBe(1);
    expect(held.jackUnder).toBe(false);
  });

  it("strikes faster with a harder touch, within a real piano's range", () => {
    const soft = strikes(play(GRAND, 0.3).events)[0];
    const hard = strikes(play(GRAND, 1).events)[0];
    if (soft?.type !== "strike" || hard?.type !== "strike") throw new Error("no strike");
    expect(metresPerSecond(soft.speed)).toBeGreaterThan(0.2);
    expect(metresPerSecond(hard.speed)).toBeGreaterThan(3 * metresPerSecond(soft.speed));
    expect(metresPerSecond(hard.speed)).toBeLessThan(6);
  });

  it("misses the string when the key goes down too slowly", () => {
    expect(strikes(play(GRAND, 0).events)).toHaveLength(0);
  });

  it("can strike twice from a hard blow when nothing catches the hammer", () => {
    expect(strikes(play({ ...NO_PARTS, escapement: true }, 1).events).length).toBeGreaterThan(1);
    expect(strikes(play({ ...NO_PARTS, escapement: true, check: true }, 1).events)).toHaveLength(1);
  });

  it("holds the hammer on the backcheck while the key stays down", () => {
    const { held } = play({ ...NO_PARTS, escapement: true, check: true }, 0.8);
    expect(held.holder).toBe("check");
  });

  it("lifts the damper with the key and drops it when the key comes up", () => {
    const parts = { ...NO_PARTS, escapement: true, check: true, damper: true };
    const { events, held, end } = play(parts, 0.8);
    expect(held.damper).toBe(1);
    expect(end.damper).toBe(0);
    expect(events.at(-1)).toMatchObject({ type: "silence", by: "damper" });
  });

  it("keeps the dampers up with the pedal", () => {
    const s = initialAction();
    s.pedal = true;
    stepAction(s, GRAND, 0.1);
    expect(s.damper).toBe(1);
  });

  it("repeats fast only with a double escapement", () => {
    const single = trill({ ...GRAND, repetition: false }, 10);
    const double = trill(GRAND, 10);
    expect(single.strikes).toBeLessThan(single.presses / 2);
    expect(double.strikes).toBe(double.presses);
    // Slow enough, both keep up.
    const slow = trill({ ...GRAND, repetition: false }, 3);
    expect(slow.strikes).toBe(slow.presses);
  });

  it("repeats faster on an upright than with a single escapement, slower than a grand", () => {
    expect(trill(UPRIGHT, 8).strikes).toBe(trill(UPRIGHT, 8).presses);
    const fast = trill(UPRIGHT, 12);
    expect(fast.strikes).toBeLessThan(fast.presses);
  });
});

describe("harpsichord jack", () => {
  it("plucks once on the way up, the same height whatever the touch, and damps on return", () => {
    for (const speed of [3, 60]) {
      const s = initialJack();
      s.speed = speed;
      pressJack(s, true);
      const events = stepJack(s, 0.5);
      expect(events).toEqual([expect.objectContaining({ type: "pluck", height: PLUCK_MM })]);
      pressJack(s, false);
      const back = stepJack(s, 0.5);
      expect(back.map((e) => e.type)).toEqual(["silence"]);
      expect(s.phase).toBe("below");
    }
  });

  it("does not pluck if the key comes up before the quill lets go", () => {
    const s = initialJack();
    s.speed = 2;
    s.held = true;
    stepJack(s, 0.1);
    s.held = false;
    expect(stepJack(s, 0.5).some((e) => e.type === "pluck")).toBe(false);
  });
});

describe("clavichord tangent", () => {
  it("strikes harder with a faster key, stays on the string, and is silenced when let go", () => {
    const speeds = [3, 40].map((speed) => {
      const s = initialTangent();
      s.speed = speed;
      pressTangent(s, true);
      const [strike] = stepTangent(s, 0.6);
      expect(s.touching).toBe(true);
      pressTangent(s, false);
      expect(stepTangent(s, 0.3).map((e) => e.type)).toEqual(["silence"]);
      return strike.type === "strike" ? strike.speed : 0;
    });
    expect(speeds[1]).toBeGreaterThan(speeds[0] * 5);
  });

  it("raises the pitch when the finger presses harder", () => {
    const s = initialTangent();
    s.speed = 20;
    s.pressure = 0;
    pressTangent(s, true);
    stepTangent(s, 0.5);
    const light = bebungCents(s.k);
    s.pressure = 1;
    stepTangent(s, 0.5);
    expect(bebungCents(s.k)).toBeGreaterThan(light + 20);
  });
});

describe("hammer heads", () => {
  it("stays on the string longer the softer the covering", () => {
    const times = COVERINGS.map((c) => contact(c, 2).time);
    expect(times[0]).toBeLessThan(times[1]);
    expect(times[1]).toBeLessThan(times[3]);
  });

  it("makes felt brighter when it is struck harder, but not wood", () => {
    const felt = COVERINGS.find((c) => c.id === "felt");
    const wood = COVERINGS[0];
    if (!felt) throw new Error("no felt");
    const bright = (c: typeof felt, v: number) =>
      brightness(strikeSpectrum(contact(c, v).time, 262));
    expect(bright(felt, 5)).toBeGreaterThan(bright(felt, 0.5) * 1.3);
    expect(bright(wood, 5)).toBeCloseTo(bright(wood, 0.5), 1);
  });
});
