import { useMemo } from "react";
import { cmosLampLayout } from "src/lib/computer/cmosLampLayout";
import type { Circuit, Snapshot } from "src/lib/computer/logic";
import { isMosfet } from "src/lib/computer/transistorGeometry";
import { bridgeWirePaths, polylinePath, wireJunctions } from "src/lib/computer/wireGeometry";
import { wireNetKeys } from "src/lib/computer/wireTopology";
import { Battery, Cable, type Control, ControlSwitch, Lamp } from "./SwitchBoardParts";
import own from "./SwitchLogic.module.css";

/** The lamp view draws the shared CMOS circuit, including its input inverters and both rails. */
export function CmosLampBoard({
  circuit,
  snapshot,
  a,
  b,
  onFlip,
  spark,
}: {
  circuit: Circuit;
  snapshot: Snapshot;
  a: boolean;
  b: boolean;
  onFlip: (name: Control) => void;
  spark: { id: number; x: number; y: number } | null;
}) {
  const layout = useMemo(() => cmosLampLayout(circuit), [circuit]);
  const nets = useMemo(() => wireNetKeys(circuit), [circuit]);
  const controls = circuit.nodes.filter((node) => node.type === "switch");
  const railNet = (id: string) => nets[circuit.wires.find((wire) => wire.from === id)!.id];
  const colors = new Map<string, string>();
  colors.set(railNet("vcc"), "#a14e3f");
  colors.set(railNet("gnd"), "#60645e");
  for (const [index, id] of ["a", "b", ...layout.stages.map((node) => node.id)].entries()) {
    const wire = circuit.wires.find((wire) => wire.from === id);
    if (wire && !colors.has(nets[wire.id]))
      colors.set(nets[wire.id], ["#57764b", "#407d83", "#8c704c", "#7b6687", "#596d4a"][index % 5]);
  }
  const paths = [
    ...layout.wires.map((wire) => ({
      id: wire.id,
      net: nets[wire.id],
      path: polylinePath(wire.points),
    })),
    { id: "battery-positive", net: railNet("vcc"), path: "M80 284 V64" },
    { id: "battery-negative", net: railNet("gnd"), path: "M80 420 V680" },
    {
      id: "selector-supply",
      net: railNet("vcc"),
      path: `M130 64 V650 H${controls.length === 1 ? 272 : 432}`,
    },
    {
      id: "lamp-return",
      net: railNet("gnd"),
      path: `M${layout.width - 76} 336 H${layout.width - 24} V680 H80`,
    },
    ...controls.flatMap((node) => {
      const x = layout.positions.get(node.id)!.x;
      return [
        { id: `${node.id}-positive`, net: railNet("vcc"), path: `M${x + 32} 630 V650` },
        { id: `${node.id}-negative`, net: railNet("gnd"), path: `M${x - 32} 630 V680` },
      ];
    }),
  ];
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
            {paths.map((wire) => (
              <Cable key={wire.id} d={bridged[wire.id]} color={colors.get(wire.net) ?? "#7a705d"} />
            ))}
            {junctions.map((point) => (
              <circle
                key={`${point.x}-${point.y}-${point.wire}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={colors.get(paths.find((wire) => wire.id === point.wire)!.net) ?? "#7a705d"}
              />
            ))}
            {circuit.nodes.filter(isMosfet).map((node) => {
              const pos = layout.positions.get(node.id)!;
              const control = circuit.wires.find(
                (wire) => wire.to === node.id && wire.input === 0,
              )!.from;
              const high = Boolean(snapshot.values[control]);
              const closed = node.type === "nmos" ? high : !high;
              const label = layout.labels.get(control) ?? control;
              return (
                <g key={node.id} transform={`translate(${pos.x} ${pos.y})`}>
                  <path className={own.deviceLead} d="M0 -34 V-26 M0 26 V34 M-46 0 H-36" />
                  <rect className={own.chip} x="-36" y="-27" width="72" height="54" rx="8" />
                  <text className={own.chipKind} x="0" y="-8">
                    {node.type.toUpperCase()}
                  </text>
                  <text className={own.chipName} x="0" y="15">
                    {label}
                  </text>
                  <circle className={own.stateLight} data-on={closed} cx="25" cy="-17" r="3" />
                </g>
              );
            })}
            {layout.stages.map((node) => {
              const pos = layout.positions.get(node.id)!;
              return (
                <text key={node.id} className={own.netLabel} x={pos.x + 9} y={pos.y - 9}>
                  {layout.labels.get(node.id)}
                </text>
              );
            })}
          </svg>
          {circuit.nodes.filter(isMosfet).map((node) => {
            const control = circuit.wires.find(
              (wire) => wire.to === node.id && wire.input === 0,
            )!.from;
            const high = Boolean(snapshot.values[control]),
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
          {spark && (
            <span
              key={spark.id}
              className={own.sparkBurst}
              style={{
                left: `${(spark.x / layout.width) * 100}%`,
                top: `${(spark.y / layout.height) * 100}%`,
              }}
              data-testid="switch-spark"
              aria-hidden="true"
            >
              {["a", "b", "c", "d", "e", "f", "g"].map((ray) => (
                <i key={ray} />
              ))}
            </span>
          )}
          <Battery y={292} boardWidth={layout.width} boardHeight={layout.height} />
          <Lamp
            lit={snapshot.values.out}
            x={layout.width - 150}
            y={205}
            boardWidth={layout.width}
            boardHeight={layout.height}
          />
          {controls.map((node) => (
            <ControlSwitch
              key={node.id}
              name={node.id === "a" ? "A" : "B"}
              x={layout.positions.get(node.id)!.x}
              y={610}
              boardWidth={layout.width}
              boardHeight={layout.height}
              high={node.id === "a" ? a : b}
              onFlip={() => onFlip(node.id === "a" ? "A" : "B")}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
