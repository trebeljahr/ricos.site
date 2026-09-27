import { useEffect } from "react";

/**
 * Holds the page still while an overlay is open.
 *
 * Only touches `<body>` while the lock is on, and puts back whatever was there
 * before. Unlocking used to assign `overflow: auto`, which ran on mount too —
 * so every page carried `overflow: auto` on `<body>` whether or not anything
 * had ever been locked. That is not the initial `visible`: it makes `<body>` a
 * scroll container, and the sticky navbar then stuck to the body's scrollport
 * instead of the viewport and scrolled away with the page.
 */
export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      if (previous) {
        document.body.style.overflow = previous;
      } else {
        document.body.style.removeProperty("overflow");
      }
    };
  }, [lock]);
}
