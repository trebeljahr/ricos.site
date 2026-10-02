import { type FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./PanelEditor.module.css";

type Props = {
  title: string;
  kind: "number" | "text" | "color";
  initialValue: string;
  hint: string;
  represented: string;
  alpha?: number;
  onApply: (value: string, alpha: number) => string | null;
  onClose: () => void;
};

export function PanelEditor({
  title,
  kind,
  initialValue,
  hint,
  represented,
  alpha,
  onApply,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(initialValue);
  const [opacity, setOpacity] = useState(alpha ?? 255);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);

  function apply(value = draft, nextAlpha = opacity, close = false) {
    const message = onApply(value, nextAlpha);
    setError(message);
    if (!message && close) dialog.current?.close();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply(draft, opacity, true);
  }

  function pickColor(value: string) {
    setDraft(value);
    setError(null);
    apply(value);
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog ref={dialog} className={styles.dialog} onClose={onClose} aria-label={`Set ${title}`}>
      <div className={styles.plate}>
        <div className={styles.heading}>
          <div>
            <span>SET VALUE</span>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={() => dialog.current?.close()}
            aria-label="Close editor"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <label className={styles.label} htmlFor="panel-editor-input">
            {kind === "color" ? "PICK COLOR" : "NEW VALUE"}
          </label>
          <input
            id="panel-editor-input"
            className={kind === "color" ? styles.colorInput : styles.textInput}
            type={kind === "color" ? "color" : "text"}
            inputMode={kind === "number" ? "decimal" : undefined}
            autoComplete="off"
            spellCheck={false}
            value={kind === "color" && !/^#[\da-f]{6}$/i.test(draft) ? "#000000" : draft}
            onInput={kind === "color" ? (event) => pickColor(event.currentTarget.value) : undefined}
            onChange={(event) => {
              const next = event.target.value;
              if (kind === "color") pickColor(next);
              else {
                setDraft(next);
                setError(null);
              }
            }}
            autoFocus
          />
          {kind === "color" && (
            <input
              className={styles.hexInput}
              type="text"
              aria-label="Hex color"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setError(null);
              }}
              spellCheck={false}
              autoComplete="off"
            />
          )}
          {kind === "color" && alpha !== undefined && (
            <label className={styles.alphaLabel}>
              ALPHA <strong>{opacity}</strong>
              <input
                type="range"
                min="0"
                max="255"
                value={opacity}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setOpacity(next);
                  apply(draft, next);
                }}
              />
            </label>
          )}
          <p className={styles.hint}>{hint}</p>
          <p className={styles.represented}>
            STORED AS <strong>{represented}</strong>
          </p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className={styles.apply}>
            {kind === "color" ? "DONE" : "SET VALUE"}
          </button>
        </form>
      </div>
    </dialog>,
    document.body,
  );
}
