import clsx from "clsx";
import type { CSSProperties } from "react";
import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  addSwitch,
  allPatterns,
  flipSwitch,
  formatPattern,
  MAX_SWITCHES,
  MIN_SWITCHES,
  patternIndex,
  removeSwitch,
  stateCount,
} from "src/lib/codebook";
import panel from "./ByteExplorer.module.css";
import styles from "./Codebook.module.css";
import { DemoMachine, MiniButton, SwitchRow } from "./CodebookParts";

// Up to here every state fits as readable text; beyond it they become cells.
const LIST_UP_TO = 4;

/** One to eight switches and every state they can be in. Usable in MDX articles. */
export function SwitchStates() {
  const [pattern, setPattern] = useState("0");
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
  const switches = pattern.length;
  const count = stateCount(switches);
  const value = patternIndex(pattern);
  const patterns = allPatterns(switches);

  function resize(next: string) {
    setPattern(next);
    playSwitch();
  }

  function step(direction: -1 | 1) {
    setPattern((current) => {
      const next = Math.max(
        0,
        Math.min(stateCount(current.length) - 1, patternIndex(current) + direction),
      );
      return formatPattern(next, current.length);
    });
    playButton();
  }

  return (
    <DemoMachine
      title="SWITCH STATES"
      label="Switches and their states"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
    >
      <div className={styles.body}>
        <div className={styles.plate}>
          <div className={panel.sectionHead}>
            <span>SWITCHES</span>
            <div className={styles.stepper}>
              <MiniButton
                onClick={() => resize(removeSwitch(pattern))}
                label="Remove a switch"
                disabled={switches <= MIN_SWITCHES}
              >
                −
              </MiniButton>
              <output aria-label="Number of switches">{switches}</output>
              <MiniButton
                onClick={() => resize(addSwitch(pattern))}
                label="Add a switch"
                disabled={switches >= MAX_SWITCHES}
              >
                +
              </MiniButton>
            </div>
          </div>
          <SwitchRow
            pattern={pattern}
            onFlip={(position) => {
              setPattern((current) => flipSwitch(current, position));
              playSwitch();
            }}
            label="Switches"
            rocker
          />
          <div className={clsx(panel.screen, styles.lcd)}>
            <div className={panel.screenTop}>
              <span>PATTERN</span>
              <div className={styles.stepper}>
                <MiniButton
                  onClick={() => step(-1)}
                  label="Decrement pattern"
                  disabled={value === 0}
                >
                  −1
                </MiniButton>
                <MiniButton
                  onClick={() => step(1)}
                  label="Increment pattern"
                  disabled={value === count - 1}
                >
                  +1
                </MiniButton>
              </div>
            </div>
            <div className={styles.lcdValue} aria-live="polite" aria-atomic="true">
              {pattern}
            </div>
            <div className={styles.lcdLine}>
              {switches} {switches === 1 ? "SWITCH" : "SWITCHES"} → 2<sup>{switches}</sup> = {count}{" "}
              STATES
            </div>
          </div>
        </div>
        <div className={styles.plate}>
          <div className={panel.sectionHead}>
            <span>ALL STATES</span>
            <span>{count}</span>
          </div>
          {switches <= LIST_UP_TO ? (
            <ol
              className={styles.stateList}
              style={{ "--columns": Math.min(count, 4) } as CSSProperties}
              aria-label={`All ${count} states`}
            >
              {patterns.map((state) => (
                <li key={state} aria-current={state === pattern ? "true" : undefined}>
                  {state}
                </li>
              ))}
            </ol>
          ) : (
            <div
              className={styles.stateGrid}
              role="img"
              aria-label={`All ${count} states, one cell each. The lit cell is ${pattern}.`}
            >
              {patterns.map((state) => (
                <i key={state} data-current={state === pattern} title={state} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DemoMachine>
  );
}
