import { useEffect, useId, useRef } from "react";
import styles from "./Tutorial.module.css";

/**
 * Asks before "Wire it for me" replaces the board. Only the reader's own click
 * opens it. A native modal <dialog> brings focus handling and Escape, and sits
 * in the top layer, above the builder's own container query.
 */
export function WireItConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);

  return (
    <dialog ref={dialog} className={styles.confirm} aria-labelledby={titleId} onClose={onCancel}>
      <h2 id={titleId}>Replace your wiring?</h2>
      <p>
        This removes everything you have on the board and wires a working solution in its place. It
        does not count as your own solve.
      </p>
      <div className={styles.confirmActions}>
        <button type="button" onClick={() => dialog.current?.close()}>
          Keep my wiring
        </button>
        <button type="button" className={styles.confirmPrimary} onClick={onConfirm}>
          Replace my wiring
        </button>
      </div>
    </dialog>
  );
}
