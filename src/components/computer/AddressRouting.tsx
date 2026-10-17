import clsx from "clsx";
import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import styles from "./AddressRouting.module.css";
import panel from "./ByteExplorer.module.css";
import shared from "./Codebook.module.css";
import { DemoMachine, MiniButton } from "./CodebookParts";
import gates from "./GateDemos.module.css";
import { GateShape, LampMark, WirePath } from "./GateDiagram";
import { InputKey, OutputLamp, TruthList } from "./TruthTables";

const LINES = [0, 1, 2, 3];
const binary = (value: number, width = 2) => value.toString(2).padStart(width, "0");

function AddressKeys({
  value,
  bits = 2,
  onChange,
}: {
  value: number;
  bits?: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset className={clsx(gates.keys, styles.fieldset)} aria-label="Address bits">
      {Array.from({ length: bits }, (_, index) => bits - index - 1).map((bit) => (
        <InputKey
          key={bit}
          name={`A${bit}`}
          on={Boolean(value & (1 << bit))}
          onFlip={() => onChange(value ^ (1 << bit))}
        />
      ))}
    </fieldset>
  );
}

/** Four shared rails feed the four AND gates. Dots mark actual junctions. */
function DecoderWiring({ address }: { address: number }) {
  const a1 = Boolean(address & 2);
  const a0 = Boolean(address & 1);
  const rails = [a1, !a1, a0, !a0];
  return (
    <div className={clsx(gates.board, styles.diagram)}>
      <svg
        viewBox="0 0 440 360"
        role="img"
        aria-label={`Decoder wiring. Address ${binary(address)} lights Y${address}. Two NOT gates feed four AND gates.`}
      >
        {[0, 1].map((index) => {
          const value = [a1, a0][index];
          const x = 36 + index * 120;
          const inverseX = x + 70;
          return (
            <g key={index}>
              <text x={x} y={18} className={gates.portName}>
                A{1 - index}
              </text>
              <WirePath
                points={[
                  { x, y: 30 },
                  { x, y: 335 },
                ]}
                on={value}
              />
              <WirePath
                points={[
                  { x, y: 56 },
                  { x: x + 6, y: 56 },
                ]}
                on={value}
                dot={[0]}
              />
              <GateShape gate="not" x={x + 6} y={35} inputs={[value]} output={!value} />
              <WirePath
                points={[
                  { x: inverseX, y: 56 },
                  { x: inverseX, y: 335 },
                ]}
                on={!value}
              />
              <text x={inverseX - 12} y={92} className={gates.portName}>
                ¬A{1 - index}
              </text>
            </g>
          );
        })}
        {LINES.map((line) => {
          const y = 112 + line * 60;
          const first = line & 2 ? 0 : 1;
          const second = line & 1 ? 2 : 3;
          return (
            <g key={line}>
              {[first, second].map((rail, input) => {
                const x = [36, 106, 156, 226][rail];
                const portY = y + (input ? 29 : 13);
                return (
                  <WirePath
                    key={rail}
                    points={[
                      { x, y: portY },
                      { x: 278, y: portY },
                    ]}
                    on={rails[rail]}
                    dot={[0]}
                  />
                );
              })}
              <GateShape
                gate="and"
                x={278}
                y={y}
                inputs={[rails[first], rails[second]]}
                output={line === address}
              />
              <WirePath
                points={[
                  { x: 342, y: y + 21 },
                  { x: 370, y: y + 21 },
                ]}
                on={line === address}
              />
              <LampMark x={378} y={y + 21} on={line === address} name={`Y${line}`} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DecoderDemo() {
  const [address, setAddress] = useState(0);
  const sound = usePanelSound();
  const change = (value: number) => {
    setAddress(value);
    sound.playSwitch();
  };
  return (
    <DemoMachine
      title="ONE ADDRESS, ONE LINE"
      label="Two-to-four decoder"
      soundEnabled={sound.soundEnabled}
      onToggleSound={sound.toggleSound}
      className={gates.demo}
    >
      <div className={clsx(shared.body, styles.body)}>
        <div className={shared.plate}>
          <div className={panel.sectionHead}>
            <span>2 ADDRESS BITS</span>
            <span>4 SELECT LINES</span>
          </div>
          <AddressKeys value={address} onChange={change} />
          <div className={gates.keys}>
            {LINES.map((line) => (
              <OutputLamp key={line} name={`Y${line}`} on={line === address} />
            ))}
          </div>
          <p className={styles.readout} aria-live="polite">
            {binary(address)} = {address} → Y{address} is on
          </p>
          <TruthList
            inputNames={["A1", "A0"]}
            outputNames={LINES.map((line) => `Y${line}`)}
            outputs={([a1, a0]) => LINES.map((line) => line === Number(a1) * 2 + Number(a0))}
            current={address}
            onPick={([a1, a0]) => change(Number(a1) * 2 + Number(a0))}
            label="Decoder truth table"
          />
          <details className={styles.reveal}>
            <summary>Reveal the gate wiring</summary>
            <DecoderWiring address={address} />
            <p>
              Each AND tests one address. A NOT supplies the opposite of each input. Dots join
              wires; crossings without dots do not.
            </p>
            <p>
              Y{address} = {address & 2 ? "A1" : "¬A1"} AND {address & 1 ? "A0" : "¬A0"}
            </p>
          </details>
        </div>
      </div>
    </DemoMachine>
  );
}

/** The selected route has a wide outline even when the data on it is zero. */
function Route({
  points,
  selected,
  on,
}: {
  points: { x: number; y: number }[];
  selected: boolean;
  on: boolean;
}) {
  return (
    <>
      {selected && (
        <path
          d={points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ")}
          className={styles.selectedRoute}
        />
      )}
      <WirePath points={points} on={on} />
    </>
  );
}

function MuxBox({
  x,
  y,
  select,
  value,
  name,
  addressBit,
}: {
  x: number;
  y: number;
  select: boolean;
  value: boolean;
  name: string;
  addressBit: string;
}) {
  return (
    <g>
      <path
        d={`M${x} ${y} L${x + 64} ${y + 16} V${y + 64} L${x} ${y + 80} Z`}
        className={gates.boxSolid}
      />
      <text x={x + 28} y={y + 41} className={gates.boxNameBig}>
        {name}
      </text>
      <text x={x + 7} y={y + 21} className={gates.portName}>
        0
      </text>
      <text x={x + 7} y={y + 63} className={gates.portName}>
        1
      </text>
      <path
        d={`M${x + 32} ${y + 104} V${y + 72}`}
        className={clsx(gates.wire, select && gates.wireOn)}
      />
      <text x={x + 32} y={y + 120} textAnchor="middle" className={gates.portName}>
        {addressBit}={Number(select)}
      </text>
      <text x={x + 70} y={y + 32} className={gates.portName}>
        {Number(value)}
      </text>
    </g>
  );
}

export function MultiplexerDemo() {
  const [address, setAddress] = useState(0);
  const [data, setData] = useState([false, true, true, false]);
  const sound = usePanelSound();
  const low = Boolean(address & 1);
  const high = Boolean(address & 2);
  const left = data[Number(low)];
  const right = data[2 + Number(low)];
  return (
    <DemoMachine
      title="FOUR SIGNALS, ONE OUTPUT"
      label="Four-to-one multiplexer"
      soundEnabled={sound.soundEnabled}
      onToggleSound={sound.toggleSound}
      className={gates.demo}
    >
      <div className={clsx(shared.body, styles.body)}>
        <div className={shared.plate}>
          <div className={panel.sectionHead}>
            <span>SELECT A1 A0</span>
            <span>THREE 2:1 MULTIPLEXERS</span>
          </div>
          <AddressKeys
            value={address}
            onChange={(value) => {
              setAddress(value);
              sound.playSwitch();
            }}
          />
          <fieldset className={clsx(gates.keys, styles.fieldset)} aria-label="Data inputs">
            {LINES.map((index) => (
              <InputKey
                key={index}
                name={`D${index}`}
                on={data[index]}
                onFlip={() => {
                  setData((current) => current.map((bit, at) => (at === index ? !bit : bit)));
                  sound.playSwitch();
                }}
              />
            ))}
          </fieldset>
          <div className={clsx(gates.board, styles.diagram)}>
            <svg
              viewBox="0 0 460 370"
              role="img"
              aria-label={`Multiplexer tree. Address ${binary(address)} selects D${address}, value ${Number(data[address])}.`}
            >
              {LINES.map((line) => {
                const y = [50, 90, 230, 270][line];
                return (
                  <g key={line}>
                    <text x={12} y={y} className={gates.portName}>
                      D{line}={Number(data[line])}
                    </text>
                    <Route
                      points={[
                        { x: 62, y },
                        { x: 114, y },
                      ]}
                      selected={line === address}
                      on={data[line]}
                    />
                  </g>
                );
              })}
              <Route
                points={[
                  { x: 178, y: 70 },
                  { x: 235, y: 70 },
                  { x: 235, y: 140 },
                  { x: 285, y: 140 },
                ]}
                selected={!high}
                on={left}
              />
              <Route
                points={[
                  { x: 178, y: 250 },
                  { x: 235, y: 250 },
                  { x: 235, y: 180 },
                  { x: 285, y: 180 },
                ]}
                selected={high}
                on={right}
              />
              <Route
                points={[
                  { x: 349, y: 160 },
                  { x: 396, y: 160 },
                ]}
                selected
                on={data[address]}
              />
              <MuxBox x={114} y={30} select={low} value={left} name="MUX" addressBit="A0" />
              <MuxBox x={114} y={210} select={low} value={right} name="MUX" addressBit="A0" />
              <MuxBox
                x={285}
                y={120}
                select={high}
                value={data[address]}
                name="MUX"
                addressBit="A1"
              />
              <LampMark x={404} y={160} on={data[address]} name="OUT" side="below" />
            </svg>
          </div>
          <p className={styles.readout} aria-live="polite">
            OUT copies D{address} = {Number(data[address])}
          </p>
          <p className={styles.note}>
            A0 selects within each pair. A1 selects the pair. The wide outline marks the chosen
            route, even when it carries 0.
          </p>
          <p className={styles.note}>
            Try changing an unselected input. OUT only changes when the selected input changes.
          </p>
        </div>
      </div>
    </DemoMachine>
  );
}

export function MemoryAddressDemo() {
  const [address, setAddress] = useState(0);
  const [cells, setCells] = useState(() => Array<boolean>(16).fill(false));
  const [data, setData] = useState(true);
  const [lastWrite, setLastWrite] = useState<string | null>(null);
  const sound = usePanelSound();
  const row = address >> 2;
  const column = address & 3;
  const change = (value: number) => {
    setAddress(value);
    sound.playSwitch();
  };
  return (
    <DemoMachine
      title="PICK A MEMORY CELL"
      label="Row and column memory addressing"
      soundEnabled={sound.soundEnabled}
      onToggleSound={sound.toggleSound}
      className={gates.demo}
    >
      <div className={clsx(shared.body, styles.body)}>
        <div className={shared.plate}>
          <div className={panel.sectionHead}>
            <span>4 ADDRESS BITS</span>
            <span>16 ONE-BIT CELLS</span>
          </div>
          <AddressKeys value={address} bits={4} onChange={change} />
          <p className={styles.readout}>
            A3 A2 → row {row} · A1 A0 → column {column}
          </p>
          <fieldset
            className={clsx(styles.memory, styles.fieldset)}
            aria-label="Sixteen memory cells"
          >
            <span className={styles.corner}>
              ROW ↓<br />
              COL →
            </span>
            {LINES.map((index) => (
              <span key={`col-${index}`} className={styles.axis} data-selected={column === index}>
                C{index}
                <i className={shared.lamp} data-on={column === index} aria-hidden="true" />
              </span>
            ))}
            {LINES.map((r) => (
              <MemoryRow
                key={r}
                row={r}
                activeRow={row}
                activeColumn={column}
                cells={cells}
                onSelect={change}
              />
            ))}
          </fieldset>
          <div className={gates.keys}>
            <InputKey
              name="DATA"
              on={data}
              onFlip={() => {
                setData(!data);
                sound.playSwitch();
              }}
            />
            <MiniButton
              onClick={() => {
                setCells((current) =>
                  current.map((value, index) => (index === address ? data : value)),
                );
                setLastWrite(
                  `Wrote ${Number(data)} to address ${address} (${binary(address, 4)}).`,
                );
                sound.playButton();
              }}
            >
              WRITE
            </MiniButton>
            <OutputLamp name="READ" on={cells[address]} />
            <MiniButton
              onClick={() => {
                setCells(Array<boolean>(16).fill(false));
                setLastWrite("Cleared all 16 cells.");
                sound.playButton();
              }}
            >
              CLEAR ALL
            </MiniButton>
          </div>
          <p className={styles.readout} aria-live="polite">
            Address {binary(address, 4)} = {address} · READ {Number(cells[address])}
          </p>
          <p className={styles.note} role="status">
            {lastWrite ?? "Choose DATA, then press WRITE to store it at the selected address."}
          </p>
          <p className={styles.note}>
            Selecting a cell only reads it. WRITE changes one cell, where the selected row and
            column meet.
          </p>
          <p className={styles.note}>
            This model shows address selection. Physical memory also needs storage circuits, read
            amplifiers, and write control.
          </p>
        </div>
      </div>
    </DemoMachine>
  );
}

function MemoryRow({
  row,
  activeRow,
  activeColumn,
  cells,
  onSelect,
}: {
  row: number;
  activeRow: number;
  activeColumn: number;
  cells: boolean[];
  onSelect: (address: number) => void;
}) {
  return (
    <>
      <span className={styles.axis} data-selected={row === activeRow}>
        R{row}
        <i className={shared.lamp} data-on={row === activeRow} aria-hidden="true" />
      </span>
      {LINES.map((column) => {
        const address = row * 4 + column;
        const selected = row === activeRow && column === activeColumn;
        return (
          <button
            type="button"
            key={column}
            className={styles.cell}
            data-row={row === activeRow}
            data-column={column === activeColumn}
            aria-pressed={selected}
            aria-label={`Address ${address}, row ${row}, column ${column}, stored ${Number(cells[address])}. Select.`}
            onClick={() => onSelect(address)}
          >
            <small>{binary(address, 4)}</small>
            <strong>{Number(cells[address])}</strong>
          </button>
        );
      })}
    </>
  );
}
