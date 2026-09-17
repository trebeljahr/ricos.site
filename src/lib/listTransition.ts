import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

// Filtering a list animates with the View Transitions API: cards that stay
// slide to their new place, cards filtered out fade away. Items only get
// `view-transition-name: match-element` while a transition runs, and only when
// they sit in or near the viewport, because every named element costs a
// snapshot. Browsers without match-element update the list instantly.

type Phase = "idle" | "pending" | "animating";

// One filter transition at a time for the whole page. Updates that arrive
// before the running transition has swapped the DOM join its batch; updates
// that arrive while it animates (fast typing) apply straight away.
let phase: Phase = "idle";
let queue: (() => void)[] = [];

const canAnimate = () =>
  typeof document !== "undefined" &&
  typeof document.startViewTransition === "function" &&
  document.visibilityState === "visible" &&
  CSS.supports("view-transition-name", "match-element") &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const flush = () => {
  const updates = queue;
  queue = [];
  for (const update of updates) update();
};

/** Names the items within one viewport height of the screen. */
const nameVisibleItems = (list: HTMLElement | null, selector: string, named: Set<HTMLElement>) => {
  if (!list) return;
  const margin = window.innerHeight;
  for (const item of list.querySelectorAll<HTMLElement>(selector)) {
    const { top, bottom } = item.getBoundingClientRect();
    if (bottom < -margin || top > window.innerHeight + margin) continue;
    item.style.viewTransitionName = "match-element";
    item.style.viewTransitionClass = "list-item";
    named.add(item);
  }
};

const runWithTransition = (list: HTMLElement | null, selector: string, update: () => void) => {
  if (phase === "pending") {
    queue.push(update);
    return;
  }
  if (phase === "animating" || !canAnimate()) {
    update();
    return;
  }

  phase = "pending";
  queue = [update];
  const named = new Set<HTMLElement>();
  const root = document.documentElement;
  const done = () => {
    root.classList.remove("list-transition");
    for (const item of named) {
      item.style.viewTransitionName = "";
      item.style.viewTransitionClass = "";
    }
    phase = "idle";
    // The callback always runs, even for a skipped transition; this is a guard.
    flush();
  };

  try {
    root.classList.add("list-transition");
    nameVisibleItems(list, selector, named);
    const transition = document.startViewTransition(() => {
      phase = "animating";
      try {
        flushSync(flush);
      } finally {
        nameVisibleItems(list, selector, named);
      }
    });
    transition.ready.catch(() => {});
    transition.finished.then(done, done);
  } catch {
    done();
  }
};

const sameItems = (a: unknown, b: unknown) =>
  a === b ||
  (Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((item, i) => item === b[i]));

/**
 * State for a filter that changes which items `list` shows. Setting it animates
 * the items matching `itemSelector` inside `list`; unchanged lists are ignored.
 * `debounceMs` waits for a pause in typing, because the page stops painting
 * while a transition captures its snapshots and each keystroke would stutter.
 */
export function useListTransition<T>(
  initial: T | (() => T),
  list: RefObject<HTMLElement | null>,
  itemSelector: string,
  debounceMs = 0,
) {
  const [value, setValue] = useState(initial);
  const latest = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const set = useCallback(
    (next: T) => {
      clearTimeout(timer.current);
      const apply = () => {
        if (sameItems(latest.current, next)) return;
        latest.current = next;
        runWithTransition(list.current, itemSelector, () => setValue(next));
      };
      if (debounceMs > 0 && canAnimate()) timer.current = setTimeout(apply, debounceMs);
      else apply();
    },
    [list, itemSelector, debounceMs],
  );
  return [value, set] as const;
}
