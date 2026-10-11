import clsx from "clsx";
import {
  type KeyboardEvent,
  type SyntheticEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { ASCII_TABLE, ASCII_TYPER_LIMIT, asciiReadings, filterAscii } from "src/lib/asciiTable";
import styles from "./AsciiTyper.module.css";
import panel from "./ByteExplorer.module.css";

const presets = ["HELLO", "hello", "SOS", "123"];
const initialText = "Hello";

interface Notice {
  rejected: string[];
  overflow: number;
  /** Restarts the note's flash when the same character is refused twice. */
  serial: number;
}

/** The slot a pointer or focus event landed on, if any. */
function slotOf(event: SyntheticEvent): number | null {
  const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-code]");
  return cell ? Number(cell.dataset.code) : null;
}

/** Sizes the field to its text. False while it has no layout, as inside a closed callout. */
function fitHeight(element: HTMLTextAreaElement): boolean {
  element.style.height = "auto";
  if (element.scrollHeight === 0) return false;
  const borders = element.offsetHeight - element.clientHeight;
  element.style.height = `${element.scrollHeight + borders}px`;
  return true;
}

/** Text in, seven bits per character out, above the whole ASCII table. Usable in MDX articles. */
export function AsciiTyper() {
  const [text, setText] = useState(initialText);
  // Index of the character typed last, which is not always the last one in the text.
  const [latest, setLatest] = useState<number | null>(initialText.length - 1);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [inspected, setInspected] = useState<number | null>(null);
  const [tabStop, setTabStop] = useState<number | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null);
  const composing = useRef(false);
  const fitted = useRef<string | null>(null);
  const serial = useRef(0);
  const id = useId();
  const { soundEnabled, toggleSound, playButton } = usePanelSound();

  const readings = asciiReadings(text);
  const latestCode = latest === null ? null : (readings[latest]?.code ?? null);
  const typed = new Set(readings.map((reading) => reading.code));
  const shownCode = inspected ?? latestCode;
  const shown = shownCode === null ? null : ASCII_TABLE[shownCode];

  // A refused character leaves React rewriting the field, which throws the
  // caret to the end. Put it back, then let the LCD grow with its text: a line
  // feed really does start a new line.
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    if (caret.current !== null) {
      element.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
    if (fitted.current !== text && fitHeight(element)) fitted.current = text;
  });

  useEffect(() => {
    const refit = () => {
      if (input.current) fitHeight(input.current);
    };
    window.addEventListener("resize", refit);
    return () => window.removeEventListener("resize", refit);
  }, []);

  function note(rejected: string[], overflow: number) {
    serial.current += 1;
    setNotice(rejected.length || overflow ? { rejected, overflow, serial: serial.current } : null);
  }

  function commit(element: HTMLTextAreaElement) {
    const { value, selectionStart } = element;
    const result = filterAscii(value);
    // Some browsers report the end of a composition twice; the second report changes nothing.
    if (value === text && result.text === text) return;
    const before = filterAscii(value.slice(0, selectionStart), Number.POSITIVE_INFINITY).text;
    const position = Math.min(before.length, result.text.length);
    if (result.text !== value) caret.current = position;
    setText(result.text);
    setLatest(result.text ? Math.max(0, position - 1) : null);
    note(result.rejected, result.overflow);
  }

  function replaceText(next: string) {
    setText(next);
    setLatest(next ? next.length - 1 : null);
    note([], 0);
    playButton();
  }

  function moveInTable(event: KeyboardEvent<HTMLFieldSetElement>) {
    const code = slotOf(event);
    if (code === null) return;
    // The column count changes with the panel's width, so read it off the layout:
    // it is the position of the first slot that sits on the second row.
    const cells = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-code]"));
    const wrapAt = cells.findIndex((cell) => cell.offsetTop !== cells[0].offsetTop);
    const columns = wrapAt === -1 ? cells.length : wrapAt;
    const steps: Record<string, number> = {
      ArrowLeft: code - 1,
      ArrowRight: code + 1,
      ArrowUp: code - columns,
      ArrowDown: code + columns,
      Home: 0,
      End: 127,
    };
    const target = steps[event.key];
    if (target === undefined) return;
    event.preventDefault();
    event.currentTarget.querySelector<HTMLElement>(`[data-code="${target}"]`)?.focus();
  }

  const rejected = notice?.rejected ?? [];

  return (
    <section className={clsx("not-prose", panel.machine, styles.typer)} aria-label="ASCII typer">
      <div className={panel.screw} aria-hidden="true" />
      <div className={clsx(panel.screw, panel.screwRight)} aria-hidden="true" />
      <div className={panel.nameplate}>
        <div>
          <strong>ASCII TYPER</strong>
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

      <div className={styles.deck}>
        <div className={styles.bay}>
          <div className={panel.sectionHead}>
            <span>INPUT · TEXT</span>
            <span>
              {readings.length} / {ASCII_TYPER_LIMIT}
            </span>
          </div>
          <label className={panel.inputLabel} htmlFor={`${id}-text`}>
            TYPE HERE
          </label>
          <textarea
            ref={input}
            id={`${id}-text`}
            className={clsx(panel.bitInput, styles.textInput)}
            rows={1}
            value={text}
            onChange={(event) => {
              // An input method builds a character in several steps; judge the result, not the steps.
              if (composing.current) setText(event.target.value);
              else commit(event.target);
            }}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              commit(event.currentTarget);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            aria-describedby={`${id}-help`}
          />
          <div className={styles.notes}>
            <p id={`${id}-help`} hidden={notice !== null}>
              Press Enter to add a line feed (LF).
            </p>
            <p className={styles.refusal} role="status">
              {notice && (
                <span key={notice.serial}>
                  {rejected.length > 0 ? (
                    <>
                      <b>
                        {rejected.slice(0, 3).join(" ")}
                        {rejected.length > 3 && " …"}
                      </b>{" "}
                      {rejected.length === 1 ? "is" : "are"} not in ASCII. ASCII has only 128 slots.
                      The aside on UTF-8 covers the rest.
                    </>
                  ) : (
                    `This typer holds ${ASCII_TYPER_LIMIT} characters. The rest did not fit.`
                  )}
                </span>
              )}
            </p>
          </div>
          <div className={clsx(panel.presetRow, styles.presets)}>
            {presets.map((preset) => (
              <button key={preset} type="button" onClick={() => replaceText(preset)}>
                {preset}
              </button>
            ))}
            <button type="button" onClick={() => replaceText("")}>
              CLEAR
            </button>
          </div>
        </div>

        <div className={styles.bay}>
          <div className={panel.sectionHead}>
            <span>BITS · 7 PER CHARACTER</span>
          </div>
          {readings.length > 0 ? (
            <ol className={styles.tape} aria-label="Typed characters, seven bits each">
              {readings.map((reading, index) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: a tile is its position in the text
                  key={index}
                  className={styles.tile}
                  data-latest={index === latest || undefined}
                >
                  <span
                    className={clsx(
                      styles.tileGlyph,
                      reading.label.length > 1 && styles.abbreviation,
                    )}
                    aria-hidden="true"
                  >
                    {reading.label}
                  </span>
                  <span className="sr-only">{reading.name}</span>
                  <span className={styles.tileBits}>{reading.bits}</span>
                  <span className={styles.tileCodes}>
                    <span>HEX</span>
                    <span>{reading.hex}</span>
                    <span>DEC</span>
                    <span>{reading.code}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.empty}>NO CHARACTERS YET</p>
          )}
        </div>

        <div className={styles.bay}>
          <div className={clsx(panel.sectionHead, styles.wrappingHead)}>
            <span>ASCII TABLE · 128 SLOTS</span>
            <span>POINT AT A SLOT TO READ IT</span>
          </div>
          <div className={clsx(panel.screen, styles.detail)}>
            {shown ? (
              <>
                <div className={panel.screenTop}>
                  <span>{shown.name}</span>
                  <span>{shown.char === null ? "CONTROL" : "PRINTABLE"}</span>
                </div>
                <div className={styles.detailBody}>
                  <strong
                    className={clsx(
                      styles.detailGlyph,
                      shown.label.length > 1 && styles.abbreviation,
                    )}
                  >
                    {shown.label}
                  </strong>
                  <dl className={styles.facts}>
                    <div>
                      <dt>DECIMAL</dt>
                      <dd>{shown.code}</dd>
                    </div>
                    <div>
                      <dt>HEX</dt>
                      <dd>{shown.hex}</dd>
                    </div>
                    <div>
                      <dt>7 BITS</dt>
                      <dd>{shown.bits}</dd>
                    </div>
                  </dl>
                </div>
              </>
            ) : (
              <div className={styles.detailEmpty}>NO SLOT SELECTED</div>
            )}
          </div>
          <fieldset
            className={styles.table}
            aria-label="ASCII table. Arrow keys move between the 128 slots."
            onMouseOver={(event) => {
              const code = slotOf(event);
              if (code !== null) setInspected(code);
            }}
            onMouseLeave={(event) => {
              const active = document.activeElement;
              const focused =
                active instanceof HTMLElement && event.currentTarget.contains(active)
                  ? Number(active.dataset.code)
                  : null;
              setInspected(focused);
            }}
            onFocus={(event) => {
              const code = slotOf(event);
              setInspected(code);
              setTabStop(code);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setInspected(null);
            }}
            onKeyDown={moveInTable}
          >
            {ASCII_TABLE.map((entry) => (
              <button
                key={entry.code}
                type="button"
                className={clsx(styles.cell, entry.char === null && styles.control)}
                data-code={entry.code}
                data-lit={
                  entry.code === latestCode ? "latest" : typed.has(entry.code) ? "typed" : undefined
                }
                tabIndex={entry.code === (tabStop ?? latestCode ?? 0) ? 0 : -1}
                aria-label={`${entry.code}: ${entry.name}${
                  entry.char === null ? ", control character" : ""
                }. Bits ${entry.bits}, hex ${entry.hex}.${typed.has(entry.code) ? " In your text." : ""}`}
                // Not every tap or assistive click arrives with a hover or a focus.
                onClick={() => setInspected(entry.code)}
              >
                <span className={styles.cellCode}>{entry.code}</span>
                <span className={styles.cellLabel}>{entry.label}</span>
              </button>
            ))}
          </fieldset>
        </div>
      </div>
    </section>
  );
}
