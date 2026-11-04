import { useMemo, useState } from "react";
import {
  type Element,
  type InputWiring,
  inputWiring,
  partCounts,
  type Schematic,
  STYLE_LABELS,
  schematicFor,
  solveWiring,
  WIRING_GATES,
  WIRING_STYLES,
  type WiringGate,
  type WiringResult,
  type WiringStyle,
} from "src/lib/computer/gateFamilies";
import { deviceState, formatAmps } from "src/lib/computer/transistorModels";
import styles from "./Graphics.module.css";
import { Bay, Choice, fixed, GraphicsPanel, Toggle } from "./GraphicsParts";

const HIGH = "#ff7a5c";
const LOW = "#6d7488";
const CURRENT = "#ffd54a";
const NET_NAMES: Record<string, string> = { a: "A", b: "B", na: "Ā", nb: "B̄" };

function Device({
  element,
  stubX,
  result,
}: {
  element: Extract<Element, { gate: string }>;
  stubX: number;
  result: WiringResult;
}) {
  const { x, y, kind, gate } = element;
  const closed = result.closed.has(element.id);
  const gateColor = result.values[gate] ? HIGH : LOW;
  const body = closed ? CURRENT : "#aeb6c6";
  const npn = kind === "npn";
  const labels = npn ? ["C", "E"] : kind === "pmos" ? ["S", "D"] : ["D", "S"];
  const baseCurrent = result.baseCurrent.has(element.id);
  return (
    <g data-device={element.id} data-kind={kind} data-closed={closed}>
      {NET_NAMES[gate] && (
        <text className={styles.wiringGateTag} x={x - 24} y={y - 7} fill={gateColor}>
          {NET_NAMES[gate]}
        </text>
      )}
      <path
        d={`M${stubX} ${y} H${npn ? x - 8 : kind === "pmos" ? x - 18 : x - 12}`}
        stroke={baseCurrent ? CURRENT : gateColor}
        strokeWidth="3"
        fill="none"
        data-base-current={baseCurrent || undefined}
      />
      {npn ? (
        <path
          d={`M${x - 8} ${y - 14} V${y + 14} M${x - 8} ${y - 6} L${x} ${y - 16} V${y - 24} M${x - 8} ${y + 6} L${x} ${y + 16} V${y + 24}`}
          stroke={body}
          strokeWidth="3"
          fill="none"
        />
      ) : (
        <>
          <path d={`M${x - 12} ${y - 14} V${y + 14}`} stroke={gateColor} strokeWidth="3" />
          <path
            d={`M${x} ${y - 24} V${y - 16} H${x - 6} V${y + 16} H${x} V${y + 24}`}
            stroke={body}
            strokeWidth="3"
            fill="none"
          />
          {kind === "pmos" && (
            <circle cx={x - 15} cy={y} r="3.5" fill="#12151e" stroke={gateColor} strokeWidth="2" />
          )}
        </>
      )}
      <text className={styles.wiringPin} x={x + 7} y={y - 16}>
        {labels[0]}
      </text>
      <text className={styles.wiringPin} x={x + 7} y={y + 22}>
        {labels[1]}
      </text>
    </g>
  );
}

function Resistor({
  element,
  result,
}: {
  element: Extract<Element, { kind: "res" }>;
  result: WiringResult;
}) {
  const { x, y1, y2 } = element;
  const live = result.values[element.top] !== result.values[element.bottom];
  const step = (y2 - y1) / 8;
  const path = Array.from(
    { length: 7 },
    (_, index) => `L${x + (index % 2 ? -8 : 8)} ${y1 + step * (index + 1)}`,
  ).join(" ");
  return (
    <path
      d={`M${x} ${y1} ${path} L${x} ${y2}`}
      stroke={live ? CURRENT : "#aeb6c6"}
      strokeWidth="2.5"
      fill="none"
      data-resistor={element.id}
    />
  );
}

/** The inputs: A and B on their lines, Ā and B̄ each out of an inverter. */
function InputBuses({
  wiring,
  result,
  level,
}: {
  wiring: InputWiring;
  result: WiringResult;
  level: (net: string) => string;
}) {
  return (
    <>
      {wiring.buses.map(({ net, y, fromX, toX, inverterFrom }) => (
        <g key={net} data-bus={net}>
          <text className={styles.wiringTag} x="10" y={y + 4} textAnchor="middle" fill={level(net)}>
            {NET_NAMES[net]}
          </text>
          {inverterFrom !== undefined && (
            <>
              <path
                d={`M24 ${inverterFrom} V${y} H26`}
                stroke={result.values[net.slice(1)] ? HIGH : LOW}
                strokeWidth="2"
                fill="none"
              />
              <path d={`M26 ${y - 5} V${y + 5} L35 ${y} Z`} fill="none" stroke="#aeb6c6" />
              <circle cx="37.5" cy={y} r="2.5" fill="none" stroke="#aeb6c6" />
            </>
          )}
          <path d={`M${fromX} ${y} H${toX}`} stroke={level(net)} strokeWidth="3" fill="none" />
        </g>
      ))}
      {wiring.runs.map((run) => (
        <polyline
          key={`${run.net}-${run.points.join(" ")}`}
          points={run.points.map((point) => point.join(",")).join(" ")}
          stroke={level(run.net)}
          strokeWidth="2"
          fill="none"
          data-input-run={run.net}
        />
      ))}
      {wiring.dots.map(({ net, at }) => (
        <circle key={`${net}-${at.join()}`} cx={at[0]} cy={at[1]} r="3.5" fill={level(net)} />
      ))}
    </>
  );
}

function SchematicView({ schematic, result }: { schematic: Schematic; result: WiringResult }) {
  const wiring = inputWiring(schematic);
  const level = (net: string) => (result.values[net] ? HIGH : LOW);
  const color = (net: string) =>
    result.currentNets.has(net) ? CURRENT : result.values[net] ? HIGH : LOW;
  const [outX, outY] = schematic.outputAt;
  return (
    <svg className={styles.wiringBoard} viewBox={`0 0 520 ${wiring.height}`} aria-hidden="true">
      <path d="M40 40 H500" stroke={HIGH} strokeWidth="4" />
      <path d="M40 310 H500" stroke={LOW} strokeWidth="4" />
      <text className={styles.wiringTag} x="44" y="30" fill={HIGH}>
        + {fixed(result.railVolts, 0)} V
      </text>
      <text className={styles.wiringTag} x="500" y="303" textAnchor="end" fill={LOW}>
        0 V
      </text>
      {schematic.wires.map((wire) => (
        <polyline
          key={`${wire.net}-${wire.points.join(" ")}`}
          points={wire.points.map((point) => point.join(",")).join(" ")}
          stroke={color(wire.net)}
          strokeWidth="3"
          fill="none"
          data-net={wire.net}
        />
      ))}
      {schematic.joints?.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill={level("x")} />
      ))}
      <InputBuses wiring={wiring} result={result} level={level} />
      {schematic.elements.map((element) =>
        element.kind === "res" ? (
          <Resistor key={element.id} element={element} result={result} />
        ) : (
          <Device
            key={element.id}
            element={element}
            stubX={wiring.stubX[element.id]}
            result={result}
          />
        ),
      )}
      <circle
        cx={outX}
        cy={outY}
        r="10"
        fill={result.output ? "#ffd54a" : "#2a3040"}
        stroke="#aeb6c6"
        strokeWidth="2"
      />
      <text className={styles.wiringTag} x={outX} y={outY - 16} textAnchor="middle" fill="#e8ecf6">
        OUT
      </text>
    </svg>
  );
}

/** One gate wired in each style, with its parts and idle current live. */
export function GateWirings() {
  const [gate, setGate] = useState<WiringGate>("nand");
  const [style, setStyle] = useState<WiringStyle>("bjt");
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const schematic = schematicFor(style, gate);
  const result = useMemo(() => solveWiring(schematic, style, a, b), [schematic, style, a, b]);
  const counts = partCounts(style, gate);
  const usesMos = style !== "bjt";
  const leak = deviceState("planar", 0).mainAmps * result.offDevices;
  return (
    <GraphicsPanel title="ONE GATE, FIVE WIRINGS" plain>
      <Bay>
        <Choice
          label="GATE"
          value={gate}
          options={WIRING_GATES.map((value) => ({ value, label: value.toUpperCase() }))}
          onChange={setGate}
        />
        <Choice
          label="WIRING"
          value={style}
          options={WIRING_STYLES.map((value) => ({ value, label: STYLE_LABELS[value] }))}
          onChange={setStyle}
        />
      </Bay>
      <Bay>
        <div className={styles.choiceRow}>
          <Toggle label={`A = ${Number(a)}`} on={a} onChange={setA} />
          {gate !== "not" && <Toggle label={`B = ${Number(b)}`} on={b} onChange={setB} />}
        </div>
        <div
          role="img"
          aria-label={`${STYLE_LABELS[style]} ${gate.toUpperCase()}: output ${Number(result.output)}, ${counts.transistors} transistors, ${counts.resistors} resistors`}
        >
          <SchematicView schematic={schematic} result={result} />
        </div>
        <dl className={styles.modelReadout}>
          <div>
            <dt>TRANSISTORS</dt>
            <dd data-testid="transistor-count">{counts.transistors}</dd>
          </div>
          <div>
            <dt>RESISTORS</dt>
            <dd data-testid="resistor-count">{counts.resistors}</dd>
          </div>
          <div>
            <dt>OUT</dt>
            <dd data-testid="output-level">
              {Number(result.output)} · {fixed(result.outputVolts)} V of{" "}
              {fixed(result.railVolts, 0)} V
            </dd>
          </div>
          <div>
            <dt>IDLE CURRENT</dt>
            <dd data-testid="idle-current">{formatAmps(result.idleAmps)}</dd>
          </div>
          {usesMos && (
            <div>
              <dt>LEAK WHEN IDLE</dt>
              <dd data-testid="leak-current">{formatAmps(leak)}</dd>
            </div>
          )}
        </dl>
      </Bay>
    </GraphicsPanel>
  );
}
