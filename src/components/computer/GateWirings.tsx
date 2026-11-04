import { useMemo, useState } from "react";
import {
  type Element,
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
import { DEVICE_INFO, deviceState, formatAmps } from "src/lib/computer/transistorModels";
import styles from "./Graphics.module.css";
import { Bay, Choice, fixed, GraphicsPanel, Toggle } from "./GraphicsParts";

const HIGH = "#ff7a5c";
const LOW = "#6d7488";
const CURRENT = "#ffd54a";
const NET_NAMES: Record<string, string> = { a: "A", b: "B", na: "Ā", nb: "B̄", x: "X" };
const netName = (net: string) => NET_NAMES[net] ?? net;
const SHAPES = ["planar", "finfet", "gaa"] as const;
type Shape = (typeof SHAPES)[number];

function Device({
  element,
  result,
}: {
  element: Extract<Element, { gate: string }>;
  result: WiringResult;
}) {
  const { x, y, kind, gate } = element;
  const closed = result.closed.has(element.id);
  const gateColor = result.values[gate] ? HIGH : LOW;
  const body = closed ? CURRENT : "#aeb6c6";
  const npn = kind === "npn";
  const labels = npn ? ["C", "B", "E"] : kind === "pmos" ? ["S", "G", "D"] : ["D", "G", "S"];
  const baseCurrent = result.baseCurrent.has(element.id);
  return (
    <g data-device={element.id} data-kind={kind} data-closed={closed}>
      <text className={styles.wiringTag} x={x - 44} y={y + 4} textAnchor="end" fill={gateColor}>
        {netName(gate)}
      </text>
      <path
        d={`M${x - 40} ${y} H${npn ? x - 8 : kind === "pmos" ? x - 18 : x - 12}`}
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
      <text className={styles.wiringPin} x={x - 30} y={y - 6}>
        {labels[1]}
      </text>
      <text className={styles.wiringPin} x={x + 7} y={y + 22}>
        {labels[2]}
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

function SchematicView({ schematic, result }: { schematic: Schematic; result: WiringResult }) {
  const color = (net: string) =>
    result.currentNets.has(net) ? CURRENT : result.values[net] ? HIGH : LOW;
  const [outX, outY] = schematic.outputAt;
  return (
    <svg className={styles.wiringBoard} viewBox="0 0 520 330" aria-hidden="true">
      <path d="M40 40 H500" stroke={HIGH} strokeWidth="4" />
      <path d="M40 310 H500" stroke={LOW} strokeWidth="4" />
      <text className={styles.wiringTag} x="44" y="30" fill={HIGH}>
        + {fixed(result.railVolts, 0)} V
      </text>
      <text className={styles.wiringTag} x="44" y="326" fill={LOW}>
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
      {schematic.tags?.map((tag) => (
        <text
          key={`${tag.net}-${tag.x}`}
          className={styles.wiringTag}
          x={tag.x}
          y={tag.y}
          textAnchor="middle"
          fill={result.values[tag.net] ? HIGH : LOW}
        >
          {netName(tag.net)}
        </text>
      ))}
      {schematic.elements.map((element) =>
        element.kind === "res" ? (
          <Resistor key={element.id} element={element} result={result} />
        ) : (
          <Device key={element.id} element={element} result={result} />
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
  const [shape, setShape] = useState<Shape>("planar");
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const schematic = schematicFor(style, gate);
  const result = useMemo(() => solveWiring(schematic, style, a, b), [schematic, style, a, b]);
  const counts = partCounts(style, gate);
  const usesMos = style !== "bjt";
  const leak = deviceState(shape, 0).mainAmps * result.offDevices;
  return (
    <GraphicsPanel title="ONE GATE, FIVE WIRINGS">
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
        <Choice
          label="SHAPE"
          value={shape}
          options={SHAPES.map((value) => ({
            value,
            label: DEVICE_INFO[value].label,
            disabled: !usesMos,
          }))}
          onChange={setShape}
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
