import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { formatFourBytes, fourByteReadings, parseFourBytes } from "src/lib/fourByteInterpretations";
import panel from "./ByteExplorer.module.css";
import styles from "./FourByteExplorer.module.css";

const presets = [
  { label: "EMOJI 😀", hex: "F0 9F 98 80", view: "text" },
  { label: "FLOAT 1.0", hex: "3F 80 00 00", view: "float" },
  { label: "RED RGBA", hex: "FF 00 00 FF", view: "color" },
  { label: "TEXT TEST", hex: "54 45 53 54", view: "text" },
  { label: "−1", hex: "FF FF FF FF", view: "signed" },
] as const;

type DisplayView = (typeof presets)[number]["view"];

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.result}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** Four bytes, one big-endian 32-bit word. Usable in MDX articles. */
export function FourByteExplorer() {
  const [input, setInput] = useState("F0 9F 98 80");
  const [view, setView] = useState<DisplayView>("text");
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
  const bytes = parseFourBytes(input);
  const reading = bytes ? fourByteReadings(bytes) : null;

  function flipBit(byteIndex: number, bitIndex: number) {
    if (!bytes) return;
    const next = new Uint8Array(bytes);
    next[byteIndex] ^= 1 << (7 - bitIndex);
    setInput(formatFourBytes(next));
    playSwitch();
  }

  const floatText = reading
    ? Number.isNaN(reading.float)
      ? "NaN"
      : Object.is(reading.float, -0)
        ? "-0"
        : Number.isFinite(reading.float)
          ? String(Number(reading.float.toPrecision(8)))
          : String(reading.float)
    : "—";
  const utf8Text = reading
    ? reading.utf8 === null
      ? "INVALID UTF-8"
      : [...reading.utf8]
          .map((character) => {
            const codePoint = character.codePointAt(0) ?? 0;
            return codePoint < 32 || codePoint === 127 ? "·" : character;
          })
          .join("") || "EMPTY"
    : "—";
  const display = {
    text: { label: "UTF-8 TEXT", value: utf8Text },
    float: { label: "FLOAT32", value: floatText },
    signed: { label: "SIGNED INT32", value: reading ? String(reading.signed) : "—" },
    color: {
      label: "RGBA / HEX",
      value: bytes ? `#${formatFourBytes(bytes).replaceAll(" ", "")}` : "—",
    },
  }[view];

  return (
    <section className={panel.machine} aria-label="Four-byte interpretation instrument">
      <div className={panel.screw} aria-hidden="true" />
      <div className={`${panel.screw} ${panel.screwRight}`} aria-hidden="true" />
      <div className={panel.nameplate}>
        <div>
          <span className={panel.serial}>02 / 32 BIT</span>
          <strong>32-BIT INTERPRETER</strong>
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
        <div className={styles.inputSide}>
          <div className={panel.sectionHead}>
            <span>INPUT · BIG-ENDIAN</span>
          </div>
          <label className={panel.inputLabel} htmlFor="four-byte-hex">
            HEX / FOUR BYTES
          </label>
          <input
            id="four-byte-hex"
            className={`${panel.bitInput} ${styles.hexInput}`}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={bytes === null}
            aria-describedby="four-byte-help"
          />
          <p id="four-byte-help" className={panel.inputHelp}>
            {bytes ? "" : "ENTER EIGHT HEX DIGITS · SPACES OK"}
          </p>
          <div className={styles.byteRows}>
            {[0, 1, 2, 3].map((byteIndex) => (
              <fieldset
                key={byteIndex}
                className={styles.byteRow}
                aria-label={`Byte ${byteIndex + 1} bit switches`}
              >
                <legend>
                  BYTE {byteIndex + 1}{" "}
                  <b>{bytes?.[byteIndex].toString(16).padStart(2, "0").toUpperCase() ?? "--"}</b>
                </legend>
                <div className={styles.bits}>
                  {[7, 6, 5, 4, 3, 2, 1, 0].map((position, bitIndex) => {
                    const on = bytes ? Boolean(bytes[byteIndex] & (1 << position)) : false;
                    return (
                      <button
                        key={position}
                        type="button"
                        disabled={!bytes}
                        onClick={() => flipBit(byteIndex, bitIndex)}
                        aria-label={`Byte ${byteIndex + 1}, bit ${position}: ${Number(on)}. Toggle bit.`}
                        aria-pressed={on}
                        className={`${styles.bitButton} ${on ? styles.bitOn : ""}`}
                      >
                        {bytes ? Number(on) : "·"}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <div className={panel.presetRow}>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setInput(preset.hex);
                  setView(preset.view);
                  playButton();
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.outputSide} aria-live="polite">
          <div className={panel.sectionHead}>
            <span>READOUT</span>
          </div>
          <div className={`${panel.screen} ${styles.screen}`}>
            <div className={panel.screenTop}>
              <span>{display.label}</span>
              {!bytes && <span>INPUT ERROR</span>}
            </div>
            <div className={styles.screenText}>{display.value}</div>
          </div>
          <dl className={styles.results}>
            <Result
              label="UNSIGNED INT32"
              value={reading ? reading.unsigned.toLocaleString("en-US") : "—"}
            />
            <Result
              label="SIGNED INT32"
              value={reading ? reading.signed.toLocaleString("en-US") : "—"}
            />
            <Result label="IEEE 754 FLOAT32" value={floatText} />
          </dl>
          <div className={styles.colorBlock}>
            <div className={panel.sectionHead}>
              <span>RGBA COLOR</span>
            </div>
            <div className={styles.colorReadout}>
              <div
                className={styles.checker}
                role="img"
                aria-label={
                  reading
                    ? `RGBA color ${reading.red}, ${reading.green}, ${reading.blue}, ${reading.alpha}`
                    : "No color"
                }
              >
                <div
                  style={{
                    backgroundColor: reading
                      ? `rgba(${reading.red}, ${reading.green}, ${reading.blue}, ${reading.alpha / 255})`
                      : "transparent",
                  }}
                />
              </div>
              <div className={styles.channels}>
                {(["R", "G", "B", "A"] as const).map((channel, index) => (
                  <span key={channel}>
                    <b>{channel}</b> {bytes?.[index] ?? "—"}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
