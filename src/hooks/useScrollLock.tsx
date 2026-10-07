import { useEffect } from "react";

/**
 * Holds the page still while an overlay is open.
 *
 * Only touches `<html>` while the lock is on, and puts back whatever was there
 * before. Unlocking used to assign `overflow: auto`, which ran on mount too —
 * so every page carried `overflow: auto` on `<body>` whether or not anything
 * had ever been locked. That is not the initial `visible`: it makes `<body>` a
 * scroll container, and the sticky navbar then stuck to the body's scrollport
 * instead of the viewport and scrolled away with the page.
 *
 * The lock goes on `<html>`, not `<body>`: globals.css gives `<html>`
 * `overflow-x: clip`, so the body's overflow no longer propagates to the
 * viewport. `overflow: hidden` on `<body>` then made the body the scroll
 * container, and the sticky navbar (with the mobile menu inside it) jumped
 * back to the top of the page — off screen when opened from far down.
 */
export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";

    return () => {
      if (previous) {
        root.style.overflow = previous;
      } else {
        root.style.removeProperty("overflow");
      }
    };
  }, [lock]);
}
