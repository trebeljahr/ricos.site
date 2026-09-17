import { recordEggFind } from "src/lib/easterEggs";

const CLICKS = 5;
const WINDOW_MS = 2000;

// Module state, not React state: the navbar remounts on every navigation,
// and the first logo click on another page navigates home.
let clickTimes: number[] = [];
let clickSeq = 0;

/** How many logo clicks have been seen. Lets the navbar tell a single click from a burst. */
export const getLogoClickSeq = () => clickSeq;

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Counts quick clicks on the site logo. The fifth makes the flask bubble over.
 * Returns true when the click was part of a sequence, so the navbar can keep
 * the logo from navigating away mid-egg.
 */
export function onLogoClick(logo: HTMLElement | null): boolean {
  const now = Date.now();
  clickSeq++;
  clickTimes = [...clickTimes.filter((t) => now - t < WINDOW_MS), now];
  const repeated = clickTimes.length > 1;

  if (clickTimes.length < CLICKS) {
    if (logo && !calm()) {
      const angle = 6 + clickTimes.length * 4;
      logo.animate(
        [
          { rotate: "0deg" },
          { rotate: `${-angle}deg` },
          { rotate: `${angle * 0.6}deg` },
          { rotate: "0deg" },
        ],
        { duration: 320, easing: "ease-out" },
      );
    }
    return repeated;
  }

  clickTimes = [];
  recordEggFind("flask");
  // The bubbles only load once someone finds them.
  import("./bubbleOver").then(({ bubbleOver }) => bubbleOver(logo)).catch(() => undefined);
  return true;
}
