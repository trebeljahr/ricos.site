import clsx from "clsx";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useDemoState } from "src/hooks/useDemoState";
import { strokeOf, usePanelSound } from "src/hooks/usePanelSound";
import { useRetype } from "src/hooks/useRetype";
import { ASCII_TYPER_LIMIT, asciiReadings, filterAscii } from "src/lib/asciiTable";
import styles from "./AsciiTyper.module.css";
import panel from "./ByteExplorer.module.css";
import { DisplayStatus } from "./DisplayStatus";
import { fitHeight } from "./fitHeight";

/** The last one is a real terminal command: red text, back to normal, ring the bell. */
const presets = [
  { label: "HELLO", text: "HELLO" },
  { label: "hello", text: "hello" },
  { label: "123", text: "123" },
  { label: "\\o/ <3 ~^_^~", text: "\\o/ <3 ~^_^~" },
  { label: "#!/bin/sh", text: "#!/bin/sh" },
  { label: "ESC[31mRED", text: "\u001b[31mRED\u001b[0m\u0007" },
];
const initialText = "Hello";

interface Notice {
  rejected: string[];
  overflow: number;
}

/** Text in, seven bits per character out. Usable in MDX articles. */
export function AsciiTyper() {
  const [text, setText] = useDemoState("ascii-typer:text", initialText);
  // Index of the character typed last, which is not always the last one in the text.
  const [latest, setLatest] = useState<number | null>(initialText.length - 1);
  const [notice, setNotice] = useState<Notice | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null);
  const composing = useRef(false);
  const fitted = useRef<string | null>(null);
  const id = useId();
  const { soundEnabled, toggleSound, playButton, playType, playRefuse } = usePanelSound();
  const { retype, cancelRetype } = useRetype((next, struck) => {
    setText(next);
    setLatest(next ? next.length - 1 : null);
    playType(strokeOf(struck));
  });

  const readings = asciiReadings(text);

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
    setNotice(rejected.length || overflow ? { rejected, overflow } : null);
  }

  function commit(element: HTMLTextAreaElement) {
    const { value, selectionStart } = element;
    const result = filterAscii(value);
    // Some browsers report the end of a composition twice; the second report changes nothing.
    if (value === text && result.text === text) return;
    const before = filterAscii(value.slice(0, selectionStart), Number.POSITIVE_INFINITY).text;
    const position = Math.min(before.length, result.text.length);
    if (result.text !== value) caret.current = position;
    cancelRetype();
    if (result.rejected.length > 0 || result.overflow > 0) playRefuse();
    else if (result.text.length !== text.length) {
      playType(strokeOf(result.text.length > text.length ? result.text[position - 1] : null));
    }
    setText(result.text);
    setLatest(result.text ? Math.max(0, position - 1) : null);
    note(result.rejected, result.overflow);
  }

  function replaceText(next: string) {
    note([], 0);
    playButton();
    retype(text, next);
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
          <label className={clsx(panel.inputLabel, styles.firstLabel)} htmlFor={`${id}-text`}>
            TYPE HERE
          </label>
          <div className={styles.display}>
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
            />
            <DisplayStatus
              count={readings.length}
              limit={ASCII_TYPER_LIMIT}
              message={
                rejected.length > 0
                  ? `NOT IN ASCII: ${rejected.slice(0, 3).join(" ")}${rejected.length > 3 ? " …" : ""}`
                  : notice
                    ? "FULL"
                    : null
              }
            />
          </div>
          <div className={clsx(panel.presetRow, styles.presets)}>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                aria-pressed={text === preset.text}
                onClick={() => replaceText(preset.text)}
              >
                {preset.label}
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
      </div>
    </section>
  );
}
