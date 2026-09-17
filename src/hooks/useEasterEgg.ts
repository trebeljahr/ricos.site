import { usePlausible } from "next-plausible";
import { useCallback, useRef } from "react";
import { markEggFound } from "src/lib/easterEggs";

type EasterEggOptions = {
  /** Clicks needed inside `windowMs` to find the egg. */
  clicks?: number;
  windowMs?: number;
  onTrigger: () => void;
  /** Called on every click that does not find the egg, with the quick clicks so far. */
  onProgress?: (clicks: number) => void;
};

/** Records a find and sends the Plausible event. For eggs that are not found by clicking. */
export function useRecordEggFind() {
  const plausible = usePlausible();
  return useCallback(
    (id: string) => {
      plausible("Easter Egg", { props: { egg: id } });
      markEggFound(id);
    },
    [plausible],
  );
}

/**
 * Counts quick clicks on an easter egg. Call the returned function on every
 * click: it returns true when this click found the egg, after recording the
 * find and sending the Plausible event.
 */
export function useEasterEgg(
  id: string,
  { clicks = 5, windowMs = 2000, onTrigger, onProgress }: EasterEggOptions,
) {
  const recordFind = useRecordEggFind();
  const clickTimes = useRef<number[]>([]);
  const callbacks = useRef({ onTrigger, onProgress });
  callbacks.current = { onTrigger, onProgress };

  return useCallback((): boolean => {
    const now = Date.now();
    clickTimes.current = [...clickTimes.current.filter((t) => now - t < windowMs), now];
    if (clickTimes.current.length < clicks) {
      callbacks.current.onProgress?.(clickTimes.current.length);
      return false;
    }

    clickTimes.current = [];
    recordFind(id);
    callbacks.current.onTrigger();
    return true;
  }, [clicks, id, recordFind, windowMs]);
}
