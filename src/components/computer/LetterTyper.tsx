import clsx from "clsx";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useDemoState } from "src/hooks/useDemoState";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  filterLetters,
  LETTER_STATES,
  LETTER_SWITCHES,
  LETTER_TYPER_LIMIT,
  type LetterFilterResult,
  letterName,
  letterReadings,
  SEED_LETTER_CODEBOOK,
} from "src/lib/letterCodebook";
import typer from "./AsciiTyper.module.css";
import panel from "./ByteExplorer.module.css";
import { DemoMachine } from "./CodebookParts";
import { fitHeight } from "./fitHeight";

const presets = ["HELLO", "HOW ARE YOU?", "SOS"];
const initialText = "HELLO";

type Notice = Pick<LetterFilterResult, "rejected" | "folded" | "overflow"> & {
  /** Restarts the note's flash when the same character is refused twice. */
  serial: number;
};

/** A character inside a sentence of a note. */
function inNote(char: string): string {
  return char === " " ? "SPACE" : char;
}

function listed(chars: string[]): string {
  return `${chars.slice(0, 3).map(inNote).join(" ")}${chars.length > 3 ? " …" : ""}`;
}

/** Text in, five bits per character out, using the fixed letter alphabet. */
export function LetterTyper() {
  const codebook = SEED_LETTER_CODEBOOK;
  const [savedText, setText] = useDemoState("letter-codebook:text", initialText);
  const [latest, setLatest] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null);
  const composing = useRef(false);
  const fitted = useRef<string | null>(null);
  const serial = useRef(0);
  const id = useId();
  const { soundEnabled, toggleSound, playButton } = usePanelSound();

  // Old drafts may contain characters from a previously edited codebook.
  // Keep composition drafts intact until the input method commits them.
  const text = composing.current ? savedText : filterLetters(savedText, codebook).text;
  const readings = letterReadings(text, codebook);
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
    setLatest(result.text ? Math.max(0, position - 1) : null);
    note(result);
  }

  function replaceText(next: string) {
    const result = filterLetters(next, codebook);
    setText(result.text);
    setLatest(result.text ? result.text.length - 1 : null);
    note(result);
    playButton();
  }

  const rejected = notice?.rejected ?? [];
  const folded = notice?.folded ?? [];

  return (
    <DemoMachine
      title="LETTER TYPER"
      label="Letter typer"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={typer.typer}
    >
      <div className={typer.deck}>
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
          />
          <div className={typer.notes}>
            <p
              className={clsx((rejected.length > 0 || notice?.overflow) && typer.refusal)}
              role="status"
            >
              {notice && (
                <span key={notice.serial}>
                  {rejected.length > 0 ? (
                    <>
                      <b>{listed(rejected)}</b> {rejected.length === 1 ? "is" : "are"} not in this
                      codebook. It holds {LETTER_STATES} characters: A–Z, space, and . , ? ! '.
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
                  className={typer.tile}
                  data-latest={index === (latest ?? readings.length - 1) || undefined}
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
