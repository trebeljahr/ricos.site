import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { formatBus } from "src/lib/computer/bus";
import { layoutCircuit } from "src/lib/computer/circuitLayout";
import { CPU_PARTS, type CpuProbe, cpuCircuit } from "src/lib/computer/cpuPreset";
import { foldBlockState, screenRows } from "src/lib/computer/datapathBlocks";
import type { Circuit, Node, Snapshot, Wire } from "src/lib/computer/logic";
import { readProbes } from "src/lib/computer/probes";
import {
  hex,
  isaFor,
  isScreenAddress,
  type Registers,
  SAMPLE_PROGRAMS,
  SIGNALS,
  type Signal,
  STACK_MODELS,
  type StackModel,
  traceTicks,
} from "src/lib/computerStepper";
import panel from "./ByteExplorer.module.css";
import styles from "./CpuCircuitStepper.module.css";
import { type LockedClock, type LockedView, LogicBuilder } from "./LogicBuilder";
import { compileSource, ProgramSource } from "./ProgramStepper";
import stepper from "./ProgramStepper.module.css";
import { ScreenGrid } from "./ScreenGrid";

const { LOOP } = SAMPLE_PROGRAMS;

/** The part each *_OUT line puts on the bus. */
const DRIVERS: Partial<Record<Signal, string>> = {
  PC_OUT: "PC",
  ROM_OUT: "CODE ROM",
  OPR_OUT: "OPERAND",
  RAM_OUT: "DATA RAM",
  ACC_OUT: "ACC",
  ALU_OUT: "ALU",
  STACK_OUT: "STACK",
};

/** The part each *_IN line loads from the bus on the rising edge. */
const READERS: Partial<Record<Signal, string>> = {
  CMAR_IN: "CMAR",
  IR_IN: "IR",
  OPR_IN: "OPERAND",
  PC_IN: "PC",
  DMAR_IN: "DMAR",
  RAM_IN: "DATA RAM",
  ACC_IN: "ACC",
  STACK_IN: "STACK",
  OUT_IN: "OUT",
};

const ACTIONS: Partial<Record<Signal, string>> = {
  PC_INC: "PC adds 1.",
  ALU_SUB: "The ALU subtracts.",
  FLAGS_IN: "The carry flag stores the ALU's carry.",
  SP_INC: "SP adds 1.",
  SP_DEC: "SP subtracts 1.",
  STEP_RESET: "The next tick starts the next instruction at T0.",
  HALT: "HALT stops the clock.",
};

const REGISTERS: { probe: CpuProbe; name: string }[] = [
  { probe: "PC", name: "PROGRAM COUNTER" },
  { probe: "CMAR", name: "CODE ADDRESS" },
  { probe: "IR", name: "INSTRUCTION" },
  { probe: "OPERAND", name: "SECOND BYTE" },
  { probe: "BUS", name: "SHARED BUS" },
  { probe: "ACC", name: "ACCUMULATOR" },
  { probe: "FLAGS", name: "Z · C" },
  { probe: "DMAR", name: "DATA ADDRESS" },
  { probe: "SP", name: "STACK POINTER" },
  { probe: "OUT", name: "OUTPUT" },
];

/** The control lines that are on, read from the control unit's outputs. */
const activeSignals = (snapshot: Snapshot): Signal[] => {
  const bits = snapshot.outputs[CPU_PARTS.control] ?? [];
  return SIGNALS.filter((_, index) => bits[index]);
};

const busDriver = (signals: readonly Signal[]) =>
  signals.map((signal) => DRIVERS[signal]).find(Boolean) ?? null;

/** What the tick about to happen does, in words, from the live control word. */
function describeTick(signals: readonly Signal[], bus: ReturnType<typeof formatBus>) {
  const driver = busDriver(signals);
  const readers = signals.flatMap((signal) => READERS[signal] ?? []);
  const parts = [
    driver
      ? `${driver} drives the bus with ${bus}.${readers.length ? ` ${readers.join(" and ")} ${readers.length > 1 ? "take" : "takes"} it on the rising edge.` : ""}`
      : "Nothing drives the bus.",
    ...signals.flatMap((signal) => ACTIONS[signal] ?? []),
  ];
  return parts.join(" ");
}

const expectedProbes = (r: Registers): Partial<Record<CpuProbe, number>> => ({
  PC: r.pc,
  CMAR: r.cmar,
  IR: r.ir,
  OPERAND: r.opr,
  DMAR: r.dmar,
  ACC: r.acc,
  FLAGS: (r.carry ? 1 : 0) | (r.zero ? 2 : 0),
  SP: r.sp,
  OUT: r.out,
});

/** A block's stored bytes, whether it runs folded (as a block) or unfolded (as gates). */
function blockBytes(circuit: Circuit, snapshot: Snapshot, id: string): number[] {
  const folded = snapshot.blocks?.[id] as { bytes?: number[] } | undefined;
  if (folded?.bytes) return folded.bytes;
  const node = circuit.nodes.find((item) => item.id === id);
  const unfolded = node && (foldBlockState(node, snapshot.modules[id]) as { bytes?: number[] });
  return unfolded?.bytes ?? [];
}

export function CpuCircuitStepper() {
  const [source, setSource] = useState<string>(LOOP);
  const [loaded, setLoaded] = useState<string>(LOOP);
  const [stackModel, setStackModel] = useState<StackModel>("hardware");
  const [view, setView] = useState<LockedView | null>(null);
  const [running, setRunning] = useState(false);
  const [ripple, setRipple] = useState(false);
  const clock = useRef<LockedClock | null>(null);
  const { soundEnabled, toggleSound, playButton, playSwitch } = usePanelSound();
  const compilation = useMemo(() => compileSource(loaded, stackModel), [loaded, stackModel]);
  const program = compilation.program;
  const isa = isaFor(stackModel);
  const circuit = useMemo(
    () => (program ? layoutCircuit(cpuCircuit(program.bytes, "Toy CPU", stackModel)) : null),
    [program, stackModel],
  );
  const ticks = useMemo(() => (program ? traceTicks(program) : []), [program]);
  const changed = source !== loaded;

  const snapshot = view?.frame.snapshot;
  const cycle = view ? Math.floor(view.frame.tick / 2) : 0;
  const signals = snapshot ? activeSignals(snapshot) : [];
  const halted = signals.includes("HALT");
  const bus = snapshot?.buses?.[CPU_PARTS.bus] ?? "Z";
  const probes = circuit && snapshot ? readProbes(circuit, snapshot) : {};
  // The trace's tick `cycle` is the one the circuit's control word acts on next.
  const tick = ticks[Math.min(cycle, ticks.length - 1)];
  const previous = cycle > 0 ? ticks[Math.min(cycle, ticks.length) - 1] : undefined;
  const expected = previous ? expectedProbes(previous.registers) : null;
  const mismatches = expected
    ? (Object.keys(expected) as CpuProbe[]).filter((name) => probes[name] !== expected[name])
    : [];
  const ram = circuit && snapshot ? blockBytes(circuit, snapshot, CPU_PARTS.ram) : [];
  const usesScreen = Boolean(
    program?.instructions.some(
      ({ opcode, operand }) =>
        isa.find((item) => item.opcode === opcode)?.operand === "RAM address" &&
        isScreenAddress(operand),
    ),
  );
  const screen =
    circuit && snapshot && usesScreen
      ? screenRows({ bytes: blockBytes(circuit, snapshot, CPU_PARTS.screen) })
      : null;
  const inRam = stackModel === "ram";
  // The return stack, bottom first: its own RAM below SP, or RAM[1F] down to RAM[SP].
  const stack =
    circuit && snapshot
      ? inRam
        ? ram.slice(probes.SP ?? STACK_MODELS.ram.ramBytes).reverse()
        : blockBytes(circuit, snapshot, CPU_PARTS.stack).slice(0, probes.SP ?? 0)
      : [];
  const opcode = isa.find(({ opcode }) => opcode === probes.IR);
  const firstCycle = view ? cycle - Math.floor(view.index / 2) : 0;
  const lastCycle = view ? cycle + Math.floor((view.frames - 1 - view.index) / 2) : 0;

  const seekCycle = useCallback(
    (target: number) => {
      if (!view) return;
      clock.current?.seek(view.index + 2 * (target - cycle));
    },
    [view, cycle],
  );

  useEffect(() => {
    if (halted) setRunning(false);
  }, [halted]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => clock.current?.cycle(), ripple ? 1600 : 250);
    return () => window.clearInterval(timer);
  }, [running, ripple]);

  const locked = useMemo(
    () =>
      circuit
        ? {
            circuit,
            clockRef: clock,
            onFrame: setView,
            ripple,
            rippleSpeed: 120,
            glowWire: (wire: Wire, state: Snapshot) =>
              wire.from === CPU_PARTS.control &&
              (wire.output ?? 0) < SIGNALS.length &&
              Boolean(state.outputs[CPU_PARTS.control]?.[wire.output ?? 0]),
            note: (node: Node, state: Snapshot) => {
              if (node.id !== CPU_PARTS.bus) return null;
              const driver = busDriver(activeSignals(state));
              const value = state.buses?.[CPU_PARTS.bus] ?? "Z";
              return driver ? `${driver} → ${formatBus(value)}` : "NO DRIVER";
            },
          }
        : undefined,
    [circuit, ripple],
  );

  function compile() {
    setLoaded(source);
    setRunning(false);
    playSwitch();
  }

  function preset(value: string, model: StackModel = stackModel) {
    setStackModel(model);
    setSource(value);
    setLoaded(value);
    setRunning(false);
    playButton();
  }

  return (
    <section
      className={`not-prose ${panel.machine} ${stepper.machine}`}
      aria-label="CPU circuit bench"
    >
      <div className={panel.screw} aria-hidden="true" />
      <div className={`${panel.screw} ${panel.screwRight}`} aria-hidden="true" />
      <div className={panel.nameplate}>
        <div>
          <strong>CPU CIRCUIT BENCH</strong>
          <span className={stepper.model}>ONE CLOCK · TWO VIEWS</span>
        </div>
        <button
          type="button"
          className={panel.soundButton}
          onClick={toggleSound}
          aria-pressed={soundEnabled}
          aria-label={`Sound ${soundEnabled ? "on" : "off"}. Toggle sound.`}
        >
          <i aria-hidden="true" /> SOUND {soundEnabled ? "ON" : "OFF"}
        </button>
      </div>

      <div className={stepper.workbench}>
        <ProgramSource
          source={source}
          onSourceChange={setSource}
          onCompile={compile}
          onPreset={preset}
          stack={stackModel}
          onStackChange={(model) => {
            setStackModel(model);
            setRunning(false);
            playSwitch();
          }}
          compilation={compilation}
          changed={changed}
          activeAddress={tick && !changed ? tick.address : null}
        />

        <div className={stepper.outputSide}>
          <div className={panel.sectionHead}>
            <span>03 / ONE CLOCK</span>
            <span>
              {halted ? "HALTED" : tick ? `${tick.phase.toUpperCase()} · T${tick.t}` : "READY"}
            </span>
          </div>
          {circuit && view && (
            <>
              <div className={stepper.transport}>
                <button
                  type="button"
                  disabled={running || cycle <= firstCycle}
                  onClick={() => {
                    seekCycle(cycle - 1);
                    playButton();
                  }}
                  className={stepper.button}
                >
                  ← BACK
                </button>
                <button
                  type="button"
                  disabled={running || halted}
                  onClick={() => {
                    if (cycle < lastCycle) seekCycle(cycle + 1);
                    else clock.current?.cycle();
                    playButton();
                  }}
                  className={stepper.primaryButton}
                >
                  CLOCK TICK →
                </button>
                <button
                  type="button"
                  disabled={halted}
                  onClick={() => {
                    setRunning((value) => !value);
                    playSwitch();
                  }}
                  className={stepper.button}
                  aria-pressed={running}
                >
                  {running ? "PAUSE" : "RUN TO HALT"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRunning(false);
                    clock.current?.reset();
                    playButton();
                  }}
                  className={stepper.button}
                >
                  RESET
                </button>
                <button
                  type="button"
                  onClick={() => setRipple((value) => !value)}
                  className={stepper.button}
                  aria-pressed={ripple}
                  title="Replay each rising edge one gate delay at a time. Off when reduced motion is set."
                >
                  RIPPLE {ripple ? "ON" : "OFF"}
                </button>
                <span className={stepper.stepCount}>
                  TICK {String(cycle).padStart(2, "0")} /{" "}
                  {String(ticks.length - 1).padStart(2, "0")}
                </span>
              </div>
              <input
                type="range"
                min={firstCycle}
                max={lastCycle}
                value={cycle}
                disabled={running || lastCycle === firstCycle}
                onChange={(event) => seekCycle(Number(event.target.value))}
                className={stepper.timeline}
                aria-label="Recorded clock ticks"
              />
              <div className={stepper.phaseScreen}>
                <span>
                  {halted
                    ? "CLOCK STOPPED"
                    : tick
                      ? `NEXT TICK · INSTRUCTION ${tick.instruction + 1} AT ${hex(tick.address)}`
                      : "READY"}
                </span>
                <p aria-live="polite">{describeTick(signals, formatBus(bus))}</p>
              </div>
              <div className={panel.sectionHead}>
                <span>CONTROL LINES / FROM THE CONTROL UNIT</span>
              </div>
              <div className={styles.signals}>
                {SIGNALS.map((signal) => (
                  <span
                    key={signal}
                    className={clsx(styles.signal, signals.includes(signal) && styles.signalOn)}
                  >
                    {signal}
                  </span>
                ))}
              </div>
              <div className={clsx(stepper.registers, styles.registers)}>
                {REGISTERS.map(({ probe, name }) => (
                  <div key={probe} className={stepper.register}>
                    <span>
                      <b>{probe}</b>
                      {name}
                    </span>
                    <strong>
                      {probe === "BUS"
                        ? formatBus(bus)
                        : probe === "FLAGS"
                          ? `${(probes.FLAGS ?? 0) >> 1} · ${(probes.FLAGS ?? 0) & 1}`
                          : hex(probes[probe] ?? 0)}
                    </strong>
                    {probe === "IR" && <small>{opcode?.mnemonic ?? "—"}</small>}
                    {probe === "ACC" && <small>{probes.ACC ?? 0} decimal</small>}
                    {probe === "OUT" && <small>{probes.OUT ?? 0} decimal</small>}
                    {probe === "BUS" && <small>{busDriver(signals) ?? "floating"}</small>}
                  </div>
                ))}
              </div>
              <p className={styles.sync} data-match={mismatches.length === 0}>
                {expected === null
                  ? "REGISTERS READ FROM THE CIRCUIT'S PROBES"
                  : mismatches.length
                    ? `CIRCUIT DIFFERS FROM THE STEPPER TRACE: ${mismatches.join(", ")}`
                    : `CIRCUIT MATCHES THE STEPPER TRACE AFTER TICK ${cycle - 1}`}
              </p>
              <div className={stepper.lowerReadouts}>
                <div>
                  <div className={panel.sectionHead}>
                    <span>DATA RAM / FROM THE CIRCUIT</span>
                  </div>
                  <div className={stepper.ramList}>
                    {program?.variables.map(({ name, address }) => (
                      <div
                        key={address}
                        className={clsx(
                          stepper.ramRow,
                          probes.DMAR === address &&
                            (signals.includes("RAM_IN") || signals.includes("RAM_OUT")) &&
                            stepper.activeRam,
                        )}
                      >
                        <span>[{hex(address)}]</span>
                        <span>{name}</span>
                        <strong>{ram[address] ?? 0}</strong>
                      </div>
                    ))}
                    {program?.variables.length === 0 && (
                      <span className={stepper.empty}>NO VARIABLES</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className={panel.sectionHead}>
                    <span>{inRam ? "STACK IN RAM / TOP AT RIGHT" : "RETURN STACK"}</span>
                  </div>
                  <div className={stepper.outputScreen}>
                    {stack.length
                      ? stack.map((value) => (inRam ? hex(value) : `→${hex(value)}`)).join(" ")
                      : "—"}
                  </div>
                  {screen && (
                    <ScreenGrid rows={screen} label="Screen" className={stepper.pixelScreen} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {locked && (
        <div className={styles.board}>
          <LogicBuilder locked={locked} />
        </div>
      )}
    </section>
  );
}
