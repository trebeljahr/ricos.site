import clsx from "clsx";
import { useId, useMemo, useRef, useState } from "react";
import { useDemoState } from "src/hooks/useDemoState";
import {
  type ByteRole,
  bitString,
  byteRole,
  codePointFace,
  codePointLabel,
  codePointName,
  type DecodedRun,
  decodeUtf8,
  hexByte,
  limitCodePoints,
  REPLACEMENT_CHARACTER,
} from "src/lib/unicodeText";
import panel from "./ByteExplorer.module.css";
import styles from "./Unicode.module.css";
import { ByteBits, UnicodePanel } from "./UnicodeParts";

const LIMIT = 16;
const PRESETS = ["Aé€😀", "日本語", "Привет", "👍🏽", "é"];

const ROLE_LABELS: Record<ByteRole, string> = {
  ascii: "ASCII",
  lead2: "LEAD · 2",
  lead3: "LEAD · 3",
  lead4: "LEAD · 4",
  continuation: "CONT",
  invalid: "BAD",
};

const toBytes = (text: string) => Array.from(new TextEncoder().encode(text));

function runResult(run: DecodedRun | undefined, cursor: number): string {
  if (!run) return "—";
  if (cursor < run.end) return "…";
  const codePoint = run.codePoint ?? REPLACEMENT_CHARACTER;
  return `${codePointLabel(codePoint)} ${codePointName(codePoint)}`;
}

/** Bytes in, characters out, one byte at a time. Start anywhere, or damage it. Usable in MDX articles. */
export function Utf8Reader() {
  const [text, setText] = useDemoState("utf8-reader:text", PRESETS[0]);
  const [bytes, setBytes] = useState(() => toBytes(text));
  const [start, setStart] = useState(0);
  const [cursor, setCursor] = useState(() => toBytes(text).length);
  const [selected, setSelected] = useState<number | null>(null);
  const composing = useRef(false);
  const id = useId();

  const runs = useMemo(() => decodeUtf8(bytes, start), [bytes, start]);
  const currentRun = runs.find((run) => cursor - 1 >= run.start && cursor - 1 < run.end);
  const decoded = runs
    .filter((run) => run.end <= cursor)
    .map((run) => run.codePoint ?? REPLACEMENT_CHARACTER);

  function load(next: string) {
    const limited = limitCodePoints(next, LIMIT).text;
    const nextBytes = toBytes(limited);
    setText(limited);
    setBytes(nextBytes);
    setStart(0);
    setCursor(nextBytes.length);
    setSelected(null);
  }

  /** Bytes changed under the reader: show the whole result straight away. */
  function edit(nextBytes: number[], nextStart: number, nextSelected: number | null) {
    setBytes(nextBytes);
    setStart(nextStart);
    setCursor(nextBytes.length);
    setSelected(nextSelected);
  }

  function step(to: number) {
    setCursor(Math.max(start, Math.min(bytes.length, to)));
  }

  const selectedByte = selected === null ? undefined : bytes[selected];

  const byteButton = (index: number) => (
    <button
      key={index}
      type="button"
      className={styles.streamByte}
      aria-pressed={selected === index}
      aria-label={`Byte ${index}, ${hexByte(bytes[index])}`}
      data-role={byteRole(bytes[index])}
      data-unread={index >= cursor || undefined}
      data-current={index === cursor - 1 || undefined}
      onClick={() => {
        setSelected(selected === index ? null : index);
      }}
    >
      <ByteBits byte={bytes[index]} />
      <span className={styles.streamHex}>{hexByte(bytes[index])}</span>
      <span className={styles.streamRole}>{ROLE_LABELS[byteRole(bytes[index])]}</span>
    </button>
  );

  return (
    <UnicodePanel title="UTF-8 READER">
      <div className={styles.bay}>
        <div className={panel.sectionHead}>
          <span>INPUT · TEXT</span>
          <span>{bytes.length} BYTES</span>
        </div>
        <label className={panel.inputLabel} htmlFor={`${id}-text`}>
          TYPE TO LOAD BYTES
        </label>
        <input
          id={`${id}-text`}
          className={styles.charInput}
          value={text}
          onChange={(event) => {
            if (composing.current) setText(event.target.value);
            else load(event.target.value);
          }}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={(event) => {
            composing.current = false;
            load(event.currentTarget.value);
          }}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
        />
        <div className={clsx(panel.presetRow, styles.choiceRow)}>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                load(preset);
              }}
            >
              {preset}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              load(text);
            }}
          >
            RESET
          </button>
        </div>
      </div>

      <div className={styles.bay}>
        <div className={panel.sectionHead}>
          <span>BYTE STREAM</span>
          <span>
            READ {cursor - start} / {bytes.length - start}
          </span>
        </div>
        <ol className={styles.stream} aria-label="Bytes grouped by decoded character">
          {Array.from({ length: start }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a byte is its position in the stream
            <li key={`skipped-${index}`} className={styles.run} data-skipped>
              <span className={styles.runGlyph}>—</span>
              <span className={styles.runBytes}>{byteButton(index)}</span>
            </li>
          ))}
          {runs.map((run) => {
            const done = run.end <= cursor;
            const face = codePointFace(run.codePoint ?? REPLACEMENT_CHARACTER);
            return (
              <li
                key={run.start}
                className={styles.run}
                data-broken={(done && run.codePoint === null) || undefined}
              >
                <span className={clsx(styles.runGlyph, face.isLabel && styles.runLabel)}>
                  {done ? face.text : " "}
                </span>
                <span className={styles.runBytes}>
                  {Array.from({ length: run.end - run.start }, (_, offset) =>
                    byteButton(run.start + offset),
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        <div className={clsx(panel.presetRow, styles.choiceRow)}>
          <button type="button" disabled={cursor <= start} onClick={() => step(start)}>
            ⏮ START
          </button>
          <button type="button" disabled={cursor <= start} onClick={() => step(cursor - 1)}>
            ◀ BACK
          </button>
          <button type="button" disabled={cursor >= bytes.length} onClick={() => step(cursor + 1)}>
            NEXT BYTE ▶
          </button>
          <button
            type="button"
            disabled={cursor >= bytes.length}
            onClick={() => step(bytes.length)}
          >
            READ ALL ⏭
          </button>
        </div>
        <dl className={styles.readerFacts}>
          <div>
            <dt>THIS BYTE</dt>
            <dd>{cursor > start ? ROLE_LABELS[byteRole(bytes[cursor - 1])] : "—"}</dd>
          </div>
          <div>
            <dt>IN CHARACTER</dt>
            <dd>
              {currentRun
                ? `${cursor - currentRun.start} OF ${currentRun.end - currentRun.start}`
                : "—"}
            </dd>
          </div>
          <div className={styles.readerResult}>
            <dt>RESULT</dt>
            <dd>{runResult(currentRun, cursor)}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.bay}>
        <div className={panel.sectionHead}>
          <span>{selected === null ? "SELECTED BYTE · NONE" : `SELECTED BYTE · ${selected}`}</span>
          {selectedByte !== undefined && <span>{hexByte(selectedByte)}</span>}
        </div>
        {selected !== null && selectedByte !== undefined ? (
          <>
            <fieldset className={styles.flipBits}>
              <legend className="sr-only">Bits of the selected byte</legend>
              {Array.from(bitString(selectedByte, 8)).map((bit, position) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: a bit is its position in the byte
                  key={position}
                  type="button"
                  className={styles.bit}
                  aria-label={`Bit ${7 - position}`}
                  aria-pressed={bit === "1"}
                  onClick={() => {
                    const next = [...bytes];
                    next[selected] = selectedByte ^ (1 << (7 - position));
                    edit(next, Math.min(start, selected), selected);
                  }}
                >
                  {bit}
                </button>
              ))}
            </fieldset>
            <div className={clsx(panel.presetRow, styles.choiceRow)}>
              <button
                type="button"
                onClick={() => {
                  edit(bytes, selected, selected);
                }}
              >
                READ FROM HERE
              </button>
              <button
                type="button"
                onClick={() => {
                  edit(
                    bytes.filter((_, index) => index !== selected),
                    Math.min(start, selected),
                    null,
                  );
                }}
              >
                DELETE BYTE
              </button>
            </div>
          </>
        ) : (
          <p className={styles.empty}>NO BYTE SELECTED</p>
        )}
      </div>

      <div className={styles.bay}>
        <div className={panel.sectionHead}>
          <span>DECODED</span>
          <span>{decoded.length} CODE POINTS</span>
        </div>
        <output className={styles.result}>
          {decoded.length > 0 ? String.fromCodePoint(...decoded) : " "}
        </output>
      </div>
    </UnicodePanel>
  );
}
