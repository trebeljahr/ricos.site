import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  DEVICE_INFO,
  DEVICES,
  type Device,
  deviceState,
  formatAmps,
} from "src/lib/computer/transistorModels";
import styles from "./Graphics.module.css";
import { Bay, Choice, fixed, GraphicsPanel, prefersStillness, Slider } from "./GraphicsParts";
import type { GateView } from "./TransistorAnatomyScene";

const Scene = lazy(() => import("./TransistorAnatomyScene"));

/** Four transistor builds as solid models, with their charges and currents live. */
export function TransistorAnatomy() {
  const [device, setDevice] = useState<Device>("planar");
  const [volts, setVolts] = useState(0);
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
    <GraphicsPanel title="FOUR TRANSISTORS" plain>
      <Bay>
        <Choice
          label="BUILD"
          value={device}
          options={DEVICES.map((value) => ({ value, label: DEVICE_INFO[value].label }))}
          onChange={setDevice}
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
                volts={volts}
                gateView={gateView}
                rate={live.rate}
                controlRate={live.controlRate}
                still={prefersStillness()}
                visible={visible}
              />
            </Suspense>
          )}
        </div>
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
          label="GATE"
          value={gateView}
          options={(["solid", "glass", "hidden"] as const).map((value) => ({
            value,
            label: value.toUpperCase(),
            disabled: device === "bjt",
          }))}
          onChange={setGateView}
        />
        <dl className={styles.modelReadout}>
          <div>
            <dt>STATE</dt>
            <dd>{live.state}</dd>
          </div>
          <div>
            <dt>
              {info.from} → {info.to}
            </dt>
            <dd data-testid="main-current">
              {formatAmps(live.mainAmps)}
              {live.state === "CUTOFF" && live.mainAmps >= 1e-13 && " LEAK"}
            </dd>
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
