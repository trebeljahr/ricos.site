import { Sprite } from "@components/Sprite";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { EASTER_EGG_IDS, EASTER_EGGS_CHANGED_EVENT, getFoundEggs } from "src/lib/easterEggs";
import { EASTER_EGG_SPRITES } from "src/lib/sprites";
import { EmojiButton } from "./EmojiButton";

const known = new Set<string>(EASTER_EGG_IDS);
const MAX_BUNNIES = 30;
const HOP_ACROSS_MS = 5000;
const BUNNY_PX = 30;
const EGGS_PER_BUNNY = 3;
const EGG_PX = 16;
// How long a hidden egg stays in the grass before it is gone.
const EGG_SHOWS_MS = 1800;

type HiddenEgg = { x: number; sprite: (typeof EASTER_EGG_SPRITES)[number]; tilt: number };

/** Spots spread across the screen, one per third, each with a random painted egg. */
function planEggs(width: number): HiddenEgg[] {
  return Array.from({ length: EGGS_PER_BUNNY }, (_, i) => ({
    x: (width * (i + 0.2 + Math.random() * 0.6)) / EGGS_PER_BUNNY,
    sprite: EASTER_EGG_SPRITES[Math.floor(Math.random() * EASTER_EGG_SPRITES.length)],
    tilt: (Math.random() - 0.5) * 30,
  }));
}

/**
 * The Easter bunny hops along the bottom of the screen once and hides a few
 * painted eggs on the way, which pop up behind it and are gone again soon.
 */
const Bunny = ({ onDone }: { onDone: () => void }) => {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const eggRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [eggs] = useState(() => planEggs(window.innerWidth));

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = -BUNNY_PX - 18;
    const to = window.innerWidth + BUNNY_PX + 18;
    const duration = calm ? HOP_ACROSS_MS * 1.6 : HOP_ACROSS_MS;
    const across = el.animate(
      [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
      { duration, easing: "linear", fill: "forwards" },
    );
    const hops = calm
      ? null
      : inner.current?.animate(
          [
            { translate: "0 0", scale: "-1 1", easing: "ease-out" },
            { translate: "0 -1.6rem", scale: "-1 1.05", easing: "ease-in" },
            { translate: "0 0", scale: "-1 0.9" },
          ],
          { duration: 420, iterations: Number.POSITIVE_INFINITY },
        );

    // Each egg appears once the bunny's tail has passed its spot.
    const hidden = eggs.map((egg, i) => {
      const passed = ((egg.x - from + BUNNY_PX / 2) / (to - from)) * duration;
      const rest = `rotate(${egg.tilt}deg) scale(1)`;
      return eggRefs.current[i]?.animate(
        calm
          ? [
              { opacity: 0 },
              { opacity: 1, offset: 0.15 },
              { opacity: 1, offset: 0.8 },
              { opacity: 0 },
            ]
          : [
              { opacity: 0, transform: "translateY(6px) scale(0.2)" },
              {
                opacity: 1,
                transform: `translateY(-5px) rotate(${egg.tilt}deg) scale(1.15)`,
                offset: 0.12,
              },
              { opacity: 1, transform: rest, offset: 0.22 },
              { opacity: 1, transform: rest, offset: 0.85 },
              { opacity: 0, transform: `translateY(4px) ${rest}` },
            ],
        { duration: EGG_SHOWS_MS, delay: passed, easing: "ease-out", fill: "both" },
      );
    });

    Promise.all([across.finished, ...hidden.map((a) => a?.finished)])
      .then(() => onDoneRef.current())
      .catch(() => undefined);
    return () => {
      across.cancel();
      hops?.cancel();
      for (const a of hidden) a?.cancel();
    };
  }, [eggs]);

  return (
    <>
      {eggs.map((egg, i) => (
        <span
          key={egg.x}
          ref={(el) => {
            eggRefs.current[i] = el;
          }}
          className="absolute bottom-2 leading-none opacity-0"
          style={{ left: egg.x - EGG_PX / 2, fontSize: EGG_PX }}
        >
          <Sprite name={egg.sprite} />
        </span>
      ))}
      <span ref={outer} className="absolute bottom-2 left-0">
        {/* The rabbit faces left; mirror it so it hops forward. */}
        <span
          ref={inner}
          className="inline-block leading-none"
          style={{ fontSize: BUNNY_PX, scale: "-1 1" }}
        >
          <Sprite name="🐇" />
        </span>
      </span>
    </>
  );
};

/** "N/total easter eggs found", once at least one is found. Reads storage after mount, so SSR renders nothing. */
export const EggCounter = () => {
  const recordFind = useRecordEggFind();
  const [found, setFound] = useState(0);
  const [bunnies, setBunnies] = useState<number[]>([]);

  useEffect(() => {
    const update = () => setFound(getFoundEggs().filter((id) => known.has(id)).length);
    update();
    window.addEventListener(EASTER_EGGS_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EASTER_EGGS_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  if (found === 0) return null;
  return (
    <span>
      <Link href="/eggs" className="hover:text-accent">
        {found}/{EASTER_EGG_IDS.length} easter eggs found
      </Link>{" "}
      <EmojiButton
        label="Easter egg"
        onClick={() => {
          recordFind("easter-bunny");
          setBunnies((current) =>
            current.length >= MAX_BUNNIES ? current : [...current, Date.now()],
          );
        }}
      >
        {/* A size up from the footer text, so the paint on the shell reads. */}
        <Sprite name="easter-egg-pink" className="text-lg" />
      </EmojiButton>
      {bunnies.length > 0 &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-50 h-20 overflow-hidden"
          >
            {bunnies.map((id) => (
              <Bunny
                key={id}
                onDone={() => setBunnies((current) => current.filter((b) => b !== id))}
              />
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
};
