import { useEffect, useId, useRef } from "react";
import styles from "./Tutorial.module.css";

const TEXT = {
  wire: {
    title: "Replace your wiring?",
    body: "This removes everything you have on the board and wires a working solution in its place. It does not count as your own solve.",
    keep: "Keep my wiring",
    confirm: "Replace my wiring",
  },
  parts: {
    title: "Replace your board?",
    body: "This removes everything you have on the board and puts the parts of a working solution in its place, without wires. Undo brings your board back.",
    keep: "Keep my board",
    confirm: "Place the parts",
  },
};

/**
 * Asks before "Wire it for me" or the parts hint replaces the board. Only the
 * reader's own click opens it. A native modal <dialog> brings focus handling
 * and Escape, and sits in the top layer, above the builder's own container query.
 */
export function WireItConfirm({
  kind = "wire",
  onConfirm,
  onCancel,
}: {
  kind?: keyof typeof TEXT;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const text = TEXT[kind];

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);

  return (
    <dialog ref={dialog} className={styles.confirm} aria-labelledby={titleId} onClose={onCancel}>
      <h2 id={titleId}>{text.title}</h2>
      <p>{text.body}</p>
      <div className={styles.confirmActions}>
        <button type="button" onClick={() => dialog.current?.close()}>
          {text.keep}
        </button>
        <button type="button" className={styles.confirmPrimary} onClick={onConfirm}>
          {text.confirm}
        </button>
      </div>
    </dialog>
  );
}
