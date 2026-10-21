import clsx from "clsx";
import { type KeyboardEvent, type SyntheticEvent, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { ASCII_TABLE } from "src/lib/asciiTable";
import styles from "./AsciiTyper.module.css";
import panel from "./ByteExplorer.module.css";
import { DemoMachine } from "./CodebookParts";

/** The slot a pointer or focus event landed on, if any. */
function slotOf(event: SyntheticEvent): number | null {
  const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-code]");
  return cell ? Number(cell.dataset.code) : null;
}

/** Explore all 128 ASCII entries without a text input. */
export function AsciiTable() {
  const [inspected, setInspected] = useState(65);
  const [tabStop, setTabStop] = useState<number | null>(null);
  const { soundEnabled, toggleSound, playButton } = usePanelSound();
  const shown = ASCII_TABLE[inspected];
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

  return (
    <DemoMachine
      title="ASCII TABLE"
      label="ASCII table explorer"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={styles.typer}
    >
      <div className={styles.deck}>
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
            onFocus={(event) => {
              const code = slotOf(event);
              if (code !== null) setInspected(code);
              setTabStop(code);
            }}
            onKeyDown={moveInTable}
          >
            {ASCII_TABLE.map((entry) => (
              <button
                key={entry.code}
                type="button"
                className={clsx(styles.cell, entry.char === null && styles.control)}
                data-code={entry.code}
                data-lit={entry.code === inspected ? "latest" : undefined}
                tabIndex={entry.code === (tabStop ?? 65) ? 0 : -1}
                aria-label={`${entry.code}: ${entry.name}${
                  entry.char === null ? ", control character" : ""
                }. Bits ${entry.bits}, hex ${entry.hex}.`}
                // Not every tap or assistive click arrives with a hover or a focus.
                onClick={() => {
                  setInspected(entry.code);
                  playButton();
                }}
              >
                <span className={styles.cellCode}>{entry.code}</span>
                <span className={styles.cellLabel}>{entry.label}</span>
              </button>
            ))}
          </fieldset>
        </div>
      </div>
    </DemoMachine>
  );
}
