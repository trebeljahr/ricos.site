import clsx from "clsx";
import type { ReactNode } from "react";
import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  ALTERNATE_CODEBOOK,
  CONVERSATION,
  type Codebook,
  flipSwitch,
  lookup,
  SEED_CODEBOOK,
  sameMeaning,
  withMeaning,
} from "src/lib/codebook";
import panel from "./ByteExplorer.module.css";
import styles from "./Codebook.module.css";
import { CodebookTable, DemoMachine, MiniButton, PhraseScreen, SwitchRow } from "./CodebookParts";

function Person({
  name,
  sends,
  pattern,
  codebook,
  alert,
  onEdit,
  children,
}: {
  name: string;
  sends: boolean;
  pattern: string;
  codebook: Codebook;
  alert: boolean;
  onEdit: (pattern: string, meaning: string) => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.plate}>
      <div className={clsx(panel.sectionHead, styles.head)}>
        <span>{name.toUpperCase()}</span>
        {children}
      </div>
      <PhraseScreen
        caption={sends ? "SENDS" : "READS"}
        pattern={pattern}
        meaning={lookup(codebook, pattern)}
        alert={alert}
      />
      <CodebookTable
        codebook={codebook}
        active={pattern}
        onEdit={onEdit}
        label={`Codebook of ${name}`}
      />
    </div>
  );
}

/**
 * Two people, one pair of switches, and a codebook each. Person B can read the
 * switches with a second codebook: same pattern, another message. Usable in MDX articles.
 */
export function CodebookMismatch() {
  const [pattern, setPattern] = useState(CONVERSATION[0].pattern);
  const [step, setStep] = useState(0);
  const [onScript, setOnScript] = useState(true);
  const [bookOne, setBookOne] = useState<string[]>([...SEED_CODEBOOK]);
  const [bookTwo, setBookTwo] = useState<string[]>([...ALTERNATE_CODEBOOK]);
  // The demo opens on the mismatch: that is the point it sits in the chapter for.
  const [secondBook, setSecondBook] = useState(true);
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();

  const bookOfB = secondBook ? bookTwo : bookOne;
  const same = sameMeaning(bookOne, bookOfB, pattern);
  const aSends = CONVERSATION[step].speaker === "a";
  const quoted = (codebook: Codebook) => {
    const meaning = lookup(codebook, pattern);
    return meaning ? `“${meaning}”` : "nothing";
  };

  function goTo(next: number) {
    const wrapped = (next + CONVERSATION.length) % CONVERSATION.length;
    setStep(wrapped);
    setPattern(CONVERSATION[wrapped].pattern);
    setOnScript(true);
    playButton();
  }

  function chooseBook(second: boolean) {
    setSecondBook(second);
    playSwitch();
  }

  return (
    <DemoMachine
      title="TWO CODEBOOKS"
      label="Two people reading the same switches with their own codebooks"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
    >
      <div className={styles.duo}>
        <Person
          name="Person A"
          sends={aSends}
          pattern={pattern}
          codebook={bookOne}
          alert={!same}
          onEdit={(state, meaning) => setBookOne(withMeaning(bookOne, state, meaning))}
        >
          <span className={styles.headNote}>BOOK 1</span>
        </Person>
        <div className={clsx(styles.plate, styles.link)}>
          <div className={clsx(panel.sectionHead, styles.head)}>
            <span>SWITCHES</span>
          </div>
          <SwitchRow
            pattern={pattern}
            onFlip={(position) => {
              setPattern(flipSwitch(pattern, position));
              setOnScript(false);
              playButton();
            }}
            label="Switches both people look at"
            large
          />
          <div className={styles.verdict} data-same={same}>
            <b aria-hidden="true">{same ? "=" : "≠"}</b>
            <span>{same ? "SAME MESSAGE" : "DIFFERENT MESSAGE"}</span>
          </div>
          <div className={styles.script}>
            <div className={styles.steps}>
              <MiniButton onClick={() => goTo(step - 1)} label="Previous step of the conversation">
                ◀
              </MiniButton>
              <span>{onScript ? `STEP ${step + 1}/${CONVERSATION.length}` : "BY HAND"}</span>
              <MiniButton onClick={() => goTo(step + 1)} label="Next step of the conversation">
                ▶
              </MiniButton>
            </div>
            <MiniButton
              onClick={() => {
                setBookOne([...SEED_CODEBOOK]);
                setBookTwo([...ALTERNATE_CODEBOOK]);
                goTo(0);
              }}
              label="Reset both codebooks and start the conversation again"
            >
              RESET
            </MiniButton>
          </div>
        </div>
        <Person
          name="Person B"
          sends={!aSends}
          pattern={pattern}
          codebook={bookOfB}
          alert={!same}
          onEdit={(state, meaning) =>
            secondBook
              ? setBookTwo(withMeaning(bookTwo, state, meaning))
              : setBookOne(withMeaning(bookOne, state, meaning))
          }
        >
          <div className={styles.segmented}>
            <button
              type="button"
              aria-pressed={!secondBook}
              aria-label="Person B uses book 1, the same as Person A"
              onClick={() => chooseBook(false)}
            >
              BOOK 1
            </button>
            <button
              type="button"
              aria-pressed={secondBook}
              aria-label="Person B uses book 2, a different codebook"
              onClick={() => chooseBook(true)}
            >
              BOOK 2
            </button>
          </div>
        </Person>
      </div>
      <p className="sr-only" aria-live="polite">
        Switches {pattern}. Person A {aSends ? "sends" : "reads"} {quoted(bookOne)}. Person B{" "}
        {aSends ? "reads" : "sends"} {quoted(bookOfB)}. {same ? "Same" : "Different"} message.
      </p>
    </DemoMachine>
  );
}
