import { useState } from "react";
import { formatFourBytes, fourByteReadings, parseFourBytes } from "src/lib/fourByteInterpretations";
import panel from "./ByteExplorer.module.css";
import styles from "./FourByteExplorer.module.css";

const presets = [
  { label: "EMOJI 😀", hex: "F0 9F 98 80" },
  { label: "FLOAT 1.0", hex: "3F 80 00 00" },
  { label: "RED RGBA", hex: "FF 00 00 FF" },
  { label: "TEXT TEST", hex: "54 45 53 54" },
  { label: "−1", hex: "FF FF FF FF" },
];

function Result({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={styles.result}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      <span>{note}</span>
    </div>
  );
}

/** Four bytes, one big-endian 32-bit word. Usable in MDX articles. */
export function FourByteExplorer() {
  const [input, setInput] = useState("F0 9F 98 80");
  const bytes = parseFourBytes(input);
  const reading = bytes ? fourByteReadings(bytes) : null;

  function flipBit(byteIndex: number, bitIndex: number) {
    if (!bytes) return;
    const next = new Uint8Array(bytes);
    next[byteIndex] ^= 1 << (7 - bitIndex);
    setInput(formatFourBytes(next));
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

  return (
    <section className={panel.machine} aria-label="Four-byte interpretation instrument">
      <div className={panel.screw} aria-hidden="true" />
      <div className={`${panel.screw} ${panel.screwRight}`} aria-hidden="true" />
      <div className={panel.nameplate}>
        <div>
          <span className={panel.serial}>ИНСТРУМЕНТ / 02</span>
          <strong>32-BIT INTERPRETER</strong>
        </div>
        <span className={panel.status}>
          <i aria-hidden="true" /> SYSTEM READY
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.inputSide}>
          <div className={panel.sectionHead}>
            <span>01 / FOUR-BYTE REGISTER</span>
            <span>BIG-ENDIAN</span>
          </div>
          <label className={panel.inputLabel} htmlFor="four-byte-hex">
            HEX INPUT · LEFT BYTE FIRST
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
            {bytes ? "FLIP A BIT OR LOAD A PRESET" : "ENTER EXACTLY EIGHT HEX DIGITS · SPACES OK"}
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
              <button key={preset.label} type="button" onClick={() => setInput(preset.hex)}>
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.outputSide} aria-live="polite">
          <div className={panel.sectionHead}>
            <span>02 / DECODED SIGNAL</span>
            <span>LIVE</span>
          </div>
          <div className={`${panel.screen} ${styles.screen}`}>
            <div className={panel.screenTop}>
              <span>32-BIT WORD</span>
              <span>{bytes ? "SIGNAL STABLE" : "INPUT ERROR"}</span>
            </div>
            <div className={styles.screenHex}>{bytes ? formatFourBytes(bytes) : "-- -- -- --"}</div>
            <div className={panel.screenBottom}>
              <span>MOST SIGNIFICANT BYTE → LEAST SIGNIFICANT BYTE</span>
            </div>
          </div>
          <dl className={styles.results}>
            <Result
              label="UNSIGNED INT32"
              value={reading ? reading.unsigned.toLocaleString("en-US") : "—"}
              note="0 to 4,294,967,295"
            />
            <Result
              label="SIGNED INT32"
              value={reading ? reading.signed.toLocaleString("en-US") : "—"}
              note="Two's complement"
            />
            <Result
              label="IEEE 754 FLOAT32"
              value={floatText}
              note="1 sign · 8 exponent · 23 fraction bits"
            />
            <Result
              label="UTF-8 TEXT"
              value={utf8Text}
              note="1–4 code points, if the sequence is valid"
            />
          </dl>
          <div className={styles.colorBlock}>
            <div className={panel.sectionHead}>
              <span>03 / RGBA COLOR</span>
              <span>8 BITS PER CHANNEL</span>
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
      <div className={panel.footnote}>
        ONE SET OF BITS · FOUR INTERPRETATIONS. FLOAT64 / DOUBLE REQUIRES EIGHT BYTES.
      </div>
    </section>
  );
}
