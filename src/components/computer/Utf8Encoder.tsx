import clsx from "clsx";
import { useId, useRef, useState } from "react";
import { useDemoState } from "src/hooks/useDemoState";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  bitHome,
  bitString,
  CODE_POINT_BITS,
  codePointFace,
  codePointLabel,
  codePointName,
  encodeUtf8,
  hexByte,
  isSurrogate,
  MAX_CODE_POINT,
  UTF8_ROWS,
  utf8Row,
} from "src/lib/unicodeText";
import panel from "./ByteExplorer.module.css";
import styles from "./Unicode.module.css";
import { ByteBits, UnicodePanel } from "./UnicodeParts";

const initialCode: string = "E9";
const validCode = (value: string) => /^[0-9A-F]{1,6}$/.test(value);
const MAX_SWITCHES = 2 ** CODE_POINT_BITS - 1;

const STOPS = [
  0x41,
  0x7f,
  0x80,
  0xe9,
  0x7ff,
  0x800,
  0x20ac,
  0x5b57,
  0xffff,
  0x10000,
  0x1f600,
  MAX_CODE_POINT,
];
/** Bit positions, high to low, split where the bytes of a four-byte form split them. */
const BIT_GROUPS = [
  [20, 19, 18],
  [17, 16, 15, 14, 13, 12],
  [11, 10, 9, 8, 7, 6],
  [5, 4, 3, 2, 1, 0],
];

/** A row's byte patterns, with the code point's own bits written over the x's. */
function filledTemplate(codePoint: number, template: readonly string[]) {
  const payload = template.join("").replace(/[^x]/g, "").length;
  const bits = bitString(codePoint, payload);
  let next = 0;
  return template.map((pattern, byte) =>
    Array.from(pattern, (slot) =>
      slot === "x" ? { char: bits[next++], group: byte } : { char: slot, group: null },
    ),
  );
}

/** Flip the bits of a code point and watch them move into UTF-8 bytes. Usable in MDX articles. */
export function Utf8Encoder() {
  const [stored, setStored] = useDemoState("utf8-encoder:code", initialCode, validCode);
  const [draft, setDraft] = useState<string | null>(null);
  const composing = useRef(false);
  const id = useId();
  const sound = usePanelSound();

  const codePoint = Math.min(Number.parseInt(stored, 16), MAX_SWITCHES);
  const row = utf8Row(codePoint);
  const bytes = encodeUtf8(codePoint);
  const face = codePointFace(codePoint);

  function set(next: number) {
    setStored(Math.max(0, Math.min(MAX_SWITCHES, next)).toString(16).toUpperCase());
    setDraft(null);
  }

  function take(value: string) {
    const last = Array.from(value).at(-1);
    if (last) {
      set(last.codePointAt(0) ?? 0);
      sound.playType("key");
    }
    setDraft(null);
  }

  const shownChar = row && !face.isLabel && !face.text.startsWith("◌") ? face.text : "";

  return (
    <UnicodePanel title="UTF-8 ENCODER" sound={sound}>
      <div className={styles.bay}>
        <div className={panel.sectionHead}>
          <span>CODE POINT</span>
          <span>{codePoint.toLocaleString("en-US")}</span>
        </div>
        <div className={styles.encoderTop}>
          <div className={clsx(styles.lcd, styles.encoderGlyph, face.isLabel && styles.lcdLabel)}>
            {face.text}
          </div>
          <div className={styles.encoderFacts}>
            <strong>{codePointLabel(codePoint)}</strong>
            <span>{codePointName(codePoint)}</span>
            <label className={panel.inputLabel} htmlFor={`${id}-char`}>
              TYPE A CHARACTER
            </label>
            <input
              id={`${id}-char`}
              className={styles.charInput}
              value={draft ?? shownChar}
              onChange={(event) => {
                if (composing.current) setDraft(event.target.value);
                else take(event.target.value);
              }}
              onCompositionStart={() => {
                composing.current = true;
              }}
              onCompositionEnd={(event) => {
                composing.current = false;
                take(event.currentTarget.value);
              }}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
        </div>
        <div className={clsx(panel.presetRow, styles.choiceRow)}>
          <button
            type="button"
            aria-label="Previous code point"
            disabled={codePoint === 0}
            onClick={() => {
              set(codePoint - 1);
              sound.playButton();
            }}
          >
            −1
          </button>
          <button
            type="button"
            aria-label="Next code point"
            disabled={codePoint === MAX_SWITCHES}
            onClick={() => {
              set(codePoint + 1);
              sound.playButton();
            }}
          >
            +1
          </button>
          {STOPS.map((stop) => {
            const stopFace = codePointFace(stop);
            return (
              <button
                key={stop}
                type="button"
                className={clsx(!stopFace.isLabel && styles.glyphKey)}
                aria-label={codePointLabel(stop)}
                aria-pressed={stop === codePoint}
                onClick={() => {
                  set(stop);
                  sound.playButton();
                }}
              >
                {stopFace.text}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.bay}>
        <div className={panel.sectionHead}>
          <span>BITS · {CODE_POINT_BITS}</span>
          <span>{row ? `${row.length} ${row.length === 1 ? "BYTE" : "BYTES"}` : "NO BYTES"}</span>
        </div>
        <fieldset className={styles.bitGroups}>
          <legend className="sr-only">Code point bits</legend>
          {BIT_GROUPS.map((group) => (
            <div key={group[0]} className={styles.bitGroup}>
              {group.map((bit) => {
                const on = Math.floor(codePoint / 2 ** bit) % 2 === 1;
                return (
                  <button
                    key={bit}
                    type="button"
                    className={styles.bit}
                    aria-label={`Bit ${bit}`}
                    aria-pressed={on}
                    data-group={bitHome(codePoint, bit) ?? undefined}
                    onClick={() => {
                      set(on ? codePoint - 2 ** bit : codePoint + 2 ** bit);
                      sound.playSwitch();
                    }}
                  >
                    {on ? 1 : 0}
                  </button>
                );
              })}
            </div>
          ))}
        </fieldset>
      </div>

      <div className={styles.bay}>
        <div className={panel.sectionHead}>
          <span>UTF-8 RANGES</span>
        </div>
        <ol className={styles.ranges}>
          {UTF8_ROWS.map((entry) => {
            const lit = entry === row;
            return (
              <li key={entry.length} className={styles.range} data-lit={lit || undefined}>
                <span className={styles.rangeSpan}>
                  {codePointLabel(entry.first)}–{codePointLabel(entry.last)}
                </span>
                <span className={styles.rangeBytes}>
                  {lit
                    ? filledTemplate(codePoint, entry.template).map((pattern, byte) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: a byte is its position in the form
                        <span key={byte} className={styles.rangeByte}>
                          {pattern.map((slot, bit) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: a bit is its position in the byte
                            <span key={bit} data-group={slot.group ?? undefined}>
                              {slot.char}
                            </span>
                          ))}
                        </span>
                      ))
                    : entry.template.map((pattern, byte) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: a byte is its position in the form
                        <span key={byte} className={styles.rangeByte}>
                          {pattern}
                        </span>
                      ))}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={styles.bay}>
        <div className={panel.sectionHead}>
          <span>BYTES</span>
        </div>
        {bytes.length > 0 ? (
          <ol className={styles.encodedBytes}>
            {bytes.map((byte, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a byte is its position in the form
              <li key={index} className={styles.encodedByte}>
                <ByteBits byte={byte} group={index} />
                <dl>
                  <div>
                    <dt>HEX</dt>
                    <dd>{hexByte(byte)}</dd>
                  </div>
                  <div>
                    <dt>DEC</dt>
                    <dd>{byte}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.error} role="status">
            {isSurrogate(codePoint)
              ? `${codePointLabel(codePoint)} is a surrogate. It has no UTF-8 form.`
              : `${codePointLabel(codePoint)} is above U+10FFFF. It is not in Unicode.`}
          </p>
        )}
      </div>
    </UnicodePanel>
  );
}
