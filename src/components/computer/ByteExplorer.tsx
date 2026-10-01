import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
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

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.meter}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ColorCell({ label, color }: { label: string; color: string | null }) {
  return (
    <div className={styles.colorCell}>
      <div
        className={styles.colorChip}
        style={{ backgroundColor: color ?? "transparent" }}
        role="img"
        aria-label={`${label} color ${color ?? "unavailable"}`}
      />
      <div>
        <strong>{label}</strong>
      </div>
    </div>
  );
}

/** Portable demo: the panel can be placed in MDX without page-specific state. */
export function ByteExplorer() {
  const [input, setInput] = useState("01000001");
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
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
    playSwitch();
  }

  return (
    <section className={styles.machine} aria-label="Byte interpretation instrument">
      <div className={styles.screw} aria-hidden="true" />
      <div className={`${styles.screw} ${styles.screwRight}`} aria-hidden="true" />
      <div className={styles.nameplate}>
        <div>
          <span className={styles.serial}>01 / 8 BIT</span>
          <strong>BYTE INTERPRETER</strong>
        </div>
        <button
          type="button"
          className={styles.soundButton}
          onClick={toggleSound}
          aria-pressed={soundEnabled}
          aria-label={`Sound ${soundEnabled ? "on" : "off"}. Toggle sound.`}
        >
          <i aria-hidden="true" /> SOUND {soundEnabled ? "ON" : "OFF"}
        </button>
      </div>

      <div className={styles.workbench}>
        <div className={styles.controls}>
          <div className={styles.sectionHead}>
            <span>INPUT</span>
          </div>
          <label className={styles.inputLabel} htmlFor="byte-bits">
            BINARY
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
            {value === null ? "ENTER EIGHT 0s OR 1s · SPACES OK" : ""}
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
              </div>
            ))}
          </fieldset>
          <div className={styles.presetRow}>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setInput(byteBits(preset.value));
                  playButton();
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.readout} aria-live="polite">
          <div className={styles.sectionHead}>
            <span>READOUT</span>
          </div>
          <div className={styles.screen}>
            <div className={styles.screenTop}>
              <span>UNSIGNED / DECIMAL</span>
              {value === null && <span>INPUT ERROR</span>}
            </div>
            <div className={styles.screenValue}>{value === null ? "---" : value.toString()}</div>
            <div className={styles.screenBottom}>
              <span>
                HEX {value === null ? "--" : value.toString(16).padStart(2, "0").toUpperCase()}
              </span>
            </div>
          </div>
          <dl className={styles.meters}>
            <Meter label="SIGNED" value={value === null ? "—" : String(signedByte(value))} />
            <Meter
              label="FIXED · Q4.4"
              value={value === null ? "—" : String(signedByte(value) / 16)}
            />
            <Meter
              label="FLOAT · E4M3"
              value={float === null ? "—" : Number.isNaN(float) ? "NaN" : String(float)}
            />
            <Meter label="ASCII" value={value === null ? "—" : (ascii ?? "CONTROL")} />
            <Meter label="LATIN-1" value={latin1} />
            <Meter
              label="UNICODE"
              value={
                value === null ? "—" : `U+${value.toString(16).padStart(4, "0").toUpperCase()}`
              }
            />
          </dl>
        </div>
      </div>

      <div className={styles.colorSection}>
        <div className={styles.sectionHead}>
          <span>COLOR</span>
        </div>
        <div className={styles.colors}>
          <ColorCell label="RGB332" color={rgb?.hex ?? null} />
          <ColorCell
            label="GRAYSCALE"
            color={value === null ? null : `rgb(${value}, ${value}, ${value})`}
          />
          <ColorCell label="INDEXED" color={value === null ? null : xtermColor(value)} />
          <ColorCell label="HUE" color={value === null ? null : hueColor(value)} />
        </div>
      </div>
    </section>
  );
}
