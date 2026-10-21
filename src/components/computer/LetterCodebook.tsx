import clsx from "clsx";
import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { flipSwitch, patternIndex } from "src/lib/codebook";
import {
  LETTER_STATES,
  LETTER_SWITCHES,
  letterPattern,
  SEED_LETTER_CODEBOOK,
} from "src/lib/letterCodebook";
import typer from "./AsciiTyper.module.css";
import panel from "./ByteExplorer.module.css";
import { DemoMachine, SwitchRow } from "./CodebookParts";
import styles from "./LetterCodebook.module.css";
import { LetterCodebookGrid } from "./LetterCodebookGrid";

/** Five switches read through a fixed alphabet, independent of the letter typer. */
export function LetterCodebook() {
  const [pattern, setPattern] = useState("00000");
  const { soundEnabled, toggleSound, playButton } = usePanelSound();
  const active = patternIndex(pattern);
  const char = SEED_LETTER_CODEBOOK[active];

  return (
    <DemoMachine
      title="LETTER CODEBOOK"
      label="Five switches and a fixed codebook of characters"
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
            <div className={clsx(panel.screen, styles.means)} aria-live="polite">
              <div className={panel.screenTop}>
                <span>MEANS</span>
                <span>{pattern}</span>
              </div>
              <div className={clsx(styles.glyph, char === " " && styles.word)}>
                {char === " " ? "SPACE" : char}
              </div>
            </div>
          </div>
        </div>
        <div className={typer.bay}>
          <div className={panel.sectionHead}>
            <span>CODEBOOK · {LETTER_STATES} CHARACTERS</span>
          </div>
          <LetterCodebookGrid
            codebook={SEED_LETTER_CODEBOOK}
            active={active}
            onShow={(state) => setPattern(letterPattern(state))}
          />
        </div>
      </div>
    </DemoMachine>
  );
}
