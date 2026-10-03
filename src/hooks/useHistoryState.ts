import { useRef, useState } from "react";
import { createHistory, record, redo, undo } from "../lib/computer/history";

export function useHistoryState<T>(initial: () => T) {
  const [history, setHistory] = useState(() => createHistory(initial()));
  const historyRef = useRef(history);
  const transactionRef = useRef<T | null>(null);
  const apply = (next: typeof history) => {
    historyRef.current = next;
    setHistory(next);
  };
  const update = (change: (current: T) => T) => {
    const current = historyRef.current;
    const next = change(current.present);
    apply(transactionRef.current === null ? record(current, next) : { ...current, present: next });
  };
  const replace = (change: (current: T) => T) => {
    apply({ ...historyRef.current, present: change(historyRef.current.present) });
  };
  const reset = (next: T) => apply(createHistory(next));
  const begin = () => {
    transactionRef.current = historyRef.current.present;
  };
  const end = () => {
    const start = transactionRef.current;
    transactionRef.current = null;
    if (start === null) return;
    apply(record({ ...historyRef.current, present: start }, historyRef.current.present));
  };
  const travel = (direction: "undo" | "redo") => {
    if (transactionRef.current !== null) end();
    const next = direction === "undo" ? undo(historyRef.current) : redo(historyRef.current);
    if (next === historyRef.current) return false;
    apply(next);
    return true;
  };
  return {
    state: history.present,
    current: () => historyRef.current.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    update,
    replace,
    reset,
    begin,
    end,
    travel,
  };
}
