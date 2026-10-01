import { useState } from "react";
import {
  asciiCharacter,
  byteBits,
  float8E4M3,
  hueColor,
  parseByteBits,
  rgb332,
  signedByte,
  xtermColor,
} from "src/lib/byteInterpretations";
import styles from "./ByteExplorer.module.css";

const weights = [128, 64, 32, 16, 8, 4, 2, 1];
const presets = [
  { label: "LETTER A", value: 65 },
  { label: "RED", value: 224 },
  { label: "MAX", value: 255 },
  { label: "CLEAR", value: 0 },
];

function Meter({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className={styles.meter}>
      <dt>{label}</dt>
      <dd title={detail}>{value}</dd>
    </div>
  );
}

function ColorCell({
  label,
  detail,
  color,
}: {
  label: string;
  detail: string;
  color: string | null;
}) {
  return (
    <div className={styles.colorCell}>
      <div
        className={styles.colorChip}
        style={{ backgroundColor: color ?? "transparent" }}
        role="img"
        aria-label={`${label}: ${detail}`}
      />
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

/** Portable demo: the panel can be placed in MDX without page-specific state. */
export function ByteExplorer() {
  const [input, setInput] = useState("01000001");
  const value = parseByteBits(input);
  const bits = value === null ? null : byteBits(value);
  const rgb = value === null ? null : rgb332(value);
  const float = value === null ? null : float8E4M3(value);
  const ascii = value === null ? null : asciiCharacter(value);
  const latin1 =
    value === null
      ? "—"
      : value >= 32 && value !== 127 && (value < 128 || value >= 160)
        ? String.fromCharCode(value)
        : "CTRL";

  function toggleBit(index: number) {
    if (!bits) return;
    const next = bits.split("");
    next[index] = next[index] === "1" ? "0" : "1";
    setInput(next.join(""));
  }

  return (
    <section className={styles.machine} aria-label="Byte interpretation instrument">
      <div className={styles.screw} aria-hidden="true" />
      <div className={`${styles.screw} ${styles.screwRight}`} aria-hidden="true" />
      <div className={styles.nameplate}>
        <div>
          <span className={styles.serial}>ИНСТРУМЕНТ / 01</span>
          <strong>BYTE INTERPRETER</strong>
        </div>
        <span className={styles.status}>
          <i aria-hidden="true" /> SYSTEM READY
        </span>
      </div>

      <div className={styles.workbench}>
        <div className={styles.controls}>
          <div className={styles.sectionHead}>
            <span>01 / INPUT REGISTER</span>
            <span>8 BIT</span>
          </div>
          <label className={styles.inputLabel} htmlFor="byte-bits">
            BINARY INPUT
          </label>
          <input
            id="byte-bits"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            inputMode="numeric"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={value === null}
            aria-describedby="byte-help"
            className={styles.bitInput}
          />
          <p id="byte-help" className={styles.inputHelp}>
            {value === null
              ? "ENTER EIGHT 0s OR 1s · SPACES OK"
              : "SET REGISTER WITH SWITCHES OR KEYBOARD"}
          </p>
          <fieldset className={styles.switchBank} aria-label="Bit switches">
            {weights.map((weight, index) => (
              <div className={styles.switchUnit} key={weight}>
                <span className={styles.weight}>{weight}</span>
                <button
                  type="button"
                  disabled={!bits}
                  onClick={() => toggleBit(index)}
                  aria-label={`Bit ${7 - index}: ${bits?.[index] ?? "unknown"}. Toggle bit.`}
                  aria-pressed={bits?.[index] === "1"}
                  className={`${styles.switch} ${bits?.[index] === "1" ? styles.switchOn : ""}`}
                >
                  <span className={styles.switchHandle} />
                </button>
                <span className={styles.bitNumber}>{bits?.[index] ?? "–"}</span>
              </div>
            ))}
          </fieldset>
          <div className={styles.presetRow}>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setInput(byteBits(preset.value))}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.readout} aria-live="polite">
          <div className={styles.sectionHead}>
            <span>02 / DATA DISPLAY</span>
            <span>LIVE</span>
          </div>
          <div className={styles.screen}>
            <div className={styles.screenTop}>
              <span>BYTE VALUE</span>
              <span>{value === null ? "INPUT ERROR" : "SIGNAL STABLE"}</span>
            </div>
            <div className={styles.screenValue}>
              {value === null ? "---" : value.toString().padStart(3, "0")}
            </div>
            <div className={styles.screenBottom}>
              <span>
                HEX {value === null ? "--" : value.toString(16).padStart(2, "0").toUpperCase()}
              </span>
              <span>BIN {bits ?? "--------"}</span>
            </div>
          </div>
          <dl className={styles.meters}>
            <Meter
              label="SIGNED / TWO'S COMPLEMENT"
              value={value === null ? "—" : String(signedByte(value))}
            />
            <Meter
              label="FIXED / Q4.4"
              value={value === null ? "—" : String(signedByte(value) / 16)}
            />
            <Meter
              label="FLOAT / E4M3*"
              value={float === null ? "—" : Number.isNaN(float) ? "NaN" : String(float)}
            />
            <Meter label="ASCII / PRINTABLE" value={value === null ? "—" : (ascii ?? "CTRL")} />
            <Meter label="LATIN-1" value={latin1} />
            <Meter
              label="UNICODE / CODE POINT"
              value={
                value === null ? "—" : `U+${value.toString(16).padStart(4, "0").toUpperCase()}`
              }
            />
          </dl>
        </div>
      </div>

      <div className={styles.colorSection}>
        <div className={styles.sectionHead}>
          <span>03 / COLOR DECODERS</span>
          <span>ONE BYTE · FOUR RULES</span>
        </div>
        <div className={styles.colors}>
          <ColorCell label="RGB332" detail="3R · 3G · 2B" color={rgb?.hex ?? null} />
          <ColorCell
            label="GRAYSCALE"
            detail="8-BIT LUMA"
            color={value === null ? null : `rgb(${value}, ${value}, ${value})`}
          />
          <ColorCell
            label="INDEXED"
            detail="XTERM-256 PALETTE"
            color={value === null ? null : xtermColor(value)}
          />
          <ColorCell
            label="HUE"
            detail="FIXED SATURATION / LIGHTNESS"
            color={value === null ? null : hueColor(value)}
          />
        </div>
      </div>
      <div className={styles.footnote}>
        * E4M3 IS AN ILLUSTRATIVE IEEE-LIKE 8-BIT FLOAT. COLOR INDEX USES THE XTERM-256 PALETTE.
      </div>
    </section>
  );
}
