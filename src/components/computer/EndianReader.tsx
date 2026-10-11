import clsx from "clsx";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  formatTwoBytes,
  parseTwoBytes,
  readBytes,
  readOrders,
  readSequence,
} from "src/lib/endianReader";
import panel from "./ByteExplorer.module.css";
import styles from "./EndianReader.module.css";

const BIT_COUNT = 16;
const STEP_MS = 160;
/** Ticks the finished read-out stays lit before the next pass starts. */
const HOLD_TICKS = 8;

const presets = [
  { label: "00 01", hex: "00 01" },
  { label: "12 34", hex: "12 34" },
  { label: "PALINDROME", hex: "80 01" },
  { label: "TWIN BYTES", hex: "A1 A1" },
] as const;

// Same sequence and wording as the list in chapter 1.1. The aliases use the
// words of FourByteExplorer's byte-order toggle. CSS sets them in capitals.
const orderText: readonly { label: string; alias?: string }[] = [
  { label: "Left to right, bit by bit", alias: "Big endian" },
  { label: "Right to left, bit by bit" },
  { label: "Left to right byte by byte, each byte right to left" },
  { label: "Right to left byte by byte, each byte left to right", alias: "Little endian" },
];

const sequences = readOrders.map((order) => readSequence(order));

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    // The server cannot know. Its markup shows the first step either way; the
    // timer only starts on the client, with the real setting.
    () => false,
  );
}

/** Two bytes read in the four orders of chapter 1.1. Usable in MDX articles. */
export function EndianReader() {
  const id = useId();
  const [input, setInput] = useState("00 01");
  const [selected, setSelected] = useState(0);
  const [tick, setTick] = useState(0);
  // null until the reader uses the switch; until then the system setting decides.
  const [sweepChoice, setSweepChoice] = useState<boolean | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const sweeping = sweepChoice ?? !reducedMotion;
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();

  const bytes = parseTwoBytes(input);
  const readings = bytes ? readOrders.map((order) => readBytes(bytes, order)) : null;
  const sequence = sequences[selected];
  // turns[position] is the turn at which the selected order reads that input bit.
  const turns = sequence.reduce<number[]>((result, position, turn) => {
    result[position] = turn;
    return result;
  }, []);
  // The turn under the read head, or null while the finished read-out is held.
  const cursor = sweeping && bytes && tick < BIT_COUNT ? tick : null;

  useEffect(() => {
    if (!sweeping) return;
    const timer = window.setInterval(
      () => setTick((current) => (current + 1) % (BIT_COUNT + HOLD_TICKS)),
      STEP_MS,
    );
    return () => window.clearInterval(timer);
  }, [sweeping]);

  function flipBit(position: number) {
    if (!bytes) return;
    const next = new Uint8Array(bytes);
    next[position >> 3] ^= 0x80 >> (position & 7);
    setInput(formatTwoBytes(next));
    playButton();
  }

  function selectOrder(index: number) {
    setSelected(index);
    setTick(0);
    playSwitch();
  }

  const selectedReading = readings?.[selected];

  return (
    <section
      className={clsx("not-prose", panel.machine, styles.root)}
      aria-label="Bit and byte order reading instrument"
    >
      <div className={panel.screw} aria-hidden="true" />
      <div className={clsx(panel.screw, panel.screwRight)} aria-hidden="true" />
      <div className={panel.nameplate}>
        <div>
          <strong>ENDIAN READER</strong>
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
      <div className={styles.body}>
        <div className={styles.side}>
          <div className={clsx(panel.sectionHead, styles.head)}>
            <span>INPUT · 2 BYTES</span>
            <button
              type="button"
              className={styles.sweepToggle}
              aria-pressed={sweeping}
              aria-label={`Reading sweep ${sweeping ? "on" : "off"}. Toggle the sweep animation.`}
              onClick={() => {
                setSweepChoice(!sweeping);
                setTick(0);
                playSwitch();
              }}
            >
              SWEEP {sweeping ? "ON" : "OFF"}
            </button>
          </div>
          <div className={styles.entry}>
            <div>
              <label className={panel.inputLabel} htmlFor={`${id}-hex`}>
                HEX / TWO BYTES
              </label>
              <input
                id={`${id}-hex`}
                className={clsx(panel.bitInput, styles.hexInput)}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={bytes === null}
                aria-describedby={`${id}-help`}
              />
            </div>
            <div className={clsx(panel.presetRow, styles.presets)}>
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  aria-label={`Preset ${preset.hex}`}
                  onClick={() => {
                    setInput(preset.hex);
                    playButton();
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <p id={`${id}-help`} className={panel.inputHelp}>
            {bytes ? "" : "ENTER FOUR HEX DIGITS · SPACES OK"}
          </p>
          <p className={styles.hint}>NUMBER ABOVE A KEY = ITS TURN IN ORDER {selected + 1}</p>
          <div className={styles.bank}>
            {[0, 1].map((byteIndex) => (
              // biome-ignore lint/a11y/useSemanticElements: a fieldset's legend cannot sit in the grid
              <div
                key={byteIndex}
                role="group"
                className={styles.byte}
                aria-label={`Byte ${byteIndex + 1} bit buttons`}
              >
                <div className={styles.byteName}>
                  BYTE {byteIndex + 1}{" "}
                  <b>{bytes?.[byteIndex].toString(16).padStart(2, "0").toUpperCase() ?? "--"}</b>
                </div>
                <div className={styles.units}>
                  {[7, 6, 5, 4, 3, 2, 1, 0].map((bit, bitIndex) => {
                    const position = byteIndex * 8 + bitIndex;
                    const turn = turns[position];
                    const on = bytes ? Boolean(bytes[byteIndex] & (1 << bit)) : false;
                    return (
                      <div
                        key={bit}
                        className={clsx(styles.unit, cursor === turn && styles.unitNow)}
                      >
                        <span
                          className={clsx(
                            styles.turn,
                            cursor !== null && turn > cursor && styles.turnPending,
                          )}
                          aria-hidden="true"
                        >
                          {turn + 1}
                        </span>
                        <button
                          type="button"
                          disabled={!bytes}
                          onClick={() => flipBit(position)}
                          aria-label={`Byte ${byteIndex + 1}, bit ${bit}: ${Number(on)}. Read at turn ${turn + 1} of ${BIT_COUNT}. Toggle bit.`}
                          aria-pressed={on}
                          className={clsx(panel.bitButton, styles.key)}
                        >
                          {bytes ? Number(on) : "·"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.side}>
          <div className={clsx(panel.sectionHead, styles.head)}>
            <span>READOUT · 4 ORDERS</span>
            <span className={styles.headNote}>SELECT ONE</span>
          </div>
          <div className={styles.rows} role="radiogroup" aria-label="Reading order">
            {readOrders.map((order, index) => {
              const text = orderText[index];
              const reading = readings?.[index];
              const isSelected = index === selected;
              return (
                <label key={text.label} className={clsx(styles.row, isSelected && styles.rowOn)}>
                  <input
                    type="radio"
                    className={styles.rowRadio}
                    name={`${id}-order`}
                    checked={isSelected}
                    onChange={() => selectOrder(index)}
                    aria-label={`Order ${index + 1}: ${text.label}${text.alias ? ` (${text.alias})` : ""}`}
                  />
                  <span className={styles.rowHead}>
                    <i className={styles.lamp} aria-hidden="true" />
                    <b>{index + 1}</b>
                    <span className={styles.rowLabel}>{text.label}</span>
                    {text.alias && <em className={styles.alias}>{text.alias}</em>}
                  </span>
                  <span className={styles.glyph} aria-hidden="true">
                    {[0, 1].map((byteIndex) => {
                      const first = (order.bytes === "ltr") === (byteIndex === 0);
                      return (
                        <span key={byteIndex} data-bits={order.bits}>
                          <b>{first ? "1ST" : "2ND"}</b>
                          <i>{order.bits === "ltr" ? "→" : "←"}</i>
                        </span>
                      );
                    })}
                  </span>
                  <span className={styles.bits}>
                    {reading
                      ? [0, 8].map((start) => (
                          <span key={start}>
                            {[...reading.bits.slice(start, start + 8)].map((bit, offset) => {
                              const turn = start + offset;
                              const live = isSelected && cursor !== null;
                              return (
                                <span
                                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed 16 positions
                                  key={offset}
                                  className={clsx(
                                    live && turn > cursor && styles.bitPending,
                                    live && turn === cursor && styles.bitNow,
                                  )}
                                >
                                  {bit}
                                </span>
                              );
                            })}
                          </span>
                        ))
                      : "—"}
                  </span>
                  <span className={clsx(styles.value, styles.hex)}>
                    <small>HEX</small>{" "}
                    {reading ? reading.value.toString(16).padStart(4, "0").toUpperCase() : "—"}
                  </span>
                  <span className={clsx(styles.value, styles.dec)}>
                    <small>DEC</small> {reading ? reading.value.toLocaleString("en-US") : "—"}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="sr-only" aria-live="polite">
            {selectedReading
              ? `Order ${selected + 1} reads ${selectedReading.bits}, hex ${selectedReading.value
                  .toString(16)
                  .padStart(4, "0")
                  .toUpperCase()}, decimal ${selectedReading.value}.`
              : "No valid input."}
          </p>
          <p className={styles.caveat}>
            Almost all hardware fixes the bit order inside a byte. The choice programmers meet is
            byte order, row 1 against row 4. Bit order matters on serial links, where bits travel
            one at a time.
          </p>
        </div>
      </div>
    </section>
  );
}
