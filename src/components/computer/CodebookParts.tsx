import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { allPatterns, type Codebook } from "src/lib/codebook";
import panel from "./ByteExplorer.module.css";
import styles from "./Codebook.module.css";

const MAX_MEANING_LENGTH = 32;

/** The machine frame of ByteExplorer, sized for a small demo. */
export function DemoMachine({
  title,
  label,
  soundEnabled,
  onToggleSound,
  children,
}: {
  title: string;
  label: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  children: ReactNode;
}) {
  return (
    <section className={clsx("not-prose", panel.machine, styles.demo)} aria-label={label}>
      <div className={panel.screw} aria-hidden="true" />
      <div className={clsx(panel.screw, panel.screwRight)} aria-hidden="true" />
      <div className={clsx(panel.nameplate, styles.nameplate)}>
        <div>
          <strong>{title}</strong>
        </div>
        <button
          type="button"
          className={panel.soundButton}
          onClick={onToggleSound}
          aria-pressed={soundEnabled}
          aria-label={`Sound ${soundEnabled ? "on" : "off"}. Toggle sound.`}
        >
          <i aria-hidden="true" /> SOUND {soundEnabled ? "ON" : "OFF"}
        </button>
      </div>
      {children}
    </section>
  );
}

/** One key per switch, left to right, with a lamp above and its state below. */
export function SwitchRow({
  pattern,
  onFlip,
  label,
  large = false,
}: {
  pattern: string;
  onFlip: (position: number) => void;
  label: string;
  large?: boolean;
}) {
  return (
    <fieldset
      className={clsx(styles.switchRow, large && styles.switchRowLarge)}
      style={{ "--switches": pattern.length } as CSSProperties}
      aria-label={label}
    >
      {Array.from(pattern, (bit, position) => {
        const on = bit === "1";
        const number = position + 1;
        return (
          <div className={styles.switchUnit} key={number}>
            <i className={styles.lamp} data-on={on} aria-hidden="true" />
            <button
              type="button"
              onClick={() => onFlip(position)}
              aria-pressed={on}
              aria-label={`Switch ${number} of ${pattern.length}: ${on ? "on" : "off"}. Flip switch.`}
              className={clsx(panel.bitButton, large && styles.keyLarge)}
            >
              {bit}
            </button>
            <span className={styles.switchState} aria-hidden="true">
              {on ? "ON" : "OFF"}
            </span>
          </div>
        );
      })}
    </fieldset>
  );
}

/** The LCD with one phrase on it: what a pattern means under a codebook. */
export function PhraseScreen({
  caption,
  pattern,
  meaning,
  alert = false,
}: {
  caption: string;
  pattern: string;
  meaning: string | null;
  alert?: boolean;
}) {
  return (
    <div className={clsx(panel.screen, styles.lcd, alert && styles.lcdAlert)}>
      <div className={panel.screenTop}>
        <span>{caption}</span>
        <span>{pattern}</span>
      </div>
      <div className={styles.lcdPhrase}>
        {meaning ? `“${meaning}”` : <span className={styles.lcdEmpty}>NO MEANING</span>}
      </div>
    </div>
  );
}

/** State → phrase, one row per state. The row of the current state is marked. */
export function CodebookTable({
  codebook,
  active,
  onEdit,
  label,
}: {
  codebook: Codebook;
  active: string;
  onEdit: (pattern: string, meaning: string) => void;
  label: string;
}) {
  return (
    <ol className={styles.book} aria-label={label}>
      {allPatterns(active.length).map((pattern, index) => (
        <li
          key={pattern}
          className={styles.bookRow}
          aria-current={pattern === active ? "true" : undefined}
        >
          <span className={styles.bookCode}>{pattern}</span>
          <input
            className={styles.bookInput}
            value={codebook[index] ?? ""}
            onChange={(event) => onEdit(pattern, event.target.value)}
            aria-label={`${label}: meaning of ${pattern}`}
            maxLength={MAX_MEANING_LENGTH}
            placeholder="NO MEANING"
            spellCheck={false}
            autoComplete="off"
          />
        </li>
      ))}
    </ol>
  );
}

export function MiniButton({
  onClick,
  label,
  disabled = false,
  children,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  // aria-disabled keeps keyboard focus on the key when it reaches its limit.
  return (
    <button
      type="button"
      className={styles.miniButton}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      aria-label={label}
    >
      {children}
    </button>
  );
}
