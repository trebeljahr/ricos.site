import { useMemo } from "react";
import { cmosLampLayout } from "src/lib/computer/cmosLampLayout";
import type { Circuit, Snapshot } from "src/lib/computer/logic";
import { isMosfet } from "src/lib/computer/transistorGeometry";
import { bridgeWirePaths, polylinePath, wireJunctions } from "src/lib/computer/wireGeometry";
import { wireNetKeys } from "src/lib/computer/wireTopology";
import {
  Battery,
  Cable,
  type Control,
  KnifeSwitch,
  Lamp,
  Terminal,
  VoltageWaves,
} from "./SwitchBoardParts";
import own from "./SwitchLogic.module.css";
import type { GateRipple } from "./useGateRipple";

/** Trace the load path through the simulator's conducting devices; gate controls are excluded. */
export function lampCurrentPath(circuit: Circuit, snapshot: Snapshot) {
  const wires = new Set<string>();
  const devices = new Set<string>();
  const byId = new Map(circuit.nodes.map((node) => [node.id, node]));
  const visiting = new Set<string>();
  const visit = (id: string): boolean => {
    const node = byId.get(id);
    if (!node || !snapshot.values[id] || visiting.has(id)) return false;
    if (node.type === "high" || node.type === "switch") return true;
    visiting.add(id);
    const sources = circuit.wires.filter(
      (wire) => wire.to === id && (!isMosfet(node) || wire.input === 1),
    );
    let connected = false;
    for (const wire of sources) {
      if (!visit(wire.from)) continue;
      wires.add(wire.id);
      connected = true;
    }
    if (connected && isMosfet(node)) devices.add(id);
    visiting.delete(id);
    return connected;
  };
  visit("out");
  return { wires, devices };
}

/** The lamp view draws the shared CMOS circuit, including its input inverters and both rails. */
export function CmosLampBoard({
  circuit,
  ripple,
  a,
  b,
  onFlip,
  spark,
}: {
  circuit: Circuit;
  ripple: GateRipple;
  a: boolean;
  b: boolean;
  onFlip: (name: Control) => void;
  spark: { id: number; x: number; y: number; control?: Control } | null;
}) {
  const { snapshot, voltages, waves, waveKey } = ripple;
  const layout = useMemo(() => cmosLampLayout(circuit), [circuit]);
  const nets = useMemo(() => wireNetKeys(circuit), [circuit]);
  const current = useMemo(() => lampCurrentPath(circuit, snapshot), [circuit, snapshot]);
  const lit = Boolean(snapshot.values.out);
  const railNet = (id: string) => nets[circuit.wires.find((wire) => wire.from === id)!.id];
  const byId = new Map(circuit.nodes.map((node) => [node.id, node]));
  // A wire's colour is its voltage: tied to battery plus or minus, the same as those rails.
  const netHigh = new Map<string, boolean>();
  for (const wire of circuit.wires)
    if (!isMosfet(byId.get(wire.from)!)) netHigh.set(nets[wire.id], Boolean(voltages[wire.from]));
  const voltageColor = (net: string, fallback = false) =>
    (netHigh.get(net) ?? fallback) ? "#a14e3f" : "#60645e";
  const paths = [
    ...layout.wires.map((wire) => ({
      id: wire.id,
      net: nets[wire.id],
      path: polylinePath(wire.points),
      active: current.wires.has(wire.id),
      signal: isMosfet(circuit.nodes.find((node) => node.id === wire.to)!) && wire.input === 0,
      high: Boolean(voltages[wire.from]),
    })),
    ...layout.inputWires.map((wire) => ({
      ...wire,
      path: polylinePath(wire.points),
      active:
        "currentSource" in wire &&
        circuit.wires.some(
          (native) => native.from === wire.currentSource && current.wires.has(native.id),
        ),
      high: Boolean(voltages[wire.from]),
    })),
    { id: "battery-positive", net: railNet("vcc"), path: "M80 228 V48", active: lit },
    {
      id: "lamp-return",
      net: railNet("gnd"),
      path: `M${layout.width - 76} 280 H${layout.width - 24} V${layout.groundY} H80 V364`,
      active: lit,
    },
  ];
  // A net's new voltage leaves its rail through the selector, or its stage's output node.
  const voltageWaves = layout.wires
    .filter((wire) => waves.has(wire.from) && isMosfet(byId.get(wire.to)!))
    .map((wire) => {
      const high = waves.get(wire.from)!;
      const rail = layout.inputWires.find(
        (input) => input.to === wire.from && input.from === (high ? "vcc" : "gnd"),
      );
      return { id: wire.id, high, lead: rail?.points, wire: wire.points };
    });
  const bridged = bridgeWirePaths(paths);
  const junctions = wireJunctions(paths);
  return (
    <div className={own.boardFrame}>
      <section
        className={own.boardViewport}
        aria-label="Circuit board, scroll sideways on small screens"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The circuit viewport supports keyboard scrolling.
        tabIndex={0}
      >
        <div
          className={`${own.board} ${own.cmosBoard}`}
          style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
          role="group"
          aria-label="Electrically controlled switches and a lamp"
        >
          <svg
            className={own.cables}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            aria-hidden="true"
          >
            {/* Inputs share a supply trunk, so draw live wires last or a dead one hides them. */}
            {[...paths]
              .sort((first, second) => Number(first.active) - Number(second.active))
              .map((wire) => (
                <g key={wire.id} data-wire-id={wire.id}>
                  <Cable
                    d={bridged[wire.id]}
                    color={voltageColor(wire.net, "high" in wire && wire.high)}
                    active={wire.active}
                    signal={"signal" in wire && wire.signal}
                    high={"high" in wire && wire.high}
                  />
                </g>
              ))}
            {lit && (
              <path
                className={own.flowArrow}
                d={`M${layout.width - 175} 280 l-8 -5 m8 5 l-8 5 M${layout.width - 24} 480 l-5 -8 m5 8 l5 -8`}
              />
            )}
            {junctions.map((point) => (
              <circle
                key={`${point.x}-${point.y}-${point.wire}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={voltageColor(paths.find((wire) => wire.id === point.wire)!.net)}
              />
            ))}
            {circuit.nodes.filter(isMosfet).map((node) => {
              const pos = layout.positions.get(node.id)!;
              const control = circuit.wires.find(
                (wire) => wire.to === node.id && wire.input === 0,
              )!.from;
              const high = Boolean(voltages[control]);
              const closed = node.type === "nmos" ? high : !high;
              const label = layout.labels.get(control) ?? control;
              return (
                <g
                  key={node.id}
                  className={own.transistorPart}
                  transform={`translate(${pos.x} ${pos.y})`}
                >
                  <path className={own.deviceLead} d="M0 -34 V-26 M0 26 V34 M-46 0 H-36" />
                  <rect className={own.chip} x="-36" y="-27" width="72" height="54" rx="8" />
                  <text className={own.chipKind} x="0" y="-8">
                    {node.type.toUpperCase()}
                  </text>
                  <text className={own.chipName} x="0" y="15">
                    {label}
                  </text>
                  <circle className={own.stateLight} data-on={closed} cx="25" cy="-17" r="3" />
                  <text className={own.gateLabel} x="-48" y="-7">
                    G
                  </text>
                </g>
              );
            })}
            {layout.inputSwitches.map((input) => (
              <g key={input.id}>
                <Terminal x={input.high.x} y={input.high.y} />
                <Terminal x={input.low.x} y={input.low.y} />
                <Terminal x={input.output.x} y={input.output.y} />
              </g>
            ))}
            {layout.stages.map((node) => {
              const pos = layout.positions.get(node.id)!;
              return (
                <text key={node.id} className={own.netLabel} x={pos.x + 9} y={pos.y - 9}>
                  {layout.labels.get(node.id)} · {snapshot.values[node.id] ? 1 : 0}
                </text>
              );
            })}
          </svg>
          {circuit.nodes.filter(isMosfet).map((node) => {
            const control = circuit.wires.find(
              (wire) => wire.to === node.id && wire.input === 0,
            )!.from;
            const high = Boolean(voltages[control]),
              closed = node.type === "nmos" ? high : !high;
            return (
              <span
                key={node.id}
                className="sr-only"
                role="img"
                aria-label={`${node.type.toUpperCase()} ${layout.labels.get(control) ?? control} transistor ${closed ? "conducting" : "blocking"}; gate ${high ? "high" : "low"}`}
              />
            );
          })}
          {voltageWaves.length > 0 && (
            <VoltageWaves
              key={waveKey}
              waves={voltageWaves}
              width={layout.width}
              height={layout.height}
            />
          )}
          {spark && (
            <span
              key={spark.id}
              className={own.sparkBurst}
              style={{
                left: `${((spark.control ? layout.inputSwitches.find((input) => input.id === spark.control!.toLowerCase())!.output.x : spark.x) / layout.width) * 100}%`,
                top: `${((spark.control ? layout.inputSwitches.find((input) => input.id === spark.control!.toLowerCase())!.y : spark.y) / layout.height) * 100}%`,
              }}
              data-testid="switch-spark"
              aria-hidden="true"
            >
              {["a", "b", "c", "d", "e", "f", "g"].map((ray) => (
                <i key={ray} />
              ))}
            </span>
          )}
          <Battery y={236} boardWidth={layout.width} boardHeight={layout.height} />
          <Lamp
            lit={snapshot.values.out}
            x={layout.width - 150}
            y={149}
            boardWidth={layout.width}
            boardHeight={layout.height}
          />
          {layout.inputSwitches.map((input) => (
            <KnifeSwitch
              key={input.id}
              name={input.id === "a" ? "A" : "B"}
              x={input.x}
              y={input.y}
              boardWidth={layout.width}
              boardHeight={layout.height}
              closed={input.id === "a" ? a : b}
              control
              active={circuit.wires.some(
                (wire) => wire.from === input.id && current.wires.has(wire.id),
              )}
              onFlip={() => onFlip(input.id === "a" ? "A" : "B")}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
