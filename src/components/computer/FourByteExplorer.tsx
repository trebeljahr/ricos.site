import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { encodeFourByteReading, type FourByteReading } from "src/lib/fourByteEditing";
import { formatFourBytes, fourByteReadings, parseFourBytes } from "src/lib/fourByteInterpretations";
import panel from "./ByteExplorer.module.css";
import styles from "./FourByteExplorer.module.css";
import { PanelEditor } from "./PanelEditor";

const presets = [
  { label: "EMOJI 😀", hex: "F0 9F 98 80", view: "text" },
  { label: "FLOAT 1.0", hex: "3F 80 00 00", view: "float" },
  { label: "RED RGBA", hex: "FF 00 00 FF", view: "color" },
  { label: "TEXT TEST", hex: "54 45 53 54", view: "text" },
  { label: "−1", hex: "FF FF FF FF", view: "signed" },
] as const;

type DisplayView = FourByteReading;

function Result({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={styles.result}
      onClick={onClick}
      aria-label={`Set ${label}. Current value ${value}`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <em>SET</em>
    </button>
  );
}

/** Four bytes, one big-endian 32-bit word. Usable in MDX articles. */
export function FourByteExplorer() {
  const [input, setInput] = useState("F0 9F 98 80");
  const [view, setView] = useState<DisplayView>("text");
  const [editor, setEditor] = useState<FourByteReading | null>(null);
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
    unsigned: { label: "UNSIGNED INT32", value: reading ? String(reading.unsigned) : "—" },
    text: { label: "UTF-8 TEXT", value: utf8Text },
    float: { label: "FLOAT32", value: floatText },
    signed: { label: "SIGNED INT32", value: reading ? String(reading.signed) : "—" },
    color: {
      label: "RGBA / HEX",
      value: bytes ? `#${formatFourBytes(bytes).replaceAll(" ", "")}` : "—",
    },
  }[view];

  function openEditor(kind: FourByteReading) {
    if (!reading || !bytes) return;
    setEditor(kind);
    if (kind !== "color") playButton();
  }

  function applyEditor(value: string, alpha: number): string | null {
    if (!editor) return null;
    const result = encodeFourByteReading(editor, value, alpha);
    if ("error" in result) return result.error;
    setInput(formatFourBytes(result.bytes));
    setView(editor);
    if (editor !== "color") playSwitch();
    return null;
  }

  const editorValue =
    editor && reading && bytes
      ? editor === "unsigned"
        ? String(reading.unsigned)
        : editor === "signed"
          ? String(reading.signed)
          : editor === "float"
            ? floatText
            : editor === "text"
              ? (reading.utf8 ?? "")
              : `#${[...bytes.slice(0, 3)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`
      : "";
  const editorTitle =
    editor === "unsigned"
      ? "UNSIGNED INT32"
      : editor === "signed"
        ? "SIGNED INT32"
        : editor === "float"
          ? "FLOAT32"
          : editor === "text"
            ? "UTF-8 TEXT"
            : "RGBA COLOR";
  const editorHint =
    editor === "unsigned"
      ? "0–4,294,967,295 · four bytes"
      : editor === "signed"
        ? "−2,147,483,648–2,147,483,647 · four bytes"
        : editor === "float"
          ? "Stored as IEEE 754 float32; decimals may round."
          : editor === "text"
            ? "Enter text that encodes to exactly four UTF-8 bytes."
            : "RGB uses three bytes; alpha uses the fourth.";

  return (
    <section className={panel.machine} aria-label="Four-byte interpretation instrument">
      <div className={panel.screw} aria-hidden="true" />
      <div className={`${panel.screw} ${panel.screwRight}`} aria-hidden="true" />
      <div className={panel.nameplate}>
        <div>
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
          <button
            type="button"
            className={`${panel.screen} ${styles.screen} ${styles.editableScreen}`}
            onClick={() => openEditor(view)}
            disabled={!reading}
            aria-label={`Set ${display.label}. Current value ${display.value}`}
          >
            <div className={panel.screenTop}>
              <span>{display.label}</span>
              {!bytes && <span>INPUT ERROR</span>}
            </div>
            <div className={styles.screenText}>{display.value}</div>
            <span className={styles.screenCue}>SET VALUE ↗</span>
          </button>
          <div className={styles.results}>
            <Result
              label="UNSIGNED INT32"
              value={reading ? reading.unsigned.toLocaleString("en-US") : "—"}
              onClick={() => openEditor("unsigned")}
            />
            <Result
              label="SIGNED INT32"
              value={reading ? reading.signed.toLocaleString("en-US") : "—"}
              onClick={() => openEditor("signed")}
            />
            <Result
              label="IEEE 754 FLOAT32"
              value={floatText}
              onClick={() => openEditor("float")}
            />
            <Result label="UTF-8 TEXT" value={utf8Text} onClick={() => openEditor("text")} />
          </div>
          <div className={styles.colorBlock}>
            <div className={panel.sectionHead}>
              <span>RGBA COLOR</span>
            </div>
            <button
              type="button"
              className={styles.colorReadout}
              onClick={() => openEditor("color")}
              disabled={!reading}
              aria-label="Set RGBA color"
            >
              <div className={styles.checker} aria-hidden="true">
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
              <span className={styles.colorCue}>SET COLOR ↗</span>
            </button>
          </div>
        </div>
      </div>
      {editor && bytes && reading && (
        <PanelEditor
          key={editor}
          title={editorTitle}
          kind={editor === "color" ? "color" : editor === "text" ? "text" : "number"}
          initialValue={editorValue}
          hint={editorHint}
          represented={formatFourBytes(bytes)}
          alpha={editor === "color" ? reading.alpha : undefined}
          onApply={applyEditor}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}
