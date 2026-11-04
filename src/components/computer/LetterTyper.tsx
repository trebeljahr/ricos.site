import clsx from "clsx";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useDemoState } from "src/hooks/useDemoState";
import { strokeOf, usePanelSound } from "src/hooks/usePanelSound";
import { useRetype } from "src/hooks/useRetype";
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
import codebookParts from "./Codebook.module.css";
import { DemoMachine } from "./CodebookParts";
import { DisplayStatus } from "./DisplayStatus";
import { fitHeight } from "./fitHeight";
import { LetterCodebookGrid } from "./LetterCodebookGrid";

const presets = ["HELLO", "HOW ARE YOU?", "SOS"];
const initialText = "HELLO";

type Notice = Pick<LetterFilterResult, "rejected" | "folded" | "overflow">;
type View = "bits" | "codebook";

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
  const [view, setView] = useState<View>("bits");
  const input = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null);
  const composing = useRef(false);
  const fitted = useRef<string | null>(null);
  const id = useId();
  const { soundEnabled, toggleSound, playButton, playSwitch, playType, playRefuse } =
    usePanelSound();
  const { retype, cancelRetype } = useRetype((next, struck) => {
    setText(next);
    setLatest(next ? next.length - 1 : null);
    playType(strokeOf(struck));
  });

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

  function note({ rejected, folded, overflow }: Notice) {
    setNotice(rejected.length || folded.length || overflow ? { rejected, folded, overflow } : null);
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
    cancelRetype();
    if (result.rejected.length > 0 || result.overflow > 0) playRefuse();
    else if (result.text.length !== text.length) {
      playType(strokeOf(result.text.length > text.length ? result.text[position - 1] : null));
    }
    setText(result.text);
    setLatest(result.text ? Math.max(0, position - 1) : null);
    note(result);
  }

  function replaceText(next: string) {
    const result = filterLetters(next, codebook);
    note(result);
    playButton();
    retype(text, result.text);
  }

  function chooseView(next: View) {
    setView(next);
    playSwitch();
  }

  const rejected = notice?.rejected ?? [];
  const folded = notice?.folded ?? [];
  const latestIndex = latest ?? readings.length - 1;
  const typedStates = new Set(readings.map((reading) => reading.state));

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
          <label className={clsx(panel.inputLabel, typer.firstLabel)} htmlFor={`${id}-text`}>
            TYPE HERE
          </label>
          <div className={typer.display}>
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
            <DisplayStatus
              count={readings.length}
              limit={LETTER_TYPER_LIMIT}
              alert={rejected.length > 0 || (notice?.overflow ?? 0) > 0}
              message={
                rejected.length > 0
                  ? `NOT IN CODEBOOK: ${listed(rejected)}`
                  : notice?.overflow
                    ? "FULL"
                    : folded.length > 0
                      ? `${listed(folded.map(([from]) => from))} TYPED AS ${listed(folded.map(([, to]) => to))}`
                      : null
              }
            />
          </div>
          <div className={clsx(panel.presetRow, typer.presets)}>
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={text === preset}
                onClick={() => replaceText(preset)}
              >
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
            <span>
              {view === "bits"
                ? `${encoded} × ${LETTER_SWITCHES} = ${encoded * LETTER_SWITCHES} BITS`
                : `${LETTER_STATES} CHARACTERS`}
            </span>
            <div className={codebookParts.segmented}>
              <button
                type="button"
                aria-pressed={view === "bits"}
                onClick={() => chooseView("bits")}
              >
                BITS
              </button>
              <button
                type="button"
                aria-pressed={view === "codebook"}
                onClick={() => chooseView("codebook")}
              >
                CODEBOOK
              </button>
            </div>
          </div>
          {view === "codebook" ? (
            <LetterCodebookGrid
              codebook={codebook}
              active={readings[latestIndex]?.state ?? -1}
              inText={typedStates}
            />
          ) : readings.length > 0 ? (
            <ol className={typer.tape} aria-label="Typed characters, five bits each">
              {readings.map((reading, index) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: a tile is its position in the text
                  key={index}
                  className={typer.tile}
                  data-latest={index === latestIndex || undefined}
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
