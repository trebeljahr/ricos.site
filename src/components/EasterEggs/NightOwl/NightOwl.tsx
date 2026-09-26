import { useRef, useState } from "react";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";

const OWL_SIZE = 22;
/** Clicks inside this window count towards the same visit. */
const SPREE_MS = 2500;
/** Quick clicks that send the owl on a lap around the footer. */
const CLICKS_TO_FLY = 5;

type Feather = { id: number; drift: number };

/**
 * Easter egg: an owl perches on the footer's top edge, but only after dark.
 * Clicking it makes it hoot and turn its head; keep clicking and it takes a
 * lap around the footer and drops a feather. Hidden in light mode by CSS, so
 * it is correct on first paint and never causes a hydration mismatch.
 */
export const NightOwl = () => {
  const recordFind = useRecordEggFind();
  const flyerRef = useRef<HTMLSpanElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  const clickTimes = useRef<number[]>([]);
  const turn = useRef(-1);
  const flying = useRef(false);
  const found = useRef(false);
  const [hoots, setHoots] = useState(0);
  const [feathers, setFeathers] = useState<Feather[]>([]);

  const dropFeather = () => {
    const feather = { id: Date.now(), drift: Math.round(Math.random() * 30) - 10 };
    setFeathers((current) => [...current, feather]);
    window.setTimeout(
      () => setFeathers((current) => current.filter((f) => f.id !== feather.id)),
      2600,
    );
  };

  const fly = () => {
    const flyer = flyerRef.current;
    if (!flyer || flying.current) return;
    flying.current = true;
    const done = () => {
      flying.current = false;
    };
    // Wings out on the way round.
    headRef.current?.animate(
      [
        { scale: "1 1" },
        { scale: "1.25 0.85" },
        { scale: "0.9 1.1" },
        { scale: "1.2 0.9" },
        { scale: "1 1" },
      ],
      { duration: 1600, easing: "ease-in-out" },
    );
    flyer
      .animate(
        [
          { transform: "translate(0, 0) rotate(0deg)" },
          { transform: "translate(-26px, -58px) rotate(-14deg)", offset: 0.3 },
          { transform: "translate(-72px, -26px) rotate(8deg)", offset: 0.6 },
          { transform: "translate(-22px, -46px) rotate(-6deg)", offset: 0.82 },
          { transform: "translate(0, -5px) rotate(0deg)", offset: 0.94 },
          // Land with a little squash.
          { transform: "translate(0, 1px) scale(1.12, 0.88)", offset: 0.98 },
          { transform: "translate(0, 0) rotate(0deg)" },
        ],
        { duration: 1600, easing: "ease-in-out" },
      )
      .finished.then(done)
      .catch(done);
    dropFeather();
  };

  const onClick = () => {
    void import("./hoot").then(({ hoot }) => hoot(0.9 + Math.random() * 0.25));
    // One find per visit: the owl can be clicked all night.
    if (!found.current) {
      found.current = true;
      recordFind("night-owl");
    }
    setHoots((n) => n + 1);

    const now = Date.now();
    clickTimes.current = [...clickTimes.current.filter((t) => now - t < SPREE_MS), now];
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (clickTimes.current.length >= CLICKS_TO_FLY) {
      clickTimes.current = [];
      if (calm) dropFeather();
      else fly();
      return;
    }
    if (calm || flying.current) return;

    // First click is a hoot bob; after that it looks around, left then right.
    const head = headRef.current;
    if (clickTimes.current.length === 1) {
      head?.animate(
        [
          { translate: "0 0", scale: "1 1" },
          { translate: "0 -4px", scale: "1.12 0.9" },
          { translate: "0 0", scale: "1 1" },
          { translate: "0 -2px", scale: "1.08 0.95", offset: 0.75 },
          { translate: "0 0", scale: "1 1" },
        ],
        { duration: 900, easing: "ease-out" },
      );
      return;
    }
    turn.current = -turn.current;
    head?.animate(
      [
        { rotate: "0deg" },
        { rotate: `${turn.current * 18}deg`, offset: 0.3 },
        { rotate: `${turn.current * 18}deg`, offset: 0.7 },
        { rotate: "0deg" },
      ],
      { duration: 900, easing: "ease-in-out" },
    );
  };

  // The perch lines up with the footer's content column, so the owl sits over
  // the last link rather than out in the page margin.
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-full hidden px-gutter leading-none dark:block">
      <span className="mx-auto block max-w-(--breakpoint-lg) text-right">
        <span className="relative inline-block translate-y-[3px]" style={{ fontSize: OWL_SIZE }}>
          <span ref={flyerRef} className="pointer-events-auto inline-block">
            {/* The glyph is small, so the button takes clicks from a larger area around it. */}
            <EmojiButton
              label="Owl"
              onClick={onClick}
              nudge={false}
              className="after:absolute after:-inset-3 after:content-['']"
            >
              <span ref={headRef} className="inline-block origin-bottom">
                🦉
              </span>
            </EmojiButton>
          </span>
          {feathers.map((feather) => (
            <span
              key={feather.id}
              aria-hidden="true"
              className="absolute top-1 left-0 text-xs motion-safe:animate-egg-feather"
              style={{ ["--egg-feather-drift" as string]: `${feather.drift}px` }}
            >
              🪶
            </span>
          ))}
          <span className="sr-only" aria-live="polite">
            {hoots > 0 ? "Hoo hoo" : ""}
          </span>
        </span>
      </span>
    </span>
  );
};
