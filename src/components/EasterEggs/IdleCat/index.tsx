import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const IdleCat = dynamic(() => import("./IdleCat"), { ssr: false });

const IDLE_MS = 60_000;
const ACTIVITY_EVENTS = ["pointermove", "pointerdown", "keydown", "scroll", "wheel", "touchstart"];

/**
 * Easter egg: after a minute without input, a cat walks in and naps at the
 * bottom of the screen. The watcher is tiny; the cat loads only when it comes.
 */
export const IdleCatWatcher = () => {
  const [visit, setVisit] = useState<number | null>(null);

  useEffect(() => {
    if (visit !== null) return;
    let timer = 0;
    const restart = () => {
      window.clearTimeout(timer);
      // Hidden tabs are not idle readers.
      if (document.visibilityState === "visible") {
        timer = window.setTimeout(() => setVisit(Date.now()), IDLE_MS);
      }
    };
    restart();
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, restart, { passive: true });
    document.addEventListener("visibilitychange", restart);
    return () => {
      window.clearTimeout(timer);
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, restart);
      document.removeEventListener("visibilitychange", restart);
    };
  }, [visit]);

  return visit === null ? null : <IdleCat key={visit} onGone={() => setVisit(null)} />;
};
