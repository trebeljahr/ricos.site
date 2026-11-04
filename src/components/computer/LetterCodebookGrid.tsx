import { type KeyboardEvent, useRef, useState } from "react";
import { LETTER_STATES, letterName, letterPattern } from "src/lib/letterCodebook";
import styles from "./LetterCodebook.module.css";

/** One state of the codebook: its five bits and a field that holds its character. */
function StateField({
  state,
  char,
  inText,
  active,
  onEdit,
  onShow,
}: {
  state: number;
  char: string;
  inText: boolean;
  active: boolean;
  onEdit?: (value: string) => void;
  onShow?: () => void;
}) {
  // An input method builds a character in several steps; the field shows them, the codebook waits.
  const [draft, setDraft] = useState<string | null>(null);
  const composing = useRef(false);
  const bits = letterPattern(state);

  // With nothing to do on a press, the state is print on a card, not a key.
  if (!onEdit && !onShow) {
    return (
      <div className={styles.state} data-lit={active ? "active" : inText ? "typed" : undefined}>
        <span className={styles.stateBits}>{bits}</span>
        <span className={styles.stateField} aria-hidden="true">
          {char === " " ? "SP" : char}
        </span>
        <span className="sr-only">{letterName(char)}</span>
      </div>
    );
  }

  if (!onEdit) {
    return (
      <button
        type="button"
        className={styles.state}
        data-state={state}
        data-lit={active ? "active" : undefined}
        tabIndex={active ? 0 : -1}
        onFocus={onShow}
        onClick={onShow}
        aria-label={`State ${bits}: ${letterName(char)}`}
        aria-pressed={active}
      >
        <span className={styles.stateBits} aria-hidden="true">
          {bits}
        </span>
        <span className={styles.stateField} aria-hidden="true">
          {char === " " ? "SP" : char}
        </span>
      </button>
    );
  }

  return (
    <label className={styles.state} data-lit={active ? "active" : inText ? "typed" : undefined}>
      <span className={styles.stateBits} aria-hidden="true">
        {bits}
      </span>
      <input
        className={styles.stateField}
        data-state={state}
        value={draft ?? char}
        tabIndex={active ? 0 : -1}
        onFocus={(event) => {
          event.target.select();
          onShow?.();
        }}
        onChange={(event) => {
          if (composing.current) setDraft(event.target.value);
          else onEdit(event.target.value);
        }}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          setDraft(null);
          onEdit(event.currentTarget.value);
        }}
        aria-label={`State ${bits}: ${letterName(char)}.${inText ? " In your text." : ""}${
          active ? " Selected." : ""
        } Type a character to put it here.`}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
      />
      {char === " " && draft === null && (
        <span className={styles.stateSpace} aria-hidden="true">
          SP
        </span>
      )}
    </label>
  );
}

/** Shared layout and keyboard navigation for fixed and editable letter codebooks. */
export function LetterCodebookGrid({
  codebook,
  active,
  inText = new Set<number>(),
  onEdit,
  onShow,
}: {
  codebook: readonly string[];
  active: number;
  inText?: ReadonlySet<number | null>;
  onEdit?: (state: number, value: string) => void;
  /** Left out, the grid is a printed card to read, with no keys. */
  onShow?: (state: number) => void;
}) {
  function moveInBook(event: KeyboardEvent<HTMLFieldSetElement>) {
    const field = (event.target as HTMLElement).closest<HTMLElement>("[data-state]");
    if (!field || event.nativeEvent.isComposing) return;
    const state = Number(field.dataset.state);
    // The column count changes with the panel's width, so read it off the layout:
    // it is the position of the first field that sits on the second row.
    const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-state]"));
    const top = (element: HTMLElement) => element.getBoundingClientRect().top;
    const wrapAt = fields.findIndex((other) => top(other) !== top(fields[0]));
    const columns = wrapAt === -1 ? fields.length : wrapAt;
    const steps: Record<string, number> = {
      ArrowLeft: state - 1,
      ArrowRight: state + 1,
      ArrowUp: state - columns,
      ArrowDown: state + columns,
      Home: 0,
      End: LETTER_STATES - 1,
    };
    const target = steps[event.key];
    if (target === undefined) return;
    event.preventDefault();
    fields[target]?.focus();
  }

  return (
    <fieldset
      className={styles.states}
      aria-label={`Codebook: one character for each of the ${LETTER_STATES} states.${
        onShow ? " Arrow keys move between them." : ""
      }`}
      onKeyDown={moveInBook}
    >
      {codebook.map((char, state) => (
        <StateField
          // biome-ignore lint/suspicious/noArrayIndexKey: a field is its state, whatever character it holds
          key={state}
          state={state}
          char={char}
          inText={inText.has(state)}
          active={state === active}
          onEdit={onEdit ? (value) => onEdit(state, value) : undefined}
          onShow={onShow && (() => onShow(state))}
        />
      ))}
    </fieldset>
  );
}
