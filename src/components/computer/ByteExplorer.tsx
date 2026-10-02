import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  type ByteColor,
  type ByteReading,
  byteColorHex,
  encodeByteColor,
  encodeByteReading,
} from "src/lib/byteEditing";
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
import { PanelEditor } from "./PanelEditor";

const weights = [128, 64, 32, 16, 8, 4, 2, 1];
const presets = [
  { label: "LETTER A", value: 65 },
  { label: "RED", value: 224 },
  { label: "MAX", value: 255 },
  { label: "CLEAR", value: 0 },
];

type ActiveEditor = { type: "reading"; kind: ByteReading } | { type: "color"; kind: ByteColor };

const readingLabels: Record<ByteReading, string> = {
  unsigned: "Unsigned",
  signed: "Signed",
  fixed: "Fixed · Q4.4",
  float: "Float · E4M3",
  ascii: "ASCII",
  latin1: "Latin-1",
  unicode: "Unicode",
};
const colorLabels: Record<ByteColor, string> = {
  rgb332: "RGB332",
  grayscale: "Grayscale",
  indexed: "Indexed",
  hue: "Hue",
};
const editorHints: Record<ByteReading | ByteColor, string> = {
  unsigned: "Whole number from 0 to 255.",
  signed: "Whole number from −128 to 127.",
  fixed: "Q4.4 rounds to steps of 1/16.",
  float: "E4M3 rounds to the nearest available 8-bit float.",
  ascii: "One printable ASCII character.",
  latin1: "One Latin-1 character (U+0000–U+00FF).",
  unicode: "One character or a code point like U+00E9. One byte only.",
  rgb332: "Closest color with 3 red, 3 green, and 2 blue bits.",
  grayscale: "The chosen color becomes its grayscale brightness.",
  indexed: "Closest match in the 256-color terminal palette.",
  hue: "Only hue is stored; saturation and lightness stay fixed.",
};

function Meter({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <button
      type="button"
      className={styles.meter}
      onClick={onEdit}
      aria-label={`Set ${label}. Current value ${value}`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <span className={styles.editCue} aria-hidden="true">
        SET
      </span>
    </button>
  );
}

function ColorCell({
  label,
  color,
  onEdit,
}: {
  label: string;
  color: string | null;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.colorCell}
      onClick={onEdit}
      aria-label={`Set ${label} color. Current color ${color ?? "unavailable"}`}
    >
      <div
        className={styles.colorChip}
        style={{ backgroundColor: color ?? "transparent" }}
        aria-hidden="true"
      />
      <strong>{label}</strong>
      <span className={styles.editCue} aria-hidden="true">
        SET
      </span>
    </button>
  );
}

/** Portable demo: the panel can be placed in MDX without page-specific state. */
export function ByteExplorer() {
  const [input, setInput] = useState("01000001");
  const [editor, setEditor] = useState<ActiveEditor | null>(null);
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
    playButton();
  }

  function openEditor(next: ActiveEditor) {
    setEditor(next);
    if (next.type !== "color") playButton();
  }

  function applyEditor(text: string): string | null {
    if (!editor) return null;
    const result =
      editor.type === "reading"
        ? encodeByteReading(editor.kind, text)
        : encodeByteColor(editor.kind, text);
    if ("error" in result) return result.error;
    setInput(byteBits(result.value));
    if (editor.type !== "color") playSwitch();
    return null;
  }

  const editorValue =
    editor?.type === "color"
      ? byteColorHex(editor.kind, value ?? 0)
      : editor?.kind === "unsigned"
        ? String(value ?? "")
        : editor?.kind === "signed"
          ? value === null
            ? ""
            : String(signedByte(value))
          : editor?.kind === "fixed"
            ? value === null
              ? ""
              : String(signedByte(value) / 16)
            : editor?.kind === "float"
              ? float === null
                ? ""
                : String(float)
              : editor?.kind === "ascii"
                ? (ascii ?? "")
                : editor?.kind === "latin1"
                  ? value !== null && value >= 32 && (value < 127 || value >= 160)
                    ? String.fromCharCode(value)
                    : ""
                  : editor?.kind === "unicode"
                    ? value === null
                      ? ""
                      : `U+${value.toString(16).padStart(4, "0").toUpperCase()}`
                    : "";

  return (
    <section className={styles.machine} aria-label="Byte interpretation instrument">
      <div className={styles.screw} aria-hidden="true" />
      <div className={`${styles.screw} ${styles.screwRight}`} aria-hidden="true" />
      <div className={styles.nameplate}>
        <div>
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
          <fieldset className={styles.bitBank} aria-label="Bit buttons">
            {weights.map((weight, index) => (
              <div className={styles.bitUnit} key={weight}>
                <span className={styles.weight}>{weight}</span>
                <button
                  type="button"
                  disabled={!bits}
                  onClick={() => toggleBit(index)}
                  aria-label={`Bit ${7 - index}: ${bits?.[index] ?? "unknown"}. Toggle bit.`}
                  aria-pressed={bits?.[index] === "1"}
                  className={styles.bitButton}
                >
                  {bits?.[index] ?? "·"}
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
          <button
            type="button"
            className={styles.screen}
            onClick={() => openEditor({ type: "reading", kind: "unsigned" })}
            aria-label={`Set unsigned decimal value. Current value ${value ?? "invalid"}`}
          >
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
          </button>
          <div className={styles.meters}>
            <Meter
              label="SIGNED"
              value={value === null ? "—" : String(signedByte(value))}
              onEdit={() => openEditor({ type: "reading", kind: "signed" })}
            />
            <Meter
              label="FIXED · Q4.4"
              value={value === null ? "—" : String(signedByte(value) / 16)}
              onEdit={() => openEditor({ type: "reading", kind: "fixed" })}
            />
            <Meter
              label="FLOAT · E4M3"
              value={float === null ? "—" : Number.isNaN(float) ? "NaN" : String(float)}
              onEdit={() => openEditor({ type: "reading", kind: "float" })}
            />
            <Meter
              label="ASCII"
              value={value === null ? "—" : (ascii ?? "CONTROL")}
              onEdit={() => openEditor({ type: "reading", kind: "ascii" })}
            />
            <Meter
              label="LATIN-1"
              value={latin1}
              onEdit={() => openEditor({ type: "reading", kind: "latin1" })}
            />
            <Meter
              label="UNICODE"
              value={
                value === null ? "—" : `U+${value.toString(16).padStart(4, "0").toUpperCase()}`
              }
              onEdit={() => openEditor({ type: "reading", kind: "unicode" })}
            />
          </div>
        </div>
      </div>

      <div className={styles.colorSection}>
        <div className={styles.sectionHead}>
          <span>COLOR</span>
        </div>
        <div className={styles.colors}>
          <ColorCell
            label="RGB332"
            color={rgb?.hex ?? null}
            onEdit={() => openEditor({ type: "color", kind: "rgb332" })}
          />
          <ColorCell
            label="GRAYSCALE"
            color={value === null ? null : `rgb(${value}, ${value}, ${value})`}
            onEdit={() => openEditor({ type: "color", kind: "grayscale" })}
          />
          <ColorCell
            label="INDEXED"
            color={value === null ? null : xtermColor(value)}
            onEdit={() => openEditor({ type: "color", kind: "indexed" })}
          />
          <ColorCell
            label="HUE"
            color={value === null ? null : hueColor(value)}
            onEdit={() => openEditor({ type: "color", kind: "hue" })}
          />
        </div>
      </div>
      {editor && (
        <PanelEditor
          key={`${editor.type}-${editor.kind}`}
          title={editor.type === "reading" ? readingLabels[editor.kind] : colorLabels[editor.kind]}
          kind={
            editor.type === "color"
              ? "color"
              : ["ascii", "latin1", "unicode"].includes(editor.kind)
                ? "text"
                : "number"
          }
          initialValue={editorValue}
          hint={editorHints[editor.kind]}
          represented={
            value === null
              ? "INVALID"
              : `${byteBits(value)} · 0x${value.toString(16).padStart(2, "0").toUpperCase()}`
          }
          onApply={(text) => applyEditor(text)}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}
