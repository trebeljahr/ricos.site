import clsx from "clsx";
import { type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { flipSwitch, patternIndex } from "src/lib/codebook";
import {
  assignCharacter,
  filterLetters,
  LETTER_STATES,
  LETTER_SWITCHES,
  LETTER_TYPER_LIMIT,
  type LetterFilterResult,
  letterName,
  letterPattern,
  letterReadings,
  SEED_LETTER_CODEBOOK,
  shuffled,
  typedCharacter,
} from "src/lib/letterCodebook";
import { fitHeight } from "./AsciiTyper";
import typer from "./AsciiTyper.module.css";
import panel from "./ByteExplorer.module.css";
import { DemoMachine, MiniButton, SwitchRow } from "./CodebookParts";
import styles from "./LetterCodebook.module.css";

const presets = ["HELLO", "HOW ARE YOU?", "SOS"];
const initialText = "HELLO";

type Notice = Pick<LetterFilterResult, "rejected" | "folded" | "overflow"> & {
  /** Restarts the note's flash when the same character is refused twice. */
  serial: number;
};

interface BookNote {
  char: string;
  replaced: string;
  swapped: boolean;
  serial: number;
}

/** A character inside a sentence of a note. */
function inNote(char: string): string {
  return char === " " ? "SPACE" : char;
}

function listed(chars: string[]): string {
  return `${chars.slice(0, 3).map(inNote).join(" ")}${chars.length > 3 ? " …" : ""}`;
}

/** One state of the codebook: its five bits and a field that holds its character. */
function StateField({
  state,
  char,
  inText,
  active,
  onEdit,
  onShow,
}: {
  state: number;
  char: string;
  inText: boolean;
  active: boolean;
  onEdit: (value: string) => void;
  onShow: () => void;
}) {
  // An input method builds a character in several steps; the field shows them, the codebook waits.
  const [draft, setDraft] = useState<string | null>(null);
  const composing = useRef(false);
  const bits = letterPattern(state);

  return (
    <label className={styles.state} data-lit={active ? "active" : inText ? "typed" : undefined}>
      <span className={styles.stateBits} aria-hidden="true">
        {bits}
      </span>
      <input
        className={styles.stateField}
        data-state={state}
        value={draft ?? char}
        tabIndex={active ? 0 : -1}
        onFocus={(event) => {
          event.target.select();
          onShow();
        }}
        onChange={(event) => {
          if (composing.current) setDraft(event.target.value);
          else onEdit(event.target.value);
        }}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          setDraft(null);
          onEdit(event.currentTarget.value);
        }}
        aria-label={`State ${bits}: ${letterName(char)}.${inText ? " In your text." : ""}${
          active ? " On the switches." : ""
        } Type a character to put it here.`}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
      />
      {char === " " && draft === null && (
        <span className={styles.stateSpace} aria-hidden="true">
          SP
        </span>
      )}
    </label>
  );
}

/**
 * Five switches, a codebook that gives each of their 32 states one character,
 * and a typer that writes text with it. Usable in MDX articles.
 */
export function LetterCodebook() {
  const [codebook, setCodebook] = useState<string[]>([...SEED_LETTER_CODEBOOK]);
  const [text, setText] = useState(initialText);
  // The state on the switches: the character typed last, until a switch or a field moves it.
  const [pattern, setPattern] = useState(() =>
    letterPattern(SEED_LETTER_CODEBOOK.indexOf(initialText.slice(-1))),
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [bookNote, setBookNote] = useState<BookNote | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null);
  const composing = useRef(false);
  const fitted = useRef<string | null>(null);
  const serial = useRef(0);
  const id = useId();
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();

  const readings = letterReadings(text, codebook);
  const active = patternIndex(pattern);
  const activeChar = codebook[active];
  const inText = new Set(readings.map((reading) => reading.state));
  const encoded = readings.filter((reading) => reading.state !== null).length;

  // A refused character leaves React rewriting the field, which throws the
  // caret to the end. Put it back, then let the LCD grow with its text.
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

  function note({ rejected, folded, overflow }: Omit<Notice, "serial">) {
    serial.current += 1;
    setNotice(
      rejected.length || folded.length || overflow
        ? { rejected, folded, overflow, serial: serial.current }
        : null,
    );
  }

  /** Puts the last character of `typed` on the switches. */
  function showLast(typed: string) {
    const last = letterReadings(typed, codebook).at(-1);
    if (last?.bits) setPattern(last.bits);
  }

  function commit(element: HTMLTextAreaElement) {
    const { value, selectionStart } = element;
    const result = filterLetters(value, codebook);
    // Some browsers report the end of a composition twice; the second report changes nothing.
    if (value === text && result.text === text) return;
    const before = filterLetters(
      value.slice(0, selectionStart),
      codebook,
      Number.POSITIVE_INFINITY,
    ).text;
    const position = Math.min(before.length, result.text.length);
    if (result.text !== value) caret.current = position;
    setText(result.text);
    showLast(result.text.slice(0, position));
    note(result);
  }

  function replaceText(next: string) {
    const result = filterLetters(next, codebook);
    setText(result.text);
    showLast(result.text);
    note(result);
    playButton();
  }

  function typeActive() {
    const full = readings.length >= LETTER_TYPER_LIMIT;
    if (!full) setText(text + activeChar);
    note({ rejected: [], folded: [], overflow: full ? 1 : 0 });
    playButton();
  }

  function edit(state: number, value: string) {
    const char = typedCharacter(codebook[state], value);
    if (char === null) return;
    const result = assignCharacter(codebook, state, char);
    serial.current += 1;
    setCodebook(result.codebook);
    // What the text field refused a moment ago may have a state now.
    setNotice(null);
    setBookNote({
      char,
      replaced: result.replaced,
      swapped: result.swapped,
      serial: serial.current,
    });
  }

  function replaceCodebook(next: string[]) {
    setCodebook(next);
    setNotice(null);
    setBookNote(null);
    playSwitch();
  }

  function moveInBook(event: KeyboardEvent<HTMLFieldSetElement>) {
    const field = (event.target as HTMLElement).closest<HTMLElement>("[data-state]");
    if (!field || event.nativeEvent.isComposing) return;
    const state = Number(field.dataset.state);
    // The column count changes with the panel's width, so read it off the layout:
    // it is the position of the first field that sits on the second row.
    const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-state]"));
    const top = (element: HTMLElement) => element.getBoundingClientRect().top;
    const wrapAt = fields.findIndex((other) => top(other) !== top(fields[0]));
    const columns = wrapAt === -1 ? fields.length : wrapAt;
    const steps: Record<string, number> = {
      ArrowLeft: state - 1,
      ArrowRight: state + 1,
      ArrowUp: state - columns,
      ArrowDown: state + columns,
      Home: 0,
      End: LETTER_STATES - 1,
    };
    const target = steps[event.key];
    if (target === undefined) return;
    event.preventDefault();
    fields[target]?.focus();
  }

  const rejected = notice?.rejected ?? [];
  const folded = notice?.folded ?? [];

  return (
    <DemoMachine
      title="LETTER CODEBOOK"
      label="Five switches and a codebook of characters"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={typer.typer}
    >
      <div className={typer.deck}>
        <div className={typer.bay}>
          <div className={panel.sectionHead}>
            <span>{LETTER_SWITCHES} SWITCHES</span>
            <span>
              2<sup>{LETTER_SWITCHES}</sup> = {LETTER_STATES} STATES
            </span>
          </div>
          <div className={styles.console}>
            <SwitchRow
              pattern={pattern}
              onFlip={(position) => {
                setPattern(flipSwitch(pattern, position));
                playButton();
              }}
              label="Switches"
              large
            />
            <div className={styles.readout}>
              <div className={clsx(panel.screen, styles.means)} aria-live="polite">
                <div className={panel.screenTop}>
                  <span>MEANS</span>
                  <span>{pattern}</span>
                </div>
                <div className={clsx(styles.glyph, activeChar === " " && styles.word)}>
                  {inNote(activeChar)}
                </div>
              </div>
              <button
                type="button"
                className={styles.typeKey}
                onClick={typeActive}
                aria-label={`Type ${letterName(activeChar)} into the text`}
              >
                TYPE IT
              </button>
            </div>
          </div>
        </div>

        <div className={typer.bay}>
          <div className={clsx(panel.sectionHead, typer.wrappingHead)}>
            <span>CODEBOOK · {LETTER_STATES} CHARACTERS</span>
            <div className={styles.keys}>
              <MiniButton
                onClick={() => replaceCodebook(shuffled(codebook))}
                label="Shuffle the codebook: the same characters on other states"
              >
                SHUFFLE
              </MiniButton>
              <MiniButton
                onClick={() => replaceCodebook([...SEED_LETTER_CODEBOOK])}
                label="Reset the codebook to the alphabet in order"
              >
                RESET
              </MiniButton>
            </div>
          </div>
          <fieldset
            className={styles.states}
            aria-label={`Codebook: one character for each of the ${LETTER_STATES} states. Arrow keys move between them.`}
            onKeyDown={moveInBook}
          >
            {codebook.map((char, state) => (
              <StateField
                // biome-ignore lint/suspicious/noArrayIndexKey: a field is its state, whatever character it holds
                key={state}
                state={state}
                char={char}
                inText={inText.has(state)}
                active={state === active}
                onEdit={(value) => edit(state, value)}
                onShow={() => setPattern(letterPattern(state))}
              />
            ))}
          </fieldset>
          <div className={typer.notes}>
            <p hidden={bookNote !== null}>Type a character over another to change the codebook.</p>
            <p role="status">
              {bookNote && (
                <span key={bookNote.serial} className={styles.flash}>
                  {bookNote.swapped ? (
                    <>
                      <b>{inNote(bookNote.char)}</b> and <b>{inNote(bookNote.replaced)}</b> traded
                      states.
                    </>
                  ) : (
                    <>
                      <b>{inNote(bookNote.char)}</b> took the state of{" "}
                      <b>{inNote(bookNote.replaced)}</b>. <b>{inNote(bookNote.replaced)}</b> has no
                      state now.
                    </>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className={typer.bay}>
          <div className={panel.sectionHead}>
            <span>TEXT</span>
            <span>
              {readings.length} / {LETTER_TYPER_LIMIT}
            </span>
          </div>
          <label className={panel.inputLabel} htmlFor={`${id}-text`}>
            TYPE HERE
          </label>
          <textarea
            ref={input}
            id={`${id}-text`}
            className={clsx(panel.bitInput, typer.textInput)}
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
            autoCapitalize="characters"
            autoCorrect="off"
            aria-describedby={`${id}-help`}
          />
          <div className={typer.notes}>
            <p id={`${id}-help`} hidden={notice !== null}>
              Every character you type becomes five bits.
            </p>
            <p
              className={clsx((rejected.length > 0 || notice?.overflow) && typer.refusal)}
              role="status"
            >
              {notice && (
                <span key={notice.serial}>
                  {rejected.length > 0 ? (
                    <>
                      <b>{listed(rejected)}</b> {rejected.length === 1 ? "is" : "are"} not in this
                      codebook. All {LETTER_STATES} states are taken. To type{" "}
                      {rejected.length === 1 ? "it" : "one"}, put it in the codebook in place of
                      another character.
                    </>
                  ) : notice.overflow > 0 ? (
                    `This typer holds ${LETTER_TYPER_LIMIT} characters. The rest did not fit.`
                  ) : (
                    <>
                      <b>{listed(folded.map(([from]) => from))}</b>{" "}
                      {folded.length === 1 ? "is" : "are"} not in this codebook, so{" "}
                      {folded.length === 1 ? "it was" : "they were"} typed as{" "}
                      <b>{listed(folded.map(([, to]) => to))}</b>.
                    </>
                  )}
                </span>
              )}
            </p>
          </div>
          <div className={clsx(panel.presetRow, typer.presets)}>
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

        <div className={typer.bay}>
          <div className={clsx(panel.sectionHead, typer.wrappingHead)}>
            <span>BITS · {LETTER_SWITCHES} PER CHARACTER</span>
            <span>
              {encoded} × {LETTER_SWITCHES} = {encoded * LETTER_SWITCHES} BITS
            </span>
          </div>
          {readings.length > 0 ? (
            <ol className={typer.tape} aria-label="Typed characters, five bits each">
              {readings.map((reading, index) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: a tile is its position in the text
                  key={index}
                  className={clsx(
                    typer.tile,
                    reading.state === null && styles.lost,
                    reading.state === active && styles.shown,
                  )}
                >
                  <span
                    className={clsx(
                      typer.tileGlyph,
                      reading.label.length > 1 && typer.abbreviation,
                    )}
                    aria-hidden="true"
                  >
                    {reading.label}
                  </span>
                  <span className="sr-only">{letterName(reading.char)}</span>
                  <span className={typer.tileBits}>{reading.bits ?? "NO STATE"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={typer.empty}>NO CHARACTERS YET</p>
          )}
        </div>
      </div>
    </DemoMachine>
  );
}
