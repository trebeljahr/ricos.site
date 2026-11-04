import { useCallback, useEffect, useRef } from "react";

const DELETE_TOTAL_MS = 450;
const DELETE_MAX_MS = 45;
const TYPE_TOTAL_MS = 1000;
const TYPE_MAX_MS = 85;
const PAUSE_BEFORE_TYPING_MS = 130;

function prefersNoMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Swaps a typewriter's text the way a typist would: backspace to nothing, then type
 * the new text. `step` gets each stage, and the character struck (null for backspace).
 */
export function useRetype(step: (text: string, struck: string | null) => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStep = useRef(step);
  latestStep.current = step;

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const retype = useCallback(
    (from: string, to: string) => {
      cancel();
      if (from === to) return;
      const target = Array.from(to);
      if (prefersNoMotion()) {
        latestStep.current(to, target.at(-1) ?? null);
        return;
      }
      const left = Array.from(from);
      const deleteDelay = Math.min(DELETE_MAX_MS, DELETE_TOTAL_MS / Math.max(1, left.length));
      const typeDelay = Math.min(TYPE_MAX_MS, TYPE_TOTAL_MS / Math.max(1, target.length));
      let typed = 0;

      const type = () => {
        typed += 1;
        latestStep.current(target.slice(0, typed).join(""), target[typed - 1]);
        // A typist's rhythm is uneven, and an even one sounds like a machine gun.
        timer.current =
          typed < target.length ? setTimeout(type, typeDelay * (0.7 + Math.random() * 0.6)) : null;
      };
      const erase = () => {
        left.pop();
        latestStep.current(left.join(""), null);
        if (left.length > 0) timer.current = setTimeout(erase, deleteDelay);
        else timer.current = target.length > 0 ? setTimeout(type, PAUSE_BEFORE_TYPING_MS) : null;
      };

      if (left.length > 0) erase();
      else type();
    },
    [cancel],
  );

  return { retype, cancelRetype: cancel };
}
