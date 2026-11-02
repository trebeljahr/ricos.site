import { type ReactNode, startTransition, useEffect, useRef, useState } from "react";

const preloads: (() => unknown)[] = [];
let preloading = false;

const whenIdle = (work: () => void) => {
  if (typeof requestIdleCallback === "function") requestIdleCallback(work, { timeout: 2000 });
  else setTimeout(work, 200);
};

function runNextPreload() {
  const load = preloads.shift();
  preloading = load !== undefined;
  if (!load) return;
  whenIdle(() => {
    Promise.resolve()
      .then(load)
      .catch(() => {})
      .finally(runNextPreload);
  });
}

/**
 * Loads a demo's code while the page is idle, one demo at a time in the order
 * they asked, which is reading order. Nothing is mounted yet, so this costs
 * one copy of the code and no instances. Skipped when the reader saves data.
 */
export function preloadWhenIdle(load: () => unknown) {
  const { connection } = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (connection?.saveData) return;
  preloads.push(load);
  if (!preloading) runNextPreload();
}

/**
 * Renders `children` only once the box comes within `margin` of the screen,
 * and keeps them mounted after that. Until then it shows `placeholder` at the
 * same height, so the page does not jump. `preload` fetches the code for
 * `children` at idle, so they are ready to mount by the time the reader is near.
 */
export function LazyMount({
  children,
  placeholder,
  height,
  margin = "200% 0px",
  label,
  preload,
}: {
  children: ReactNode;
  placeholder: ReactNode;
  height: string;
  margin?: string;
  label?: string;
  preload?: () => unknown;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (preload) preloadWhenIdle(preload);
  }, [preload]);
  useEffect(() => {
    const element = box.current;
    if (!element || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        // A transition, so a big builder mounting never holds up scrolling.
        if (entries.some((entry) => entry.isIntersecting)) startTransition(() => setNear(true));
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near, margin]);
  return (
    <section ref={box} style={{ height }} aria-label={label} data-mounted={near || undefined}>
      {near ? children : placeholder}
    </section>
  );
}
