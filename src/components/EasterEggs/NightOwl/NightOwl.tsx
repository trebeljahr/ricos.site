import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PERCH_MS = 6000;
const OWL_SIZE = 26;

/**
 * An owl flies in from the top right, perches on the site logo, looks around,
 * and flies off again. Clicking it makes it hoot. Only the owl itself takes
 * clicks; the rest of the overlay lets them through.
 */
const NightOwl = ({
  anchor,
  leave,
  onDone,
}: {
  anchor: HTMLElement;
  /** The theme went back to light: fly off now. */
  leave: boolean;
  onDone: () => void;
}) => {
  const bodyRef = useRef<HTMLSpanElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  const flyOff = useRef<() => void>(() => undefined);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Measured once: the owl stays where it landed even if the page re-renders.
  const [{ left, top }] = useState(() => {
    const logo =
      anchor.closest("header")?.querySelector('a[href="/"] img') ??
      document.querySelector('header a[href="/"] img');
    const perch = (logo ?? anchor).getBoundingClientRect();
    return {
      left: Math.max(4, perch.left + perch.width / 2 - OWL_SIZE / 2),
      // Feet on the rim of the flask.
      top: Math.max(0, perch.top - OWL_SIZE + 8),
    };
  });
  const [hoots, setHoots] = useState(0);
  const perchTimer = useRef(0);

  useEffect(() => {
    const body = bodyRef.current;
    const head = headRef.current;
    if (!body || !head) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fromX = window.innerWidth - left + 40;
    let gone = false;

    const leaveNow = () => {
      if (gone) return;
      gone = true;
      window.clearTimeout(perchTimer.current);
      const exit = calm
        ? body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" })
        : body.animate(
            [
              { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
              { transform: "translate(-10px, 6px) scale(1, 0.85)", opacity: 1, offset: 0.15 },
              {
                transform: `translate(${fromX * 0.5}px, -70px) rotate(-12deg)`,
                opacity: 1,
                offset: 0.6,
              },
              { transform: `translate(${fromX}px, -140px) rotate(-18deg)`, opacity: 0 },
            ],
            { duration: 1100, easing: "ease-in", fill: "forwards" },
          );
      exit.finished.then(() => onDoneRef.current()).catch(() => undefined);
    };
    flyOff.current = leaveNow;

    const arrive = calm
      ? body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "forwards" })
      : body.animate(
          [
            { transform: `translate(${fromX}px, -120px) rotate(-20deg)`, opacity: 0 },
            {
              transform: `translate(${fromX * 0.45}px, -50px) rotate(-8deg)`,
              opacity: 1,
              offset: 0.5,
            },
            { transform: "translate(0, -6px) rotate(6deg)", opacity: 1, offset: 0.85 },
            // Touch down with a little squash.
            { transform: "translate(0, 2px) scale(1.1, 0.85)", opacity: 1, offset: 0.93 },
            { transform: "translate(0, 0) scale(1, 1)", opacity: 1 },
          ],
          { duration: 1300, easing: "ease-out", fill: "forwards" },
        );

    arrive.finished
      .then(() => {
        if (gone) return;
        if (!calm) {
          // Look left, look right, as owls do.
          head.animate(
            [
              { transform: "rotate(0deg)" },
              { transform: "rotate(-16deg)", offset: 0.25 },
              { transform: "rotate(-16deg)", offset: 0.4 },
              { transform: "rotate(16deg)", offset: 0.65 },
              { transform: "rotate(16deg)", offset: 0.8 },
              { transform: "rotate(0deg)" },
            ],
            { duration: 2200, delay: 500, easing: "ease-in-out" },
          );
        }
        perchTimer.current = window.setTimeout(leaveNow, PERCH_MS);
      })
      .catch(() => undefined);

    return () => {
      window.clearTimeout(perchTimer.current);
      arrive.cancel();
    };
  }, [left]);

  useEffect(() => {
    if (leave) flyOff.current();
  }, [leave]);

  const onHoot = () => {
    void import("./hoot").then(({ hoot }) => hoot());
    setHoots((n) => n + 1);
    // A hoot bob, and a few more seconds on the perch.
    headRef.current?.animate(
      [
        { transform: "translateY(0) scale(1)" },
        { transform: "translateY(-3px) scale(1.12, 0.92)" },
        { transform: "translateY(0) scale(1)" },
        { transform: "translateY(-2px) scale(1.08, 0.95)", offset: 0.75 },
        { transform: "translateY(0) scale(1)" },
      ],
      { duration: 900, easing: "ease-out" },
    );
    window.clearTimeout(perchTimer.current);
    perchTimer.current = window.setTimeout(() => flyOff.current(), PERCH_MS);
  };

  return createPortal(
    <span
      className="pointer-events-none fixed z-1000 leading-none"
      style={{ left, top, width: OWL_SIZE, height: OWL_SIZE, fontSize: OWL_SIZE - 4 }}
    >
      <span ref={bodyRef} className="inline-block" style={{ opacity: 0 }}>
        <button
          type="button"
          aria-label="Owl"
          onClick={onHoot}
          className="pointer-events-auto cursor-pointer appearance-none border-0 bg-transparent p-0 leading-none"
        >
          <span ref={headRef} aria-hidden="true" className="inline-block origin-bottom">
            🦉
          </span>
        </button>
      </span>
      <span className="sr-only" aria-live="polite">
        {hoots > 0 ? "Hoo hoo" : ""}
      </span>
    </span>,
    document.body,
  );
};

export default NightOwl;
