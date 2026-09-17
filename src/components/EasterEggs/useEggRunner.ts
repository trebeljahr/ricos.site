import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs one egg animation at a time. `wait` timers are cleared on unmount, so a
 * sequence that is still running just stops instead of touching dead state.
 */
export function useEggRunner() {
  const timers = useRef(new Set<number>());
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) window.clearTimeout(t);
      pending.clear();
    };
  }, []);

  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(() => {
          timers.current.delete(t);
          resolve();
        }, ms);
        timers.current.add(t);
      }),
    [],
  );

  /** Starts `sequence` unless one is already running. */
  const run = useCallback((sequence: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    sequence().finally(() => {
      busyRef.current = false;
      setBusy(false);
    });
  }, []);

  return { busy, busyRef, run, wait };
}
