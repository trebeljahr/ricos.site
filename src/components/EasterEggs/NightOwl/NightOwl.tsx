import { useEffect, useRef, useState } from "react";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { markOwlFlownAway, owlHasFlownAway } from "./flown";

const OWL_SIZE = 22;
/** Clicks inside this window count towards the same visit. */
const SPREE_MS = 2500;
/** Quick clicks that send the owl on a lap around the footer. */
const CLICKS_TO_FLY = 5;
/** Clicks the owl puts up with before it leaves for the night. */
const CLICKS_TO_LEAVE = 12;
const FEATHER_MS = 2600;

type Feather = { id: number; drift: number; delay: number; size: number; x: number; y: number };

/**
 * Easter egg: an owl perches on the footer's top edge, but only after dark.
 * Clicking it makes it hoot and turn its head, and every click winds it up a
 * little more; five quick ones send it on a lap around the footer. Keep going
 * and it has had enough: it drops a handful of feathers, flies off the side of
 * the screen, and stays away for the rest of the visit. Hidden in light mode
 * by CSS, so it is correct on first paint and never causes a hydration
 * mismatch.
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
  const [gone, setGone] = useState(false);
  const [feathers, setFeathers] = useState<Feather[]>([]);

  // It left earlier in this visit, so there is no owl on this page either.
  useEffect(() => {
    if (owlHasFlownAway()) setGone(true);
  }, []);

  const dropFeathers = (count: number) => {
    const born = Date.now();
    const batch: Feather[] = Array.from({ length: count }, (_, i) => ({
      id: born + i,
      drift: Math.round(Math.random() * 44) - 18,
      delay: i * 70,
      size: 10 + Math.round(Math.random() * 5),
      // A burst spreads from the moment it leaves the owl, not on the way down.
      x: count === 1 ? 0 : Math.round(Math.random() * 30) - 16,
      y: count === 1 ? 0 : Math.round(Math.random() * 16) - 9,
    }));
    setFeathers((current) => [...current, ...batch]);
    const ids = new Set(batch.map((f) => f.id));
    window.setTimeout(
      () => setFeathers((current) => current.filter((f) => !ids.has(f.id))),
      FEATHER_MS + count * 70,
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
    dropFeathers(1);
  };

  /** Out over the right edge of the window, in a puff of feathers, for good. */
  const leave = () => {
    const flyer = flyerRef.current;
    if (!flyer || gone) return;
    markOwlFlownAway();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    dropFeathers(calm ? 2 : 5);

    if (calm) {
      flyer
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" })
        .finished.finally(() => setGone(true));
      return;
    }

    const perch = flyer.getBoundingClientRect();
    const outX = window.innerWidth - perch.left + 120;
    headRef.current?.animate(
      [
        { rotate: "0deg", scale: "1 1" },
        { rotate: "-14deg", scale: "1.2 0.88" },
        { rotate: "9deg", scale: "0.9 1.12" },
        { rotate: "-7deg", scale: "1.15 0.9" },
        { rotate: "0deg", scale: "1 1" },
      ],
      { duration: 1300, easing: "linear" },
    );
    flyer
      .animate(
        [
          { transform: "translate(0, 0) rotate(0deg) scale(1, 1)", easing: "ease-out" },
          // Crouch...
          { transform: "translate(-4px, 6px) scale(1.2, 0.78)", offset: 0.12, easing: "ease-in" },
          // ...off the perch...
          {
            transform: `translate(${outX * 0.12}px, -20px) rotate(-10deg) scale(1, 1.08)`,
            offset: 0.32,
            easing: "ease-in",
          },
          // ...and away, gathering speed.
          {
            transform: `translate(${outX * 0.45}px, -58px) rotate(10deg) scale(0.98, 1.05)`,
            offset: 0.66,
            easing: "ease-in",
          },
          {
            transform: `translate(${outX}px, -140px) rotate(22deg) scale(0.8)`,
            opacity: 0.6,
          },
        ],
        { duration: 1300, fill: "forwards" },
      )
      .finished.finally(() => setGone(true));
  };

  const onClick = () => {
    const total = hoots + 1;
    const last = total >= CLICKS_TO_LEAVE;
    void import("./hoot").then(({ hoot }) =>
      hoot(0.9 + Math.random() * 0.25, last ? "startled" : "call"),
    );
    // One find per visit: the owl can be clicked all night.
    if (!found.current) {
      found.current = true;
      recordFind("night-owl");
    }
    setHoots(total);

    const now = Date.now();
    clickTimes.current = [...clickTimes.current.filter((t) => now - t < SPREE_MS), now];
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (last) {
      // Let the startled call start before it goes.
      window.setTimeout(leave, 200);
      return;
    }
    if (clickTimes.current.length >= CLICKS_TO_FLY) {
      clickTimes.current = [];
      if (calm) dropFeathers(1);
      else fly();
      return;
    }
    if (calm || flying.current) return;

    // The more it is poked, the sharper and quicker it moves.
    const nerve = Math.min(1, (total - 1) / (CLICKS_TO_LEAVE - 1));
    const head = headRef.current;
    // First click is a hoot bob; after that it looks around, left then right.
    if (clickTimes.current.length === 1) {
      head?.animate(
        [
          { translate: "0 0", scale: "1 1", rotate: "0deg" },
          {
            translate: "0 1px",
            scale: `${1.1 + 0.08 * nerve} ${0.88 - 0.05 * nerve}`,
            offset: 0.18,
          },
          {
            translate: `0 ${-4 - 3 * nerve}px`,
            scale: "0.92 1.14",
            rotate: `${-3 - 5 * nerve}deg`,
            offset: 0.45,
          },
          { translate: "0 0", scale: "1.06 0.94", rotate: `${2 + 4 * nerve}deg`, offset: 0.72 },
          { translate: "0 0", scale: "1 1", rotate: "0deg" },
        ],
        { duration: 820 - 200 * nerve, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)" },
      );
    } else {
      turn.current = -turn.current;
      const look = turn.current * (16 + 9 * nerve);
      head?.animate(
        [
          { rotate: "0deg", translate: "0 0" },
          { rotate: `${look}deg`, translate: "0 -2px", offset: 0.3 },
          { rotate: `${look}deg`, translate: "0 -2px", offset: 0.62 },
          { rotate: "0deg", translate: "0 0" },
        ],
        { duration: 900 - 240 * nerve, easing: "cubic-bezier(0.34, 1.3, 0.64, 1)" },
      );
    }
    // A shuffle of the feet, on `translate` so it never fights a flight path.
    flyerRef.current?.animate(
      [
        { translate: "0 0" },
        { translate: `${-1 - nerve}px 1px`, offset: 0.3 },
        { translate: `${1 + 1.5 * nerve}px 0`, offset: 0.65 },
        { translate: "0 0" },
      ],
      { duration: 620 - 160 * nerve, easing: "ease-in-out" },
    );
  };

  // The perch lines up with the footer's content column, so the owl sits over
  // the last link rather than out in the page margin.
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-full hidden px-gutter leading-none dark:block">
      <span className="mx-auto block max-w-(--breakpoint-lg) text-right">
        <span className="relative inline-block translate-y-[3px]" style={{ fontSize: OWL_SIZE }}>
          {!gone && (
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
          )}
          {feathers.map((feather) => (
            <span
              key={feather.id}
              aria-hidden="true"
              className="absolute top-1 left-0 motion-safe:animate-egg-feather"
              style={{
                ["--egg-feather-drift" as string]: `${feather.drift}px`,
                animationDelay: `${feather.delay}ms`,
                fontSize: feather.size,
                marginLeft: feather.x,
                marginTop: feather.y,
              }}
            >
              🪶
            </span>
          ))}
          <span className="sr-only" aria-live="polite">
            {gone ? "The owl flew away" : hoots > 0 ? "Hoo hoo" : ""}
          </span>
        </span>
      </span>
    </span>
  );
};
