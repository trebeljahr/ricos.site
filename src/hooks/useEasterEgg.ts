import { usePlausible } from "next-plausible";
import { useCallback, useRef } from "react";
import { markEggFound } from "src/lib/easterEggs";

type EasterEggOptions = {
  /** Clicks needed inside `windowMs` to find the egg. */
  clicks?: number;
  windowMs?: number;
  onTrigger: () => void;
};

/**
 * Counts quick clicks on an easter egg. Call the returned function on every
 * click: it returns true when this click found the egg, after recording the
 * find and sending the Plausible event.
 */
export function useEasterEgg(
  id: string,
  { clicks = 3, windowMs = 2000, onTrigger }: EasterEggOptions,
) {
  const plausible = usePlausible();
  const clickTimes = useRef<number[]>([]);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  return useCallback((): boolean => {
    const now = Date.now();
    clickTimes.current = [...clickTimes.current.filter((t) => now - t < windowMs), now];
    if (clickTimes.current.length < clicks) return false;

    clickTimes.current = [];
    plausible("Easter Egg", { props: { egg: id } });
    markEggFound(id);
    onTriggerRef.current();
    return true;
  }, [clicks, id, plausible, windowMs]);
}
