import { describe, expect, it } from "vitest";
import { type Circuit, initialSnapshot, type Node, validateCircuit, type WireLane } from "./logic";
import {
  LANE_STUB,
  laneComb,
  laneValue,
  NO_LANES,
  resolveLanes,
  trunkRoute,
  validLane,
} from "./wireLanes";

const node = (id: string, type: Node["type"] = "and"): Node => ({ id, type, x: 0, y: 0 });
const wire = (from: string, output: number, to: string, input: number) => ({
  id: `${from}:${output}-${to}:${input}`,
  from,
  output,
  to,
  input,
});
const lane: WireLane = {
  id: "a",
  label: "A",
  sources: [
    { node: "reg", output: 0 },
    { node: "reg", output: 1 },
  ],
};

describe("resolveLanes", () => {
  const circuit: Pick<Circuit, "nodes" | "wires" | "lanes"> = {
    nodes: [node("reg"), node("left"), node("right")],
    wires: [
      wire("reg", 0, "left", 0),
      wire("reg", 1, "left", 1),
      wire("reg", 0, "right", 0),
      wire("reg", 2, "right", 1),
    ],
    lanes: [lane],
  };

  it("groups a lane's wires into one tap per target part", () => {
    const { lanes } = resolveLanes(circuit);
    expect(lanes[0].taps.map((tap) => [tap.to, tap.wires.length])).toEqual([
      ["left", 2],
      ["right", 1],
    ]);
  });

  it("leaves a wire from any other port drawn on its own", () => {
    const { tapOf } = resolveLanes(circuit);
    expect(tapOf.has("reg:2-right:1")).toBe(false);
    expect(tapOf.get("reg:1-left:1")?.to).toBe("left");
  });

  it("leaves a hand-routed wire on its own route", () => {
    const routed = { ...wire("reg", 0, "left", 0), points: [{ x: 1, y: 1 }] };
    const { tapOf } = resolveLanes({ ...circuit, wires: [routed] });
    expect(tapOf.size).toBe(0);
  });

  it("changes nothing for a circuit with no lanes", () => {
    expect(resolveLanes({ ...circuit, lanes: undefined })).toBe(NO_LANES);
  });

  it("drops a lane whose wires are all gone", () => {
    expect(resolveLanes({ ...circuit, wires: [] }).lanes).toEqual([]);
  });
});

describe("lane geometry", () => {
  it("joins ports to a bar one stub away and anchors at its middle", () => {
    const comb = laneComb(
      [
        { x: 100, y: 10 },
        { x: 100, y: 30 },
        { x: 100, y: 50 },
      ],
      "right",
    );
    expect(comb.anchor).toEqual({ x: 100 + LANE_STUB, y: 30 });
    expect(comb.bar).toBe(`M ${100 + LANE_STUB} 10 L ${100 + LANE_STUB} 50`);
  });

  it("stands the bar off on the input side too", () => {
    expect(laneComb([{ x: 100, y: 10 }], "left").anchor).toEqual({ x: 100 - LANE_STUB, y: 10 });
  });

  it("routes a stem through a fixed trunk", () => {
    expect(trunkRoute({ ...lane, trunkX: [50] }, { x: 10, y: 0 }, { x: 90, y: 40 })).toEqual([
      { x: 10, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 40 },
      { x: 90, y: 40 },
    ]);
  });

  it("reaches the trunk through its via points", () => {
    expect(
      trunkRoute(
        { ...lane, trunkX: [50], via: [{ x: 200, y: -30 }] },
        { x: 10, y: 0 },
        { x: 90, y: 40 },
      ),
    ).toEqual([
      { x: 10, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: -30 },
      { x: 50, y: -30 },
      { x: 50, y: 40 },
      { x: 90, y: 40 },
    ]);
  });

  it("takes the nearest trunk left of the part", () => {
    const route = trunkRoute(
      { ...lane, trunkX: [50, 500, 900] },
      { x: 10, y: 0 },
      { x: 600, y: 40 },
    );
    expect(route?.[2]).toEqual({ x: 500, y: 40 });
  });

  it("leaves a lane without a trunk to the router", () => {
    expect(trunkRoute(lane, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeUndefined();
  });
});

describe("laneValue", () => {
  const snapshot = initialSnapshot();

  it("reads a byte from its source ports", () => {
    expect(laneValue(lane, { ...snapshot, outputs: { reg: [true, true] } })).toEqual({
      text: "0x3",
      state: "high",
    });
    expect(laneValue(lane, snapshot)).toEqual({ text: "0x0", state: "low" });
  });

  it("names the lines that are on in a control lane", () => {
    const named = { ...lane, names: ["LOAD", "CLK"] };
    expect(laneValue(named, { ...snapshot, outputs: { reg: [false, true] } }).text).toBe("CLK");
    expect(laneValue(named, snapshot).text).toBe("—");
  });

  it("shows a bus floating and in conflict", () => {
    const onBus = { ...lane, bus: "bus" };
    expect(laneValue(onBus, snapshot).state).toBe("floating");
    expect(laneValue(onBus, { ...snapshot, buses: { bus: "X" } }).state).toBe("conflict");
    expect(laneValue(onBus, { ...snapshot, buses: { bus: 0x2a } }).text).toBe("0x2A");
  });
});

describe("stored lanes", () => {
  const circuit: Circuit = {
    name: "lanes",
    nodes: [
      { id: "a", type: "switch", x: 0, y: 0 },
      { id: "b", type: "lamp", x: 300, y: 0 },
    ],
    wires: [{ id: "w", from: "a", to: "b", input: 0 }],
    lanes: [{ id: "l", label: "L", sources: [{ node: "a" }], trunkX: [150] }],
  };

  it("survive validation", () => {
    expect(validateCircuit(JSON.parse(JSON.stringify(circuit)))?.lanes).toEqual(circuit.lanes);
  });

  it("stay absent on a circuit without them", () => {
    const plain = validateCircuit({ ...circuit, lanes: undefined });
    expect(plain && "lanes" in plain).toBe(false);
  });

  it("reject junk", () => {
    expect(validLane({ id: "x" })).toBeUndefined();
    expect(validLane(null)).toBeUndefined();
  });
});

describe("lanes for a column of parts", () => {
  it("keeps a straight bar when one port has moved further out", () => {
    const comb = laneComb(
      [
        { x: 100, y: 0 },
        { x: 400, y: 50 },
      ],
      "right",
    );
    expect(comb.bar).toBe(`M ${400 + LANE_STUB} 0 L ${400 + LANE_STUB} 50`);
    expect(comb.stubs).toContain(`M 100 0 L ${400 + LANE_STUB} 0`);
  });

  it("reads a decimal lane as a plain number", () => {
    const lane = {
      id: "a",
      label: "A",
      decimal: true,
      sources: [0, 1, 2, 3].map((output) => ({ node: "a", output })),
    };
    const snapshot = { values: {}, outputs: { a: [true, false, true, true] }, buses: {} };
    expect(laneValue(lane, snapshot).text).toBe("13");
    expect(validLane(lane)?.decimal).toBe(true);
  });
});
