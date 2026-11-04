import clsx from "clsx";
import type { ReactNode } from "react";
import { byteParts, hexByte, type TextReading } from "src/lib/unicodeText";
import panel from "./ByteExplorer.module.css";
import styles from "./Unicode.module.css";

/** The panel, screws and nameplate every Unicode demo sits in. */
export function UnicodePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={clsx("not-prose", panel.machine, styles.unicode)} aria-label={title}>
      <div className={panel.screw} aria-hidden="true" />
      <div className={clsx(panel.screw, panel.screwRight)} aria-hidden="true" />
      <div className={panel.nameplate}>
        <div>
          <strong>{title}</strong>
        </div>
      </div>
      <div className={styles.deck}>{children}</div>
    </section>
  );
}

/** A row of mutually exclusive buttons. */
export function Choice<Value extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <fieldset className={styles.choice}>
      <legend>{label}</legend>
      <div className={clsx(panel.presetRow, styles.choiceRow)}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** One byte in binary, with the bits UTF-8 uses as markers set apart from the data. */
export function ByteBits({ byte, group }: { byte: number; group?: number }) {
  const { marker, data } = byteParts(byte);
  return (
    <span className={styles.byteBits}>
      <span className={styles.marker}>{marker}</span>
      {data && (
        <span className={styles.data} data-group={group}>
          {data}
        </span>
      )}
    </span>
  );
}

export function Counts({ reading }: { reading: TextReading }) {
  return (
    <dl className={styles.counts}>
      <div>
        <dt>GRAPHEMES</dt>
        <dd>{reading.graphemes.length}</dd>
      </div>
      <div>
        <dt>CODE POINTS</dt>
        <dd>{reading.codePointCount}</dd>
      </div>
      <div>
        <dt>BYTES</dt>
        <dd>{reading.bytes.length}</dd>
      </div>
    </dl>
  );
}

/** Text as three levels, stacked so each thing sits above the parts it is made of. */
export function TextLayers({ reading }: { reading: TextReading }) {
  return (
    <ol className={styles.graphemes} aria-label="Graphemes">
      {reading.graphemes.map((grapheme, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a cluster is its position in the text
        <li key={index} className={styles.grapheme}>
          <div className={clsx(styles.lcd, grapheme.face.isLabel && styles.lcdLabel)}>
            {grapheme.face.text}
          </div>
          <ol className={styles.codePoints} aria-label="Code points">
            {grapheme.codePoints.map((point, pointIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a code point is its position in the cluster
              <li key={pointIndex} className={styles.codePoint}>
                <span
                  className={clsx(styles.pointGlyph, point.face.isLabel && styles.pointLabel)}
                  aria-hidden="true"
                >
                  {point.face.text}
                </span>
                <span className={styles.pointHex}>{point.hex}</span>
                <span className={styles.pointName}>{point.name}</span>
                <ol className={styles.pointBytes} aria-label="UTF-8 bytes">
                  {point.bytes.map((byte, byteIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: a byte is its position in the code point
                    <li key={byteIndex}>
                      <ByteBits byte={byte} />
                      <b>{hexByte(byte)}</b>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

/** The same bytes as they are stored: one flat run, shaded by the cluster they belong to. */
export function ByteRun({ reading }: { reading: TextReading }) {
  return (
    <ol className={styles.byteRun} aria-label="All bytes in order">
      {reading.bytes.map((entry, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a byte is its position in the text
        <li key={index} data-odd={entry.grapheme % 2 === 1 || undefined}>
          {hexByte(entry.byte)}
        </li>
      ))}
    </ol>
  );
}
