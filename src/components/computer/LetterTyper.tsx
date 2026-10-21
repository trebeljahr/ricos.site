import clsx from "clsx";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useDemoState } from "src/hooks/useDemoState";
import { usePanelSound } from "src/hooks/usePanelSound";
import { patternIndex } from "src/lib/codebook";
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
import typer from "./AsciiTyper.module.css";
import panel from "./ByteExplorer.module.css";
import { DemoMachine, MiniButton } from "./CodebookParts";
import { fitHeight } from "./fitHeight";
import styles from "./LetterCodebook.module.css";
import { LetterCodebookGrid } from "./LetterCodebookGrid";

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

/**
 * An editable codebook and a typer that writes five bits per character.
 * Usable independently of the fixed letter-codebook demo.
 */
export function LetterTyper() {
  const [codebook, setCodebook] = useDemoState("letter-codebook:letters", [
    ...SEED_LETTER_CODEBOOK,
  ]);
  const [text, setText] = useDemoState("letter-codebook:text", initialText);
  // Highlight the character typed last, or the codebook field being inspected.
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

  /** Highlights the last character of `typed` in the codebook. */
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

  const rejected = notice?.rejected ?? [];
  const folded = notice?.folded ?? [];

  return (
    <DemoMachine
      title="LETTER TYPER"
      label="Letter typer with an editable codebook"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={typer.typer}
    >
      <div className={typer.deck}>
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
          <LetterCodebookGrid
            codebook={codebook}
            active={active}
            inText={inText}
            onEdit={edit}
            onShow={(state) => setPattern(letterPattern(state))}
          />
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
