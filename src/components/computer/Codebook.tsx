import clsx from "clsx";
import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { flipSwitch, lookup, SEED_CODEBOOK, withMeaning } from "src/lib/codebook";
import panel from "./ByteExplorer.module.css";
import styles from "./Codebook.module.css";
import { CodebookTable, DemoMachine, MiniButton, PhraseScreen, SwitchRow } from "./CodebookParts";

/** Two switches and the codebook that gives each state a meaning. Usable in MDX articles. */
export function Codebook() {
  const [pattern, setPattern] = useState("00");
  const [codebook, setCodebook] = useState<string[]>([...SEED_CODEBOOK]);
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();

  return (
    <DemoMachine
      title="CODEBOOK"
      label="Two switches and a codebook"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
    >
      <div className={styles.body}>
        <div className={styles.plate}>
          <div className={panel.sectionHead}>
            <span>SWITCHES</span>
          </div>
          <SwitchRow
            pattern={pattern}
            onFlip={(position) => {
              setPattern(flipSwitch(pattern, position));
              playButton();
            }}
            label="Switches"
            large
          />
          <div aria-live="polite">
            <PhraseScreen caption="MEANS" pattern={pattern} meaning={lookup(codebook, pattern)} />
          </div>
        </div>
        <div className={styles.plate}>
          <div className={clsx(panel.sectionHead, styles.head)}>
            <span>CODEBOOK</span>
            <MiniButton
              onClick={() => {
                setCodebook([...SEED_CODEBOOK]);
                playSwitch();
              }}
              label="Reset the codebook to its four starting phrases"
            >
              RESET
            </MiniButton>
          </div>
          <CodebookTable
            codebook={codebook}
            active={pattern}
            onEdit={(state, meaning) => setCodebook(withMeaning(codebook, state, meaning))}
            label="Codebook"
          />
        </div>
      </div>
    </DemoMachine>
  );
}
