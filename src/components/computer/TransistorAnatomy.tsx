import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  DEVICE_INFO,
  DEVICES,
  type Device,
  deviceState,
  formatAmps,
  type Material,
  type Slice,
} from "src/lib/computer/transistorModels";
import styles from "./Graphics.module.css";
import { Bay, Choice, fixed, GraphicsPanel, prefersStillness, Slider } from "./GraphicsParts";
import type { GateView } from "./TransistorAnatomyScene";

const Scene = lazy(() => import("./TransistorAnatomyScene"));

const LEGEND: { material: Material | "electron" | "control"; label: string; color: string }[] = [
  { material: "n", label: "N SILICON", color: "#3f7fe0" },
  { material: "p", label: "P SILICON", color: "#d0647f" },
  { material: "channel", label: "OPEN CHANNEL", color: "#ffd54a" },
  { material: "oxide", label: "INSULATOR", color: "#e6eef5" },
  { material: "gate", label: "GATE", color: "#8e97a8" },
  { material: "metal", label: "METAL", color: "#d8b56a" },
  { material: "electron", label: "ELECTRONS", color: "#7ff0ff" },
  { material: "control", label: "BASE CURRENT", color: "#ff9d4d" },
];

/** The energy hill between the two ends: the same picture for every device. */
function Hill({ device, flow }: { device: Device; flow: number }) {
  const { from, to } = DEVICE_INFO[device];
  const height = 46 * (1 - flow);
  const points = Array.from({ length: 41 }, (_, index) => {
    const x = index / 40;
    const y = 66 - height * Math.exp(-(((x - 0.5) / 0.16) ** 2));
    return `${(16 + x * 288).toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg
      className={styles.hill}
      viewBox="0 0 320 90"
      role="img"
      aria-label={`Energy barrier from ${from.toLowerCase()} to ${to.toLowerCase()}: ${Math.round((1 - flow) * 100)} percent of its full height`}
    >
      <polyline points={points} fill="none" stroke="#38e1ff" strokeWidth="2.5" />
      {[0, 1, 2, 3].map((index) => (
        <circle
          key={index}
          cx={(28 + index * 12 + flow ** 3 * (index + 1) * 58).toFixed(1)}
          cy={60}
          r="3.5"
          fill="#7ff0ff"
        />
      ))}
      <text x="16" y="84">
        {from}
      </text>
      <text x="304" y="84" textAnchor="end">
        {to}
      </text>
    </svg>
  );
}

/** Four transistor builds as solid models, with their barrier and currents live. */
export function TransistorAnatomy() {
  const sound = usePanelSound();
  const [device, setDevice] = useState<Device>("planar");
  const [volts, setVolts] = useState(0);
  const [slice, setSlice] = useState<Slice>("none");
  const [gateView, setGateView] = useState<GateView>("glass");
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMounted(true);
    if (!stage.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  const info = DEVICE_INFO[device];
  const live = deviceState(device, volts);
  return (
    <GraphicsPanel title="FOUR TRANSISTORS" sound={sound}>
      <Bay>
        <Choice
          label="BUILD"
          value={device}
          options={DEVICES.map((value) => ({ value, label: DEVICE_INFO[value].label }))}
          onChange={(value) => {
            sound.playButton();
            setDevice(value);
          }}
        />
        <div
          ref={stage}
          className={styles.modelStage}
          role="img"
          aria-label={`${info.label} model, ${info.control.toLowerCase()} at ${fixed(volts)} volts, ${live.state.toLowerCase()}. Drag to turn.`}
        >
          {mounted && (
            <Suspense fallback={null}>
              <Scene
                device={device}
                slice={slice}
                gateView={gateView}
                flow={live.flow}
                controlFlow={live.controlFlow}
                still={prefersStillness()}
                visible={visible}
              />
            </Suspense>
          )}
        </div>
        <ul className={styles.modelLegend}>
          {LEGEND.filter(({ material }) =>
            device === "bjt"
              ? !["channel", "oxide", "gate"].includes(material)
              : material !== "control",
          ).map(({ material, label, color }) => (
            <li key={material}>
              <i style={{ background: color }} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </Bay>
      <Bay>
        <Slider
          label={info.voltage}
          value={volts}
          min={0}
          max={1}
          step={0.01}
          format={(value) => `${fixed(value)} V`}
          onChange={setVolts}
        />
        <Choice
          label="SLICE"
          value={slice}
          options={[
            { value: "none", label: "WHOLE" },
            { value: "along", label: "ALONG" },
            { value: "across", label: "ACROSS" },
          ]}
          onChange={(value) => {
            sound.playButton();
            setSlice(value);
          }}
        />
        <Choice
          label="GATE"
          value={gateView}
          options={(["solid", "glass", "hidden"] as const).map((value) => ({
            value,
            label: value.toUpperCase(),
            disabled: device === "bjt",
          }))}
          onChange={(value) => {
            sound.playButton();
            setGateView(value);
          }}
        />
        <Hill device={device} flow={live.flow} />
        <dl className={styles.modelReadout}>
          <div>
            <dt>STATE</dt>
            <dd>{live.state}</dd>
          </div>
          <div>
            <dt>
              {info.from} → {info.to}
            </dt>
            <dd data-testid="main-current">{formatAmps(live.mainAmps)}</dd>
          </div>
          <div>
            <dt>{info.control} WIRE</dt>
            <dd data-testid="control-current">{formatAmps(live.controlAmps)}</dd>
          </div>
          <div>
            <dt>SIZE</dt>
            <dd>{info.size}</dd>
          </div>
        </dl>
      </Bay>
    </GraphicsPanel>
  );
}
